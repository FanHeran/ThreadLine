pub mod database;
pub mod file_manager;
pub mod cache;
pub mod mock_data;

pub struct StorageManager;

impl StorageManager {
    pub fn new() -> Self {
        Self
    }
}
