mod commands;
mod database;
mod models;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data_dir)?;
            let database = database::Database::open(&app_data_dir.join("cafe-service.sqlite3"))?;
            app.manage(database);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::create_service_request,
            commands::list_service_requests,
            commands::get_service_request,
            commands::update_service_request,
            commands::close_service_request,
            commands::reopen_service_request,
            commands::update_service_request_status,
            commands::delete_service_request,
            commands::get_firm_settings,
            commands::save_firm_settings,
            commands::get_input_default,
            commands::save_input_default,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
