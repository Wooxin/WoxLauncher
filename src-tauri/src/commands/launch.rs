use crate::error::WoxError;
use crate::models::instance::InstanceConfig;
use crate::services::account_store;
use crate::services::launcher;
use crate::services::preflight;
#[tauri::command]
pub async fn launch_game(
    app_handle: tauri::AppHandle,
    instance: InstanceConfig,
    _account_uuid: String,
    java_path: String,
) -> Result<u32, WoxError> {
    // 1. Load account from store
    let account = account_store::get_active_account()?
        .ok_or_else(|| WoxError::Auth("No account selected".into()))?;

    // 2. Pre-flight: ensure version JSON exists
    preflight::ensure_version_json(&app_handle, &instance.game_version).await?;

    // 3. Build auth result for launcher
    let auth_result = crate::services::auth::AuthResult {
        username: account.username,
        uuid: account.uuid,
        access_token: account.access_token,
        token_type: account.auth_mode,
    };

    // 4. Ensure all game files are downloaded
    crate::services::game_installer::install_version(&app_handle, &instance.game_version).await?;

    // 5. Spawn game
    let pid = launcher::launch_game(&instance, &auth_result, &java_path)?;

    // 6. Update last_played_at
    let mut updated = instance.clone();
    updated.last_played_at = Some(chrono::Utc::now());
    crate::services::instance_manager::update_instance(updated)?;

    Ok(pid)
}
