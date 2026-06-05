use crate::utils::paths;
use chrono::Utc;
use std::fs::OpenOptions;
use std::io::Write;

pub fn log(level: &str, message: impl AsRef<str>) {
    let dir = paths::logs_dir();
    if std::fs::create_dir_all(&dir).is_err() {
        return;
    }

    let path = dir.join("woxlauncher.log");
    let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) else {
        return;
    };

    let _ = writeln!(
        file,
        "[{}] [{}] {}",
        Utc::now().to_rfc3339(),
        level,
        message.as_ref()
    );
}

pub fn info(message: impl AsRef<str>) {
    log("INFO", message);
}

pub fn warn(message: impl AsRef<str>) {
    log("WARN", message);
}

pub fn error(message: impl AsRef<str>) {
    log("ERROR", message);
}
