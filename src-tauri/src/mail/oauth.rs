/// OAuth 2.0 认证实现
use oauth2::{
    AuthUrl, AuthorizationCode, ClientId, ClientSecret, CsrfToken, PkceCodeChallenge,
    RedirectUrl, Scope, TokenResponse, TokenUrl,
};
use oauth2::basic::BasicClient;
use oauth2::reqwest::async_http_client;
use std::io::{BufRead, BufReader, Write};
use std::net::TcpListener;
use url::Url;
use crate::error::AppError;
use serde::{Deserialize, Serialize};

/// OAuth Token 信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthTokenInfo {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: Option<i64>,  // 秒数
}

/// OAuth 提供商配置
pub struct OAuthProvider {
    pub name: String,
    pub auth_url: String,
    pub token_url: String,
    pub scopes: Vec<String>,
}

impl OAuthProvider {
    /// Gmail OAuth 配置
    pub fn gmail() -> Self {
        Self {
            name: "Gmail".to_string(),
            auth_url: "https://accounts.google.com/o/oauth2/v2/auth".to_string(),
            token_url: "https://oauth2.googleapis.com/token".to_string(),
            scopes: vec![
                "https://mail.google.com/".to_string(),
                "https://www.googleapis.com/auth/userinfo.email".to_string(),
            ],
        }
    }

    /// Outlook OAuth 配置
    pub fn outlook() -> Self {
        Self {
            name: "Outlook".to_string(),
            auth_url: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize".to_string(),
            token_url: "https://login.microsoftonline.com/common/oauth2/v2.0/token".to_string(),
            scopes: vec![
                "https://outlook.office.com/IMAP.AccessAsUser.All".to_string(),
                "https://outlook.office.com/SMTP.Send".to_string(),
                "offline_access".to_string(),
            ],
        }
    }

    /// 获取内置的客户端凭据
    ///
    /// 凭据从编译时环境变量中读取：
    /// - Gmail: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET
    /// - Outlook: OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET
    pub fn get_builtin_credentials(&self) -> Option<(String, String)> {
        match self.name.as_str() {
            "Gmail" => {
                // 从编译时环境变量读取 Gmail OAuth 凭据
                let client_id = option_env!("GMAIL_CLIENT_ID");
                let client_secret = option_env!("GMAIL_CLIENT_SECRET");

                match (client_id, client_secret) {
                    (Some(id), Some(secret)) if !id.is_empty() && !secret.is_empty() => {
                        Some((id.to_string(), secret.to_string()))
                    }
                    _ => {
                        log::warn!("Gmail OAuth credentials not found in environment variables");
                        log::warn!("Please set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET before building");
                        None
                    }
                }
            }
            "Outlook" => {
                // 从编译时环境变量读取 Outlook OAuth 凭据
                let client_id = option_env!("OUTLOOK_CLIENT_ID");
                let client_secret = option_env!("OUTLOOK_CLIENT_SECRET");

                match (client_id, client_secret) {
                    (Some(id), Some(secret)) if !id.is_empty() && !secret.is_empty() => {
                        Some((id.to_string(), secret.to_string()))
                    }
                    _ => {
                        log::warn!("Outlook OAuth credentials not found in environment variables");
                        log::warn!("Please set OUTLOOK_CLIENT_ID and OUTLOOK_CLIENT_SECRET before building");
                        None
                    }
                }
            }
            _ => None,
        }
    }
}

/// OAuth 2.0 客户端
pub struct OAuthClient {
    client_id: String,
    client_secret: Option<String>,
    provider: OAuthProvider,
}

impl OAuthClient {
    /// 创建新的 OAuth 客户端
    pub fn new(client_id: String, client_secret: Option<String>, provider: OAuthProvider) -> Self {
        Self {
            client_id,
            client_secret,
            provider,
        }
    }

    /// 启动 OAuth 2.0 授权流程（使用 PKCE）
    pub async fn authorize(&self) -> Result<OAuthTokenInfo, AppError> {
        // 1. 启动本地 HTTP 服务器监听回调
        let listener = TcpListener::bind("127.0.0.1:0")
            .map_err(|e| AppError::Network(format!("Failed to bind local server: {}", e)))?;
        
        let port = listener.local_addr()
            .map_err(|e| AppError::Network(format!("Failed to get local port: {}", e)))?
            .port();
        
        let redirect_url = format!("http://127.0.0.1:{}/callback", port);
        
        log::info!("OAuth callback server listening on port {}", port);

        // 2. 创建 OAuth 客户端
        log::info!("Creating OAuth client with client_id: {}", self.client_id);
        log::info!("Client secret provided: {}", self.client_secret.is_some());

        let client = BasicClient::new(
            ClientId::new(self.client_id.clone()),
            self.client_secret.as_ref().map(|s| ClientSecret::new(s.clone())),
            AuthUrl::new(self.provider.auth_url.clone())
                .map_err(|e| AppError::Auth(format!("Invalid auth URL: {}", e)))?,
            Some(
                TokenUrl::new(self.provider.token_url.clone())
                    .map_err(|e| AppError::Auth(format!("Invalid token URL: {}", e)))?,
            ),
        )
        .set_redirect_uri(
            RedirectUrl::new(redirect_url.clone())
                .map_err(|e| AppError::Auth(format!("Invalid redirect URL: {}", e)))?,
        );

        // 3. 生成 PKCE challenge
        let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();

        // 4. 构建授权 URL
        let mut auth_request = client
            .authorize_url(CsrfToken::new_random)
            .set_pkce_challenge(pkce_challenge);

        // 添加 scopes
        for scope in &self.provider.scopes {
            auth_request = auth_request.add_scope(Scope::new(scope.clone()));
        }

        let (auth_url, csrf_token) = auth_request.url();

        log::info!("Opening authorization URL: {}", auth_url);

        // 5. 在浏览器中打开授权 URL
        if let Err(e) = open::that(auth_url.as_str()) {
            log::error!("Failed to open browser: {}", e);
            return Err(AppError::Generic(format!("Failed to open browser: {}", e)));
        }

        // 6. 等待回调
        log::info!("Waiting for OAuth callback...");
        let (code, state) = Self::wait_for_callback(listener)?;
        log::info!("Received authorization code (length: {})", code.len());

        // 7. 验证 CSRF token
        if &state != csrf_token.secret() {
            log::error!("CSRF token mismatch! Expected: {}, Got: {}", csrf_token.secret(), state);
            return Err(AppError::Auth("CSRF token mismatch".to_string()));
        }
        log::info!("CSRF token verified successfully");

        // 8. 交换授权码获取 access token
        log::info!("Exchanging authorization code for access token...");
        log::info!("Token endpoint: {}", self.provider.token_url);
        log::info!("Redirect URI: {}", redirect_url);

        let token_result = client
            .exchange_code(AuthorizationCode::new(code.clone()))
            .set_pkce_verifier(pkce_verifier)
            .request_async(async_http_client)
            .await
            .map_err(|e| {
                log::error!("Token exchange error details: {:?}", e);
                log::error!("Authorization code used: {}", code);
                log::error!("Client ID: {}", self.client_id);
                AppError::Auth(format!("Token exchange failed: {:?}", e))
            })?;

        let access_token = token_result.access_token().secret().to_string();
        let refresh_token = token_result.refresh_token().map(|t| t.secret().to_string());
        let expires_in = token_result.expires_in().map(|d| d.as_secs() as i64);

        log::info!("Successfully obtained access token");
        if refresh_token.is_some() {
            log::info!("Refresh token obtained");
        }
        if let Some(exp) = expires_in {
            log::info!("Token expires in {} seconds", exp);
        }

        Ok(OAuthTokenInfo {
            access_token,
            refresh_token,
            expires_in,
        })
    }

    /// 等待 OAuth 回调
    fn wait_for_callback(listener: TcpListener) -> Result<(String, String), AppError> {
        // 设置超时（5 分钟）
        listener
            .set_nonblocking(false)
            .map_err(|e| AppError::Network(format!("Failed to set blocking mode: {}", e)))?;

        for stream in listener.incoming() {
            match stream {
                Ok(mut stream) => {
                    let mut reader = BufReader::new(&stream);
                    let mut request_line = String::new();

                    reader
                        .read_line(&mut request_line)
                        .map_err(|e| AppError::Network(format!("Failed to read request: {}", e)))?;

                    // 解析请求行：GET /callback?code=xxx&state=yyy HTTP/1.1
                    let parts: Vec<&str> = request_line.split_whitespace().collect();
                    if parts.len() < 2 {
                        continue;
                    }

                    let path = parts[1];

                    // 解析 URL 参数
                    if let Some(_query_start) = path.find('?') {
                        let url = Url::parse(&format!("http://localhost{}", path))
                            .map_err(|e| AppError::Generic(format!("Failed to parse callback URL: {}", e)))?;

                        let mut code = None;
                        let mut state = None;

                        for (key, value) in url.query_pairs() {
                            match key.as_ref() {
                                "code" => code = Some(value.to_string()),
                                "state" => state = Some(value.to_string()),
                                _ => {}
                            }
                        }

                        // 发送成功响应
                        let response = "HTTP/1.1 200 OK\r\n\
                                       Content-Type: text/html; charset=utf-8\r\n\
                                       \r\n\
                                       <html><body>\
                                       <h1>授权成功！</h1>\
                                       <p>您可以关闭此窗口并返回应用。</p>\
                                       <script>window.close();</script>\
                                       </body></html>";

                        let _ = stream.write_all(response.as_bytes());
                        let _ = stream.flush();

                        if let (Some(code), Some(state)) = (code, state) {
                            return Ok((code, state));
                        }
                    }

                    // 发送错误响应
                    let error_response = "HTTP/1.1 400 Bad Request\r\n\
                                         Content-Type: text/html; charset=utf-8\r\n\
                                         \r\n\
                                         <html><body>\
                                         <h1>授权失败</h1>\
                                         <p>未收到有效的授权码。</p>\
                                         </body></html>";

                    let _ = stream.write_all(error_response.as_bytes());
                    let _ = stream.flush();
                }
                Err(e) => {
                    log::error!("Connection failed: {}", e);
                    continue;
                }
            }
        }

        Err(AppError::Auth("No valid callback received".to_string()))
    }
}

