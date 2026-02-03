use serde::{Serialize, Deserialize};

pub mod extractor;
pub mod parser;
pub mod ocr;
pub mod archive;

#[derive(Debug, Serialize, Deserialize)]
pub struct Artifact {
    pub id: i64,
    pub filename: String,
    pub file_type: String, // e.g., 'pdf', 'docx'
    pub file_size: i64,
    pub mime_type: Option<String>,
    pub source_email_id: Option<i64>, 
    pub created_at: String,
}
