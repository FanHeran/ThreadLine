use crate::project::{Project, ProjectStats, TimelineEvent, MilestoneEvent, EmailEvent, ThreadEvent, Attachment, LastActivity};
use rusqlite::Connection;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn list_projects(app: AppHandle) -> Result<Vec<Project>, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("threadline.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, name, description, status, is_pinned, updated_at, email_count, attachment_count, tags FROM projects ORDER BY is_pinned DESC, updated_at DESC")
        .map_err(|e| e.to_string())?;

    let projects_iter = stmt
        .query_map([], |row| {
            let project_id: i64 = row.get(0)?;
            let tags_json: Option<String> = row.get(8).ok();
            let tags = tags_json.and_then(|json| serde_json::from_str(&json).ok());

            Ok((project_id, Project {
                id: project_id,
                title: row.get(1)?,
                description: row.get(2)?,
                status: row.get(3)?,
                is_pinned: row.get(4)?,
                last_updated: row.get(5).unwrap_or_else(|_| "Unknown".to_string()),
                stats: ProjectStats {
                    emails: row.get(6)?,
                    attachments: row.get(7)?,
                },
                tags,
                last_activity: None, // Will be filled below
                participants: None, // Will be filled below
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut projects = Vec::new();
    for project_result in projects_iter {
        let (project_id, mut project) = project_result.map_err(|e| e.to_string())?;

        // Get last activity (most recent email)
        let last_activity = conn
            .query_row(
                "SELECT sender, date FROM emails WHERE project_id = ? ORDER BY date DESC LIMIT 1",
                [project_id],
                |row| {
                    Ok(LastActivity {
                        sender: row.get(0)?,
                        date: row.get(1)?,
                    })
                },
            )
            .ok();

        // Get unique participants (senders)
        let mut participants_stmt = conn
            .prepare("SELECT DISTINCT sender FROM emails WHERE project_id = ? ORDER BY date DESC LIMIT 5")
            .map_err(|e| e.to_string())?;

        let participants_iter = participants_stmt
            .query_map([project_id], |row| {
                let sender: String = row.get(0)?;
                // Extract name from "Name <email>" format
                let name = if let Some(start) = sender.find('<') {
                    sender[..start].trim().to_string()
                } else {
                    sender
                };
                Ok(name)
            })
            .map_err(|e| e.to_string())?;

        let mut participants = Vec::new();
        for participant in participants_iter {
            if let Ok(name) = participant {
                if !name.is_empty() {
                    participants.push(name);
                }
            }
        }

        project.last_activity = last_activity;
        project.participants = if participants.is_empty() { None } else { Some(participants) };

        projects.push(project);
    }

    Ok(projects)
}

#[tauri::command]
pub fn get_project(app: AppHandle, id: i64) -> Result<Project, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("threadline.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, name, description, status, is_pinned, updated_at, email_count, attachment_count, tags FROM projects WHERE id = ?")
        .map_err(|e| e.to_string())?;

    let mut project = stmt
        .query_row([id], |row| {
            let tags_json: Option<String> = row.get(8).ok();
            let tags = tags_json.and_then(|json| serde_json::from_str(&json).ok());

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
                tags,
                last_activity: None,
                participants: None,
            })
        })
        .map_err(|e| e.to_string())?;

    // Get last activity
    let last_activity = conn
        .query_row(
            "SELECT sender, date FROM emails WHERE project_id = ? ORDER BY date DESC LIMIT 1",
            [id],
            |row| {
                Ok(LastActivity {
                    sender: row.get(0)?,
                    date: row.get(1)?,
                })
            },
        )
        .ok();

    // Get unique participants
    let mut participants_stmt = conn
        .prepare("SELECT DISTINCT sender FROM emails WHERE project_id = ? ORDER BY date DESC LIMIT 5")
        .map_err(|e| e.to_string())?;

    let participants_iter = participants_stmt
        .query_map([id], |row| {
            let sender: String = row.get(0)?;
            let name = if let Some(start) = sender.find('<') {
                sender[..start].trim().to_string()
            } else {
                sender
            };
            Ok(name)
        })
        .map_err(|e| e.to_string())?;

    let mut participants = Vec::new();
    for participant in participants_iter {
        if let Ok(name) = participant {
            if !name.is_empty() {
                participants.push(name);
            }
        }
    }

    project.last_activity = last_activity;
    project.participants = if participants.is_empty() { None } else { Some(participants) };

    Ok(project)
}

#[tauri::command]
pub fn get_project_timeline(app: AppHandle, id: i64) -> Result<Vec<TimelineEvent>, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("threadline.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut events: Vec<TimelineEvent> = Vec::new();

    // 1. Fetch Milestones
    let mut stmt = conn.prepare("SELECT id, date, title, type FROM milestones WHERE project_id = ? ORDER BY date DESC")
        .map_err(|e| e.to_string())?;
    
    // Map milestone_id -> MilestoneEvent (to populate children later)
    // For simplicity, we first just load them. Complex grouping usually requires HashMap.
    
    // Let's use a simpler strategy for MVP+ logic:
    // A. Fetch all emails for project.
    // B. Group emails by thread_id.
    // C. Create ThreadEvents.
    // D. Fetch Milestones.
    // E. If a milestone links to an email (not in schema? Ah, schema has milestones.email_id), nest it?
    //    Actually, our mock schema has `milestones.email_id`. If set, that milestone is "attached" to that email or vice versa.
    //    But typical TimelineView: Milestones are top-level. Threads are top-level.
    
    // Let's implement:
    // 1. Get all Milestones.
    // 2. Get all Threads (group emails).
    // 3. Merge and Sort.

    // A. Milestones
    let milestones_iter = stmt.query_map([id], |row| {
        Ok(TimelineEvent::Milestone(MilestoneEvent {
            id: format!("m{}", row.get::<_, i64>(0)?),
            date: row.get::<_, String>(1)?,
            title: row.get::<_, String>(2)?,
            status: row.get::<_, String>(3)?,
            children: vec![], 
        }))
    }).map_err(|e| e.to_string())?;

    for m in milestones_iter {
        events.push(m.map_err(|e| e.to_string())?);
    }

    // B. Emails & Threads
    // We fetch all emails, then group them in Rust.
    struct RawEmail {
        id: i64,
        thread_id: Option<String>,
        date: String,
        sender: String,
        body: String,
        subject: String,
    }

    let mut stmt = conn.prepare("SELECT id, thread_id, date, sender, body_text, subject FROM emails WHERE project_id = ? ORDER BY date DESC")
        .map_err(|e| e.to_string())?;

    let emails = stmt.query_map([id], |row| {
        Ok(RawEmail {
            id: row.get(0)?,
            thread_id: row.get(1)?,
            date: row.get(2)?,
            sender: row.get(3)?,
            body: row.get(4)?,
            subject: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    // Helper function to format file size
    fn format_file_size(bytes: i64) -> String {
        if bytes < 1024 {
            format!("{} B", bytes)
        } else if bytes < 1024 * 1024 {
            format!("{:.1} KB", bytes as f64 / 1024.0)
        } else {
            format!("{:.1} MB", bytes as f64 / (1024.0 * 1024.0))
        }
    }

    // Helper function to get attachments for an email
    let get_attachments = |email_id: i64| -> Result<Option<Vec<Attachment>>, String> {
        let mut stmt = conn.prepare("SELECT filename, file_type, file_size FROM attachments WHERE email_id = ?")
            .map_err(|e| e.to_string())?;

        let attachments_result: Vec<Attachment> = stmt.query_map([email_id], |row| {
            let file_size: i64 = row.get(2)?;
            let size_str = format_file_size(file_size);

            Ok(Attachment {
                name: row.get(0)?,
                file_type: row.get(1)?,
                size: size_str,
            })
        }).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

        if attachments_result.is_empty() {
            Ok(None)
        } else {
            Ok(Some(attachments_result))
        }
    };

    let mut thread_map: std::collections::HashMap<String, Vec<RawEmail>> = std::collections::HashMap::new();
    let mut standalone_emails: Vec<RawEmail> = Vec::new();

    for email_res in emails {
        let email = email_res.map_err(|e| e.to_string())?;
        if let Some(tid) = &email.thread_id {
            thread_map.entry(tid.clone()).or_insert_with(Vec::new).push(email);
        } else {
            standalone_emails.push(email);
        }
    }

    // Convert Threads
    for (tid, mut thread_emails) in thread_map {
        // Sort emails in thread by date desc
        thread_emails.sort_by(|a, b| b.date.cmp(&a.date));

        // Clone date from first email before moving ownership
        let latest_date = thread_emails[0].date.clone();

        let children: Result<Vec<TimelineEvent>, String> = thread_emails.into_iter().map(|e| {
            let attachments = get_attachments(e.id)?;
            Ok(TimelineEvent::Email(EmailEvent {
                id: format!("e{}", e.id),
                date: e.date,
                sender: e.sender,
                content: e.body,
                subject: e.subject,
                attachments,
            }))
        }).collect();

        events.push(TimelineEvent::Thread(ThreadEvent {
            id: tid,
            date: latest_date,
            children: children?,
        }));
    }

    // Convert Standalone Emails
    for e in standalone_emails {
        let attachments = get_attachments(e.id)?;
        events.push(TimelineEvent::Email(EmailEvent {
            id: format!("e{}", e.id),
            date: e.date,
            sender: e.sender,
            content: e.body,
            subject: e.subject,
            attachments,
        }));
    }

    // Sort all events by date desc
    // We need to access 'date' field from enum.
    events.sort_by(|a, b| {
        let date_a = match a {
            TimelineEvent::Milestone(m) => &m.date,
            TimelineEvent::Email(e) => &e.date,
            TimelineEvent::Thread(t) => &t.date,
        };
        let date_b = match b {
            TimelineEvent::Milestone(m) => &m.date,
            TimelineEvent::Email(e) => &e.date,
            TimelineEvent::Thread(t) => &t.date,
        };
        date_b.cmp(date_a)
    });

    Ok(events)
}

