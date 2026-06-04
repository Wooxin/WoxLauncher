use crate::models::instance::InstanceConfig;
use crate::error::WoxError;
use crate::utils::paths;

pub fn list_instances() -> Result<Vec<InstanceConfig>, WoxError> {
    let dir = paths::instances_dir();
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut instances = Vec::new();
    let entries = std::fs::read_dir(&dir)?;
    for entry in entries {
        let entry = entry?;
        let config_path = entry.path().join("config.json");
        if config_path.exists() {
            let json = std::fs::read_to_string(&config_path)?;
            let config: InstanceConfig = serde_json::from_str(&json)?;
            instances.push(config);
        }
    }
    Ok(instances)
}

pub fn create_instance(mut config: InstanceConfig) -> Result<InstanceConfig, WoxError> {
    config.id = uuid::Uuid::new_v4().to_string();
    let dir = paths::instance_dir(&config.id);
    std::fs::create_dir_all(dir.join("mods"))?;
    std::fs::create_dir_all(dir.join("config"))?;
    let json = serde_json::to_string_pretty(&config)?;
    std::fs::write(dir.join("config.json"), json)?;
    Ok(config)
}

pub fn delete_instance(id: &str) -> Result<(), WoxError> {
    let dir = paths::instance_dir(id);
    if dir.exists() {
        std::fs::remove_dir_all(&dir)?;
    }
    Ok(())
}

pub fn get_instance(id: &str) -> Result<InstanceConfig, WoxError> {
    let config_path = paths::instance_dir(id).join("config.json");
    if !config_path.exists() {
        return Err(WoxError::NotFound(format!("Instance {} not found", id)));
    }
    let json = std::fs::read_to_string(&config_path)?;
    Ok(serde_json::from_str(&json)?)
}

pub fn update_instance(config: InstanceConfig) -> Result<(), WoxError> {
    let dir = paths::instance_dir(&config.id);
    let json = serde_json::to_string_pretty(&config)?;
    std::fs::write(dir.join("config.json"), json)?;
    Ok(())
}
