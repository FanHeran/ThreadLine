use crate::project::{Project, ProjectStats};
use rusqlite::Connection;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn list_projects(app: AppHandle) -> Result<Vec<Project>, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("threadline.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, name, description, status, is_pinned, updated_at, email_count, attachment_count FROM projects ORDER BY is_pinned DESC, updated_at DESC")
        .map_err(|e| e.to_string())?;

    let projects_iter = stmt
        .query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                status: row.get(3)?,
                is_pinned: row.get(4)?,
                last_updated: row.get(5).unwrap_or_else(|_| "Unknown".to_string()),
                stats: ProjectStats {
                    emails: row.get(6)?,
                    attachments: row.get(7)?,
                },
            })
        })
        .map_err(|e| e.to_string())?;

    let mut projects = Vec::new();
    for project in projects_iter {
        projects.push(project.map_err(|e| e.to_string())?);
    }

    Ok(projects)
}
