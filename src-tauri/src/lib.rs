mod models;
mod services;
mod commands;
mod utils;
mod error;
mod app_state;
mod events;

use app_state::AppState;
use utils::requests;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            http: requests::http_client().clone(),
        })
        .invoke_handler(tauri::generate_handler![
            commands::instance::list_instances,
            commands::instance::create_instance,
            commands::instance::delete_instance,
            commands::instance::get_instance,
            commands::instance::update_instance,
            commands::auth::ms_device_code,
            commands::auth::ms_poll_token,
            commands::auth::offline_auth,
            commands::auth::authlib_login,
            commands::account::list_accounts,
            commands::account::delete_account,
            commands::account::get_active_account,
            commands::account::set_active_account,
            commands::launch::launch_game,
            commands::java::detect_java,
            commands::minecraft::fetch_version_manifest,
            commands::download::start_download,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
