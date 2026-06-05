use std::path::PathBuf;

fn launcher_dir() -> PathBuf {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(PathBuf::from))
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));

    let exe_text = exe_dir.to_string_lossy().replace('\\', "/");
    if exe_text.ends_with("/src-tauri/target/debug")
        || exe_text.ends_with("/src-tauri/target/release")
    {
        if let Ok(cwd) = std::env::current_dir() {
            if cwd.file_name().and_then(|name| name.to_str()) == Some("src-tauri") {
                if let Some(parent) = cwd.parent() {
                    return parent.to_path_buf();
                }
            }
            return cwd;
        }
    }

    exe_dir
}

pub fn wox_data_dir() -> PathBuf {
    let base = launcher_dir();
    let dir = base.join("woxlauncher");
    if !dir.exists() {
        let exe_dir = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(PathBuf::from));
        let mut old_dirs = vec![base.join("wox_data")];
        if let Some(exe_dir) = exe_dir {
            let old = exe_dir.join("wox_data");
            if old != old_dirs[0] {
                old_dirs.push(old);
            }
        }
        for old_dir in old_dirs {
            if old_dir.exists() && std::fs::rename(&old_dir, &dir).is_ok() {
                break;
            }
        }
    }
    dir
}

pub fn shared_dir() -> PathBuf {
    wox_data_dir().join(".minecraft")
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

pub fn launcher_db_dir() -> PathBuf {
    wox_data_dir().join("woxlauncherdb")
}

pub fn launcher_db_file() -> PathBuf {
    launcher_db_dir().join("woxlauncher.sqlite")
}

pub fn cache_dir() -> PathBuf {
    wox_data_dir().join("cache")
}

pub fn download_cache_dir() -> PathBuf {
    cache_dir().join("downloads")
}

pub fn logs_dir() -> PathBuf {
    wox_data_dir().join("logs")
}

pub fn version_game_dir(game_version: &str) -> PathBuf {
    versions_dir().join(game_version)
}

pub fn migrate_legacy_instance_dir(id: &str, game_version: &str) {
    let legacy = wox_data_dir().join(id);
    if !legacy.exists() {
        return;
    }

    let target = version_game_dir(game_version);
    let _ = std::fs::create_dir_all(&target);
    for name in [
        "mods",
        "config",
        "resourcepacks",
        "shaderpacks",
        "saves",
        "screenshots",
        "launcher_logs",
        "log_configs",
        "options.txt",
    ] {
        let from = legacy.join(name);
        let to = target.join(name);
        if from.exists() && !to.exists() {
            let _ = std::fs::rename(&from, &to);
        }
    }

    let _ = std::fs::remove_dir(&legacy);
}

pub fn clear_download_cache() {
    let dir = download_cache_dir();
    if dir.exists() {
        let _ = std::fs::remove_dir_all(&dir);
    }
}
