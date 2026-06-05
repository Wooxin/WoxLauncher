use std::collections::HashMap;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;

use crate::error::WoxError;
use crate::models::instance::{InstanceConfig, LoaderType};
use crate::models::version::{AssetIndexInfo, Library, Rule, VersionJson};
use crate::utils::logger;
use crate::utils::paths;
use tauri::AppHandle;
use tauri::Emitter;

const MAX_CONCURRENT: usize = 32;

fn current_os_name() -> &'static str {
    if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "osx"
    } else {
        "linux"
    }
}

fn current_arch() -> &'static str {
    if cfg!(target_arch = "x86_64") {
        "x86_64"
    } else if cfg!(target_arch = "aarch64") {
        "aarch64"
    } else {
        "x86"
    }
}

fn native_classifier(raw: &str) -> String {
    raw.replace(
        "${arch}",
        if cfg!(target_arch = "x86_64") {
            "64"
        } else {
            "32"
        },
    )
}

fn is_library_allowed(rules: &Option<Vec<Rule>>) -> bool {
    let rules = match rules {
        Some(r) => r,
        None => return true,
    };
    let mut allowed = !rules.iter().any(|rule| rule.action == "allow");
    for rule in rules {
        if let Some(ref os) = rule.os {
            let name_match = os.name.as_deref().unwrap_or("") == current_os_name();
            let arch_match = match &os.arch {
                Some(a) => a.as_str() == current_arch(),
                None => true,
            };
            if rule.action == "allow" && name_match && arch_match {
                allowed = true;
            }
            if rule.action == "disallow" && name_match && arch_match {
                allowed = false;
            }
        } else {
            if rule.action == "allow" {
                allowed = true;
            }
            if rule.action == "disallow" {
                allowed = false;
            }
        }
    }
    allowed
}

fn get_maven_path(name: &str) -> std::path::PathBuf {
    let parts: Vec<&str> = name.split(':').collect();
    if parts.len() < 3 {
        return paths::libraries_dir().join(name);
    }
    let (group, artifact, version) = (parts[0], parts[1], parts[2]);
    let group_path = group.replace('.', "/");
    paths::libraries_dir().join(format!(
        "{}/{}/{}/{}-{}.jar",
        group_path, artifact, version, artifact, version
    ))
}

fn get_maven_relative_path(name: &str) -> Option<String> {
    let parts: Vec<&str> = name.split(':').collect();
    if parts.len() < 3 {
        return None;
    }
    let (group, artifact, version) = (parts[0], parts[1], parts[2]);
    Some(format!(
        "{}/{}/{}/{}-{}.jar",
        group.replace('.', "/"),
        artifact,
        version,
        artifact,
        version
    ))
}

fn get_maven_url(name: &str, base_url: &str) -> Option<String> {
    let relative = get_maven_relative_path(name)?;
    Some(format!("{}/{}", base_url.trim_end_matches('/'), relative))
}

fn get_native_path(name: &str, classifier: &str) -> std::path::PathBuf {
    let parts: Vec<&str> = name.split(':').collect();
    if parts.len() < 3 {
        return paths::libraries_dir().join(name);
    }
    let (group, artifact, version) = (parts[0], parts[1], parts[2]);
    let group_path = group.replace('.', "/");
    paths::libraries_dir().join(format!(
        "{}/{}/{}/{}-{}-{}.jar",
        group_path, artifact, version, artifact, version, classifier
    ))
}

fn download_info_path(
    info: &crate::models::version::DownloadInfo,
    fallback: std::path::PathBuf,
) -> std::path::PathBuf {
    info.path
        .as_ref()
        .map(|path| paths::libraries_dir().join(path))
        .unwrap_or(fallback)
}

fn sha1_file(path: &std::path::Path) -> Result<String, WoxError> {
    let bytes = std::fs::read(path)?;
    use sha1::Digest;
    let mut hasher = sha1::Sha1::new();
    hasher.update(bytes);
    Ok(format!("{:x}", hasher.finalize()))
}

fn verified_file_exists(path: &std::path::Path, sha1: Option<&str>, size: Option<u64>) -> bool {
    if !path.exists() {
        return false;
    }

    if let Some(expected_size) = size {
        match std::fs::metadata(path) {
            Ok(meta) if meta.len() == expected_size => {}
            _ => return false,
        }
    }

    if let Some(expected_sha1) = sha1 {
        match sha1_file(path) {
            Ok(actual) if actual.eq_ignore_ascii_case(expected_sha1) => {}
            _ => return false,
        }
    }

    true
}

fn remove_invalid_file(path: &std::path::Path) {
    if path.exists() {
        let _ = std::fs::remove_file(path);
    }
}

/// Full installation orchestration
pub async fn install_version(app_handle: &AppHandle, game_version: &str) -> Result<(), WoxError> {
    logger::info(format!("install version start: {}", game_version));
    // Step 1: Ensure version JSON exists
    crate::services::preflight::ensure_version_json(app_handle, game_version).await?;

    // Step 2: Parse version JSON
    let version_json = parse_version_json(game_version)?;

    // Step 3: Download client JAR
    download_client_jar(app_handle, &version_json, game_version).await?;

    // Step 4: Download libraries
    download_libraries(app_handle, &version_json.libraries).await?;

    // Step 5: Download assets
    download_assets(app_handle, &version_json.asset_index).await?;

    // Step 6: Extract natives
    extract_natives(&version_json.libraries, game_version)?;

    paths::clear_download_cache();
    logger::info(format!("install version done: {}", game_version));
    Ok(())
}

pub async fn install_instance(
    app_handle: &AppHandle,
    instance: &InstanceConfig,
    java_path: Option<&str>,
) -> Result<InstanceConfig, WoxError> {
    let mut installed = instance.clone();
    install_version(app_handle, &installed.game_version).await?;

    let Some(loader_version_id) =
        ensure_loader_profile(app_handle, &mut installed, java_path).await?
    else {
        installed.downloaded = true;
        crate::services::instance_manager::update_instance(installed.clone())?;
        return Ok(installed);
    };

    logger::info(format!(
        "install loader start: {} for {}",
        loader_version_id, installed.game_version
    ));
    let version_json = parse_effective_version_json(&loader_version_id)?;
    download_libraries(app_handle, &version_json.libraries).await?;
    paths::clear_download_cache();

    installed.downloaded = true;
    crate::services::instance_manager::update_instance(installed.clone())?;
    logger::info(format!("install loader done: {}", loader_version_id));
    Ok(installed)
}

fn parse_version_json(game_version: &str) -> Result<VersionJson, WoxError> {
    let json_path = paths::versions_dir()
        .join(game_version)
        .join(format!("{}.json", game_version));
    if !json_path.exists() {
        return Err(WoxError::NotFound(format!(
            "Version JSON not found for {}",
            game_version
        )));
    }
    let json_str = std::fs::read_to_string(&json_path)?;
    serde_json::from_str(&json_str).map_err(|e| WoxError::Internal(e.to_string()))
}

pub fn launch_version_id(instance: &InstanceConfig) -> String {
    match &instance.loader_type {
        LoaderType::Vanilla => instance.game_version.clone(),
        LoaderType::Fabric if !instance.loader_version.is_empty() => {
            format!(
                "fabric-loader-{}-{}",
                instance.loader_version, instance.game_version
            )
        }
        LoaderType::Quilt if !instance.loader_version.is_empty() => {
            format!(
                "quilt-loader-{}-{}",
                instance.loader_version, instance.game_version
            )
        }
        LoaderType::Forge if !instance.loader_version.is_empty() => {
            format!(
                "{}-forge-{}",
                instance.game_version, instance.loader_version
            )
        }
        _ => instance.game_version.clone(),
    }
}

pub fn parse_effective_version_json(version_id: &str) -> Result<VersionJson, WoxError> {
    let value = parse_effective_version_value(version_id)?;
    serde_json::from_value(value).map_err(|e| WoxError::Internal(e.to_string()))
}

pub fn parse_effective_version_value(version_id: &str) -> Result<serde_json::Value, WoxError> {
    let path = paths::versions_dir()
        .join(version_id)
        .join(format!("{}.json", version_id));
    if !path.exists() {
        return Err(WoxError::NotFound(format!(
            "Version JSON not found for {}",
            version_id
        )));
    }

    let child: serde_json::Value = serde_json::from_str(&std::fs::read_to_string(&path)?)?;
    let Some(parent_id) = child["inheritsFrom"].as_str() else {
        return Ok(child);
    };

    let parent = parse_effective_version_value(parent_id)?;
    Ok(merge_version_json(parent, child))
}

fn merge_version_json(
    mut parent: serde_json::Value,
    child: serde_json::Value,
) -> serde_json::Value {
    if let Some(child_obj) = child.as_object() {
        for (key, value) in child_obj {
            match key.as_str() {
                "libraries" => {
                    let mut libraries = parent["libraries"].as_array().cloned().unwrap_or_default();
                    if let Some(child_libraries) = value.as_array() {
                        libraries.extend(child_libraries.iter().cloned());
                    }
                    parent["libraries"] = serde_json::Value::Array(libraries);
                }
                "arguments" => {
                    let mut arguments = parent["arguments"].clone();
                    merge_argument_array(&mut arguments, value, "game");
                    merge_argument_array(&mut arguments, value, "jvm");
                    parent["arguments"] = arguments;
                }
                "inheritsFrom" => {}
                _ => {
                    if !value.is_null() {
                        parent[key.as_str()] = value.clone();
                    }
                }
            }
        }
    }
    parent
}

fn merge_argument_array(target: &mut serde_json::Value, source: &serde_json::Value, key: &str) {
    let mut values = target[key].as_array().cloned().unwrap_or_default();
    if let Some(source_values) = source[key].as_array() {
        values.extend(source_values.iter().cloned());
    }
    target[key] = serde_json::Value::Array(values);
}

async fn ensure_loader_profile(
    app_handle: &AppHandle,
    instance: &mut InstanceConfig,
    java_path: Option<&str>,
) -> Result<Option<String>, WoxError> {
    match &instance.loader_type {
        LoaderType::Vanilla => Ok(None),
        LoaderType::Fabric => create_meta_loader_profile(
            app_handle,
            instance,
            "fabric",
            "https://meta.fabricmc.net/v2/versions/loader",
            "net.fabricmc:intermediary",
            "https://maven.fabricmc.net/",
            "net.fabricmc:fabric-loader",
            "https://maven.fabricmc.net/",
        )
        .await
        .map(Some),
        LoaderType::Quilt => create_meta_loader_profile(
            app_handle,
            instance,
            "quilt",
            "https://meta.quiltmc.org/v3/versions/loader",
            "org.quiltmc:hashed",
            "https://maven.quiltmc.org/repository/release/",
            "org.quiltmc:quilt-loader",
            "https://maven.quiltmc.org/repository/release/",
        )
        .await
        .map(Some),
        LoaderType::Forge => install_forge_loader(app_handle, instance, java_path)
            .await
            .map(Some),
        _ => Err(WoxError::Validation(
            "当前版本先支持 Fabric / Quilt / Forge 的自动安装。".into(),
        )),
    }
}

async fn install_forge_loader(
    app_handle: &AppHandle,
    instance: &mut InstanceConfig,
    java_path: Option<&str>,
) -> Result<String, WoxError> {
    let forge_full_version =
        resolve_forge_version(&instance.game_version, &instance.loader_version).await?;
    let loader_version = forge_full_version
        .strip_prefix(&format!("{}-", instance.game_version))
        .unwrap_or(&forge_full_version)
        .to_string();
    instance.loader_version = loader_version.clone();

    let version_id = format!("{}-forge-{}", instance.game_version, loader_version);
    let version_json = paths::versions_dir()
        .join(&version_id)
        .join(format!("{}.json", version_id));
    if version_json.exists() {
        return Ok(version_id);
    }

    let installer_path = paths::download_cache_dir()
        .join("forge")
        .join(format!("forge-{}-installer.jar", forge_full_version));
    let installer_url = format!(
        "https://maven.minecraftforge.net/net/minecraftforge/forge/{}/forge-{}-installer.jar",
        forge_full_version, forge_full_version
    );
    crate::services::downloader::download_file_with_events(
        app_handle,
        &installer_url,
        installer_path.clone(),
        None,
        format!("Forge installer {}", forge_full_version),
    )
    .await?;

    let java = java_path
        .filter(|path| !path.trim().is_empty())
        .unwrap_or("java")
        .to_string();
    let minecraft_dir = paths::shared_dir();
    let status = tokio::task::spawn_blocking(move || {
        Command::new(java)
            .arg("-jar")
            .arg(installer_path)
            .arg("--installClient")
            .arg(minecraft_dir)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
    })
    .await
    .map_err(|e| WoxError::Internal(e.to_string()))?
    .map_err(|e| WoxError::Launch(format!("Failed to run Forge installer: {}", e)))?;

    if !status.success() {
        return Err(WoxError::Launch(format!(
            "Forge installer exited with status {}",
            status
        )));
    }

    if !version_json.exists() {
        return Err(WoxError::NotFound(format!(
            "Forge profile was not created: {}",
            version_json.display()
        )));
    }

    Ok(version_id)
}

async fn resolve_forge_version(
    game_version: &str,
    requested_loader_version: &str,
) -> Result<String, WoxError> {
    if !requested_loader_version.trim().is_empty() {
        if requested_loader_version.starts_with(&format!("{}-", game_version)) {
            return Ok(requested_loader_version.to_string());
        }
        return Ok(format!("{}-{}", game_version, requested_loader_version));
    }

    let metadata = reqwest::get(
        "https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml",
    )
    .await?
    .error_for_status()?
    .text()
    .await?;
    let prefix = format!("{}-", game_version);
    metadata
        .split("<version>")
        .filter_map(|part| part.split("</version>").next())
        .filter(|version| version.starts_with(&prefix))
        .last()
        .map(str::to_string)
        .ok_or_else(|| {
            WoxError::NotFound(format!(
                "Forge loader not found for Minecraft {}",
                game_version
            ))
        })
}

async fn create_meta_loader_profile(
    _app_handle: &AppHandle,
    instance: &mut InstanceConfig,
    loader_name: &str,
    endpoint: &str,
    mapping_group_artifact: &str,
    mapping_maven: &str,
    loader_group_artifact: &str,
    loader_maven: &str,
) -> Result<String, WoxError> {
    let url = format!("{}/{}", endpoint, instance.game_version);
    let versions: serde_json::Value = reqwest::get(&url).await?.error_for_status()?.json().await?;
    let entries = versions.as_array().ok_or_else(|| {
        WoxError::Network(format!("Invalid {} loader metadata response", loader_name))
    })?;

    let selected = if instance.loader_version.is_empty() {
        entries
            .iter()
            .find(|entry| is_stable_loader_entry(entry))
            .or_else(|| entries.first())
    } else {
        entries.iter().find(|entry| {
            entry["loader"]["version"]
                .as_str()
                .map(|version| version == instance.loader_version)
                .unwrap_or(false)
        })
    }
    .ok_or_else(|| {
        WoxError::NotFound(format!(
            "{} loader not found for Minecraft {}",
            loader_name, instance.game_version
        ))
    })?;

    let loader_version = selected["loader"]["version"]
        .as_str()
        .ok_or_else(|| WoxError::Internal("Loader version is missing".into()))?;
    let mapping_version = selected
        .get("intermediary")
        .or_else(|| selected.get("hashed"))
        .and_then(|v| v["version"].as_str())
        .unwrap_or(&instance.game_version);

    instance.loader_version = loader_version.to_string();
    let version_id = format!(
        "{}-loader-{}-{}",
        loader_name, loader_version, instance.game_version
    );

    let main_class = selected["launcherMeta"]["mainClass"]["client"]
        .as_str()
        .or_else(|| selected["launcherMeta"]["mainClass"].as_str())
        .ok_or_else(|| WoxError::Internal("Loader mainClass is missing".into()))?;

    let mut libraries = Vec::<serde_json::Value>::new();
    libraries.push(serde_json::json!({
        "name": format!("{}:{}", mapping_group_artifact, mapping_version),
        "url": mapping_maven,
    }));
    libraries.push(serde_json::json!({
        "name": format!("{}:{}", loader_group_artifact, loader_version),
        "url": loader_maven,
    }));

    if let Some(common) = selected["launcherMeta"]["libraries"]["common"].as_array() {
        libraries.extend(common.iter().cloned());
    }
    if let Some(client) = selected["launcherMeta"]["libraries"]["client"].as_array() {
        libraries.extend(client.iter().cloned());
    }

    let profile = serde_json::json!({
        "id": version_id.clone(),
        "inheritsFrom": instance.game_version.clone(),
        "type": "release",
        "mainClass": main_class,
        "libraries": libraries,
    });

    let dir = paths::versions_dir().join(&version_id);
    std::fs::create_dir_all(&dir)?;
    std::fs::write(
        dir.join(format!("{}.json", version_id)),
        serde_json::to_string_pretty(&profile)?,
    )?;

    Ok(version_id)
}

fn is_stable_loader_entry(entry: &serde_json::Value) -> bool {
    if let Some(stable) = entry["loader"]["stable"].as_bool() {
        return stable;
    }
    let version = entry["loader"]["version"]
        .as_str()
        .unwrap_or("")
        .to_ascii_lowercase();
    !(version.contains("alpha") || version.contains("beta") || version.contains("rc"))
}

async fn download_client_jar(
    app_handle: &AppHandle,
    version_json: &VersionJson,
    game_version: &str,
) -> Result<(), WoxError> {
    let jar_path = paths::versions_dir()
        .join(game_version)
        .join(format!("{}.jar", game_version));
    // Use downloads.client if available, otherwise construct URL from version ID
    let (url, sha1) = if let Some(ref downloads) = version_json.downloads {
        if let Some(ref client) = downloads.client {
            if verified_file_exists(&jar_path, Some(client.sha1.as_str()), Some(client.size)) {
                return Ok(());
            }
            remove_invalid_file(&jar_path);
            (client.url.clone(), Some(client.sha1.as_str()))
        } else {
            return Err(WoxError::NotFound(
                "No client download info in version JSON".into(),
            ));
        }
    } else {
        // Legacy versions - skip JAR download (these use standard Minecraft launcher jars)
        return Ok(());
    };

    crate::services::downloader::download_file_with_events(
        app_handle,
        &url,
        jar_path,
        sha1,
        format!("Minecraft client JAR {}", game_version),
    )
    .await
}

async fn download_libraries(app_handle: &AppHandle, libraries: &[Library]) -> Result<(), WoxError> {
    let os_name = current_os_name();
    let sem = Arc::new(tokio::sync::Semaphore::new(MAX_CONCURRENT));
    let mut tasks = tokio::task::JoinSet::new();
    let total = libraries
        .iter()
        .filter(|l| is_library_allowed(&l.rules))
        .count();
    let completed = Arc::new(AtomicUsize::new(0));
    let handle = app_handle.clone();

    // Aggregate progress emitter for libraries
    let agg_completed = Arc::clone(&completed);
    let agg_handle = handle.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
            let done = agg_completed.load(Ordering::Relaxed);
            let _ = agg_handle.emit(
                crate::events::EVENT_DOWNLOAD_PROGRESS,
                &crate::models::download::DownloadProgress {
                    downloaded: done as u64,
                    total: total as u64,
                    percent: if total > 0 {
                        (done as f64 / total as f64) * 100.0
                    } else {
                        0.0
                    },
                    speed: String::new(),
                    status: if done < total {
                        crate::models::download::DownloadStatus::Downloading
                    } else {
                        crate::models::download::DownloadStatus::Done
                    },
                    file_name: "Minecraft Libraries".to_string(),
                },
            );
            if done >= total {
                break;
            }
        }
    });

    for lib in libraries.iter() {
        if !is_library_allowed(&lib.rules) {
            continue;
        }
        let native_ready = lib
            .natives
            .as_ref()
            .and_then(|n| n.get(os_name))
            .map_or(true, |c| {
                let classifier = native_classifier(c);
                lib.downloads
                    .as_ref()
                    .and_then(|d| d.classifiers.as_ref())
                    .and_then(|classifiers| classifiers.get(&classifier))
                    .map_or(false, |info| {
                        let path =
                            download_info_path(info, get_native_path(&lib.name, &classifier));
                        verified_file_exists(&path, Some(info.sha1.as_str()), Some(info.size))
                    })
            });
        let artifact_ready = lib
            .downloads
            .as_ref()
            .and_then(|d| d.artifact.as_ref())
            .map_or_else(
                || lib.url.is_none() || get_maven_path(&lib.name).exists(),
                |artifact| {
                    let path = download_info_path(artifact, get_maven_path(&lib.name));
                    verified_file_exists(&path, Some(artifact.sha1.as_str()), Some(artifact.size))
                },
            );

        if native_ready && artifact_ready {
            completed.fetch_add(1, Ordering::Relaxed);
            continue;
        }

        let lib = lib.clone();
        let os_name = os_name.to_string();
        let app_handle = handle.clone();
        let sem = Arc::clone(&sem);
        let completed = Arc::clone(&completed);

        tasks.spawn(async move {
            let _permit = sem
                .acquire_owned()
                .await
                .map_err(|e| WoxError::Internal(e.to_string()))?;

            if let Some(ref natives) = lib.natives {
                if let Some(classifier_raw) = natives.get(&os_name) {
                    let classifier = native_classifier(classifier_raw);
                    if let Some(ref downloads) = lib.downloads {
                        if let Some(ref classifiers) = downloads.classifiers {
                            if let Some(native_info) = classifiers.get(&classifier) {
                                let dest = download_info_path(
                                    native_info,
                                    get_native_path(&lib.name, &classifier),
                                );
                                if !verified_file_exists(
                                    &dest,
                                    Some(native_info.sha1.as_str()),
                                    Some(native_info.size),
                                ) {
                                    remove_invalid_file(&dest);
                                    if let Some(parent) = dest.parent() {
                                        let _ = std::fs::create_dir_all(parent);
                                    }
                                    if let Err(e) =
                                        crate::services::downloader::download_file_with_events(
                                            &app_handle,
                                            &native_info.url,
                                            dest,
                                            Some(native_info.sha1.as_str()),
                                            String::new(),
                                        )
                                        .await
                                    {
                                        completed.fetch_add(1, Ordering::Relaxed);
                                        return Err(e);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if let Some(ref downloads) = lib.downloads {
                if let Some(ref artifact) = downloads.artifact {
                    let dest = download_info_path(artifact, get_maven_path(&lib.name));
                    if !verified_file_exists(
                        &dest,
                        Some(artifact.sha1.as_str()),
                        Some(artifact.size),
                    ) {
                        remove_invalid_file(&dest);
                        if let Some(parent) = dest.parent() {
                            let _ = std::fs::create_dir_all(parent);
                        }
                        if let Err(e) = crate::services::downloader::download_file_with_events(
                            &app_handle,
                            &artifact.url,
                            dest,
                            Some(artifact.sha1.as_str()),
                            String::new(),
                        )
                        .await
                        {
                            completed.fetch_add(1, Ordering::Relaxed);
                            return Err(e);
                        }
                    }
                }
            } else if let Some(ref base_url) = lib.url {
                let dest = get_maven_path(&lib.name);
                if !dest.exists() {
                    if let Some(parent) = dest.parent() {
                        let _ = std::fs::create_dir_all(parent);
                    }
                    let url = get_maven_url(&lib.name, base_url).ok_or_else(|| {
                        WoxError::Internal(format!("Invalid Maven coordinate: {}", lib.name))
                    })?;
                    crate::services::downloader::download_file_with_events(
                        &app_handle,
                        &url,
                        dest,
                        None,
                        String::new(),
                    )
                    .await?;
                }
            }
            completed.fetch_add(1, Ordering::Relaxed);
            Ok::<_, WoxError>(())
        });
    }

    while let Some(result) = tasks.join_next().await {
        result.map_err(|e| WoxError::Internal(e.to_string()))??;
    }
    Ok(())
}

async fn download_assets(
    app_handle: &AppHandle,
    asset_index: &AssetIndexInfo,
) -> Result<(), WoxError> {
    let indexes_dir = paths::assets_dir().join("indexes");
    let index_path = indexes_dir.join(format!("{}.json", asset_index.id));
    if !verified_file_exists(
        &index_path,
        Some(asset_index.sha1.as_str()),
        Some(asset_index.size),
    ) {
        remove_invalid_file(&index_path);
        std::fs::create_dir_all(&indexes_dir)?;
        crate::services::downloader::download_file_with_events(
            app_handle,
            &asset_index.url,
            index_path.clone(),
            Some(&asset_index.sha1),
            format!("Asset index {}", asset_index.id),
        )
        .await?;
    }

    let json_str = std::fs::read_to_string(&index_path)?;
    #[derive(serde::Deserialize)]
    struct AssetObjects {
        objects: HashMap<String, AssetObject>,
    }
    #[derive(serde::Deserialize)]
    struct AssetObject {
        hash: String,
        size: u64,
    }

    let index: AssetObjects = serde_json::from_str(&json_str)
        .map_err(|e| WoxError::Internal(format!("Failed to parse asset index: {}", e)))?;

    let objects_dir = paths::assets_dir().join("objects");
    let base_url = "https://resources.download.minecraft.net";
    let sem = Arc::new(tokio::sync::Semaphore::new(MAX_CONCURRENT));
    let mut tasks = tokio::task::JoinSet::new();
    let total = index.objects.len();
    let completed = Arc::new(AtomicUsize::new(0));
    let handle = app_handle.clone();

    // Emit aggregate progress periodically
    let agg_completed = Arc::clone(&completed);
    let agg_handle = handle.clone();
    let agg_total = total;
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
            let done = agg_completed.load(Ordering::Relaxed);
            let _ = agg_handle.emit(
                crate::events::EVENT_DOWNLOAD_PROGRESS,
                &crate::models::download::DownloadProgress {
                    downloaded: done as u64,
                    total: agg_total as u64,
                    percent: if agg_total > 0 {
                        (done as f64 / agg_total as f64) * 100.0
                    } else {
                        0.0
                    },
                    speed: String::new(),
                    status: if done < agg_total {
                        crate::models::download::DownloadStatus::Downloading
                    } else {
                        crate::models::download::DownloadStatus::Done
                    },
                    file_name: "Assets".to_string(),
                },
            );
            if done >= agg_total {
                break;
            }
        }
    });

    for (_key, obj) in &index.objects {
        let hash = obj.hash.clone();
        let first2 = hash[..2].to_string();
        let dest = objects_dir.join(format!("{}/{}", first2, hash));
        let expected_size = obj.size;

        // Skip only if file exists AND matches the asset index.
        if verified_file_exists(&dest, Some(&hash), Some(expected_size)) {
            completed.fetch_add(1, Ordering::Relaxed);
            continue;
        }
        remove_invalid_file(&dest);
        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let url = format!("{}/{}", base_url, format!("{}/{}", first2, hash));
        let app_handle = handle.clone();
        let sem = Arc::clone(&sem);
        let completed = Arc::clone(&completed);

        tasks.spawn(async move {
            let _permit = sem
                .acquire_owned()
                .await
                .map_err(|e| WoxError::Internal(e.to_string()))?;
            let result = crate::services::downloader::download_file_with_events(
                &app_handle,
                &url,
                dest,
                Some(&hash),
                String::new(),
            )
            .await;
            completed.fetch_add(1, Ordering::Relaxed);
            result
        });
    }

    while let Some(result) = tasks.join_next().await {
        result.map_err(|e| WoxError::Internal(e.to_string()))??;
    }
    Ok(())
}

fn extract_natives(libraries: &[Library], game_version: &str) -> Result<(), WoxError> {
    let os_name = current_os_name();
    let natives_dir = paths::versions_dir().join(game_version).join("natives");
    std::fs::create_dir_all(&natives_dir)?;

    for lib in libraries {
        if !is_library_allowed(&lib.rules) {
            continue;
        }

        if let Some(ref natives) = lib.natives {
            if let Some(classifier_raw) = natives.get(os_name) {
                let classifier = native_classifier(classifier_raw);
                let jar_path = lib
                    .downloads
                    .as_ref()
                    .and_then(|d| d.classifiers.as_ref())
                    .and_then(|classifiers| classifiers.get(&classifier))
                    .map(|info| download_info_path(info, get_native_path(&lib.name, &classifier)))
                    .unwrap_or_else(|| get_native_path(&lib.name, &classifier));
                if !jar_path.exists() {
                    continue;
                }

                // Extract native libraries (dll/so/dylib) from the JAR
                let file = std::fs::File::open(&jar_path)?;
                let mut archive = match zip::ZipArchive::new(file) {
                    Ok(a) => a,
                    Err(_) => continue,
                };

                for i in 0..archive.len() {
                    let mut entry = match archive.by_index(i) {
                        Ok(e) => e,
                        Err(_) => continue,
                    };
                    let name = entry.name().to_string();
                    let is_native =
                        name.ends_with(".dll") || name.ends_with(".so") || name.ends_with(".dylib");
                    if !is_native {
                        continue;
                    }

                    // Extract file (just filename, no path)
                    let file_name = std::path::Path::new(&name).file_name().unwrap_or_default();
                    let out_path = natives_dir.join(file_name);
                    let mut out = std::fs::File::create(&out_path)?;
                    std::io::copy(&mut entry, &mut out)?;
                }
            }
        }
    }
    Ok(())
}
