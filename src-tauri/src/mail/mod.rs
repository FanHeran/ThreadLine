use serde::{Serialize, Deserialize};

pub mod imap_client;
pub mod parser;
pub mod thread;
pub mod sync;

#[derive(Debug, Serialize, Deserialize)]
pub struct EmailPreview {
    pub id: i64,
    pub subject: String,
    pub sender: String,
    pub date: String,
    pub preview: String,
    pub has_attachments: bool,
}
