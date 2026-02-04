use crate::mail::EmailPreview;

#[tauri::command]
pub fn fetch_emails() {
    log::info!("Fetching emails...");
}

#[tauri::command]
pub fn get_inbox_emails() -> Result<Vec<EmailPreview>, String> {
    // TODO: 迁移到 repository 模式
    log::warn!("get_inbox_emails not yet implemented with SQLx");
    Ok(vec![])
}
