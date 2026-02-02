// use crate::search;

#[tauri::command]
pub fn search_query(query: String) {
    println!("Searching for: {}", query);
}
