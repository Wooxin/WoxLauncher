use reqwest::Client;
use serde::{Deserialize, Serialize};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

const MS_CLIENT_ID: &str = "00000000402b5328";
const MS_AUTH_URL: &str = "https://login.live.com/oauth20_authorize.srf";
const MS_TOKEN_URL: &str = "https://login.live.com/oauth20_token.srf";
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
struct TokenResponse {
    access_token: String,
    #[allow(dead_code)]
    token_type: String,
    refresh_token: Option<String>,
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

/// Generate PKCE code verifier and challenge
fn generate_pkce() -> (String, String) {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let bytes: Vec<u8> = (0..64).map(|_| rng.gen()).collect();
    let verifier = base64_url(&bytes);

    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    let hash = hasher.finalize();
    let challenge = base64_url(&hash);
    (verifier, challenge)
}

fn base64_url(bytes: &[u8]) -> String {
    use base64::Engine;
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(bytes)
}

/// Microsoft OAuth PKCE login — starts local server, returns auth URL. Caller opens browser, then calls complete.
pub async fn ms_login_start() -> Result<(TcpListener, String, String, String), String> {
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| format!("Failed to start local server: {}", e))?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let redirect_uri = format!("http://127.0.0.1:{}", port);

    let (verifier, challenge) = generate_pkce();

    let auth_url = format!(
        "{}?client_id={}&response_type=code&redirect_uri={}&scope={}&code_challenge={}&code_challenge_method=S256",
        MS_AUTH_URL,
        MS_CLIENT_ID,
        urlencoding(&redirect_uri),
        urlencoding("XboxLive.signin offline_access"),
        challenge
    );

    Ok((listener, auth_url, verifier, redirect_uri))
}

/// Complete the OAuth PKCE flow after browser callback
pub async fn ms_login_complete(
    client: &Client,
    listener: TcpListener,
    verifier: &str,
    redirect_uri: &str,
) -> Result<AuthResult, String> {
    let code = wait_for_callback(listener).await?;
    let token = exchange_code(client, &code, verifier, redirect_uri).await?;
    do_minecraft_auth(client, &token.access_token).await
}

fn urlencoding(s: &str) -> String {
    let mut result = String::new();
    for b in s.as_bytes() {
        match *b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                result.push(*b as char)
            }
            b' ' => result.push_str("%20"),
            b':' => result.push_str("%3A"),
            b'/' => result.push_str("%2F"),
            _ => result.push_str(&format!("%{:02X}", b)),
        }
    }
    result
}

/// Wait for browser redirect on local server
async fn wait_for_callback(listener: TcpListener) -> Result<String, String> {
    let (mut stream, _) =
        tokio::time::timeout(std::time::Duration::from_secs(300), listener.accept())
            .await
            .map_err(|_| "Login timed out. Please try again.".to_string())?
            .map_err(|e| format!("Failed to accept connection: {}", e))?;

    let mut buf = [0u8; 4096];
    let n = stream.read(&mut buf).await.map_err(|e| e.to_string())?;
    let request = String::from_utf8_lossy(&buf[..n]);

    // Parse the GET /?code=xxx from HTTP request
    let code = request
        .lines()
        .next()
        .and_then(|line| {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 2 {
                Some(parts[1].to_string())
            } else {
                None
            }
        })
        .and_then(|path| {
            path.split("?code=")
                .nth(1)
                .map(|c| c.split('&').next().unwrap_or(c).to_string())
        })
        .ok_or("No authorization code received. Please try again.".to_string())?;

    // Send success response to browser
    let response = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<html><body><h1>Login successful!</h1><p>You can close this window now.</p></body></html>";
    let _ = stream.write_all(response.as_bytes()).await;
    let _ = stream.shutdown().await;

    Ok(code)
}

/// Exchange authorization code for access token
async fn exchange_code(
    client: &Client,
    code: &str,
    verifier: &str,
    redirect_uri: &str,
) -> Result<TokenResponse, String> {
    let resp = client
        .post(MS_TOKEN_URL)
        .form(&[
            ("client_id", MS_CLIENT_ID),
            ("code", code),
            ("grant_type", "authorization_code"),
            ("code_verifier", verifier),
            ("redirect_uri", redirect_uri),
            ("scope", "XboxLive.signin offline_access"),
        ])
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Token exchange failed ({}): {}", status, body));
    }

    resp.json()
        .await
        .map_err(|e| format!("Invalid response: {}", e))
}

/// Xbox Live → XSTS → Minecraft authentication chain
async fn do_minecraft_auth(client: &Client, ms_token: &str) -> Result<AuthResult, String> {
    // Xbox Live auth
    let xbl = client
        .post(MS_XBL_AUTH_URL)
        .json(&serde_json::json!({
            "Properties": {
                "AuthMethod": "RPS",
                "SiteName": "user.auth.xboxlive.com",
                "RpsTicket": format!("d={}", ms_token),
            },
            "RelyingParty": "http://auth.xboxlive.com",
            "TokenType": "JWT",
        }))
        .send()
        .await
        .map_err(|e| format!("XBL error: {}", e))?
        .json::<XblAuthResponse>()
        .await
        .map_err(|e| format!("XBL error: {}", e))?;

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
        .map_err(|e| format!("XSTS error: {}", e))?
        .json::<XstsResponse>()
        .await
        .map_err(|e| format!("XSTS error: {}", e))?;

    let uhs = &xsts.display_claims.xui[0].uhs;

    // Minecraft login
    let mc = client
        .post(MC_LOGIN_URL)
        .json(&McLoginRequest {
            identity_token: format!("XBL3.0 x={};{}", uhs, xsts.token),
        })
        .send()
        .await
        .map_err(|e| format!("Minecraft auth error: {}", e))?
        .json::<TokenResponse>()
        .await
        .map_err(|e| format!("Minecraft auth error: {}", e))?;

    // Minecraft profile
    let profile = client
        .get(MC_PROFILE_URL)
        .bearer_auth(&mc.access_token)
        .send()
        .await
        .map_err(|e| format!("Profile error: {}", e))?
        .json::<McProfileResponse>()
        .await
        .map_err(|e| format!("Profile error: {}", e))?;

    Ok(AuthResult {
        username: profile.name,
        uuid: profile.id,
        access_token: mc.access_token,
        token_type: "msa".to_string(),
    })
}

/// Offline mode -- generate UUID from username
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
    client: &Client,
    server_url: &str,
    username: &str,
    password: &str,
) -> Result<AuthResult, String> {
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
