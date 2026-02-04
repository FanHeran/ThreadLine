use crate::artifacts::Artifact;

#[tauri::command]
pub fn get_artifact(id: String) {
    log::info!("Getting artifact: {}", id);
}

#[tauri::command]
pub fn get_project_artifacts(_project_id: i64) -> Result<Vec<Artifact>, String> {
    // TODO: 迁移到 repository 模式
    log::warn!("get_project_artifacts not yet implemented with SQLx");
    Ok(vec![])
}
