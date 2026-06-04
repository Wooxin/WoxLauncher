use reqwest::Client;
use serde::{Deserialize, Serialize};

const MS_CLIENT_ID: &str = "00000000402b5328";
const MS_DEVICE_CODE_URL: &str = "https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode";
const MS_TOKEN_URL: &str = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";
const MS_XBL_AUTH_URL: &str = "https://user.auth.xboxlive.com/user/authenticate";
const MS_XSTS_AUTH_URL: &str = "https://xsts.auth.xboxlive.com/xsts/authorize";
const MC_LOGIN_URL: &str = "https://api.minecraftservices.com/authentication/login_with_xbox";
const MC_PROFILE_URL: &str = "https://api.minecraftservices.com/minecraft/profile";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthResult {
    pub username: String,
    pub uuid: String,
    pub access_token: String,
    pub token_type: String,
}

#[derive(Deserialize)]
struct DeviceCodeResponse {
    device_code: String,
    user_code: String,
    verification_uri: String,
    #[allow(dead_code)]
    message: String,
    #[allow(dead_code)]
    interval: u64,
    #[allow(dead_code)]
    expires_in: u64,
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    #[allow(dead_code)]
    token_type: String,
}

#[derive(Deserialize)]
struct XblAuthResponse {
    #[serde(rename = "Token")]
    token: String,
}

#[derive(Deserialize)]
struct XstsResponse {
    #[serde(rename = "Token")]
    token: String,
    #[serde(rename = "DisplayClaims")]
    display_claims: DisplayClaims,
}

#[derive(Deserialize)]
struct DisplayClaims {
    xui: Vec<XuiClaim>,
}

#[derive(Deserialize)]
struct XuiClaim {
    uhs: String,
}

#[derive(Serialize)]
struct McLoginRequest {
    #[serde(rename = "identityToken")]
    identity_token: String,
}

#[derive(Deserialize)]
struct McProfileResponse {
    name: String,
    id: String,
}

/// Step 1: Get device code for user to authorize
pub async fn ms_device_code() -> Result<(String, String, String), String> {
    let client = Client::new();
    let resp = client
        .post(MS_DEVICE_CODE_URL)
        .form(&[
            ("client_id", MS_CLIENT_ID),
            ("scope", "XboxLive.signoff offline_access"),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json::<DeviceCodeResponse>()
        .await
        .map_err(|e| e.to_string())?;

    Ok((resp.device_code, resp.user_code, resp.verification_uri))
}

/// Step 2: Poll for token (call repeatedly until success or timeout)
pub async fn ms_poll_token(device_code: &str) -> Result<AuthResult, String> {
    let client = Client::new();

    let token = client
        .post(MS_TOKEN_URL)
        .form(&[
            ("client_id", MS_CLIENT_ID),
            ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
            ("device_code", device_code),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json::<TokenResponse>()
        .await
        .map_err(|e| e.to_string())?;

    // Xbox Live auth
    let xbl = client
        .post(MS_XBL_AUTH_URL)
        .json(&serde_json::json!({
            "Properties": {
                "AuthMethod": "RPS",
                "SiteName": "user.auth.xboxlive.com",
                "RpsTicket": format!("d={}", token.access_token),
            },
            "RelyingParty": "http://auth.xboxlive.com",
            "TokenType": "JWT",
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json::<XblAuthResponse>()
        .await
        .map_err(|e| e.to_string())?;

    // XSTS auth
    let xsts = client
        .post(MS_XSTS_AUTH_URL)
        .json(&serde_json::json!({
            "Properties": {
                "SandboxId": "RETAIL",
                "UserTokens": [xbl.token],
            },
            "RelyingParty": "rp://api.minecraftservices.com/",
            "TokenType": "JWT",
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json::<XstsResponse>()
        .await
        .map_err(|e| e.to_string())?;

    let uhs = &xsts.display_claims.xui[0].uhs;

    // Minecraft login
    let mc = client
        .post(MC_LOGIN_URL)
        .json(&McLoginRequest {
            identity_token: format!("XBL3.0 x={};{}", uhs, xsts.token),
        })
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json::<TokenResponse>()
        .await
        .map_err(|e| e.to_string())?;

    // Minecraft profile
    let profile = client
        .get(MC_PROFILE_URL)
        .bearer_auth(&mc.access_token)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json::<McProfileResponse>()
        .await
        .map_err(|e| e.to_string())?;

    Ok(AuthResult {
        username: profile.name,
        uuid: profile.id,
        access_token: mc.access_token,
        token_type: "msa".to_string(),
    })
}

/// Offline mode — generate UUID from username
pub fn offline_auth(username: &str) -> AuthResult {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(format!("OfflinePlayer:{}", username));
    let hash = hasher.finalize();

    let mut uuid_bytes = [0u8; 16];
    uuid_bytes.copy_from_slice(&hash[..16]);
    uuid_bytes[6] = (uuid_bytes[6] & 0x0f) | 0x30;
    uuid_bytes[8] = (uuid_bytes[8] & 0x3f) | 0x80;
    let uuid = uuid::Uuid::from_bytes(uuid_bytes).to_string();

    AuthResult {
        username: username.to_string(),
        uuid,
        access_token: "0".to_string(),
        token_type: "offline".to_string(),
    }
}

/// AuthLib-Injector login
pub async fn authlib_login(
    server_url: &str,
    username: &str,
    password: &str,
) -> Result<AuthResult, String> {
    let client = Client::new();
    let resp = client
        .post(format!("{}/authserver/authenticate", server_url))
        .json(&serde_json::json!({
            "agent": { "name": "Minecraft", "version": 1 },
            "username": username,
            "password": password,
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if resp.status().is_client_error() {
        return Err("Invalid credentials".to_string());
    }

    let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let profile = &body["selectedProfile"];

    Ok(AuthResult {
        username: profile["name"].as_str().unwrap_or(username).to_string(),
        uuid: profile["id"].as_str().unwrap_or("").to_string(),
        access_token: body["accessToken"].as_str().unwrap_or("").to_string(),
        token_type: "authlib".to_string(),
    })
}
