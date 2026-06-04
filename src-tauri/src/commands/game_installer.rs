use crate::error::WoxError;
use crate::services::game_installer;

#[tauri::command]
pub async fn install_game_version(
    app_handle: tauri::AppHandle,
    version: String,
) -> Result<(), WoxError> {
    game_installer::install_version(&app_handle, &version).await
}
