pub mod commands;
pub mod error;
pub mod mail;
pub mod project;
pub mod repository;
pub mod search;
pub mod artifacts;
pub mod index_scheduler;
pub mod storage;
pub mod utils;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化日志系统
    env_logger::Builder::from_default_env()
        .filter_level(log::LevelFilter::Info)
        .init();

    log::info!("Starting ThreadLine application");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // 使用 tokio runtime 初始化数据库
            let runtime = tokio::runtime::Runtime::new()?;
            let pool = runtime.block_on(async {
                storage::database::init_pool(app.handle()).await
            })?;

            // 注册全局状态
            let project_repo = repository::ProjectRepository::new(pool.clone());
            app.manage(project_repo);

            // 填充模拟数据
            runtime.block_on(async {
                storage::mock_data::seed_mock_data(app.handle()).await
            })?;

            log::info!("Application initialized successfully");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::greet_user,
            commands::mail::fetch_emails,
            commands::mail::get_inbox_emails,
            commands::project::list_projects,
            commands::project::get_project,
            commands::project::get_project_timeline,
            commands::search::search_query,
            commands::artifact::get_artifact,
            commands::artifact::get_project_artifacts
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
