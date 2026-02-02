// use crate::artifacts;

#[tauri::command]
pub fn get_artifact(id: String) {
    println!("Getting artifact: {}", id);
}
