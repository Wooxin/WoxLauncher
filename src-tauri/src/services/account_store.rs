use crate::error::WoxError;
use crate::database;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredAccount {
    pub username: String,
    pub uuid: String,
    pub access_token: String,
    pub auth_mode: String,
    pub auth_server_url: Option<String>,
    pub refresh_token: Option<String>,
    pub last_used_at: DateTime<Utc>,
}

pub fn list_accounts() -> Result<Vec<StoredAccount>, WoxError> {
    let db = database::get_db().lock().map_err(|e| WoxError::Internal(e.to_string()))?;
    let mut stmt = db.prepare("SELECT uuid, username, access_token, auth_mode, auth_server_url, refresh_token, last_used_at FROM accounts ORDER BY last_used_at DESC")?;
    let accounts = stmt.query_map([], |row| {
        Ok(StoredAccount {
            uuid: row.get(0)?,
            username: row.get(1)?,
            access_token: row.get(2)?,
            auth_mode: row.get(3)?,
            auth_server_url: row.get(4)?,
            refresh_token: row.get(5)?,
            last_used_at: row.get::<_, String>(6).ok().and_then(|s| DateTime::parse_from_rfc3339(&s).ok().map(|d| d.with_timezone(&Utc))).unwrap_or_else(Utc::now),
        })
    })?.filter_map(|r| r.ok()).collect();
    Ok(accounts)
}

pub fn save_account(account: &StoredAccount) -> Result<(), WoxError> {
    let db = database::get_db().lock().map_err(|e| WoxError::Internal(e.to_string()))?;
    db.execute(
        "INSERT OR REPLACE INTO accounts (uuid, username, access_token, auth_mode, auth_server_url, refresh_token, last_used_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![account.uuid, account.username, account.access_token, account.auth_mode, account.auth_server_url, account.refresh_token, account.last_used_at.to_rfc3339()],
    )?;
    Ok(())
}

pub fn delete_account(uuid: &str) -> Result<(), WoxError> {
    let db = database::get_db().lock().map_err(|e| WoxError::Internal(e.to_string()))?;
    db.execute("DELETE FROM accounts WHERE uuid = ?1", rusqlite::params![uuid])?;
    Ok(())
}

pub fn get_active_account() -> Result<Option<StoredAccount>, WoxError> {
    let accounts = list_accounts()?;
    Ok(accounts.into_iter().max_by_key(|a| a.last_used_at))
}

pub fn set_active_account(uuid: &str) -> Result<Option<StoredAccount>, WoxError> {
    let db = database::get_db().lock().map_err(|e| WoxError::Internal(e.to_string()))?;
    db.execute("UPDATE accounts SET last_used_at = ?1 WHERE uuid = ?2",
        rusqlite::params![Utc::now().to_rfc3339(), uuid])?;
    let accounts = list_accounts()?;
    Ok(accounts.into_iter().find(|a| a.uuid == uuid))
}
