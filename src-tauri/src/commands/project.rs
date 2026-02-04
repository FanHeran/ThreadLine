use crate::error::ErrorResponse;
use crate::project::{Project, TimelineEvent};
use crate::repository::ProjectRepository;
use tauri::State;

/// 获取所有项目列表
#[tauri::command]
pub async fn list_projects(
    repo: State<'_, ProjectRepository>,
) -> Result<Vec<Project>, ErrorResponse> {
    repo.list_all()
        .await
        .map_err(Into::into)
}

/// 根据 ID 获取项目
#[tauri::command]
pub async fn get_project(
    repo: State<'_, ProjectRepository>,
    id: i64,
) -> Result<Project, ErrorResponse> {
    repo.get_by_id(id)
        .await
        .map_err(Into::into)
}

/// 获取项目时间线
#[tauri::command]
pub async fn get_project_timeline(
    repo: State<'_, ProjectRepository>,
    id: i64,
) -> Result<Vec<TimelineEvent>, ErrorResponse> {
    repo.get_timeline(id)
        .await
        .map_err(Into::into)
}

/// 置顶/取消置顶项目
#[tauri::command]
pub async fn toggle_project_pin(
    repo: State<'_, ProjectRepository>,
    id: i64,
) -> Result<bool, ErrorResponse> {
    repo.toggle_pin(id)
        .await
        .map_err(Into::into)
}

/// 归档项目
#[tauri::command]
pub async fn archive_project(
    repo: State<'_, ProjectRepository>,
    id: i64,
) -> Result<(), ErrorResponse> {
    repo.archive(id)
        .await
        .map_err(Into::into)
}

/// 取消归档项目
#[tauri::command]
pub async fn unarchive_project(
    repo: State<'_, ProjectRepository>,
    id: i64,
) -> Result<(), ErrorResponse> {
    repo.unarchive(id)
        .await
        .map_err(Into::into)
}

