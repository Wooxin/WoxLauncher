use crate::app_state::AppState;
use crate::error::WoxError;
use crate::services::{downloader, instance_manager};
use crate::utils::{logger, paths};
use serde::Serialize;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalModFile {
    file_name: String,
    path: String,
    size: u64,
    modified_at: String,
    enabled: bool,
}

#[tauri::command]
pub async fn start_download(
    _state: tauri::State<'_, AppState>,
    app_handle: tauri::AppHandle,
    url: String,
    dest: String,
    sha1: Option<String>,
    label: String,
) -> Result<(), WoxError> {
    let path = std::path::PathBuf::from(&dest);
    let path = if path.is_relative() {
        paths::wox_data_dir().parent().unwrap().join(&dest)
    } else {
        path
    };
    downloader::download_file_with_events(&app_handle, &url, path, sha1.as_deref(), label).await
}

#[tauri::command]
pub async fn install_mod_to_instance(
    app_handle: tauri::AppHandle,
    instance_id: String,
    url: String,
    file_name: String,
    sha1: Option<String>,
    label: String,
) -> Result<String, WoxError> {
    let file_name = std::path::Path::new(&file_name)
        .file_name()
        .ok_or_else(|| WoxError::Validation("Invalid mod file name".into()))?
        .to_string_lossy()
        .to_string();

    let instance = instance_manager::get_instance(&instance_id)?;
    let mods_dir = paths::version_game_dir(&instance.game_version).join("mods");
    std::fs::create_dir_all(&mods_dir)?;
    let dest = mods_dir.join(&file_name);
    logger::info(&format!(
        "Installing mod for instance {}: {} -> {}",
        instance_id,
        url,
        dest.display()
    ));
    downloader::download_file_with_events(
        &app_handle,
        &url,
        dest.clone(),
        sha1.as_deref(),
        if label.is_empty() {
            file_name.clone()
        } else {
            label
        },
    )
    .await?;

    logger::info(&format!(
        "Installed mod for instance {}: {}",
        instance_id,
        dest.display()
    ));
    Ok(dest.to_string_lossy().to_string())
}

fn instance_mods_dir(instance_id: &str) -> Result<PathBuf, WoxError> {
    let instance = instance_manager::get_instance(instance_id)?;
    Ok(paths::version_game_dir(&instance.game_version).join("mods"))
}

fn local_mod_path(instance_id: &str, file_name: &str) -> Result<PathBuf, WoxError> {
    let safe_name = Path::new(file_name)
        .file_name()
        .ok_or_else(|| WoxError::Validation("Invalid mod file name".into()))?;
    Ok(instance_mods_dir(instance_id)?.join(safe_name))
}

#[tauri::command]
pub fn list_local_mods(instance_id: String) -> Result<Vec<LocalModFile>, WoxError> {
    let mods_dir = instance_mods_dir(&instance_id)?;
    if !mods_dir.exists() {
        std::fs::create_dir_all(&mods_dir)?;
        return Ok(Vec::new());
    }

    let mut mods = Vec::new();
    for entry in std::fs::read_dir(&mods_dir)? {
        let entry = entry?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let Some(file_name) = path.file_name().and_then(|name| name.to_str()) else {
            continue;
        };
        let lower = file_name.to_ascii_lowercase();
        if !(lower.ends_with(".jar") || lower.ends_with(".jar.disabled")) {
            continue;
        }
        let metadata = std::fs::metadata(&path)?;
        let modified_at = metadata
            .modified()
            .ok()
            .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|duration| {
                chrono::DateTime::<chrono::Utc>::from(std::time::UNIX_EPOCH + duration).to_rfc3339()
            })
            .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());
        mods.push(LocalModFile {
            file_name: file_name.to_string(),
            path: path.to_string_lossy().to_string(),
            size: metadata.len(),
            modified_at,
            enabled: lower.ends_with(".jar"),
        });
    }
    mods.sort_by(|a, b| a.file_name.to_lowercase().cmp(&b.file_name.to_lowercase()));
    Ok(mods)
}

#[tauri::command]
pub fn delete_local_mod(instance_id: String, file_name: String) -> Result<(), WoxError> {
    let path = local_mod_path(&instance_id, &file_name)?;
    if path.exists() {
        std::fs::remove_file(path)?;
    }
    Ok(())
}

#[tauri::command]
pub fn backup_local_mod(instance_id: String, file_name: String) -> Result<String, WoxError> {
    let path = local_mod_path(&instance_id, &file_name)?;
    if !path.exists() {
        return Err(WoxError::NotFound(format!("Mod not found: {}", file_name)));
    }

    let instance = instance_manager::get_instance(&instance_id)?;
    let stamp = chrono::Utc::now().format("%Y%m%d-%H%M%S").to_string();
    let backup_dir = paths::version_game_dir(&instance.game_version)
        .join("mod_backups")
        .join(stamp);
    std::fs::create_dir_all(&backup_dir)?;
    let dest = backup_dir.join(
        path.file_name()
            .ok_or_else(|| WoxError::Validation("Invalid mod file name".into()))?,
    );
    std::fs::copy(&path, &dest)?;
    Ok(dest.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_wox_data_dir() -> String {
    paths::wox_data_dir().to_string_lossy().to_string()
}
