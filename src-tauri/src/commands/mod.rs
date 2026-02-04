pub mod mail;
pub mod project;
pub mod search;
pub mod artifact;
pub mod sync;
pub mod oauth;
pub mod settings;

#[tauri::command]
pub fn greet_user(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
