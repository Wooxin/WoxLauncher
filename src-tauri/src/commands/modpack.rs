use crate::error::WoxError;
use crate::services::modpack_importer::{self, ImportedModpack};

#[tauri::command]
pub async fn import_modpack(
    app_handle: tauri::AppHandle,
    file_path: String,
) -> Result<ImportedModpack, WoxError> {
    modpack_importer::import_modpack(&app_handle, &file_path).await
}

#[tauri::command]
pub async fn import_modpack_from_url(
    app_handle: tauri::AppHandle,
    url: String,
    file_name: String,
) -> Result<ImportedModpack, WoxError> {
    modpack_importer::import_modpack_from_url(&app_handle, &url, &file_name).await
}
