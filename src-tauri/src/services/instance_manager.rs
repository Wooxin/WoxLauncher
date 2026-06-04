use crate::models::instance::{InstanceConfig, LoaderType};
use crate::error::WoxError;
use crate::database;

pub fn list_instances() -> Result<Vec<InstanceConfig>, WoxError> {
    let db = database::get_db().lock().map_err(|e| WoxError::Internal(e.to_string()))?;
    let mut stmt = db.prepare("SELECT id, name, game_version, loader_type, loader_version, java_version, jvm_args, game_args, resolution_width, resolution_height, created_at, last_played_at, downloaded FROM instances ORDER BY created_at DESC")?;
    let instances = stmt.query_map([], |row| {
        Ok(InstanceConfig {
            id: row.get(0)?,
            name: row.get(1)?,
            game_version: row.get(2)?,
            loader_type: serde_json::from_str(&format!("\"{}\"", row.get::<_, String>(3)?)).unwrap_or(LoaderType::Vanilla),
            loader_version: row.get(4)?,
            java_version: row.get(5)?,
            jvm_args: serde_json::from_str(&row.get::<_, String>(6)?).unwrap_or_default(),
            game_args: serde_json::from_str(&row.get::<_, String>(7)?).unwrap_or_default(),
            resolution_width: row.get(8)?,
            resolution_height: row.get(9)?,
            created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(10)?).map(|d| d.with_timezone(&chrono::Utc)).unwrap_or_else(|_| chrono::Utc::now()),
            last_played_at: row.get::<_, Option<String>>(11)?.and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok().map(|d| d.with_timezone(&chrono::Utc))),
            downloaded: row.get::<_, i32>(12)? != 0,
        })
    })?.filter_map(|r| r.ok()).collect();
    Ok(instances)
}

pub fn create_instance(mut config: InstanceConfig) -> Result<InstanceConfig, WoxError> {
    config.id = uuid::Uuid::new_v4().to_string();
    let db = database::get_db().lock().map_err(|e| WoxError::Internal(e.to_string()))?;
    let jvm_args = serde_json::to_string(&config.jvm_args)?;
    let game_args = serde_json::to_string(&config.game_args)?;
    let loader = serde_json::to_string(&config.loader_type)?.trim_matches('"').to_string();
    let downloaded_int: i32 = if config.downloaded { 1 } else { 0 };
    db.execute(
        "INSERT INTO instances (id, name, game_version, loader_type, loader_version, java_version, jvm_args, game_args, resolution_width, resolution_height, created_at, downloaded) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        rusqlite::params![config.id, config.name, config.game_version, loader, config.loader_version, config.java_version, jvm_args, game_args, config.resolution_width, config.resolution_height, config.created_at.to_rfc3339(), downloaded_int],
    )?;
    Ok(config)
}

pub fn delete_instance(id: &str) -> Result<(), WoxError> {
    let db = database::get_db().lock().map_err(|e| WoxError::Internal(e.to_string()))?;
    db.execute("DELETE FROM instances WHERE id = ?1", rusqlite::params![id])?;
    Ok(())
}

pub fn get_instance(id: &str) -> Result<InstanceConfig, WoxError> {
    let db = database::get_db().lock().map_err(|e| WoxError::Internal(e.to_string()))?;
    let mut stmt = db.prepare("SELECT id, name, game_version, loader_type, loader_version, java_version, jvm_args, game_args, resolution_width, resolution_height, created_at, last_played_at, downloaded FROM instances WHERE id = ?1")?;
    let instance = stmt.query_row(rusqlite::params![id], |row| {
        Ok(InstanceConfig {
            id: row.get(0)?,
            name: row.get(1)?,
            game_version: row.get(2)?,
            loader_type: serde_json::from_str(&format!("\"{}\"", row.get::<_, String>(3)?)).unwrap_or(LoaderType::Vanilla),
            loader_version: row.get(4)?,
            java_version: row.get(5)?,
            jvm_args: serde_json::from_str(&row.get::<_, String>(6)?).unwrap_or_default(),
            game_args: serde_json::from_str(&row.get::<_, String>(7)?).unwrap_or_default(),
            resolution_width: row.get(8)?,
            resolution_height: row.get(9)?,
            created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(10)?).map(|d| d.with_timezone(&chrono::Utc)).unwrap_or_else(|_| chrono::Utc::now()),
            last_played_at: row.get::<_, Option<String>>(11)?.and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok().map(|d| d.with_timezone(&chrono::Utc))),
            downloaded: row.get::<_, i32>(12)? != 0,
        })
    }).map_err(|e| WoxError::NotFound(format!("Instance {} not found: {}", id, e)))?;
    Ok(instance)
}

pub fn update_instance(config: InstanceConfig) -> Result<(), WoxError> {
    let db = database::get_db().lock().map_err(|e| WoxError::Internal(e.to_string()))?;
    let jvm_args = serde_json::to_string(&config.jvm_args)?;
    let game_args = serde_json::to_string(&config.game_args)?;
    let loader = serde_json::to_string(&config.loader_type)?.trim_matches('"').to_string();
    let downloaded_int: i32 = if config.downloaded { 1 } else { 0 };
    db.execute(
        "UPDATE instances SET name=?2, game_version=?3, loader_type=?4, loader_version=?5, java_version=?6, jvm_args=?7, game_args=?8, resolution_width=?9, resolution_height=?10, last_played_at=?11, downloaded=?12 WHERE id=?1",
        rusqlite::params![config.id, config.name, config.game_version, loader, config.loader_version, config.java_version, jvm_args, game_args, config.resolution_width, config.resolution_height, config.last_played_at.map(|d| d.to_rfc3339()), downloaded_int],
    )?;
    Ok(())
}
