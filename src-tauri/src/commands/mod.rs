pub mod mail;
pub mod project;
pub mod search;
pub mod artifact;

#[tauri::command]
pub fn greet_user(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
