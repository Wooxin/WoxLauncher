mod models;
mod services;
mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::instance::list_instances,
            commands::instance::create_instance,
            commands::instance::delete_instance,
            commands::instance::get_instance,
            commands::instance::update_instance,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
