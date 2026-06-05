use crate::error::WoxError;
use crate::models::instance::InstanceConfig;
use crate::services::game_installer;

#[tauri::command]
pub async fn install_game_version(
    app_handle: tauri::AppHandle,
    version: String,
) -> Result<(), WoxError> {
    game_installer::install_version(&app_handle, &version).await
}

#[tauri::command]
pub async fn install_instance(
    app_handle: tauri::AppHandle,
    instance: InstanceConfig,
    java_path: Option<String>,
) -> Result<InstanceConfig, WoxError> {
    game_installer::install_instance(&app_handle, &instance, java_path.as_deref()).await
}
