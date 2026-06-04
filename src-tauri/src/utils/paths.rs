use std::path::PathBuf;

pub fn wox_data_dir() -> PathBuf {
    // Portable: data directory next to the executable
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(PathBuf::from))
        .unwrap_or_else(|| PathBuf::from("."));
    exe_dir.join("wox_data")
}

pub fn instances_dir() -> PathBuf { wox_data_dir().join("instances") }
pub fn shared_dir() -> PathBuf { wox_data_dir().join("shared") }
pub fn libraries_dir() -> PathBuf { shared_dir().join("libraries") }
pub fn versions_dir() -> PathBuf { shared_dir().join("versions") }
pub fn assets_dir() -> PathBuf { shared_dir().join("assets") }
pub fn java_dir() -> PathBuf { wox_data_dir().join("java") }
pub fn instance_dir(id: &str) -> PathBuf { instances_dir().join(id) }
