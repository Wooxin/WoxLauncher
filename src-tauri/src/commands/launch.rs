use crate::models::instance::InstanceConfig;
use crate::services::auth::AuthResult;
use crate::services::launcher;
use crate::error::WoxError;

#[tauri::command]
pub fn launch_game(instance: InstanceConfig, auth: AuthResult, java_path: String) -> Result<u32, WoxError> {
    launcher::launch_game(&instance, &auth, &java_path)
}
