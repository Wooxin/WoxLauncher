use crate::models::instance::InstanceConfig;
use crate::services::instance_manager;
use crate::error::WoxError;

#[tauri::command]
pub fn list_instances() -> Result<Vec<InstanceConfig>, WoxError> {
    instance_manager::list_instances()
}

#[tauri::command]
pub fn create_instance(config: InstanceConfig) -> Result<InstanceConfig, WoxError> {
    instance_manager::create_instance(config)
}

#[tauri::command]
pub fn delete_instance(id: String) -> Result<(), WoxError> {
    instance_manager::delete_instance(&id)
}

#[tauri::command]
pub fn get_instance(id: String) -> Result<InstanceConfig, WoxError> {
    instance_manager::get_instance(&id)
}

#[tauri::command]
pub fn update_instance(config: InstanceConfig) -> Result<(), WoxError> {
    instance_manager::update_instance(config)
}
