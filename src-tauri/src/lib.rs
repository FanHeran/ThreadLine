pub mod commands;
pub mod error;
pub mod events;
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
            app.manage(pool.clone()); // 注册 SqlitePool 供 sync 命令使用

            // 填充模拟数据（暂时禁用，使用真实 OAuth 账户）
            // runtime.block_on(async {
            //     storage::mock_data::seed_mock_data(app.handle()).await
            // })?;

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
            commands::project::toggle_project_pin,
            commands::project::archive_project,
            commands::project::unarchive_project,
            commands::search::search_query,
            commands::artifact::get_artifact,
            commands::artifact::get_project_artifacts,
            commands::sync::get_email_providers,
            commands::sync::add_email_account,
            commands::sync::add_oauth_email_account,
            commands::sync::sync_email_account,
            commands::sync::list_email_accounts,
            commands::sync::reset_account_sync,
            commands::oauth::start_oauth_flow,
            commands::oauth::get_oauth_instructions,
            commands::settings::get_sync_settings,
            commands::settings::update_sync_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
