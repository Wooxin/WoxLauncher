use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MinecraftVersion {
    pub id: String,
    #[serde(rename = "type")]
    pub version_type: String,
    pub release_time: String,
}

#[tauri::command]
pub async fn fetch_version_manifest() -> Result<Vec<MinecraftVersion>, String> {
    let client = reqwest::Client::new();
    let resp = client
        .get("https://launchermeta.mojang.com/mc/game/version_manifest.json")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    #[derive(Deserialize)]
    struct Manifest {
        versions: Vec<MinecraftVersion>,
    }

    let manifest: Manifest = resp.json().await.map_err(|e| e.to_string())?;
    Ok(manifest.versions)
}
