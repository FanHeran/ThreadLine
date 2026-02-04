/// 应用事件系统模块
/// 
/// 提供统一的事件发送接口，用于后台任务进度通知
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

/// 同步进度事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncProgressEvent {
    pub account_id: i64,
    pub current: usize,
    pub total: usize,
    pub status: SyncStatus,
}

/// 同步状态
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SyncStatus {
    Starting,
    Syncing,
    Completed,
    Failed,
}

/// OCR 进度事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrProgressEvent {
    pub attachment_id: i64,
    pub file_name: String,
    pub current: usize,
    pub total: usize,
    pub status: OcrStatus,
}

/// OCR 状态
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OcrStatus {
    Starting,
    Processing,
    Completed,
    Failed,
}

/// 索引构建进度事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexProgressEvent {
    pub current: usize,
    pub total: usize,
    pub status: IndexStatus,
    pub index_type: String, // "email", "attachment", "project"
}

/// 索引状态
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum IndexStatus {
    Starting,
    Building,
    Completed,
    Failed,
}

/// 事件发射器
/// 
/// 提供类型安全的事件发送接口
pub struct EventEmitter {
    app_handle: AppHandle,
}

impl EventEmitter {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }

    /// 发送同步进度事件
    pub fn emit_sync_progress(&self, event: SyncProgressEvent) {
        if let Err(e) = self.app_handle.emit("sync-progress", &event) {
            log::warn!("Failed to emit sync progress event: {}", e);
        }
    }

    /// 发送 OCR 进度事件
    pub fn emit_ocr_progress(&self, event: OcrProgressEvent) {
        if let Err(e) = self.app_handle.emit("ocr-progress", &event) {
            log::warn!("Failed to emit OCR progress event: {}", e);
        }
    }

    /// 发送索引构建进度事件
    pub fn emit_index_progress(&self, event: IndexProgressEvent) {
        if let Err(e) = self.app_handle.emit("index-progress", &event) {
            log::warn!("Failed to emit index progress event: {}", e);
        }
    }

    /// 发送通用通知事件
    pub fn emit_notification(&self, title: &str, message: &str, level: NotificationLevel) {
        let event = NotificationEvent {
            title: title.to_string(),
            message: message.to_string(),
            level,
        };
        if let Err(e) = self.app_handle.emit("notification", &event) {
            log::warn!("Failed to emit notification event: {}", e);
        }
    }
}

/// 通知事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationEvent {
    pub title: String,
    pub message: String,
    pub level: NotificationLevel,
}

/// 通知级别
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NotificationLevel {
    Info,
    Success,
    Warning,
    Error,
}

