use crate::error::WoxError;
use crate::models::version::VersionManifest;
use crate::services::downloader;
use crate::utils::paths;
use crate::utils::requests;
use tauri::AppHandle;

/// Ensure version JSON exists on disk. Downloads it if missing.
pub async fn ensure_version_json(
    app_handle: &AppHandle,
    game_version: &str,
) -> Result<(), WoxError> {
    let version_dir = paths::versions_dir().join(game_version);
    let json_path = version_dir.join(format!("{}.json", game_version));

    if json_path.exists() {
        if std::fs::read_to_string(&json_path)
            .ok()
            .and_then(|json| serde_json::from_str::<serde_json::Value>(&json).ok())
            .is_some()
        {
            return Ok(());
        }
        let _ = std::fs::remove_file(&json_path);
    }

    // Fetch version manifest to find the version-specific URL
    let client = requests::http_client();
    let manifest_url = "https://launchermeta.mojang.com/mc/game/version_manifest.json";
    #[derive(serde::Deserialize)]
    struct ManifestList {
        versions: Vec<VersionManifest>,
    }
    let list: ManifestList = client.get(manifest_url).send().await?.json().await?;

    let version_manifest = list
        .versions
        .iter()
        .find(|v| v.id == game_version)
        .ok_or_else(|| {
            WoxError::NotFound(format!("Version {} not found in manifest", game_version))
        })?;

    std::fs::create_dir_all(&version_dir)?;

    downloader::download_file_with_events(
        app_handle,
        &version_manifest.url,
        json_path,
        None,
        format!("Minecraft version {}", game_version),
    )
    .await
}
