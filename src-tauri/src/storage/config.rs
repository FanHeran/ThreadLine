/// OAuth 配置存储
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::fs;
use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthClientConfig {
    pub provider: String,  // "gmail" or "outlook"
    pub client_id: String,
    pub client_secret: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppConfig {
    pub oauth_clients: Vec<OAuthClientConfig>,
}

impl AppConfig {
    /// 获取配置文件路径
    fn config_path() -> Result<PathBuf, AppError> {
        let config_dir = dirs::config_dir()
            .ok_or_else(|| AppError::Generic("Failed to get config directory".to_string()))?;
        
        let app_config_dir = config_dir.join("ThreadLine");
        Ok(app_config_dir.join("config.json"))
    }

    /// 加载配置
    pub async fn load() -> Result<Self, AppError> {
        let path = Self::config_path()?;
        
        if !path.exists() {
            log::info!("Config file not found, creating default config");
            return Ok(Self::default());
        }

        let content = fs::read_to_string(&path)
            .await
            .map_err(|e| AppError::Generic(format!("Failed to read config: {}", e)))?;

        let config: Self = serde_json::from_str(&content)
            .map_err(|e| AppError::Generic(format!("Failed to parse config: {}", e)))?;

        Ok(config)
    }

    /// 保存配置
    pub async fn save(&self) -> Result<(), AppError> {
        let path = Self::config_path()?;
        
        // 确保目录存在
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .await
                .map_err(|e| AppError::Generic(format!("Failed to create config directory: {}", e)))?;
        }

        let content = serde_json::to_string_pretty(self)
            .map_err(|e| AppError::Generic(format!("Failed to serialize config: {}", e)))?;

        fs::write(&path, content)
            .await
            .map_err(|e| AppError::Generic(format!("Failed to write config: {}", e)))?;

        log::info!("Config saved to {:?}", path);
        Ok(())
    }

    /// 添加或更新 OAuth 客户端配置
    pub fn set_oauth_client(&mut self, provider: String, client_id: String, client_secret: String) {
        // 移除旧的配置
        self.oauth_clients.retain(|c| c.provider != provider);
        
        // 添加新配置
        self.oauth_clients.push(OAuthClientConfig {
            provider,
            client_id,
            client_secret,
        });
    }

    /// 获取 OAuth 客户端配置
    pub fn get_oauth_client(&self, provider: &str) -> Option<&OAuthClientConfig> {
        self.oauth_clients.iter().find(|c| c.provider == provider)
    }
}

