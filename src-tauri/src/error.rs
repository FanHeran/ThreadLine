use serde::{Deserialize, Serialize};
use thiserror::Error;

/// 应用错误类型
#[derive(Debug, Error)]
pub enum AppError {
    /// 数据库错误
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    /// IO 错误
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    /// 项目未找到
    #[error("Project not found: {id}")]
    ProjectNotFound { id: i64 },

    /// 邮件未找到
    #[error("Email not found: {id}")]
    EmailNotFound { id: i64 },

    /// 附件未找到
    #[error("Attachment not found: {id}")]
    AttachmentNotFound { id: i64 },

    /// 网络错误
    #[error("Network error: {0}")]
    Network(String),

    /// IMAP 错误
    #[error("IMAP error: {0}")]
    Imap(String),

    /// 解析错误
    #[error("Parse error: {0}")]
    Parse(String),

    /// 索引错误
    #[error("Index error: {0}")]
    Index(String),

    /// 验证错误
    #[error("Validation error: {0}")]
    Validation(String),

    /// 配置错误
    #[error("Config error: {0}")]
    Config(String),

    /// 文件系统错误
    #[error("File system error: {0}")]
    FileSystem(String),

    /// 任务执行错误
    #[error("Task execution error: {0}")]
    TaskExecution(String),

    /// 序列化错误
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    /// 通用错误
    #[error("{0}")]
    Generic(String),
}

/// 前端错误响应
#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    /// 错误代码
    pub code: String,
    /// 错误消息
    pub message: String,
    /// 错误详情（可选）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

impl From<AppError> for ErrorResponse {
    fn from(err: AppError) -> Self {
        match err {
            AppError::Database(e) => ErrorResponse {
                code: "DB_ERROR".to_string(),
                message: e.to_string(),
                details: None,
            },
            AppError::Io(e) => ErrorResponse {
                code: "FS_IO_ERROR".to_string(),
                message: e.to_string(),
                details: None,
            },
            AppError::ProjectNotFound { id } => ErrorResponse {
                code: "PROJECT_NOT_FOUND".to_string(),
                message: format!("Project with id {} not found", id),
                details: Some(serde_json::json!({ "project_id": id })),
            },
            AppError::EmailNotFound { id } => ErrorResponse {
                code: "EMAIL_NOT_FOUND".to_string(),
                message: format!("Email with id {} not found", id),
                details: Some(serde_json::json!({ "email_id": id })),
            },
            AppError::AttachmentNotFound { id } => ErrorResponse {
                code: "ATTACHMENT_NOT_FOUND".to_string(),
                message: format!("Attachment with id {} not found", id),
                details: Some(serde_json::json!({ "attachment_id": id })),
            },
            AppError::Network(msg) => ErrorResponse {
                code: "NET_ERROR".to_string(),
                message: msg,
                details: None,
            },
            AppError::Imap(msg) => ErrorResponse {
                code: "NET_IMAP_ERROR".to_string(),
                message: msg,
                details: None,
            },
            AppError::Parse(msg) => ErrorResponse {
                code: "PARSE_ERROR".to_string(),
                message: msg,
                details: None,
            },
            AppError::Index(msg) => ErrorResponse {
                code: "IDX_ERROR".to_string(),
                message: msg,
                details: None,
            },
            AppError::Validation(msg) => ErrorResponse {
                code: "VAL_ERROR".to_string(),
                message: msg,
                details: None,
            },
            AppError::Config(msg) => ErrorResponse {
                code: "CONFIG_ERROR".to_string(),
                message: msg,
                details: None,
            },
            AppError::FileSystem(msg) => ErrorResponse {
                code: "FS_ERROR".to_string(),
                message: msg,
                details: None,
            },
            AppError::TaskExecution(msg) => ErrorResponse {
                code: "TASK_ERROR".to_string(),
                message: msg,
                details: None,
            },
            AppError::Serialization(e) => ErrorResponse {
                code: "SERIALIZATION_ERROR".to_string(),
                message: e.to_string(),
                details: None,
            },
            AppError::Generic(msg) => ErrorResponse {
                code: "GENERIC_ERROR".to_string(),
                message: msg,
                details: None,
            },
        }
    }
}

/// 用于 Tokio task join 错误
impl From<tokio::task::JoinError> for AppError {
    fn from(err: tokio::task::JoinError) -> Self {
        AppError::TaskExecution(err.to_string())
    }
}

