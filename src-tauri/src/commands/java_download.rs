use crate::app_state::AppState;
use crate::error::WoxError;
use crate::services::java_download;

#[tauri::command]
pub async fn download_java(
    _state: tauri::State<'_, AppState>,
    app_handle: tauri::AppHandle,
    vendor: String,
    version: String,
) -> Result<String, WoxError> {
    java_download::download_java(&app_handle, &vendor, &version).await
}
