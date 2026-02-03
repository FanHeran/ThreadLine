use crate::artifacts::Artifact;
use rusqlite::Connection;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn get_artifact(id: String) {
    println!("Getting artifact: {}", id);
}

#[tauri::command]
pub fn get_project_artifacts(app: AppHandle, project_id: i64) -> Result<Vec<Artifact>, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("threadline.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id, filename, file_type, file_size, mime_type, email_id, created_at FROM attachments WHERE project_id = ? ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let artifacts_iter = stmt.query_map([project_id], |row| {
        Ok(Artifact {
            id: row.get(0)?,
            filename: row.get(1)?,
            file_type: row.get(2)?,
            file_size: row.get(3)?,
            mime_type: row.get(4)?,
            source_email_id: row.get(5)?,
            created_at: row.get(6).unwrap_or_else(|_| "Unknown".to_string()),
        })
    }).map_err(|e| e.to_string())?;

    let mut artifacts = Vec::new();
    for a in artifacts_iter {
        artifacts.push(a.map_err(|e| e.to_string())?);
    }

    Ok(artifacts)
}
