use crate::services::auth;
use crate::services::auth::AuthResult;

#[tauri::command]
pub async fn ms_device_code() -> Result<(String, String, String), String> {
    auth::ms_device_code().await
}

#[tauri::command]
pub async fn ms_poll_token(device_code: String) -> Result<AuthResult, String> {
    auth::ms_poll_token(&device_code).await
}

#[tauri::command]
pub fn offline_auth(username: String) -> Result<AuthResult, String> {
    Ok(auth::offline_auth(&username))
}

#[tauri::command]
pub async fn authlib_login(
    server_url: String,
    username: String,
    password: String,
) -> Result<AuthResult, String> {
    auth::authlib_login(&server_url, &username, &password).await
}
