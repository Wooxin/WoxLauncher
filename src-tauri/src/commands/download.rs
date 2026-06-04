use crate::app_state::AppState;
use crate::error::WoxError;
use crate::services::downloader;
use crate::utils::paths;

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
    let path = if path.is_relative() { paths::wox_data_dir().parent().unwrap().join(&dest) } else { path };
    downloader::download_file_with_events(
        &app_handle,
        &url,
        path,
        sha1.as_deref(),
        label,
    )
    .await
}

#[tauri::command]
pub fn get_wox_data_dir() -> String {
    paths::wox_data_dir().to_string_lossy().to_string()
}
