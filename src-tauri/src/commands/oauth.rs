/// OAuth 2.0 认证命令
use crate::error::{AppError, ErrorResponse};
use crate::mail::oauth::{OAuthClient, OAuthProvider};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct OAuthConfig {
    pub provider: String,  // "gmail" or "outlook"
    pub client_id: String,
    pub client_secret: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct OAuthResult {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: Option<i64>,  // 秒数
    pub provider: String,
}

/// 启动 OAuth 2.0 授权流程
#[tauri::command]
pub async fn start_oauth_flow(config: OAuthConfig) -> Result<OAuthResult, ErrorResponse> {
    log::info!("Starting OAuth flow for provider: {}", config.provider);

    // 选择提供商配置
    let provider = match config.provider.to_lowercase().as_str() {
        "gmail" => OAuthProvider::gmail(),
        "outlook" => OAuthProvider::outlook(),
        _ => {
            return Err(AppError::Auth(format!(
                "Unsupported OAuth provider: {}",
                config.provider
            ))
            .into())
        }
    };

    // 使用提供的凭据或内置凭据
    let (client_id, client_secret) = if !config.client_id.is_empty() {
        // 用户提供了自定义凭据
        log::info!("Using user-provided OAuth credentials");
        (config.client_id, config.client_secret.or_else(|| Some(String::new())))
    } else {
        // 使用内置凭据
        log::info!("Using built-in OAuth credentials");
        let (id, secret) = provider.get_builtin_credentials()
            .ok_or_else(|| AppError::Auth(format!(
                "No built-in credentials for provider: {}. Please provide client_id and client_secret.",
                config.provider
            )))?;
        (id, Some(secret))
    };

    // 创建 OAuth 客户端
    let oauth_client = OAuthClient::new(client_id, client_secret, provider);

    // 启动授权流程
    let token_info = oauth_client
        .authorize()
        .await
        .map_err(|e| {
            log::error!("OAuth authorization failed: {:?}", e);
            e
        })?;

    Ok(OAuthResult {
        access_token: token_info.access_token,
        refresh_token: token_info.refresh_token,
        expires_in: token_info.expires_in,
        provider: config.provider,
    })
}

/// 获取 OAuth 配置说明
#[tauri::command]
pub fn get_oauth_instructions(provider: String) -> Result<String, ErrorResponse> {
    let instructions = match provider.to_lowercase().as_str() {
        "gmail" => {
            r#"Gmail OAuth 2.0 配置步骤：

1. 访问 Google Cloud Console: https://console.cloud.google.com/
2. 创建新项目或选择现有项目
3. 启用 Gmail API：
   - 在左侧菜单选择 "API 和服务" > "库"
   - 搜索 "Gmail API" 并启用
4. 创建 OAuth 2.0 客户端 ID：
   - 在左侧菜单选择 "API 和服务" > "凭据"
   - 点击 "创建凭据" > "OAuth 客户端 ID"
   - 应用类型：选择 "桌面应用"（Desktop app）
   - 名称：ThreadLine
5. 创建后会显示客户端 ID 和客户端密钥
   - 复制客户端 ID
   - 复制客户端密钥（可选，桌面应用可以不用）

注意事项：
- 首次使用会看到 "此应用未经验证" 警告
  点击"高级" > "转到 ThreadLine（不安全）"
- 如果是个人使用，不需要通过 Google 验证
- 客户端密钥对于桌面应用是可选的"#
        }
        "outlook" => {
            r#"Outlook OAuth 2.0 配置步骤：

1. 访问 Azure Portal: https://portal.azure.com/
2. 进入 "Azure Active Directory" > "应用注册"
3. 点击 "新注册"
   - 名称：ThreadLine
   - 支持的账户类型：任何组织目录中的账户和个人 Microsoft 账户
   - 重定向 URI：公共客户端/本机 - http://127.0.0.1
4. 创建后，复制 "应用程序(客户端) ID"
5. 在 "证书和密码" 中创建新的客户端密码
6. 在 "API 权限" 中添加：
   - IMAP.AccessAsUser.All
   - SMTP.Send
   - offline_access"#
        }
        _ => {
            return Err(AppError::Auth(format!("Unknown provider: {}", provider)).into());
        }
    };

    Ok(instructions.to_string())
}

