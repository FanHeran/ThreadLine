/// 邮件同步相关命令
use crate::error::ErrorResponse;
use crate::events::EventEmitter;
use crate::mail::imap_client::AuthMethod;
use crate::mail::providers::{detect_provider, get_provider_configs};
use crate::mail::sync::{EmailSyncer, SyncProgress};
use sqlx::SqlitePool;
use tauri::State;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AddAccountRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AddOAuthAccountRequest {
    pub email: String,
    pub provider: String,
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncAccountRequest {
    pub email: String,
    pub password: Option<String>,  // 仅用于密码认证
}

/// 前端兼容的 Provider 结构
#[derive(Debug, Serialize, Deserialize)]
pub struct ProviderResponse {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub use_tls: bool,
    pub supports_oauth: bool,
}

/// 重置账户的同步状态（清空所有邮件和项目，重新开始同步）
#[tauri::command]
pub async fn reset_account_sync(
    email: String,
    pool: State<'_, SqlitePool>,
) -> Result<(), ErrorResponse> {
    log::info!("Resetting sync state for account: {}", email);

    // 1. 获取账户 ID
    let account: Option<(i64,)> = sqlx::query_as(
        "SELECT id FROM accounts WHERE email = ?"
    )
    .bind(&email)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| ErrorResponse {
        code: "DB_ERROR".to_string(),
        message: format!("Failed to find account: {}", e),
        details: None,
    })?;

    let account_id = account.ok_or_else(|| ErrorResponse {
        code: "NOT_FOUND".to_string(),
        message: "Account not found".to_string(),
        details: None,
    })?.0;

    // 2. 删除该账户的所有邮件
    sqlx::query("DELETE FROM emails WHERE account_id = ?")
        .bind(account_id)
        .execute(pool.inner())
        .await
        .map_err(|e| ErrorResponse {
            code: "DB_ERROR".to_string(),
            message: format!("Failed to delete emails: {}", e),
            details: None,
        })?;

    // 3. 删除该账户的所有项目
    sqlx::query("DELETE FROM projects WHERE id IN (SELECT DISTINCT project_id FROM emails WHERE account_id = ?)")
        .bind(account_id)
        .execute(pool.inner())
        .await
        .map_err(|e| ErrorResponse {
            code: "DB_ERROR".to_string(),
            message: format!("Failed to delete projects: {}", e),
            details: None,
        })?;

    // 4. 重置同步状态
    sqlx::query("UPDATE accounts SET last_synced_uid = 0 WHERE id = ?")
        .bind(account_id)
        .execute(pool.inner())
        .await
        .map_err(|e| ErrorResponse {
            code: "DB_ERROR".to_string(),
            message: format!("Failed to reset sync state: {}", e),
            details: None,
        })?;

    log::info!("Successfully reset sync state for account {}", email);
    Ok(())
}

/// 获取支持的邮箱服务商列表
#[tauri::command]
pub async fn get_email_providers() -> Result<Vec<ProviderResponse>, ErrorResponse> {
    let configs = get_provider_configs();
    let providers = configs
        .into_iter()
        .map(|config| ProviderResponse {
            name: config.display_name,
            host: config.imap.host,
            port: config.imap.port,
            use_tls: config.imap.use_tls,
            supports_oauth: config.oauth_supported,
        })
        .collect();
    Ok(providers)
}

/// 添加邮件账户
#[tauri::command]
pub async fn add_email_account(
    pool: State<'_, SqlitePool>,
    request: AddAccountRequest,
) -> Result<i64, ErrorResponse> {
    log::info!("Adding email account: {}", request.email);

    // 自动检测服务商
    let provider = detect_provider(&request.email)
        .ok_or_else(|| ErrorResponse {
            code: "UNSUPPORTED_PROVIDER".to_string(),
            message: format!("Unsupported email provider for: {}", request.email),
            details: None,
        })?;

    log::info!("Detected provider: {}", provider.name);

    // 创建同步器
    let syncer = EmailSyncer::new(pool.inner().clone());

    // 添加账户
    let account_id = syncer
        .add_account(request.email.clone(), provider)
        .await
        .map_err(|e: crate::error::AppError| -> ErrorResponse { e.into() })?;

    log::info!("Account added with ID: {}", account_id);

    Ok(account_id)
}

/// 添加 OAuth 邮件账户
#[tauri::command]
pub async fn add_oauth_email_account(
    pool: State<'_, SqlitePool>,
    request: AddOAuthAccountRequest,
) -> Result<i64, ErrorResponse> {
    log::info!("Adding OAuth email account: {}", request.email);

    // 自动检测服务商
    let provider_config = detect_provider(&request.email)
        .ok_or_else(|| ErrorResponse {
            code: "UNSUPPORTED_PROVIDER".to_string(),
            message: format!("Unsupported email provider for: {}", request.email),
            details: None,
        })?;

    log::info!("Detected provider: {}", provider_config.name);

    // 序列化 IMAP 配置
    let imap_config = serde_json::to_string(&provider_config.imap)
        .map_err(|e| ErrorResponse {
            code: "SERIALIZATION_ERROR".to_string(),
            message: format!("Failed to serialize config: {}", e),
            details: None,
        })?;

    // 计算 token 过期时间
    let expires_at = request.expires_in.map(|exp| {
        chrono::Utc::now().timestamp() + exp
    });

    // 插入账户到数据库
    let result = sqlx::query(
        r#"
        INSERT INTO accounts (
            email, provider, imap_config, auth_type,
            oauth_access_token, oauth_refresh_token, oauth_token_expires_at
        ) VALUES (?, ?, ?, 'oauth', ?, ?, ?)
        "#
    )
    .bind(&request.email)
    .bind(&provider_config.name)
    .bind(&imap_config)
    .bind(&request.access_token)
    .bind(&request.refresh_token)
    .bind(expires_at)
    .execute(pool.inner())
    .await
    .map_err(|e| ErrorResponse {
        code: "DB_ERROR".to_string(),
        message: format!("Failed to insert account: {}", e),
        details: None,
    })?;

    let account_id = result.last_insert_rowid();
    log::info!("OAuth account added with ID: {}", account_id);

    Ok(account_id)
}

/// 同步邮件账户
#[tauri::command]
pub async fn sync_email_account(
    pool: State<'_, SqlitePool>,
    app: tauri::AppHandle,
    request: SyncAccountRequest,
) -> Result<SyncProgress, ErrorResponse> {
    log::info!("Syncing account: {}", request.email);

    // 从数据库获取账户信息
    #[derive(sqlx::FromRow)]
    #[allow(dead_code)]
    struct AccountRow {
        id: i64,
        email: String,
        provider: String,
        imap_config: String,
        auth_type: String,
        password: Option<String>,
        oauth_access_token: Option<String>,
    }

    let account = sqlx::query_as::<_, AccountRow>(
        "SELECT id, email, provider, imap_config, auth_type, password, oauth_access_token FROM accounts WHERE email = ?"
    )
    .bind(&request.email)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| ErrorResponse {
        code: "DB_ERROR".to_string(),
        message: format!("Failed to fetch account: {}", e),
        details: None,
    })?
    .ok_or_else(|| ErrorResponse {
        code: "ACCOUNT_NOT_FOUND".to_string(),
        message: format!("Account {} not found", request.email),
        details: None,
    })?;

    // 重建 provider 配置
    let provider = detect_provider(&account.email)
        .ok_or_else(|| ErrorResponse {
            code: "UNSUPPORTED_PROVIDER".to_string(),
            message: format!("Unsupported email provider for: {}", account.email),
            details: None,
        })?;

    // 根据认证类型创建认证方法
    let auth = match account.auth_type.as_str() {
        "oauth" => {
            let access_token = account.oauth_access_token
                .ok_or_else(|| ErrorResponse {
                    code: "MISSING_TOKEN".to_string(),
                    message: "OAuth access token not found".to_string(),
                    details: None,
                })?;

            log::info!("Using OAuth authentication for {}", account.email);
            AuthMethod::OAuth {
                username: account.email.clone(),
                access_token,
            }
        }
        "password" => {
            let password = request.password
                .or(account.password)
                .ok_or_else(|| ErrorResponse {
                    code: "MISSING_PASSWORD".to_string(),
                    message: "Password required for password authentication".to_string(),
                    details: None,
                })?;

            log::info!("Using password authentication for {}", account.email);
            AuthMethod::Password {
                username: account.email.clone(),
                password,
            }
        }
        _ => {
            return Err(ErrorResponse {
                code: "INVALID_AUTH_TYPE".to_string(),
                message: format!("Invalid auth type: {}", account.auth_type),
                details: None,
            });
        }
    };

    // 创建事件发射器和同步器
    let event_emitter = EventEmitter::new(app);
    let syncer = EmailSyncer::with_event_emitter(pool.inner().clone(), event_emitter);

    let progress = syncer
        .sync_account(account.id, auth, &provider)
        .await
        .map_err(|e: crate::error::AppError| -> ErrorResponse { e.into() })?;

    log::info!("Sync completed: {:?}", progress);

    Ok(progress)
}

/// 获取所有邮件账户
#[tauri::command]
pub async fn list_email_accounts(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<EmailAccountInfo>, ErrorResponse> {
    #[derive(sqlx::FromRow)]
    struct AccountRow {
        id: i64,
        email: String,
        provider: String,
        created_at: Option<String>,
    }

    let rows = sqlx::query_as::<_, AccountRow>(
        "SELECT id, email, provider, created_at FROM accounts ORDER BY created_at DESC"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| ErrorResponse {
        code: "DB_ERROR".to_string(),
        message: format!("Failed to fetch accounts: {}", e),
        details: None,
    })?;

    let accounts = rows
        .into_iter()
        .map(|row| EmailAccountInfo {
            id: row.id,
            email: row.email,
            provider: row.provider,
            created_at: row.created_at.unwrap_or_default(),
        })
        .collect();

    Ok(accounts)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EmailAccountInfo {
    pub id: i64,
    pub email: String,
    pub provider: String,
    pub created_at: String,
}

