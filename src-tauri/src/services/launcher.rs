use crate::error::WoxError;
use crate::models::instance::InstanceConfig;
use crate::services::auth::AuthResult;
use crate::utils::paths;
use std::path::PathBuf;
use std::process::{Command, Stdio};

pub fn launch_game(
    instance: &InstanceConfig,
    auth: &AuthResult,
    java_path: &str,
) -> Result<u32, WoxError> {
    let game_dir = paths::version_game_dir(&instance.game_version);
    let logs_dir = paths::logs_dir().join(&instance.game_version);

    // Ensure directories exist
    std::fs::create_dir_all(&game_dir)
        .map_err(|e| WoxError::Filesystem(format!("Cannot create game directory: {}", e)))?;
    std::fs::create_dir_all(&logs_dir)
        .map_err(|e| WoxError::Filesystem(format!("Cannot create log directory: {}", e)))?;

    // Build classpath from libraries
    let libraries_dir = paths::libraries_dir();
    let versions_dir = paths::versions_dir();
    let launch_version_id = crate::services::game_installer::launch_version_id(instance);

    // Read version JSON to get args and libraries
    let version_json_path = versions_dir
        .join(&launch_version_id)
        .join(format!("{}.json", launch_version_id));
    if !version_json_path.exists() {
        return Err(WoxError::NotFound(format!(
            "Game version {} is not downloaded. Please download it first.",
            launch_version_id
        )));
    }

    let version_json =
        crate::services::game_installer::parse_effective_version_value(&launch_version_id)?;

    // Build classpath
    let mut classpath = Vec::new();
    let mut missing_classpath = Vec::new();
    if let Some(libs) = version_json["libraries"].as_array() {
        for lib in libs {
            if !is_allowed_by_rules(lib["rules"].as_array(), false) {
                continue;
            }
            let name = lib["name"].as_str().unwrap_or("");
            let lib_path = get_library_path_from_json(lib, name, &libraries_dir);
            if lib_path.exists() {
                classpath.push(lib_path.to_string_lossy().to_string());
            } else if lib["downloads"]["artifact"].is_object() {
                missing_classpath.push(lib_path.display().to_string());
            }
        }
    }
    // Add the game JAR
    let game_jar = versions_dir
        .join(&instance.game_version)
        .join(format!("{}.jar", instance.game_version));
    if game_jar.exists() {
        classpath.push(game_jar.to_string_lossy().to_string());
    } else {
        missing_classpath.push(game_jar.display().to_string());
    }

    if !missing_classpath.is_empty() {
        return Err(WoxError::NotFound(format!(
            "Missing launch files after installation: {}",
            missing_classpath.join(", ")
        )));
    }

    // Build JVM args from version JSON
    let custom_resolution = instance.resolution_width > 0 && instance.resolution_height > 0;
    let mut jvm_args: Vec<String> = if let Some(args) = version_json["arguments"]["jvm"].as_array()
    {
        collect_launch_arguments(args, custom_resolution)
    } else {
        vec![]
    };

    // Add instance's custom JVM args
    jvm_args.extend(instance.jvm_args.clone());

    // Add logging argument if present (modern versions 1.19+)
    let log_configs_dir = game_dir.join("log_configs");
    if let Some(log_arg_raw) = version_json["logging"]["client"]["argument"].as_str() {
        if let Some(log_file) = version_json["logging"]["client"]["file"].as_object() {
            let log_id = log_file["id"].as_str().unwrap_or("log4j2.xml");
            let log_path = log_configs_dir.join(log_id);
            if log_path.exists() {
                jvm_args.push(log_arg_raw.replace("${path}", &log_path.to_string_lossy()));
            }
        }
    }

    // Replace placeholders
    let classpath_separator = if cfg!(target_os = "windows") {
        ";"
    } else {
        ":"
    };
    let natives_dir = paths::shared_dir()
        .join("versions")
        .join(&instance.game_version)
        .join("natives");

    let replaced_jvm_args: Vec<String> = jvm_args
        .iter()
        .map(|arg| {
            arg.replace("${classpath}", &classpath.join(classpath_separator))
                .replace("${natives_directory}", &natives_dir.to_string_lossy())
                .replace("${library_directory}", &libraries_dir.to_string_lossy())
                .replace("${launcher_name}", "WoxLauncher")
                .replace("${launcher_version}", "0.1.0")
        })
        .collect();

    // Build game args from version JSON
    let mut game_args: Vec<String> =
        if let Some(args) = version_json["arguments"]["game"].as_array() {
            collect_launch_arguments(args, custom_resolution)
        } else if let Some(args_str) = version_json["minecraftArguments"].as_str() {
            args_str.split(' ').map(String::from).collect()
        } else {
            vec![]
        };

    game_args.extend(instance.game_args.clone());
    if instance.fullscreen && !game_args.iter().any(|arg| arg == "--fullscreen") {
        game_args.push("--fullscreen".to_string());
    }

    let main_class = version_json["mainClass"]
        .as_str()
        .unwrap_or("net.minecraft.client.main.Main");

    let assets_index_name = version_json["assets"]
        .as_str()
        .unwrap_or(&instance.game_version);

    // Replace placeholders in game args
    let replaced_game_args: Vec<String> = game_args
        .iter()
        .map(|arg| {
            arg.replace("${auth_player_name}", &auth.username)
                .replace("${auth_uuid}", &auth.uuid)
                .replace("${auth_access_token}", &auth.access_token)
                .replace("${auth_session}", &auth.access_token)
                .replace("${user_type}", &auth.token_type)
                .replace("${version_name}", &launch_version_id)
                .replace("${game_directory}", &game_dir.to_string_lossy())
                .replace("${assets_root}", &paths::assets_dir().to_string_lossy())
                .replace("${assets_index_name}", assets_index_name)
                .replace("${game_assets}", &paths::assets_dir().to_string_lossy())
                .replace("${user_properties}", "{}")
                .replace("${user_property_map}", "{}")
                .replace("${auth_xuid}", "")
                .replace("${clientid}", "")
                .replace(
                    "${resolution_width}",
                    &instance.resolution_width.to_string(),
                )
                .replace(
                    "${resolution_height}",
                    &instance.resolution_height.to_string(),
                )
        })
        .collect();

    // Assemble full command
    let mut cmd = Command::new(java_path);
    cmd.args(&replaced_jvm_args);
    cmd.arg(main_class);
    cmd.args(&replaced_game_args);
    cmd.current_dir(&game_dir);
    if let Ok(stdout) = std::fs::File::create(logs_dir.join("latest.stdout.log")) {
        cmd.stdout(Stdio::from(stdout));
    }
    if let Ok(stderr) = std::fs::File::create(logs_dir.join("latest.stderr.log")) {
        cmd.stderr(Stdio::from(stderr));
    }

    // Detach process
    let child = cmd
        .spawn()
        .map_err(|e| WoxError::Launch(format!("Failed to launch: {}", e)))?;
    let pid = child.id();

    Ok(pid)
}

fn collect_launch_arguments(args: &[serde_json::Value], custom_resolution: bool) -> Vec<String> {
    let mut collected = Vec::new();
    for arg in args {
        if let Some(value) = arg.as_str() {
            collected.push(value.to_string());
            continue;
        }

        let Some(object) = arg.as_object() else {
            continue;
        };
        if !is_allowed_by_rules(
            object.get("rules").and_then(|r| r.as_array()),
            custom_resolution,
        ) {
            continue;
        }

        match object.get("value") {
            Some(serde_json::Value::String(value)) => collected.push(value.clone()),
            Some(serde_json::Value::Array(values)) => {
                collected.extend(
                    values
                        .iter()
                        .filter_map(|value| value.as_str().map(String::from)),
                );
            }
            _ => {}
        }
    }
    collected
}

fn is_allowed_by_rules(rules: Option<&Vec<serde_json::Value>>, custom_resolution: bool) -> bool {
    let Some(rules) = rules else {
        return true;
    };

    let mut allowed = !rules
        .iter()
        .any(|rule| rule["action"].as_str().unwrap_or("") == "allow");
    for rule in rules {
        let action = rule["action"].as_str().unwrap_or("");
        if action.is_empty() || !rule_matches(rule, custom_resolution) {
            continue;
        }

        allowed = action == "allow";
    }
    allowed
}

fn rule_matches(rule: &serde_json::Value, custom_resolution: bool) -> bool {
    if let Some(os) = rule["os"].as_object() {
        if let Some(name) = os.get("name").and_then(|v| v.as_str()) {
            if name != current_os_name() {
                return false;
            }
        }
        if let Some(arch) = os.get("arch").and_then(|v| v.as_str()) {
            if arch != current_arch_name() {
                return false;
            }
        }
    }

    if let Some(features) = rule["features"].as_object() {
        for (feature, expected) in features {
            let enabled = match feature.as_str() {
                "has_custom_resolution" => custom_resolution,
                _ => false,
            };
            if expected.as_bool().unwrap_or(false) != enabled {
                return false;
            }
        }
    }

    true
}

fn current_os_name() -> &'static str {
    if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "osx"
    } else {
        "linux"
    }
}

fn current_arch_name() -> &'static str {
    if cfg!(target_arch = "x86") {
        "x86"
    } else {
        "x86_64"
    }
}

fn get_library_path(name: &str, libraries_dir: &PathBuf) -> PathBuf {
    // Convert Maven coordinate to path: "com.mojang:logging:1.0.0" -> com/mojang/logging/1.0.0/logging-1.0.0.jar
    let parts: Vec<&str> = name.split(':').collect();
    if parts.len() < 3 {
        return libraries_dir.join(name);
    }
    let (group, artifact, version) = (parts[0], parts[1], parts[2]);
    let group_path = group.replace('.', "/");
    libraries_dir.join(format!(
        "{}/{}/{}/{}-{}.jar",
        group_path, artifact, version, artifact, version
    ))
}

fn get_library_path_from_json(
    lib: &serde_json::Value,
    name: &str,
    libraries_dir: &PathBuf,
) -> PathBuf {
    lib["downloads"]["artifact"]["path"]
        .as_str()
        .map(|path| libraries_dir.join(path))
        .unwrap_or_else(|| get_library_path(name, libraries_dir))
}
