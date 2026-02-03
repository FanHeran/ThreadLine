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

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")] // 'milestone' | 'email' | 'thread'
pub enum TimelineEvent {
    Milestone(MilestoneEvent),
    Email(EmailEvent),
    Thread(ThreadEvent),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MilestoneEvent {
    pub id: String,
    pub date: String,
    pub title: String,
    pub status: String,
    pub children: Vec<TimelineEvent>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EmailEvent {
    pub id: String,
    pub date: String,
    pub sender: String,
    pub content: String,
    pub subject: String,
    // pub attachments: Vec<Attachment>, // skipping for now or use placeholder
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ThreadEvent {
    pub id: String,
    pub date: String, // Latest date in thread
    pub children: Vec<TimelineEvent>, // Usually EmailEvents
}

