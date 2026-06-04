use crate::app_state::AppState;
use crate::error::WoxError;
use crate::services::downloader;

#[tauri::command]
pub async fn start_download(
    _state: tauri::State<'_, AppState>,
    app_handle: tauri::AppHandle,
    url: String,
    dest: String,
    sha1: Option<String>,
    label: String,
) -> Result<(), WoxError> {
    downloader::download_file_with_events(
        &app_handle,
        &url,
        std::path::PathBuf::from(dest),
        sha1.as_deref(),
        label,
    )
    .await
}
