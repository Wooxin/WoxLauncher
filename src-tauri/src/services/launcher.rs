use crate::models::instance::InstanceConfig;
use crate::services::auth::AuthResult;
use std::path::PathBuf;
use std::process::Command;

fn get_wox_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        std::env::var("APPDATA")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("."))
    }
    #[cfg(target_os = "macos")]
    {
        std::env::var("HOME")
            .map(|h| PathBuf::from(h).join("Library/Application Support"))
            .unwrap_or_else(|_| PathBuf::from("."))
    }
    #[cfg(target_os = "linux")]
    {
        std::env::var("XDG_DATA_HOME")
            .map(PathBuf::from)
            .or_else(|_| {
                std::env::var("HOME")
                    .map(|h| PathBuf::from(h).join(".local/share"))
            })
            .unwrap_or_else(|_| PathBuf::from("."))
    }
}

pub fn launch_game(
    instance: &InstanceConfig,
    auth: &AuthResult,
    java_path: &str,
) -> Result<u32, String> {
    let wox_dir = get_wox_dir().join(".woxlauncher");
    let shared_dir = wox_dir.join("shared");
    let instance_dir = wox_dir.join("instances").join(&instance.id);
    let game_dir = instance_dir.join("game");

    // Build classpath from libraries
    let libraries_dir = shared_dir.join("libraries");
    let versions_dir = shared_dir.join("versions");

    // Read version JSON to get args and libraries
    let version_json_path =
        versions_dir.join(&instance.game_version).join(format!("{}.json", instance.game_version));
    if !version_json_path.exists() {
        return Err(format!(
            "Game version {} is not downloaded. Please download it first.",
            instance.game_version
        ));
    }

    let version_json: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(&version_json_path).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;

    // Build classpath
    let mut classpath = Vec::new();
    if let Some(libs) = version_json["libraries"].as_array() {
        for lib in libs {
            let name = lib["name"].as_str().unwrap_or("");
            let lib_path = get_library_path(name, &libraries_dir);
            if lib_path.exists() {
                classpath.push(lib_path.to_string_lossy().to_string());
            }
        }
    }
    // Add the game JAR
    let game_jar = versions_dir
        .join(&instance.game_version)
        .join(format!("{}.jar", instance.game_version));
    if game_jar.exists() {
        classpath.push(game_jar.to_string_lossy().to_string());
    }

    // Build JVM args from version JSON
    let mut jvm_args: Vec<String> = if let Some(args) = version_json["arguments"]["jvm"].as_array() {
        args.iter()
            .filter_map(|a| a.as_str().map(String::from))
            .collect()
    } else {
        vec![]
    };

    // Add instance's custom JVM args
    jvm_args.extend(instance.jvm_args.clone());

    // Replace placeholders
    let classpath_separator = if cfg!(target_os = "windows") { ";" } else { ":" };
    let natives_dir = shared_dir
        .join("versions")
        .join(&instance.game_version)
        .join("natives");

    let replaced_jvm_args: Vec<String> = jvm_args
        .iter()
        .map(|arg| {
            arg.replace("${classpath}", &classpath.join(classpath_separator))
                .replace("${natives_directory}", &natives_dir.to_string_lossy())
                .replace(
                    "${library_directory}",
                    &libraries_dir.to_string_lossy(),
                )
                .replace("${launcher_name}", "WoxLauncher")
                .replace("${launcher_version}", "0.1.0")
        })
        .collect();

    // Build game args from version JSON
    let mut game_args: Vec<String> =
        if let Some(args) = version_json["arguments"]["game"].as_array() {
            args.iter()
                .filter_map(|a| a.as_str().map(String::from))
                .collect()
        } else if let Some(args_str) = version_json["minecraftArguments"].as_str() {
            args_str.split(' ').map(String::from).collect()
        } else {
            vec![]
        };

    game_args.extend(instance.game_args.clone());

    let main_class = version_json["mainClass"]
        .as_str()
        .unwrap_or("net.minecraft.client.main.Main");

    // Replace placeholders in game args
    let replaced_game_args: Vec<String> = game_args
        .iter()
        .map(|arg| {
            arg.replace("${auth_player_name}", &auth.username)
                .replace("${auth_uuid}", &auth.uuid)
                .replace("${auth_access_token}", &auth.access_token)
                .replace("${user_type}", &auth.token_type)
                .replace(
                    "${version_name}",
                    &instance.game_version,
                )
                .replace("${game_directory}", &game_dir.to_string_lossy())
                .replace(
                    "${assets_root}",
                    &shared_dir.join("assets").to_string_lossy(),
                )
                .replace("${assets_index_name}", &instance.game_version)
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
    cmd.current_dir(&instance_dir);

    // Detach process
    let child = cmd.spawn().map_err(|e| format!("Failed to launch: {}", e))?;
    let pid = child.id();

    Ok(pid)
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
