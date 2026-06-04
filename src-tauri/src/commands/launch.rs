use crate::models::instance::InstanceConfig;
use crate::services::auth::AuthResult;
use crate::services::launcher;

#[tauri::command]
pub fn launch_game(instance: InstanceConfig, auth: AuthResult, java_path: String) -> Result<u32, String> {
    launcher::launch_game(&instance, &auth, &java_path)
}
