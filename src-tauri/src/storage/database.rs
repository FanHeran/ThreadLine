use sqlx::{SqlitePool, sqlite::SqlitePoolOptions};
use std::fs;

use tauri::{AppHandle, Manager};
use anyhow::Result;

const DB_NAME: &str = "threadline.db";

/// 初始化数据库连接池
pub async fn init_pool(app: &AppHandle) -> Result<SqlitePool> {
    let app_data_dir = app.path().app_data_dir()?;

    // 确保目录存在
    if !app_data_dir.exists() {
        log::info!("Creating app data directory: {:?}", app_data_dir);
        fs::create_dir_all(&app_data_dir)?;
    }

    let db_path = app_data_dir.join(DB_NAME);
    log::info!("Database path: {:?}", db_path);

    // 添加 ?mode=rwc 允许创建数据库文件
    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());

    // 创建连接池
    log::info!("Connecting to database: {}", db_url);
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .map_err(|e| {
            log::error!("Failed to connect to database: {}", e);
            e
        })?;

    // Enable WAL mode for better concurrency
    sqlx::query("PRAGMA journal_mode = WAL;")
        .execute(&pool)
        .await?;

    // Create Tables
    sqlx::query(
        r#"
        -- Accounts Table
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            provider TEXT,
            imap_config TEXT,
            auth_type TEXT DEFAULT 'password',  -- 'password' or 'oauth'
            password TEXT,  -- 用于密码认证
            oauth_access_token TEXT,  -- OAuth access token
            oauth_refresh_token TEXT,  -- OAuth refresh token
            oauth_token_expires_at INTEGER,  -- Token 过期时间 (Unix timestamp)
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Projects Table
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'active',
            color TEXT,
            is_pinned BOOLEAN DEFAULT 0,
            email_count INTEGER DEFAULT 0,
            attachment_count INTEGER DEFAULT 0,
            tags TEXT,  -- JSON array of tags
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Emails Table
        CREATE TABLE IF NOT EXISTS emails (
            id INTEGER PRIMARY KEY,
            message_id TEXT UNIQUE NOT NULL,
            account_id INTEGER,
            thread_id TEXT,
            project_id INTEGER,
            subject TEXT,
            sender TEXT,
            recipients TEXT,
            date DATETIME,
            body_text TEXT,
            body_html TEXT,
            has_attachments BOOLEAN,
            is_read BOOLEAN DEFAULT 0,
            is_starred BOOLEAN DEFAULT 0,
            raw_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (account_id) REFERENCES accounts(id),
            FOREIGN KEY (project_id) REFERENCES projects(id)
        );

        -- Attachments Table
        CREATE TABLE IF NOT EXISTS attachments (
            id INTEGER PRIMARY KEY,
            email_id INTEGER,
            project_id INTEGER,
            filename TEXT NOT NULL,
            file_type TEXT,
            file_size INTEGER,
            mime_type TEXT,
            file_path TEXT,
            content_hash TEXT,
            parsed_content_path TEXT,
            ocr_content_path TEXT,
            index_status TEXT DEFAULT 'pending',
            index_reason TEXT,
            indexed_at DATETIME,
            status TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (email_id) REFERENCES emails(id),
            FOREIGN KEY (project_id) REFERENCES projects(id)
        );

        -- Milestones Table
        CREATE TABLE IF NOT EXISTS milestones (
            id INTEGER PRIMARY KEY,
            project_id INTEGER,
            email_id INTEGER,
            type TEXT,
            title TEXT,
            date DATETIME,
            FOREIGN KEY (project_id) REFERENCES projects(id),
            FOREIGN KEY (email_id) REFERENCES emails(id)
        );

        -- Sync Settings Table
        CREATE TABLE IF NOT EXISTS sync_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),  -- 单例模式，只允许一条记录
            max_sync_count INTEGER DEFAULT 100,  -- 最大同步邮件数
            auto_sync_enabled BOOLEAN DEFAULT 1,  -- 是否自动同步
            sync_interval_minutes INTEGER DEFAULT 15,  -- 自动同步间隔（分钟）
            sync_attachments BOOLEAN DEFAULT 1,  -- 是否同步附件
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- 插入默认配置（如果不存在）
        INSERT OR IGNORE INTO sync_settings (id) VALUES (1);
        "#
    )
    .execute(&pool)
    .await?;

    log::info!("Database initialized successfully.");
    Ok(pool)
}
