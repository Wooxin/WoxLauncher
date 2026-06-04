use crate::app_state::AppState;
use crate::error::WoxError;
use crate::services::java_download;

#[tauri::command]
pub async fn download_java(
    _state: tauri::State<'_, AppState>,
    app_handle: tauri::AppHandle,
    vendor: String,
    version: String,
    install_path: Option<String>,
) -> Result<String, WoxError> {
    let path = install_path.filter(|p| !p.is_empty());
    java_download::download_java(&app_handle, &vendor, &version, path.as_deref()).await
}
