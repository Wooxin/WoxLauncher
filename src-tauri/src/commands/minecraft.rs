use crate::app_state::AppState;
use crate::error::WoxError;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MinecraftVersion {
    pub id: String,
    #[serde(alias = "type")]
    pub version_type: String,
    pub release_time: String,
}

#[tauri::command]
pub async fn fetch_version_manifest(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<MinecraftVersion>, WoxError> {
    let resp = state
        .http
        .get("https://launchermeta.mojang.com/mc/game/version_manifest.json")
        .send()
        .await
        .map_err(|e| WoxError::Network(e.to_string()))?;

    #[derive(Deserialize)]
    struct Manifest {
        versions: Vec<MinecraftVersion>,
    }

    let manifest: Manifest = resp
        .json()
        .await
        .map_err(|e| WoxError::Internal(e.to_string()))?;
    Ok(manifest.versions)
}
