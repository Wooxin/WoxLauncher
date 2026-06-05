use crate::utils::paths;
use rusqlite::Connection;
use std::sync::Mutex;

fn ensure_column(conn: &Connection, table: &str, column: &str, definition: &str) {
    let exists = conn
        .prepare(&format!("PRAGMA table_info({})", table))
        .and_then(|mut stmt| {
            let rows = stmt.query_map([], |row| row.get::<_, String>(1))?;
            for row in rows {
                if row? == column {
                    return Ok(true);
                }
            }
            Ok(false)
        })
        .unwrap_or(false);

    if !exists {
        let _ = conn.execute(
            &format!("ALTER TABLE {} ADD COLUMN {}", table, definition),
            [],
        );
    }
}

static DB: once_cell::sync::Lazy<Mutex<Connection>> = once_cell::sync::Lazy::new(|| {
    let db_dir = paths::launcher_db_dir();
    let db_path = paths::launcher_db_file();
    let legacy_db_file = paths::wox_data_dir().join("woxlauncherdb");
    let old_db_path = paths::wox_data_dir().join("woxlauncher.db");

    if legacy_db_file.is_file() {
        let _ = std::fs::rename(
            &legacy_db_file,
            paths::wox_data_dir().join("woxlauncherdb_legacy.sqlite"),
        );
    }
    std::fs::create_dir_all(&db_dir).ok();

    let legacy_renamed = paths::wox_data_dir().join("woxlauncherdb_legacy.sqlite");
    if !db_path.exists() {
        if legacy_renamed.exists() {
            let _ = std::fs::rename(&legacy_renamed, &db_path);
        } else if old_db_path.exists() {
            let _ = std::fs::rename(&old_db_path, &db_path);
        }
    }

    let conn = Connection::open(&db_path).expect("Failed to open database");
    conn.execute_batch(
        "
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
    ",
    )
    .expect("Failed to run migrations");
    ensure_column(
        &conn,
        "instances",
        "fullscreen",
        "fullscreen INTEGER NOT NULL DEFAULT 0",
    );
    ensure_column(
        &conn,
        "instances",
        "use_instance_settings",
        "use_instance_settings INTEGER NOT NULL DEFAULT 0",
    );
    Mutex::new(conn)
});

pub fn get_db() -> &'static Mutex<Connection> {
    &DB
}
