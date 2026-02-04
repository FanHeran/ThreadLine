use crate::error::AppError;
use crate::project::{Project, ProjectStats, TimelineEvent, MilestoneEvent, EmailEvent, ThreadEvent, Attachment, LastActivity};
use sqlx::SqlitePool;
use std::collections::HashMap;

/// 项目数据仓库
#[derive(Clone)]
pub struct ProjectRepository {
    pool: SqlitePool,
}

impl ProjectRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// 获取所有项目列表
    pub async fn list_all(&self) -> Result<Vec<Project>, AppError> {
        let rows = sqlx::query_as::<_, ProjectRow>(
            r#"
            SELECT
                id,
                name,
                description,
                status,
                is_pinned,
                updated_at,
                email_count,
                attachment_count,
                tags
            FROM projects
            ORDER BY is_pinned DESC, updated_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        let mut projects: Vec<Project> = rows
            .into_iter()
            .map(|row| Project {
                id: row.id,
                title: row.name,
                description: row.description,
                status: row.status,
                is_pinned: row.is_pinned,
                last_updated: row.updated_at.unwrap_or_else(|| "Unknown".to_string()),
                stats: ProjectStats {
                    emails: row.email_count.unwrap_or(0),
                    attachments: row.attachment_count.unwrap_or(0),
                },
                tags: row.tags.and_then(|s: String| serde_json::from_str(&s).ok()),
                last_activity: None,
                participants: None,
            })
            .collect();

        // 填充 last_activity 和 participants
        for project in &mut projects {
            project.last_activity = self.get_last_activity(project.id).await.ok();
            project.participants = self.get_participants(project.id).await.ok();
        }

        Ok(projects)
    }

    /// 根据 ID 获取项目
    pub async fn get_by_id(&self, id: i64) -> Result<Project, AppError> {
        let row = sqlx::query_as::<_, ProjectRow>(
            r#"
            SELECT
                id,
                name,
                description,
                status,
                is_pinned,
                updated_at,
                email_count,
                attachment_count,
                tags
            FROM projects
            WHERE id = ?
            "#
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(AppError::ProjectNotFound { id })?;

        let mut project = Project {
            id: row.id,
            title: row.name,
            description: row.description,
            status: row.status,
            is_pinned: row.is_pinned,
            last_updated: row.updated_at.unwrap_or_else(|| "Unknown".to_string()),
            stats: ProjectStats {
                emails: row.email_count.unwrap_or(0),
                attachments: row.attachment_count.unwrap_or(0),
            },
            tags: row.tags.and_then(|s: String| serde_json::from_str(&s).ok()),
            last_activity: None,
            participants: None,
        };

        project.last_activity = self.get_last_activity(id).await.ok();
        project.participants = self.get_participants(id).await.ok();

        Ok(project)
    }

    /// 获取项目的最后活动
    async fn get_last_activity(&self, project_id: i64) -> Result<LastActivity, AppError> {
        #[derive(sqlx::FromRow)]
        struct ActivityRow {
            sender: Option<String>,
            date: Option<String>,
        }

        let row = sqlx::query_as::<_, ActivityRow>(
            "SELECT sender, date FROM emails WHERE project_id = ? ORDER BY date DESC LIMIT 1"
        )
        .bind(project_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(AppError::Generic("No activity found".to_string()))?;

        Ok(LastActivity {
            sender: row.sender.unwrap_or_default(),
            date: row.date.unwrap_or_default(),
        })
    }

    /// 获取项目参与者
    async fn get_participants(&self, project_id: i64) -> Result<Vec<String>, AppError> {
        #[derive(sqlx::FromRow)]
        struct ParticipantRow {
            sender: Option<String>,
        }

        let rows = sqlx::query_as::<_, ParticipantRow>(
            "SELECT DISTINCT sender FROM emails WHERE project_id = ? ORDER BY date DESC LIMIT 5"
        )
        .bind(project_id)
        .fetch_all(&self.pool)
        .await?;

        let participants: Vec<String> = rows
            .into_iter()
            .filter_map(|row| row.sender)
            .map(|sender| {
                // Extract name from "Name <email>" format
                if let Some(start) = sender.find('<') {
                    sender[..start].trim().to_string()
                } else {
                    sender
                }
            })
            .filter(|name| !name.is_empty())
            .collect();

        Ok(participants)
    }

    /// 获取项目时间线
    pub async fn get_timeline(&self, project_id: i64) -> Result<Vec<TimelineEvent>, AppError> {
        let mut events: Vec<TimelineEvent> = Vec::new();

        // 1. 获取里程碑
        #[derive(sqlx::FromRow)]
        struct MilestoneRow {
            id: i64,
            date: Option<String>,
            title: Option<String>,
            r#type: Option<String>,
        }

        let milestones = sqlx::query_as::<_, MilestoneRow>(
            "SELECT id, date, title, type FROM milestones WHERE project_id = ? ORDER BY date DESC"
        )
        .bind(project_id)
        .fetch_all(&self.pool)
        .await?;

        for m in milestones {
            events.push(TimelineEvent::Milestone(MilestoneEvent {
                id: format!("m{}", m.id),
                date: m.date.unwrap_or_default(),
                title: m.title.unwrap_or_default(),
                status: m.r#type.unwrap_or_default(),
                children: vec![],
            }));
        }

        // 2. 获取邮件并按线程分组
        #[derive(sqlx::FromRow)]
        struct EmailRow {
            id: i64,
            thread_id: Option<String>,
            date: Option<String>,
            sender: Option<String>,
            body_text: Option<String>,
            subject: Option<String>,
        }

        let emails = sqlx::query_as::<_, EmailRow>(
            r#"
            SELECT
                id,
                thread_id,
                date,
                sender,
                body_text,
                subject
            FROM emails
            WHERE project_id = ?
            ORDER BY date DESC
            "#
        )
        .bind(project_id)
        .fetch_all(&self.pool)
        .await?;

        let mut thread_map: HashMap<String, Vec<RawEmail>> = HashMap::new();
        let mut standalone_emails: Vec<RawEmail> = Vec::new();

        for email in emails {
            let raw_email = RawEmail {
                id: email.id,
                thread_id: email.thread_id,
                date: email.date.unwrap_or_default(),
                sender: email.sender.unwrap_or_default(),
                body: email.body_text.unwrap_or_default(),
                subject: email.subject.unwrap_or_default(),
            };

            if let Some(tid) = &raw_email.thread_id {
                thread_map.entry(tid.clone()).or_insert_with(Vec::new).push(raw_email);
            } else {
                standalone_emails.push(raw_email);
            }
        }

        // 3. 转换线程
        for (tid, mut thread_emails) in thread_map {
            thread_emails.sort_by(|a, b| b.date.cmp(&a.date));
            let latest_date = thread_emails[0].date.clone();

            let mut children = Vec::new();
            for e in thread_emails {
                let attachments = self.get_email_attachments(e.id).await.ok();
                children.push(TimelineEvent::Email(EmailEvent {
                    id: format!("e{}", e.id),
                    date: e.date,
                    sender: e.sender,
                    content: e.body,
                    subject: e.subject,
                    attachments,
                }));
            }

            events.push(TimelineEvent::Thread(ThreadEvent {
                id: tid,
                date: latest_date,
                children,
            }));
        }

        // 4. 转换独立邮件
        for e in standalone_emails {
            let attachments = self.get_email_attachments(e.id).await.ok();
            events.push(TimelineEvent::Email(EmailEvent {
                id: format!("e{}", e.id),
                date: e.date,
                sender: e.sender,
                content: e.body,
                subject: e.subject,
                attachments,
            }));
        }

        // 5. 按日期排序
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

    /// 获取邮件附件
    async fn get_email_attachments(&self, email_id: i64) -> Result<Vec<Attachment>, AppError> {
        #[derive(sqlx::FromRow)]
        struct AttachmentRow {
            filename: Option<String>,
            file_type: Option<String>,
            file_size: Option<i64>,
        }

        let rows = sqlx::query_as::<_, AttachmentRow>(
            "SELECT filename, file_type, file_size FROM attachments WHERE email_id = ?"
        )
        .bind(email_id)
        .fetch_all(&self.pool)
        .await?;

        let attachments: Vec<Attachment> = rows
            .into_iter()
            .map(|row| {
                let file_size = row.file_size.unwrap_or(0);
                let size_str = format_file_size(file_size);

                Attachment {
                    name: row.filename.unwrap_or_default(),
                    file_type: row.file_type.unwrap_or_default(),
                    size: size_str,
                }
            })
            .collect();

        if attachments.is_empty() {
            Err(AppError::Generic("No attachments".to_string()))
        } else {
            Ok(attachments)
        }
    }

    /// 切换项目置顶状态
    pub async fn toggle_pin(&self, id: i64) -> Result<bool, AppError> {
        // 获取当前状态
        let current: (bool,) = sqlx::query_as(
            "SELECT is_pinned FROM projects WHERE id = ?"
        )
        .bind(id)
        .fetch_one(&self.pool)
        .await?;

        let new_state = !current.0;

        // 更新状态
        sqlx::query(
            "UPDATE projects SET is_pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        )
        .bind(new_state)
        .bind(id)
        .execute(&self.pool)
        .await?;

        log::info!("Project {} pin state changed to: {}", id, new_state);
        Ok(new_state)
    }

    /// 归档项目
    pub async fn archive(&self, id: i64) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE projects SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        )
        .bind(id)
        .execute(&self.pool)
        .await?;

        log::info!("Project {} archived", id);
        Ok(())
    }

    /// 取消归档项目
    pub async fn unarchive(&self, id: i64) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE projects SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        )
        .bind(id)
        .execute(&self.pool)
        .await?;

        log::info!("Project {} unarchived", id);
        Ok(())
    }
}

// 辅助结构体
#[derive(sqlx::FromRow)]
struct ProjectRow {
    id: i64,
    name: String,
    description: Option<String>,
    status: String,
    is_pinned: bool,
    updated_at: Option<String>,
    email_count: Option<i64>,
    attachment_count: Option<i64>,
    tags: Option<String>,
}

struct RawEmail {
    id: i64,
    thread_id: Option<String>,
    date: String,
    sender: String,
    body: String,
    subject: String,
}

fn format_file_size(bytes: i64) -> String {
    if bytes < 1024 {
        format!("{} B", bytes)
    } else if bytes < 1024 * 1024 {
        format!("{:.1} KB", bytes as f64 / 1024.0)
    } else {
        format!("{:.1} MB", bytes as f64 / (1024.0 * 1024.0))
    }
}

