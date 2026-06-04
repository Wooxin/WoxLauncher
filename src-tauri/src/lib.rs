mod models;
mod services;
mod commands;
mod utils;
mod error;
mod app_state;
mod events;
mod database;

use app_state::AppState;
use utils::requests;
use tauri::Manager;
use tauri::tray::TrayIconBuilder;
use tauri::menu::{MenuBuilder, MenuItemBuilder};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            http: requests::http_client().clone(),
        })
        .setup(|app| {
            let show = MenuItemBuilder::with_id("show", "Show").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let menu = MenuBuilder::new(app).item(&show).item(&quit).build()?;

            let icon = app.default_window_icon().cloned().unwrap();
            let _tray = TrayIconBuilder::new()
                .icon(icon)
                .tooltip("WoxLauncher")
                .menu(&menu)
                .on_menu_event(move |app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => { app.exit(0); }
                        _ => {}
                    }
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::instance::list_instances,
            commands::instance::create_instance,
            commands::instance::delete_instance,
            commands::instance::get_instance,
            commands::instance::update_instance,
            commands::auth::ms_login,
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
            commands::download::get_wox_data_dir,
            commands::java_download::download_java,
            commands::game_installer::install_game_version,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
