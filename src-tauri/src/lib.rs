pub mod commands;
pub mod mail;
pub mod project;
pub mod search;
pub mod artifacts;
pub mod index_scheduler;
pub mod storage;
pub mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            storage::database::init(app.handle())?;
            storage::mock_data::seed_mock_data(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::greet_user,
            commands::mail::fetch_emails,
            commands::project::list_projects,
            commands::search::search_query,
            commands::artifact::get_artifact
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
