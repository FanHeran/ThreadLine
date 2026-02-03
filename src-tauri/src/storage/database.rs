use rusqlite::Connection;
use std::fs;

use tauri::{AppHandle, Manager};
use anyhow::Result;

const DB_NAME: &str = "threadline.db";

pub fn init(app: &AppHandle) -> Result<()> {
    let app_data_dir = app.path().app_data_dir()?;
    
    if !app_data_dir.exists() {
        fs::create_dir_all(&app_data_dir)?;
    }

    let db_path = app_data_dir.join(DB_NAME);
    let conn = Connection::open(db_path)?;

    // Enable WAL mode for better concurrency
    conn.execute_batch("PRAGMA journal_mode = WAL;")?;

    // Create Tables
    conn.execute_batch(
        r#"
        -- Accounts Table
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            provider TEXT,
            imap_config TEXT,
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
        "#
    )?;

    println!("Database initialized successfully.");
    Ok(())
}
