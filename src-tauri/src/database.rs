use rusqlite::{Connection};
use std::sync::Mutex;
use crate::utils::paths;

static DB: once_cell::sync::Lazy<Mutex<Connection>> = once_cell::sync::Lazy::new(|| {
    let db_path = paths::wox_data_dir().join("woxlauncher.db");
    std::fs::create_dir_all(db_path.parent().unwrap()).ok();
    let conn = Connection::open(&db_path).expect("Failed to open database");
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS instances (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            game_version TEXT NOT NULL,
            loader_type TEXT NOT NULL DEFAULT 'vanilla',
            loader_version TEXT NOT NULL DEFAULT '',
            java_version TEXT NOT NULL DEFAULT '17',
            jvm_args TEXT NOT NULL DEFAULT '-Xmx2G',
            game_args TEXT NOT NULL DEFAULT '',
            resolution_width INTEGER NOT NULL DEFAULT 1920,
            resolution_height INTEGER NOT NULL DEFAULT 1080,
            created_at TEXT NOT NULL,
            last_played_at TEXT,
            downloaded INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS accounts (
            uuid TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            access_token TEXT NOT NULL,
            auth_mode TEXT NOT NULL,
            auth_server_url TEXT,
            refresh_token TEXT,
            last_used_at TEXT NOT NULL
        );
    ").expect("Failed to run migrations");
    Mutex::new(conn)
});

pub fn get_db() -> &'static Mutex<Connection> {
    &DB
}
