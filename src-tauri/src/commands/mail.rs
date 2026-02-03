use crate::mail::EmailPreview;
use rusqlite::Connection;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn fetch_emails() {
    println!("Fetching emails...");
}

#[tauri::command]
pub fn get_inbox_emails(app: AppHandle) -> Result<Vec<EmailPreview>, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("threadline.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // Query emails. For now, fetch all. Ideally limit validation to those NOT in a project?
    // Or just all emails (Global Inbox).
    // Also checking for attachments existence.
    let mut stmt = conn
        .prepare(
            "SELECT e.id, e.subject, e.sender, e.date, 
            COALESCE(e.body_text, e.body_html, '') as body_preview,
            EXISTS(SELECT 1 FROM attachments a WHERE a.email_id = e.id) as has_att
            FROM emails e
            ORDER BY e.date DESC",
        )
        .map_err(|e| e.to_string())?;

    let emails_iter = stmt.query_map([], |row| {
        let body: String = row.get(4)?;
        // Create a simple preview from body (first 100 chars)
        let preview = body.chars().take(100).collect::<String>();

        Ok(EmailPreview {
            id: row.get(0)?,
            subject: row.get(1)?,
            sender: row.get(2)?,
            date: row.get(3)?,
            preview,
            has_attachments: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut emails = Vec::new();
    for email in emails_iter {
        emails.push(email.map_err(|e| e.to_string())?);
    }

    Ok(emails)
}
