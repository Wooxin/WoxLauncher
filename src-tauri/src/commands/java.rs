use crate::models::java::JavaRuntime;
use crate::services::java_manager;

#[tauri::command]
pub fn detect_java() -> Result<Vec<JavaRuntime>, String> {
    java_manager::detect_installed()
}
