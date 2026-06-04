use std::path::PathBuf;

fn wox_data_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        std::env::var("APPDATA")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("."))
            .join(".woxlauncher")
    }
    #[cfg(target_os = "macos")]
    {
        std::env::var("HOME")
            .map(|h| PathBuf::from(h).join("Library/Application Support/.woxlauncher"))
            .unwrap_or_else(|_| PathBuf::from("."))
    }
    #[cfg(target_os = "linux")]
    {
        std::env::var("XDG_DATA_HOME")
            .map(|p| PathBuf::from(p).join("woxlauncher"))
            .or_else(|_| {
                std::env::var("HOME")
                    .map(|h| PathBuf::from(h).join(".local/share/woxlauncher"))
            })
            .unwrap_or_else(|_| PathBuf::from("."))
    }
}

pub fn instances_dir() -> PathBuf {
    wox_data_dir().join("instances")
}
pub fn shared_dir() -> PathBuf {
    wox_data_dir().join("shared")
}
pub fn libraries_dir() -> PathBuf {
    shared_dir().join("libraries")
}
pub fn versions_dir() -> PathBuf {
    shared_dir().join("versions")
}
pub fn assets_dir() -> PathBuf {
    shared_dir().join("assets")
}
pub fn java_dir() -> PathBuf {
    wox_data_dir().join("java")
}
pub fn accounts_file() -> PathBuf {
    wox_data_dir().join("accounts.json")
}
pub fn instance_dir(id: &str) -> PathBuf {
    instances_dir().join(id)
}
