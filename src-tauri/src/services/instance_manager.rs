use std::path::PathBuf;
use crate::models::instance::InstanceConfig;

fn get_wox_dir() -> PathBuf {
    dirs_next().unwrap_or_else(|| PathBuf::from("."))
}

fn dirs_next() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        std::env::var("APPDATA").ok().map(PathBuf::from)
    }
    #[cfg(target_os = "macos")]
    {
        std::env::var("HOME").ok().map(|h| PathBuf::from(h).join("Library/Application Support"))
    }
    #[cfg(target_os = "linux")]
    {
        std::env::var("XDG_DATA_HOME")
            .ok()
            .map(PathBuf::from)
            .or_else(|| std::env::var("HOME").ok().map(|h| PathBuf::from(h).join(".local/share")))
    }
}

fn instances_dir() -> PathBuf {
    get_wox_dir().join(".woxlauncher").join("instances")
}

pub fn list_instances() -> Result<Vec<InstanceConfig>, String> {
    let dir = instances_dir();
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut instances = Vec::new();
    let entries = std::fs::read_dir(&dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let config_path = entry.path().join("config.json");
        if config_path.exists() {
            let json = std::fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
            let config: InstanceConfig = serde_json::from_str(&json).map_err(|e| e.to_string())?;
            instances.push(config);
        }
    }
    Ok(instances)
}

pub fn create_instance(mut config: InstanceConfig) -> Result<InstanceConfig, String> {
    config.id = uuid::Uuid::new_v4().to_string();
    let dir = instances_dir().join(&config.id);
    std::fs::create_dir_all(dir.join("mods")).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(dir.join("config")).map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    std::fs::write(dir.join("config.json"), json).map_err(|e| e.to_string())?;
    Ok(config)
}

pub fn delete_instance(id: &str) -> Result<(), String> {
    let dir = instances_dir().join(id);
    if dir.exists() {
        std::fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn get_instance(id: &str) -> Result<InstanceConfig, String> {
    let config_path = instances_dir().join(id).join("config.json");
    let json = std::fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&json).map_err(|e| e.to_string())
}

pub fn update_instance(config: InstanceConfig) -> Result<(), String> {
    let dir = instances_dir().join(&config.id);
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    std::fs::write(dir.join("config.json"), json).map_err(|e| e.to_string())
}
