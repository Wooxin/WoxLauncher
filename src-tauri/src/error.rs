use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", content = "message")]
pub enum WoxError {
    NotFound(String),
    Network(String),
    Filesystem(String),
    Auth(String),
    Launch(String),
    Validation(String),
    Internal(String),
}

impl std::fmt::Display for WoxError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            WoxError::NotFound(msg) => write!(f, "Not found: {}", msg),
            WoxError::Network(msg) => write!(f, "Network: {}", msg),
            WoxError::Filesystem(msg) => write!(f, "Filesystem: {}", msg),
            WoxError::Auth(msg) => write!(f, "Auth: {}", msg),
            WoxError::Launch(msg) => write!(f, "Launch: {}", msg),
            WoxError::Validation(msg) => write!(f, "Validation: {}", msg),
            WoxError::Internal(msg) => write!(f, "Internal: {}", msg),
        }
    }
}

impl std::error::Error for WoxError {}

impl From<std::io::Error> for WoxError {
    fn from(e: std::io::Error) -> Self {
        WoxError::Filesystem(e.to_string())
    }
}

impl From<reqwest::Error> for WoxError {
    fn from(e: reqwest::Error) -> Self {
        WoxError::Network(e.to_string())
    }
}

impl From<serde_json::Error> for WoxError {
    fn from(e: serde_json::Error) -> Self {
        WoxError::Internal(e.to_string())
    }
}
