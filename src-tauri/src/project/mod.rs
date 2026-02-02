use serde::{Deserialize, Serialize};

pub mod classifier;
pub mod lifecycle;
pub mod merger;

#[derive(Debug, Serialize, Deserialize)]
pub struct Project {
    pub id: i64,
    pub title: String, // DB column is 'name', but UI uses 'title'. Let's map it or use rename. UI 'ProjectData' has 'title'.
    pub description: Option<String>,
    pub status: String,
    pub is_pinned: bool,
    pub last_updated: String, // DB 'updated_at'
    pub stats: ProjectStats,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectStats {
    pub emails: i64,
    pub attachments: i64,
}

