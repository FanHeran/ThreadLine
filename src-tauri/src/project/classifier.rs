/// 项目自动分类器
///
/// MVP 阶段策略：
/// 1. 基于 Thread ID 的强规则聚合
/// 2. 基于主题相似度的聚合
/// 3. 保守策略：只在高置信度时自动创建项目

use crate::error::AppError;
use sqlx::SqlitePool;

/// 安全地截断 UTF-8 字符串到指定字节长度
/// 确保不会在多字节字符的中间截断
fn safe_truncate(s: &str, max_bytes: usize) -> String {
    if s.len() <= max_bytes {
        return s.to_string();
    }

    // 找到 max_bytes 之前的最后一个字符边界
    let mut end = max_bytes;
    while end > 0 && !s.is_char_boundary(end) {
        end -= 1;
    }

    s[..end].to_string()
}

/// 项目分类器
pub struct ProjectClassifier {
    pool: SqlitePool,
}

impl ProjectClassifier {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// 为新同步的邮件自动分配项目
    ///
    /// 策略：
    /// 1. 如果邮件有 thread_id，查找同一 thread 的其他邮件
    /// 2. 如果找到已分配项目的邮件，使用相同项目
    /// 3. 如果没有，基于主题相似度查找
    /// 4. 如果都没有，创建新项目
    pub async fn classify_email(&self, email_id: i64) -> Result<i64, AppError> {
        // 1. 获取邮件信息
        let email = self.get_email_info(email_id).await?;

        // 2. 如果已经有项目，直接返回
        if let Some(project_id) = email.project_id {
            return Ok(project_id);
        }

        // 3. 基于 Thread ID 查找项目
        if let Some(thread_id) = &email.thread_id {
            if let Some(project_id) = self.find_project_by_thread(thread_id).await? {
                self.assign_email_to_project(email_id, project_id).await?;
                log::info!("Assigned email {} to project {} (by thread)", email_id, project_id);
                return Ok(project_id);
            }
        }

        // 4. 基于主题相似度查找项目
        if let Some(subject) = &email.subject {
            let normalized_subject = normalize_subject(subject);
            if let Some(project_id) = self.find_project_by_subject(&normalized_subject).await? {
                self.assign_email_to_project(email_id, project_id).await?;
                log::info!("Assigned email {} to project {} (by subject)", email_id, project_id);
                return Ok(project_id);
            }
        }

        // 5. 创建新项目
        let project_id = self.create_project_for_email(&email).await?;
        self.assign_email_to_project(email_id, project_id).await?;
        log::info!("Created new project {} for email {}", project_id, email_id);

        Ok(project_id)
    }

    /// 批量分类邮件（用于初次同步）
    pub async fn classify_all_unassigned(&self) -> Result<usize, AppError> {
        let unassigned_emails = self.get_unassigned_emails().await?;
        let count = unassigned_emails.len();

        for email_id in unassigned_emails {
            if let Err(e) = self.classify_email(email_id).await {
                log::warn!("Failed to classify email {}: {}", email_id, e);
            }
        }

        Ok(count)
    }

    /// 获取邮件信息
    async fn get_email_info(&self, email_id: i64) -> Result<EmailInfo, AppError> {
        let email = sqlx::query_as::<_, EmailInfo>(
            r#"
            SELECT
                id, message_id, thread_id, subject, sender,
                date, project_id, account_id
            FROM emails
            WHERE id = ?
            "#
        )
        .bind(email_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(email)
    }

    /// 基于 Thread ID 查找项目
    async fn find_project_by_thread(&self, thread_id: &str) -> Result<Option<i64>, AppError> {
        let result: Option<(i64,)> = sqlx::query_as(
            r#"
            SELECT project_id
            FROM emails
            WHERE thread_id = ? AND project_id IS NOT NULL
            LIMIT 1
            "#
        )
        .bind(thread_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(result.map(|(id,)| id))
    }

    /// 基于主题相似度查找项目
    async fn find_project_by_subject(&self, normalized_subject: &str) -> Result<Option<i64>, AppError> {
        // 查找最近 30 天内主题相似的邮件
        let result: Option<(i64,)> = sqlx::query_as(
            r#"
            SELECT project_id
            FROM emails
            WHERE project_id IS NOT NULL
              AND datetime(date) > datetime('now', '-30 days')
              AND subject LIKE ?
            ORDER BY date DESC
            LIMIT 1
            "#
        )
        .bind(format!("%{}%", normalized_subject))
        .fetch_optional(&self.pool)
        .await?;

        Ok(result.map(|(id,)| id))
    }

    /// 为邮件创建新项目
    async fn create_project_for_email(&self, email: &EmailInfo) -> Result<i64, AppError> {
        // 使用主题作为项目名称（去除 Re: / Fwd: 等前缀）
        let project_name = email.subject
            .as_ref()
            .map(|s| normalize_subject(s))
            .unwrap_or_else(|| format!("Project from {}", email.sender.as_deref().unwrap_or("Unknown")));

        let result = sqlx::query(
            r#"
            INSERT INTO projects (name, status, email_count, attachment_count, created_at, updated_at)
            VALUES (?, 'active', 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            "#
        )
        .bind(&project_name)
        .execute(&self.pool)
        .await?;

        Ok(result.last_insert_rowid())
    }

    /// 将邮件分配到项目
    async fn assign_email_to_project(&self, email_id: i64, project_id: i64) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE emails SET project_id = ? WHERE id = ?"
        )
        .bind(project_id)
        .bind(email_id)
        .execute(&self.pool)
        .await?;

        // 更新项目统计
        self.update_project_stats(project_id).await?;

        Ok(())
    }

    /// 更新项目统计信息
    async fn update_project_stats(&self, project_id: i64) -> Result<(), AppError> {
        sqlx::query(
            r#"
            UPDATE projects
            SET
                email_count = (SELECT COUNT(*) FROM emails WHERE project_id = ?),
                attachment_count = (SELECT COUNT(*) FROM attachments WHERE email_id IN (SELECT id FROM emails WHERE project_id = ?)),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "#
        )
        .bind(project_id)
        .bind(project_id)
        .bind(project_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// 获取未分配项目的邮件
    async fn get_unassigned_emails(&self) -> Result<Vec<i64>, AppError> {
        let rows: Vec<(i64,)> = sqlx::query_as(
            "SELECT id FROM emails WHERE project_id IS NULL ORDER BY date DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|(id,)| id).collect())
    }
}

/// 邮件信息
#[derive(Debug, sqlx::FromRow)]
struct EmailInfo {
    id: i64,
    message_id: String,
    thread_id: Option<String>,
    subject: Option<String>,
    sender: Option<String>,
    date: Option<String>,
    project_id: Option<i64>,
    account_id: i64,
}

/// 规范化主题（去除 Re: / Fwd: / 数字后缀等）
fn normalize_subject(subject: &str) -> String {
    let mut normalized = subject.to_string();

    // 去除常见前缀
    let prefixes = ["Re:", "RE:", "Fwd:", "FWD:", "Fw:", "回复:", "转发:"];
    loop {
        let mut changed = false;
        for prefix in &prefixes {
            if let Some(stripped) = normalized.trim().strip_prefix(prefix) {
                normalized = stripped.to_string();
                changed = true;
                break;
            }
        }
        if !changed {
            break;
        }
    }

    // 去除尾部的数字（如 "合同 v2" -> "合同"）
    normalized = normalized.trim().to_string();

    // 限制长度（安全地截断 UTF-8 字符串）
    safe_truncate(&normalized, 100)
}
