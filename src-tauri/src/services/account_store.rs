use crate::error::WoxError;
use crate::utils::paths;
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
    let path = paths::accounts_file();
    if !path.exists() {
        return Ok(vec![]);
    }
    let json = std::fs::read_to_string(&path)?;
    let accounts: Vec<StoredAccount> = serde_json::from_str(&json)?;
    Ok(accounts)
}

pub fn save_account(account: &StoredAccount) -> Result<(), WoxError> {
    let path = paths::accounts_file();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let mut accounts = list_accounts().unwrap_or_default();
    // Upsert by uuid
    if let Some(existing) = accounts.iter_mut().find(|a| a.uuid == account.uuid) {
        *existing = account.clone();
    } else {
        accounts.push(account.clone());
    }
    let json = serde_json::to_string_pretty(&accounts)?;
    std::fs::write(&path, json)?;
    Ok(())
}

pub fn delete_account(uuid: &str) -> Result<(), WoxError> {
    let path = paths::accounts_file();
    let accounts = list_accounts()?;
    let filtered: Vec<StoredAccount> = accounts.into_iter().filter(|a| a.uuid != uuid).collect();
    let json = serde_json::to_string_pretty(&filtered)?;
    std::fs::write(&path, json)?;
    Ok(())
}

pub fn get_active_account() -> Result<Option<StoredAccount>, WoxError> {
    let accounts = list_accounts()?;
    Ok(accounts.into_iter().max_by_key(|a| a.last_used_at))
}

pub fn set_active_account(uuid: &str) -> Result<Option<StoredAccount>, WoxError> {
    let mut accounts = list_accounts()?;
    let mut found = None;
    if let Some(acct) = accounts.iter_mut().find(|a| a.uuid == uuid) {
        acct.last_used_at = Utc::now();
        found = Some(acct.clone());
    }
    let path = paths::accounts_file();
    let json = serde_json::to_string_pretty(&accounts)?;
    std::fs::write(&path, json)?;
    Ok(found)
}
