use crate::error::WoxError;
use crate::models::java::JavaRuntime;
use crate::services::java_manager;

#[tauri::command]
pub fn detect_java(custom_path: Option<String>) -> Result<Vec<JavaRuntime>, WoxError> {
    java_manager::detect_installed(custom_path.as_deref())
}
