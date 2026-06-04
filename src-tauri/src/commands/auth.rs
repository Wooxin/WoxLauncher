use crate::app_state::AppState;
use crate::error::WoxError;
use crate::services::auth;
use crate::services::auth::{AuthResult, DeviceCodeData};
use crate::services::account_store::{self, StoredAccount};
use chrono::Utc;

fn save_account_from_result(result: &AuthResult, auth_mode: &str, auth_server_url: Option<String>) {
    let account = StoredAccount {
        username: result.username.clone(),
        uuid: result.uuid.clone(),
        access_token: result.access_token.clone(),
        auth_mode: auth_mode.to_string(),
        auth_server_url,
        refresh_token: None,
        last_used_at: Utc::now(),
    };
    if let Err(e) = account_store::save_account(&account) {
        eprintln!("Failed to save account: {}", e);
    }
}

#[tauri::command]
pub async fn ms_device_code(state: tauri::State<'_, AppState>) -> Result<DeviceCodeData, WoxError> {
    auth::ms_device_code(&state.http).await.map_err(|e| WoxError::Network(e))
}

#[tauri::command]
pub async fn ms_poll_token(state: tauri::State<'_, AppState>, device_code: String) -> Result<AuthResult, WoxError> {
    let result = auth::ms_poll_token(&state.http, &device_code).await.map_err(|e| WoxError::Network(e))?;
    save_account_from_result(&result, "msa", None);
    Ok(result)
}

#[tauri::command]
pub fn offline_auth(username: String) -> Result<AuthResult, WoxError> {
    let result = auth::offline_auth(&username);
    save_account_from_result(&result, "offline", None);
    Ok(result)
}

#[tauri::command]
pub async fn authlib_login(
    state: tauri::State<'_, AppState>,
    server_url: String,
    username: String,
    password: String,
) -> Result<AuthResult, WoxError> {
    let result = auth::authlib_login(&state.http, &server_url, &username, &password).await.map_err(|e| WoxError::Network(e))?;
    save_account_from_result(&result, "authlib", Some(server_url.clone()));
    Ok(result)
}
