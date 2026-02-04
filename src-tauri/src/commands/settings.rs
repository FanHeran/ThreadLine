/// 设置相关命令
use crate::error::ErrorResponse;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tauri::State;

/// 同步设置
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SyncSettings {
    pub id: i64,
    pub max_sync_count: i64,
    pub auto_sync_enabled: bool,
    pub sync_interval_minutes: i64,
    pub sync_attachments: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// 获取同步设置
#[tauri::command]
pub async fn get_sync_settings(
    pool: State<'_, SqlitePool>,
) -> Result<SyncSettings, ErrorResponse> {
    log::info!("Getting sync settings");

    let settings = sqlx::query_as::<_, SyncSettings>(
        r#"
        SELECT id, max_sync_count, auto_sync_enabled, sync_interval_minutes, 
               sync_attachments, created_at, updated_at
        FROM sync_settings
        WHERE id = 1
        "#
    )
    .fetch_one(pool.inner())
    .await
    .map_err(|e: sqlx::Error| -> ErrorResponse {
        log::error!("Failed to get sync settings: {}", e);
        crate::error::AppError::Database(e).into()
    })?;

    log::info!("Sync settings retrieved: {:?}", settings);
    Ok(settings)
}

/// 更新同步设置请求
#[derive(Debug, Deserialize)]
pub struct UpdateSyncSettingsRequest {
    pub max_sync_count: i64,
    pub auto_sync_enabled: bool,
    pub sync_interval_minutes: i64,
    pub sync_attachments: bool,
}

/// 更新同步设置
#[tauri::command]
pub async fn update_sync_settings(
    pool: State<'_, SqlitePool>,
    request: UpdateSyncSettingsRequest,
) -> Result<(), ErrorResponse> {
    log::info!("Updating sync settings: {:?}", request);

    sqlx::query(
        r#"
        UPDATE sync_settings
        SET max_sync_count = ?,
            auto_sync_enabled = ?,
            sync_interval_minutes = ?,
            sync_attachments = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
        "#
    )
    .bind(request.max_sync_count)
    .bind(request.auto_sync_enabled)
    .bind(request.sync_interval_minutes)
    .bind(request.sync_attachments)
    .execute(pool.inner())
    .await
    .map_err(|e: sqlx::Error| -> ErrorResponse {
        log::error!("Failed to update sync settings: {}", e);
        crate::error::AppError::Database(e).into()
    })?;

    log::info!("Sync settings updated successfully");
    Ok(())
}

