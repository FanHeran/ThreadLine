/// 邮件同步模块
use crate::error::AppError;
use crate::events::{EventEmitter, SyncProgressEvent, SyncStatus};
use crate::mail::imap_client::{AuthMethod, ImapConnection};
use crate::mail::parser::{parse_email, generate_thread_id, ParsedEmail};
use crate::mail::providers::ProviderConfig;
use sqlx::SqlitePool;
use serde::{Deserialize, Serialize};

/// 邮件账户
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailAccount {
    pub id: Option<i64>,
    pub email: String,
    pub provider: String,
    pub imap_config: String,
}

/// 同步进度
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncProgress {
    pub account_id: i64,
    pub current: usize,
    pub total: usize,
    pub status: String,
}

/// 邮件同步器
pub struct EmailSyncer {
    pool: SqlitePool,
    event_emitter: Option<EventEmitter>,
}

impl EmailSyncer {
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            pool,
            event_emitter: None,
        }
    }

    pub fn with_event_emitter(pool: SqlitePool, emitter: EventEmitter) -> Self {
        Self {
            pool,
            event_emitter: Some(emitter),
        }
    }

    /// 发送同步进度事件
    fn emit_progress(&self, account_id: i64, current: usize, total: usize, status: SyncStatus) {
        if let Some(emitter) = &self.event_emitter {
            emitter.emit_sync_progress(SyncProgressEvent {
                account_id,
                current,
                total,
                status,
            });
        }
    }

    /// 从数据库读取最大同步数量配置
    async fn get_max_sync_count(&self) -> Result<usize, AppError> {
        let result: (i64,) = sqlx::query_as(
            "SELECT max_sync_count FROM sync_settings WHERE id = 1"
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(result.0 as usize)
    }

    /// 添加邮件账户
    pub async fn add_account(
        &self,
        email: String,
        provider: ProviderConfig,
    ) -> Result<i64, AppError> {
        let imap_config = serde_json::to_string(&provider.imap)
            .map_err(|e| AppError::Generic(format!("Failed to serialize config: {}", e)))?;

        let result = sqlx::query(
            "INSERT INTO accounts (email, provider, imap_config) VALUES (?, ?, ?)"
        )
        .bind(&email)
        .bind(&provider.name)
        .bind(&imap_config)
        .execute(&self.pool)
        .await?;

        Ok(result.last_insert_rowid())
    }

    /// 获取账户的最后同步 UID
    async fn get_last_synced_uid(&self, account_id: i64) -> Result<u32, AppError> {
        let result: Option<(i64,)> = sqlx::query_as(
            "SELECT MAX(CAST(raw_path AS INTEGER)) FROM emails WHERE account_id = ?"
        )
        .bind(account_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(result.and_then(|(uid,)| Some(uid as u32)).unwrap_or(0))
    }

    /// 同步单个账户的邮件
    pub async fn sync_account(
        &self,
        account_id: i64,
        auth: AuthMethod,
        provider: &ProviderConfig,
    ) -> Result<SyncProgress, AppError> {
        log::info!("Starting sync for account {}", account_id);

        // 1. 连接到 IMAP 服务器
        let mut conn = ImapConnection::connect_with_provider(provider, auth).await?;

        // 2. 选择收件箱
        let total = conn.select_folder("INBOX").await? as usize;
        log::info!("Inbox has {} messages", total);

        // 3. 获取上次同步的 UID
        let last_uid = self.get_last_synced_uid(account_id).await?;
        log::info!("Last synced UID: {}", last_uid);

        // 4. 从数据库读取同步配置
        let max_sync_count = self.get_max_sync_count().await.unwrap_or(100);
        let sync_all = max_sync_count >= 999999; // 999999 表示同步全部

        // 5. 获取新邮件的 UID 列表（优化：只获取最新的邮件）
        let range = if last_uid == 0 {
            // 首次同步
            if sync_all {
                // 同步全部邮件
                log::info!("Sync mode: ALL emails");
                "1:*".to_string()
            } else if total > max_sync_count {
                // 只获取最新的 N 封邮件
                // 如果邮箱有 10000 封，max_sync_count=100，则获取 9901:*
                let start_uid = (total - max_sync_count) as u32 + 1;
                log::info!("Sync mode: Latest {} emails (from UID {})", max_sync_count, start_uid);
                format!("{}:*", start_uid)
            } else {
                // 邮箱总数少于限制，获取全部
                log::info!("Sync mode: All {} emails (less than limit)", total);
                "1:*".to_string()
            }
        } else {
            // 增量同步：获取上次同步后的新邮件
            log::info!("Sync mode: Incremental from UID {}", last_uid + 1);
            format!("{}:*", last_uid + 1)
        };

        log::info!("Fetching UIDs with range: {}", range);
        let mut uids = conn.fetch_uids(&range).await?;
        log::info!("Found {} new messages", uids.len());

        // 调试：显示前 20 个 UID
        if uids.len() > 0 {
            let preview: Vec<u32> = uids.iter().take(20).copied().collect();
            log::debug!("First 20 UIDs: {:?}", preview);
        }

        // 6. 对于增量同步，如果新邮件超过限制且未设置同步全部，只取最新的
        if !sync_all && last_uid > 0 && uids.len() > max_sync_count {
            // 反转后取前 N 个，再反转回来（保持从旧到新的顺序）
            uids.reverse();
            uids.truncate(max_sync_count);
            uids.reverse();
            log::info!("Limited to {} newest messages", max_sync_count);
        }

        let uids_to_sync = uids;
        log::info!("Syncing {} messages", uids_to_sync.len());

        // 5. 下载并保存邮件
        let mut current = 0;
        for uid in &uids_to_sync {
            current += 1;

            log::info!("Fetching email {}/{} (UID: {})", current, uids_to_sync.len(), uid);

            // 发送进度事件
            self.emit_progress(account_id, current, uids_to_sync.len(), SyncStatus::Syncing);

            // 使用 match 捕获所有错误并记录详细信息
            let result = async {
                // 下载邮件
                log::debug!("Downloading email UID {}", uid);
                let raw_data = conn.fetch_email(*uid).await
                    .map_err(|e| AppError::Generic(format!("Failed to download email UID {}: {}", uid, e)))?;
                log::debug!("Downloaded {} bytes for UID {}", raw_data.len(), uid);

                // 解析邮件
                log::debug!("Parsing email UID {}", uid);
                let parsed = parse_email(&raw_data)
                    .map_err(|e| AppError::Generic(format!("Failed to parse email UID {}: {}", uid, e)))?;
                log::debug!("Parsed email UID {}, subject: {:?}", uid, parsed.subject);

                // 保存到数据库
                log::debug!("Saving email UID {} to database", uid);
                self.save_email(account_id, *uid, &parsed).await
                    .map_err(|e| AppError::Generic(format!("Failed to save email UID {}: {}", uid, e)))?;

                // 获取刚保存的邮件 ID
                log::debug!("Getting email ID for message_id: {}", parsed.message_id);
                let email_id = self.get_email_id_by_message_id(&parsed.message_id, account_id).await
                    .map_err(|e| AppError::Generic(format!("Failed to get email ID for UID {}: {}", uid, e)))?;

                // 自动分类到项目
                log::debug!("Classifying email {}", email_id);
                let classifier = crate::project::classifier::ProjectClassifier::new(self.pool.clone());
                if let Err(e) = classifier.classify_email(email_id).await {
                    log::warn!("Failed to classify email {}: {}", email_id, e);
                }

                // 保存附件
                log::debug!("Saving {} attachments for email {}", parsed.attachments.len(), email_id);
                for (idx, attachment) in parsed.attachments.iter().enumerate() {
                    self.save_attachment(account_id, &parsed.message_id, idx, attachment).await
                        .map_err(|e| AppError::Generic(format!("Failed to save attachment {} for UID {}: {}", idx, uid, e)))?;
                }

                Ok::<(), AppError>(())
            }.await;

            // 处理错误
            match result {
                Ok(_) => {
                    log::info!("Successfully processed email UID {}", uid);
                }
                Err(e) => {
                    // 如果是 "not found" 错误，说明邮件已被删除，这是正常情况
                    if e.to_string().contains("not found") {
                        log::warn!("Email UID {} not found (may have been deleted), skipping", uid);
                    } else {
                        log::error!("Failed to process email UID {}: {}", uid, e);
                    }
                    // 继续处理下一封邮件，而不是中断整个同步
                    continue;
                }
            }
        }

        // 6. 登出
        conn.logout().await?;

        let synced_count = uids_to_sync.len();
        log::info!("Sync completed for account {}: {} new emails", account_id, synced_count);

        // 发送完成事件
        self.emit_progress(account_id, synced_count, synced_count, SyncStatus::Completed);

        Ok(SyncProgress {
            account_id,
            current: synced_count,
            total: synced_count,
            status: "completed".to_string(),
        })
    }

    /// 保存邮件到数据库
    async fn save_email(
        &self,
        account_id: i64,
        uid: u32,
        parsed: &ParsedEmail,
    ) -> Result<(), AppError> {
        let thread_id = generate_thread_id(parsed);
        let recipients = serde_json::to_string(&parsed.to).unwrap_or_default();

        sqlx::query(
            r#"
            INSERT OR REPLACE INTO emails (
                message_id, account_id, thread_id, subject, sender, recipients,
                date, body_text, body_html, has_attachments, raw_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&parsed.message_id)
        .bind(account_id)
        .bind(&thread_id)
        .bind(&parsed.subject)
        .bind(&parsed.from)
        .bind(&recipients)
        .bind(&parsed.date)
        .bind(&parsed.body_text)
        .bind(&parsed.body_html)
        .bind(!parsed.attachments.is_empty())
        .bind(uid.to_string()) // 使用 UID 作为 raw_path
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// 根据 message_id 获取邮件 ID
    async fn get_email_id_by_message_id(&self, message_id: &str, account_id: i64) -> Result<i64, AppError> {
        let result: (i64,) = sqlx::query_as(
            "SELECT id FROM emails WHERE message_id = ? AND account_id = ?"
        )
        .bind(message_id)
        .bind(account_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(result.0)
    }

    /// 保存附件到数据库和文件系统
    async fn save_attachment(
        &self,
        account_id: i64,
        message_id: &str,
        _index: usize,
        attachment: &crate::mail::parser::ParsedAttachment,
    ) -> Result<(), AppError> {
        // 首先获取邮件的 ID
        let email_id: Option<(i64,)> = sqlx::query_as(
            "SELECT id FROM emails WHERE message_id = ? AND account_id = ?"
        )
        .bind(message_id)
        .bind(account_id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some((email_id,)) = email_id {
            // 保存附件文件到文件系统
            let file_path = self.save_attachment_file(account_id, email_id, attachment).await?;

            // 计算文件哈希
            let content_hash = calculate_sha256(&attachment.data);

            sqlx::query(
                r#"
                INSERT INTO attachments (
                    email_id, filename, file_type, file_size, mime_type, file_path, content_hash
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                "#
            )
            .bind(email_id)
            .bind(&attachment.filename)
            .bind(extract_file_extension(&attachment.filename))
            .bind(attachment.size as i64)
            .bind(&attachment.content_type)
            .bind(&file_path)
            .bind(&content_hash)
            .execute(&self.pool)
            .await?;

            log::info!("Saved attachment: {} ({} bytes) to {}", attachment.filename, attachment.size, file_path);
        }

        Ok(())
    }

    /// 保存附件文件到文件系统
    async fn save_attachment_file(
        &self,
        account_id: i64,
        email_id: i64,
        attachment: &crate::mail::parser::ParsedAttachment,
    ) -> Result<String, AppError> {
        use tokio::fs;

        // 获取应用数据目录（使用环境变量或默认路径）
        let app_data_dir = std::env::var("APPDATA")
            .or_else(|_| std::env::var("HOME").map(|h| format!("{}/.config", h)))
            .map(|p| std::path::PathBuf::from(p).join("com.threadline.app"))
            .map_err(|e| AppError::Generic(format!("Failed to get app data directory: {}", e)))?;

        // 构建附件存储路径: ~/.threadline/attachments/{file_type}/{account_id}/{email_id}/
        let file_type = extract_file_extension(&attachment.filename);
        let attachment_dir = app_data_dir
            .join("attachments")
            .join(&file_type)
            .join(account_id.to_string())
            .join(email_id.to_string());

        // 创建目录
        fs::create_dir_all(&attachment_dir).await
            .map_err(|e| AppError::Generic(format!("Failed to create attachment directory: {}", e)))?;

        // 生成安全的文件名（避免路径遍历攻击）
        let safe_filename = sanitize_filename(&attachment.filename);
        let file_path = attachment_dir.join(&safe_filename);

        // 写入文件
        fs::write(&file_path, &attachment.data).await
            .map_err(|e| AppError::Generic(format!("Failed to write attachment file: {}", e)))?;

        // 返回相对路径（用于数据库存储）
        Ok(format!("{}/{}/{}/{}", file_type, account_id, email_id, safe_filename))
    }
}

/// 提取文件扩展名
fn extract_file_extension(filename: &str) -> String {
    std::path::Path::new(filename)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("unknown")
        .to_string()
}

/// 计算 SHA256 哈希
fn calculate_sha256(data: &[u8]) -> String {
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(data);
    format!("{:x}", hasher.finalize())
}

/// 清理文件名，移除不安全字符
fn sanitize_filename(filename: &str) -> String {
    filename
        .chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ => c,
        })
        .collect()
}
