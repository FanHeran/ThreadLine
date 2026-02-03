use crate::project::{Project, ProjectStats, TimelineEvent, MilestoneEvent, EmailEvent, ThreadEvent};
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

#[tauri::command]
pub fn get_project(app: AppHandle, id: i64) -> Result<Project, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("threadline.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, name, description, status, is_pinned, updated_at, email_count, attachment_count FROM projects WHERE id = ?")
        .map_err(|e| e.to_string())?;

    let project = stmt
        .query_row([id], |row| {
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

        let children: Vec<TimelineEvent> = thread_emails.into_iter().map(|e| {
             TimelineEvent::Email(EmailEvent {
                id: format!("e{}", e.id),
                date: e.date,
                sender: e.sender,
                content: e.body,
                subject: e.subject,
            })
        }).collect();

        events.push(TimelineEvent::Thread(ThreadEvent {
            id: tid,
            date: latest_date,
            children,
        }));
    }

    // Convert Standalone Emails
    for e in standalone_emails {
        events.push(TimelineEvent::Email(EmailEvent {
            id: format!("e{}", e.id),
            date: e.date,
            sender: e.sender,
            content: e.body,
            subject: e.subject,
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

