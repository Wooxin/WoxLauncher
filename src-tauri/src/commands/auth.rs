use crate::app_state::AppState;
use crate::error::WoxError;
use crate::services::auth;
use crate::services::auth::AuthResult;

#[tauri::command]
pub async fn ms_device_code(state: tauri::State<'_, AppState>) -> Result<(String, String, String), WoxError> {
    auth::ms_device_code(&state.http).await.map_err(|e| WoxError::Network(e))
}

#[tauri::command]
pub async fn ms_poll_token(state: tauri::State<'_, AppState>, device_code: String) -> Result<AuthResult, WoxError> {
    auth::ms_poll_token(&state.http, &device_code).await.map_err(|e| WoxError::Network(e))
}

#[tauri::command]
pub fn offline_auth(username: String) -> Result<AuthResult, WoxError> {
    Ok(auth::offline_auth(&username))
}

#[tauri::command]
pub async fn authlib_login(
    state: tauri::State<'_, AppState>,
    server_url: String,
    username: String,
    password: String,
) -> Result<AuthResult, WoxError> {
    auth::authlib_login(&state.http, &server_url, &username, &password).await.map_err(|e| WoxError::Network(e))
}
