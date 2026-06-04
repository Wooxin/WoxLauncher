use crate::services::account_store;
use crate::services::account_store::StoredAccount;

#[tauri::command]
pub fn list_accounts() -> Result<Vec<StoredAccount>, String> {
    account_store::list_accounts().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_account(uuid: String) -> Result<(), String> {
    account_store::delete_account(&uuid).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_active_account() -> Result<Option<StoredAccount>, String> {
    account_store::get_active_account().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_active_account(uuid: String) -> Result<Option<StoredAccount>, String> {
    account_store::set_active_account(&uuid).map_err(|e| e.to_string())
}
