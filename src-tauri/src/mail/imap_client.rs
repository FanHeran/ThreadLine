/// IMAP 客户端实现
use async_imap::{Client as ImapClient, Session as ImapSession, Authenticator};
use tokio::net::TcpStream;
use tokio_native_tls::{TlsConnector, TlsStream};
use futures::StreamExt;
use tokio::time::{timeout, Duration};
use crate::error::AppError;
use crate::mail::providers::{ImapConfig, ProviderConfig};

/// XOAUTH2 认证器
struct XOAuth2Authenticator {
    auth_string: String,
    first_call: bool,
}

impl XOAuth2Authenticator {
    fn new(username: &str, access_token: &str) -> Self {
        // 构建 XOAUTH2 认证字符串
        // 格式: user=<username>\x01auth=Bearer <access_token>\x01\x01
        let auth_string = format!(
            "user={}\x01auth=Bearer {}\x01\x01",
            username, access_token
        );

        Self {
            auth_string,
            first_call: true,
        }
    }
}

impl Authenticator for XOAuth2Authenticator {
    type Response = String;

    fn process(&mut self, _challenge: &[u8]) -> Self::Response {
        if self.first_call {
            self.first_call = false;
            self.auth_string.clone()
        } else {
            // 如果服务器发送了第二个 challenge，返回空字符串
            String::new()
        }
    }
}

/// 认证方式
#[derive(Debug, Clone)]
pub enum AuthMethod {
    /// 用户名密码
    Password { username: String, password: String },
    /// OAuth 2.0
    OAuth { username: String, access_token: String },
}

/// IMAP 连接会话
pub struct ImapConnection {
    session: ImapSession<TlsStream<TcpStream>>,
}

impl ImapConnection {
    /// 连接到 IMAP 服务器
    pub async fn connect(
        config: &ImapConfig,
        auth: AuthMethod,
    ) -> Result<Self, AppError> {
        log::info!("Connecting to IMAP server: {}:{}", config.host, config.port);

        // 1. 建立 TCP 连接
        let addr = format!("{}:{}", config.host, config.port);
        let tcp_stream = TcpStream::connect(&addr)
            .await
            .map_err(|e| AppError::Network(format!("Failed to connect to {}: {}", addr, e)))?;

        // 2. 建立 TLS 连接
        let tls_connector = native_tls::TlsConnector::new()
            .map_err(|e| AppError::Network(format!("Failed to create TLS connector: {}", e)))?;
        let tls = TlsConnector::from(tls_connector);
        let tls_stream = tls
            .connect(&config.host, tcp_stream)
            .await
            .map_err(|e| AppError::Network(format!("TLS handshake failed: {}", e)))?;

        // 3. 创建 IMAP 客户端
        let mut client = ImapClient::new(tls_stream);

        // Read IMAP greeting (avoid silent hangs).
        match timeout(Duration::from_secs(5), client.read_response()).await {
            Ok(Ok(Some(resp))) => log::info!("IMAP greeting: {:?}", resp),
            Ok(Ok(None)) => log::warn!("IMAP greeting missing (server sent no response)"),
            Ok(Err(e)) => log::warn!("Failed to read IMAP greeting: {}", e),
            Err(_) => log::warn!("Timed out waiting for IMAP greeting"),
        }

        // 4. 认证
        let mut session = match auth {
            AuthMethod::Password { username, password } => {
                log::info!("Authenticating with password for user: {}", username);
                client
                    .login(&username, &password)
                    .await
                    .map_err(|e| AppError::Auth(format!("Login failed: {:?}", e)))?
            }
            AuthMethod::OAuth { username, access_token } => {
                log::info!("Authenticating with OAuth for user: {}", username);
                log::info!("Access token length: {}", access_token.len());

                // 创建 XOAUTH2 认证器
                let authenticator = XOAuth2Authenticator::new(&username, &access_token);
                log::info!("XOAUTH2 authenticator created");

                // 使用 XOAUTH2 SASL 机制
                log::info!("Starting XOAUTH2 authentication...");
                let result = timeout(
                    Duration::from_secs(15),
                    client.authenticate("XOAUTH2", authenticator),
                )
                .await
                .map_err(|_| {
                    AppError::Network("IMAP XOAUTH2 authentication timed out after 15s".to_string())
                })?
                .map_err(|(err, _client)| {
                    log::error!("OAuth authentication failed: {:?}", err);
                    AppError::Auth(format!("OAuth authentication failed: {:?}", err))
                })?;

                log::info!("XOAUTH2 authentication completed");
                result
            }
        };

        // Read CAPABILITY after authentication.
        match timeout(Duration::from_secs(5), session.capabilities()).await {
            Ok(Ok(caps)) => {
                log::info!("IMAP capabilities received (post-auth)");
                log::info!(
                    "IMAP AUTH=XOAUTH2 supported: {}",
                    caps.has_str("AUTH=XOAUTH2")
                );
            }
            Ok(Err(e)) => log::warn!("Failed to read IMAP capabilities (post-auth): {:?}", e),
            Err(_) => log::warn!("Timed out waiting for IMAP capabilities (post-auth)"),
        }

        log::info!("Successfully connected and authenticated");
        Ok(Self { session })
    }

    /// 从预定义配置连接
    pub async fn connect_with_provider(
        provider: &ProviderConfig,
        auth: AuthMethod,
    ) -> Result<Self, AppError> {
        Self::connect(&provider.imap, auth).await
    }

    /// 列出所有邮箱文件夹
    pub async fn list_folders(&mut self) -> Result<Vec<String>, AppError> {
        let mut mailboxes = self
            .session
            .list(Some(""), Some("*"))
            .await
            .map_err(|e| AppError::Generic(format!("Failed to list folders: {:?}", e)))?;

        let mut folders = Vec::new();
        while let Some(mailbox) = mailboxes.next().await {
            if let Ok(name) = mailbox {
                folders.push(name.name().to_string());
            }
        }

        Ok(folders)
    }

    /// 选择邮箱文件夹
    pub async fn select_folder(&mut self, folder: &str) -> Result<u32, AppError> {
        log::info!("Selecting folder: {}", folder);
        let mailbox = self
            .session
            .select(folder)
            .await
            .map_err(|e| AppError::Generic(format!("Failed to select folder {}: {:?}", folder, e)))?;

        let exists = mailbox.exists;
        log::info!("Folder {} has {} messages", folder, exists);
        Ok(exists)
    }

    /// 获取邮件 UID 列表
    pub async fn fetch_uids(&mut self, range: &str) -> Result<Vec<u32>, AppError> {
        let mut messages = self
            .session
            .uid_fetch(range, "UID")
            .await
            .map_err(|e| AppError::Generic(format!("Failed to fetch UIDs: {:?}", e)))?;

        let mut uids = Vec::new();
        while let Some(msg) = messages.next().await {
            if let Ok(fetch) = msg {
                if let Some(uid) = fetch.uid {
                    uids.push(uid);
                }
            }
        }

        Ok(uids)
    }

    /// 获取邮件内容
    pub async fn fetch_email(&mut self, uid: u32) -> Result<Vec<u8>, AppError> {
        let mut messages = self
            .session
            .uid_fetch(uid.to_string(), "RFC822")
            .await
            .map_err(|e| AppError::Generic(format!("Failed to fetch email {}: {:?}", uid, e)))?;

        if let Some(msg) = messages.next().await {
            if let Ok(fetch) = msg {
                if let Some(body) = fetch.body() {
                    return Ok(body.to_vec());
                }
            }
        }

        Err(AppError::Generic(format!("Email {} not found", uid)))
    }

    /// 登出并关闭连接
    pub async fn logout(mut self) -> Result<(), AppError> {
        self.session
            .logout()
            .await
            .map_err(|e| AppError::Generic(format!("Logout failed: {:?}", e)))?;
        Ok(())
    }
}
