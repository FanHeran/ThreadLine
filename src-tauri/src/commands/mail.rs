use sqlx::SqlitePool;
use tauri::State;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct EmailPreview {
    pub id: i64,
    pub account_id: i64,
    pub subject: Option<String>,
    pub sender: Option<String>,
    pub date: Option<String>,
    pub body_text: Option<String>,
    pub is_read: bool,
    pub has_attachments: bool,
}

#[tauri::command]
pub fn fetch_emails() {
    log::info!("Fetching emails...");
}

#[tauri::command]
pub async fn get_inbox_emails(pool: State<'_, SqlitePool>) -> Result<Vec<EmailPreview>, String> {
    log::info!("Fetching inbox emails from database");

    let emails = sqlx::query_as::<_, EmailPreview>(
        r#"
        SELECT
            id, account_id, subject, sender, date,
            body_text, is_read, has_attachments
        FROM emails
        ORDER BY date DESC
        LIMIT 100
        "#
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to fetch emails: {}", e);
        format!("Failed to fetch emails: {}", e)
    })?;

    log::info!("Fetched {} emails from database", emails.len());
    Ok(emails)
}
