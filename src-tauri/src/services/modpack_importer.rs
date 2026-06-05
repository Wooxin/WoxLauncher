use crate::error::WoxError;
use crate::models::instance::{InstanceConfig, LoaderType};
use crate::services::{downloader, instance_manager};
use crate::utils::{logger, paths};
use chrono::Utc;
use std::fs::File;
use std::io::{Read, Seek};
use std::path::{Path, PathBuf};
use tauri::AppHandle;
use zip::ZipArchive;

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportedModpack {
    pub instance: InstanceConfig,
    pub format: String,
    pub installed_files: usize,
    pub downloaded_files: usize,
}

#[derive(Debug)]
struct PackInfo {
    name: String,
    game_version: String,
    loader_type: LoaderType,
    loader_version: String,
    format: String,
}

#[derive(Debug)]
struct RemoteFile {
    path: PathBuf,
    url: String,
    sha1: Option<String>,
}

fn loader_from_id(id: &str) -> (LoaderType, String) {
    let lower = id.to_ascii_lowercase();
    let mut parts = lower.split('-');
    let kind = parts.next().unwrap_or("vanilla");
    let version = parts.collect::<Vec<_>>().join("-");
    let loader = match kind {
        "fabric" => LoaderType::Fabric,
        "forge" => LoaderType::Forge,
        "quilt" => LoaderType::Quilt,
        "neoforge" => LoaderType::NeoForge,
        _ => LoaderType::Vanilla,
    };
    (loader, version)
}

fn sanitize_name(name: &str) -> String {
    let clean = name
        .chars()
        .map(|c| match c {
            '\\' | '/' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            c => c,
        })
        .collect::<String>();
    let clean = clean.trim();
    if clean.is_empty() {
        "Imported Modpack".to_string()
    } else {
        clean.to_string()
    }
}

fn safe_join(root: &Path, relative: &Path) -> Result<PathBuf, WoxError> {
    if relative.is_absolute()
        || relative
            .components()
            .any(|c| matches!(c, std::path::Component::ParentDir))
    {
        return Err(WoxError::Validation(format!(
            "Unsafe path in modpack: {}",
            relative.display()
        )));
    }
    Ok(root.join(relative))
}

fn read_zip_text<R: Read + Seek>(archive: &mut ZipArchive<R>, name: &str) -> Option<String> {
    let mut file = archive.by_name(name).ok()?;
    let mut text = String::new();
    file.read_to_string(&mut text).ok()?;
    Some(text)
}

fn find_zip_entry<R: Read + Seek>(archive: &mut ZipArchive<R>, file_name: &str) -> Option<String> {
    for i in 0..archive.len() {
        let file = archive.by_index(i).ok()?;
        let name = file.name().replace('\\', "/");
        if name == file_name || name.ends_with(&format!("/{}", file_name)) {
            return Some(name);
        }
    }
    None
}

fn detect_modrinth<R: Read + Seek>(
    archive: &mut ZipArchive<R>,
) -> Result<Option<(PackInfo, Vec<RemoteFile>)>, WoxError> {
    let Some(text) = read_zip_text(archive, "modrinth.index.json") else {
        return Ok(None);
    };
    let json: serde_json::Value = serde_json::from_str(&text)?;
    let name = sanitize_name(json["name"].as_str().unwrap_or("Modrinth Pack"));
    let game_version = json["dependencies"]["minecraft"]
        .as_str()
        .unwrap_or("1.21")
        .to_string();

    let mut loader_type = LoaderType::Vanilla;
    let mut loader_version = String::new();
    for key in ["fabric-loader", "forge", "quilt-loader", "neoforge"] {
        if let Some(version) = json["dependencies"][key].as_str() {
            let loader = match key {
                "fabric-loader" => LoaderType::Fabric,
                "forge" => LoaderType::Forge,
                "quilt-loader" => LoaderType::Quilt,
                "neoforge" => LoaderType::NeoForge,
                _ => LoaderType::Vanilla,
            };
            loader_type = loader;
            loader_version = version.to_string();
            break;
        }
    }

    let mut remotes = Vec::new();
    if let Some(files) = json["files"].as_array() {
        for file in files {
            let Some(path) = file["path"].as_str() else {
                continue;
            };
            let Some(downloads) = file["downloads"].as_array() else {
                continue;
            };
            let Some(url) = downloads.first().and_then(|v| v.as_str()) else {
                continue;
            };
            let sha1 = file["hashes"]["sha1"].as_str().map(String::from);
            remotes.push(RemoteFile {
                path: PathBuf::from(path),
                url: url.to_string(),
                sha1,
            });
        }
    }

    Ok(Some((
        PackInfo {
            name,
            game_version,
            loader_type,
            loader_version,
            format: "Modrinth".to_string(),
        },
        remotes,
    )))
}

fn detect_curseforge<R: Read + Seek>(
    archive: &mut ZipArchive<R>,
) -> Result<Option<(PackInfo, Vec<RemoteFile>)>, WoxError> {
    let Some(text) = read_zip_text(archive, "manifest.json") else {
        return Ok(None);
    };
    let json: serde_json::Value = serde_json::from_str(&text)?;
    if json["manifestType"].as_str() != Some("minecraftModpack") {
        return Ok(None);
    }

    let name = sanitize_name(json["name"].as_str().unwrap_or("CurseForge Pack"));
    let game_version = json["minecraft"]["version"]
        .as_str()
        .unwrap_or("1.21")
        .to_string();
    let (loader_type, loader_version) = json["minecraft"]["modLoaders"]
        .as_array()
        .and_then(|loaders| {
            loaders
                .iter()
                .find(|loader| loader["primary"].as_bool().unwrap_or(false))
                .or_else(|| loaders.first())
        })
        .and_then(|loader| loader["id"].as_str())
        .map(loader_from_id)
        .unwrap_or((LoaderType::Vanilla, String::new()));

    let mut remotes = Vec::new();
    if let Some(files) = json["files"].as_array() {
        for file in files {
            let Some(project_id) = file["projectID"].as_i64() else {
                continue;
            };
            let Some(file_id) = file["fileID"].as_i64() else {
                continue;
            };
            remotes.push(RemoteFile {
                path: PathBuf::from(format!("mods/{}-{}.jar", project_id, file_id)),
                url: format!(
                    "https://www.curseforge.com/api/v1/mods/{}/files/{}/download-url",
                    project_id, file_id
                ),
                sha1: None,
            });
        }
    }

    Ok(Some((
        PackInfo {
            name,
            game_version,
            loader_type,
            loader_version,
            format: "CurseForge".to_string(),
        },
        remotes,
    )))
}

fn detect_multimc<R: Read + Seek>(
    archive: &mut ZipArchive<R>,
    fallback_name: &str,
) -> Result<Option<(PackInfo, Vec<RemoteFile>)>, WoxError> {
    let Some(entry_name) = find_zip_entry(archive, "mmc-pack.json") else {
        return Ok(None);
    };
    let Some(text) = read_zip_text(archive, &entry_name) else {
        return Ok(None);
    };
    let json: serde_json::Value = serde_json::from_str(&text)?;
    let mut game_version = "1.21".to_string();
    let mut loader_type = LoaderType::Vanilla;
    let mut loader_version = String::new();

    if let Some(components) = json["components"].as_array() {
        for component in components {
            let uid = component["uid"].as_str().unwrap_or("");
            let version = component["version"].as_str().unwrap_or("").to_string();
            match uid {
                "net.minecraft" => game_version = version,
                "net.fabricmc.fabric-loader" => {
                    loader_type = LoaderType::Fabric;
                    loader_version = version;
                }
                "net.minecraftforge" => {
                    loader_type = LoaderType::Forge;
                    loader_version = version;
                }
                "org.quiltmc.quilt-loader" => {
                    loader_type = LoaderType::Quilt;
                    loader_version = version;
                }
                _ => {}
            }
        }
    }

    Ok(Some((
        PackInfo {
            name: sanitize_name(fallback_name),
            game_version,
            loader_type,
            loader_version,
            format: "MultiMC/Prism".to_string(),
        },
        Vec::new(),
    )))
}

fn strip_prefix<'a>(name: &'a str, prefixes: &[&str]) -> Option<&'a str> {
    prefixes.iter().find_map(|prefix| name.strip_prefix(prefix))
}

fn extract_overrides<R: Read + Seek>(
    archive: &mut ZipArchive<R>,
    instance_dir: &Path,
    format: &str,
) -> Result<usize, WoxError> {
    let markers: &[&str] = match format {
        "Modrinth" => &["overrides/"],
        "CurseForge" => &["overrides/"],
        "MultiMC/Prism" => &[".minecraft/", "minecraft/"],
        _ => &[],
    };
    let mut installed = 0usize;

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| WoxError::Internal(format!("ZIP entry error: {}", e)))?;
        let name = file.name().replace('\\', "/");
        let Some(relative) = strip_prefix(&name, markers).or_else(|| {
            markers.iter().find_map(|marker| {
                name.find(&format!("/{}", marker))
                    .map(|index| &name[index + marker.len() + 1..])
            })
        }) else {
            continue;
        };
        if relative.is_empty() {
            continue;
        }

        let out_path = safe_join(instance_dir, Path::new(relative))?;
        if file.is_dir() || name.ends_with('/') {
            std::fs::create_dir_all(out_path)?;
            continue;
        }
        if let Some(parent) = out_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let mut out = File::create(out_path)?;
        std::io::copy(&mut file, &mut out)?;
        installed += 1;
    }

    Ok(installed)
}

async fn resolve_download_url(url: &str) -> Result<String, WoxError> {
    if !url.contains("curseforge.com/api/v1/mods/") {
        return Ok(url.to_string());
    }

    let text = crate::utils::requests::http_client()
        .get(url)
        .send()
        .await?
        .text()
        .await?;
    let trimmed = text.trim().trim_matches('"');
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        return Ok(trimmed.to_string());
    }

    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
        if let Some(url) = json["data"]
            .as_str()
            .or_else(|| json["downloadUrl"].as_str())
        {
            return Ok(url.to_string());
        }
    }

    Err(WoxError::Network(
        "CurseForge did not return a downloadable file URL".into(),
    ))
}

pub async fn import_modpack(
    app_handle: &AppHandle,
    file_path: &str,
) -> Result<ImportedModpack, WoxError> {
    let path = PathBuf::from(file_path);
    if !path.exists() {
        return Err(WoxError::NotFound(format!(
            "Modpack not found: {}",
            file_path
        )));
    }

    let fallback_name = path
        .file_stem()
        .and_then(|name| name.to_str())
        .unwrap_or("Imported Modpack");
    let file = File::open(&path)?;
    let mut archive = ZipArchive::new(file)
        .map_err(|e| WoxError::Validation(format!("Unsupported modpack ZIP: {}", e)))?;

    let detected = if let Some(pack) = detect_modrinth(&mut archive)? {
        Some(pack)
    } else if let Some(pack) = detect_curseforge(&mut archive)? {
        Some(pack)
    } else {
        detect_multimc(&mut archive, fallback_name)?
    };
    let (info, remotes) = detected.ok_or_else(|| {
        WoxError::Validation(
            "Unsupported modpack format. Expected Modrinth .mrpack, CurseForge, or MultiMC/Prism ZIP.".into(),
        )
    })?;

    let mut instance = InstanceConfig::default();
    instance.name = info.name.clone();
    instance.game_version = info.game_version.clone();
    instance.loader_type = info.loader_type.clone();
    instance.loader_version = info.loader_version.clone();
    instance.java_version = String::new();
    instance.jvm_args = Vec::new();
    instance.created_at = Utc::now();
    instance = instance_manager::create_instance(instance)?;

    let instance_dir = paths::version_game_dir(&instance.game_version);
    std::fs::create_dir_all(&instance_dir)?;
    archive = ZipArchive::new(File::open(&path)?)
        .map_err(|e| WoxError::Validation(format!("Unsupported modpack ZIP: {}", e)))?;
    let installed_files = extract_overrides(&mut archive, &instance_dir, &info.format)?;

    let mut downloaded_files = 0usize;
    for remote in remotes {
        let dest = safe_join(&instance_dir, &remote.path)?;
        let url = resolve_download_url(&remote.url).await?;
        downloader::download_file_with_events(
            app_handle,
            &url,
            dest,
            remote.sha1.as_deref(),
            remote
                .path
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or("Modpack file")
                .to_string(),
        )
        .await?;
        downloaded_files += 1;
    }

    logger::info(format!(
        "imported modpack {} as instance {} ({})",
        path.display(),
        instance.id,
        info.format
    ));

    Ok(ImportedModpack {
        instance,
        format: info.format,
        installed_files,
        downloaded_files,
    })
}

pub async fn import_modpack_from_url(
    app_handle: &AppHandle,
    url: &str,
    file_name: &str,
) -> Result<ImportedModpack, WoxError> {
    std::fs::create_dir_all(paths::download_cache_dir())?;
    let safe_name = Path::new(file_name)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("modpack.zip");
    let archive_path = paths::download_cache_dir().join(safe_name);
    let resolved_url = resolve_download_url(url).await?;
    downloader::download_file_with_events(
        app_handle,
        &resolved_url,
        archive_path.clone(),
        None,
        format!("整合包 {}", safe_name),
    )
    .await?;

    let result = import_modpack(app_handle, &archive_path.to_string_lossy()).await;
    let _ = std::fs::remove_file(&archive_path);
    result
}
