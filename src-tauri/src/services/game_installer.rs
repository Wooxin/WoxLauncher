use std::collections::HashMap;
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};

use crate::error::WoxError;
use crate::models::version::{AssetIndexInfo, Library, Rule, VersionJson};
use crate::utils::paths;
use tauri::AppHandle;
use tauri::Emitter;

const MAX_CONCURRENT: usize = 64;

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

fn is_library_allowed(rules: &Option<Vec<Rule>>) -> bool {
    let rules = match rules {
        Some(r) => r,
        None => return true,
    };
    let mut allowed = false;
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

/// Full installation orchestration
pub async fn install_version(
    app_handle: &AppHandle,
    game_version: &str,
) -> Result<(), WoxError> {
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

    Ok(())
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

async fn download_client_jar(
    app_handle: &AppHandle,
    version_json: &VersionJson,
    game_version: &str,
) -> Result<(), WoxError> {
    let jar_path = paths::versions_dir()
        .join(game_version)
        .join(format!("{}.jar", game_version));
    if jar_path.exists() {
        return Ok(());
    }

    // Use downloads.client if available, otherwise construct URL from version ID
    let (url, sha1) = if let Some(ref downloads) = version_json.downloads {
        if let Some(ref client) = downloads.client {
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

async fn download_libraries(
    app_handle: &AppHandle,
    libraries: &[Library],
) -> Result<(), WoxError> {
    let os_name = current_os_name();
    let sem = Arc::new(tokio::sync::Semaphore::new(MAX_CONCURRENT));
    let mut tasks = tokio::task::JoinSet::new();

    for lib in libraries.iter() {
        if !is_library_allowed(&lib.rules) { continue; }

        // Skip already-downloaded libraries early
        let already_exists = if let Some(ref natives) = lib.natives {
            natives.get(os_name).map_or(false, |c| get_native_path(&lib.name, c).exists())
        } else if let Some(ref downloads) = lib.downloads {
            downloads.artifact.as_ref().map_or(false, |_| get_maven_path(&lib.name).exists())
        } else {
            false
        };
        if already_exists { continue; }

        let lib = lib.clone();
        let os_name = os_name.to_string();
        let app_handle = app_handle.clone();
        let sem = Arc::clone(&sem);

        tasks.spawn(async move {
            let _permit = sem.acquire_owned().await.map_err(|e| WoxError::Internal(e.to_string()))?;

            if let Some(ref natives) = lib.natives {
                if let Some(classifier) = natives.get(&os_name) {
                    if let Some(ref downloads) = lib.downloads {
                        if let Some(ref classifiers) = downloads.classifiers {
                            if let Some(native_info) = classifiers.get(classifier) {
                                let dest = get_native_path(&lib.name, classifier);
                                if !dest.exists() {
                                    if let Some(parent) = dest.parent() { let _ = std::fs::create_dir_all(parent); }
                                    crate::services::downloader::download_file_with_events(
                                        &app_handle, &native_info.url, dest, Some(&native_info.sha1),
                                        format!("Native {}", lib.name.split(':').last().unwrap_or(&lib.name)),
                                    ).await?;
                                }
                            }
                        }
                    }
                    return Ok::<_, WoxError>(());
                }
            }
            if let Some(ref downloads) = lib.downloads {
                if let Some(ref artifact) = downloads.artifact {
                    let dest = get_maven_path(&lib.name);
                    if !dest.exists() {
                        if let Some(parent) = dest.parent() { let _ = std::fs::create_dir_all(parent); }
                        crate::services::downloader::download_file_with_events(
                            &app_handle, &artifact.url, dest, Some(&artifact.sha1),
                            format!("Library {}", lib.name.split(':').last().unwrap_or(&lib.name)),
                        ).await?;
                    }
                }
            }
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
    if !index_path.exists() {
        std::fs::create_dir_all(&indexes_dir)?;
        crate::services::downloader::download_file_with_events(
            app_handle, &asset_index.url, index_path.clone(), Some(&asset_index.sha1),
            format!("Asset index {}", asset_index.id),
        ).await?;
    }

    let json_str = std::fs::read_to_string(&index_path)?;
    #[derive(serde::Deserialize)]
    struct AssetObjects { objects: HashMap<String, AssetObject> }
    #[derive(serde::Deserialize)]
    struct AssetObject { hash: String, size: u64 }

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
            let _ = agg_handle.emit(crate::events::EVENT_DOWNLOAD_PROGRESS, &crate::models::download::DownloadProgress {
                downloaded: done as u64,
                total: agg_total as u64,
                percent: if agg_total > 0 { (done as f64 / agg_total as f64) * 100.0 } else { 0.0 },
                speed: String::new(),
                status: if done < agg_total { crate::models::download::DownloadStatus::Downloading } else { crate::models::download::DownloadStatus::Done },
                file_name: format!("Assets {}/{}", done, agg_total),
            });
            if done >= agg_total { break; }
        }
    });

    for (_key, obj) in &index.objects {
        let hash = obj.hash.clone();
        let first2 = hash[..2].to_string();
        let dest = objects_dir.join(format!("{}/{}", first2, hash));

        if dest.exists() {
            completed.fetch_add(1, Ordering::Relaxed);
            continue;
        }
        if let Some(parent) = dest.parent() { std::fs::create_dir_all(parent)?; }

        let url = format!("{}/{}", base_url, format!("{}/{}", first2, hash));
        let app_handle = handle.clone();
        let sem = Arc::clone(&sem);
        let completed = Arc::clone(&completed);

        tasks.spawn(async move {
            let _permit = sem.acquire_owned().await.map_err(|e| WoxError::Internal(e.to_string()))?;
            let result = crate::services::downloader::download_file_with_events(
                &app_handle, &url, dest, None, String::new(),
            ).await;
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
            if let Some(classifier) = natives.get(os_name) {
                let jar_path = get_native_path(&lib.name, classifier);
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
                    let is_native = name.ends_with(".dll")
                        || name.ends_with(".so")
                        || name.ends_with(".dylib");
                    if !is_native {
                        continue;
                    }

                    // Extract file (just filename, no path)
                    let file_name = std::path::Path::new(&name)
                        .file_name()
                        .unwrap_or_default();
                    let out_path = natives_dir.join(file_name);
                    let mut out = std::fs::File::create(&out_path)?;
                    std::io::copy(&mut entry, &mut out)?;
                }
            }
        }
    }
    Ok(())
}
