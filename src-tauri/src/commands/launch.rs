use crate::error::WoxError;
use crate::models::instance::InstanceConfig;
use crate::services::account_store;
use crate::services::downloader;
use crate::services::launcher;
use crate::services::preflight;
use crate::utils::logger;
use crate::utils::paths;

async fn ensure_logging_config(
    app_handle: &tauri::AppHandle,
    instance: &InstanceConfig,
) -> Result<(), WoxError> {
    let version_json_path = paths::versions_dir()
        .join(&instance.game_version)
        .join(format!("{}.json", instance.game_version));
    if !version_json_path.exists() {
        return Ok(());
    }

    let version_json: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(&version_json_path)?)?;
    let Some(log_file) = version_json["logging"]["client"]["file"].as_object() else {
        return Ok(());
    };
    let Some(url) = log_file["url"].as_str() else {
        return Ok(());
    };

    let log_id = log_file["id"].as_str().unwrap_or("log4j2.xml");
    let log_configs_dir = paths::version_game_dir(&instance.game_version).join("log_configs");
    let log_path = log_configs_dir.join(log_id);
    if log_path.exists() {
        return Ok(());
    }

    let sha1 = log_file["sha1"].as_str();
    downloader::download_file_with_events(
        app_handle,
        url,
        log_path,
        sha1,
        format!("Log config {}", log_id),
    )
    .await
}

#[tauri::command]
pub async fn launch_game(
    app_handle: tauri::AppHandle,
    instance: InstanceConfig,
    _account_uuid: String,
    java_path: String,
) -> Result<u32, WoxError> {
    logger::info(format!(
        "launch requested: {} ({})",
        instance.name, instance.game_version
    ));
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

    // 4. Ensure all game and loader files are downloaded
    let installed_instance =
        crate::services::game_installer::install_instance(&app_handle, &instance, Some(&java_path))
            .await?;
    ensure_logging_config(&app_handle, &installed_instance).await?;

    // 5. Spawn game
    let pid = launcher::launch_game(&installed_instance, &auth_result, &java_path)?;
    logger::info(format!(
        "launch spawned: {} pid={}",
        installed_instance.name, pid
    ));

    // 6. Update last_played_at
    let mut updated = installed_instance.clone();
    updated.downloaded = true;
    updated.last_played_at = Some(chrono::Utc::now());
    crate::services::instance_manager::update_instance(updated)?;

    Ok(pid)
}
