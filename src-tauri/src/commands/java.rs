use crate::models::java::JavaRuntime;
use crate::services::java_manager;
use crate::error::WoxError;

#[tauri::command]
pub fn detect_java() -> Result<Vec<JavaRuntime>, WoxError> {
    java_manager::detect_installed()
}
