/// 邮箱服务商配置
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImapConfig {
    pub host: String,
    pub port: u16,
    pub use_tls: bool,
    pub use_starttls: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmtpConfig {
    pub host: String,
    pub port: u16,
    pub use_tls: bool,
    pub use_starttls: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub name: String,
    pub display_name: String,
    pub imap: ImapConfig,
    pub smtp: SmtpConfig,
    pub oauth_supported: bool,
    pub oauth_client_id: Option<String>,
}

/// 预定义的邮箱服务商配置
pub fn get_provider_configs() -> Vec<ProviderConfig> {
    vec![
        // Gmail
        ProviderConfig {
            name: "gmail".to_string(),
            display_name: "Gmail".to_string(),
            imap: ImapConfig {
                host: "imap.gmail.com".to_string(),
                port: 993,
                use_tls: true,
                use_starttls: false,
            },
            smtp: SmtpConfig {
                host: "smtp.gmail.com".to_string(),
                port: 587,
                use_tls: false,
                use_starttls: true,
            },
            oauth_supported: true,
            oauth_client_id: None, // 需要用户配置
        },
        
        // Outlook / Hotmail / Office 365
        ProviderConfig {
            name: "outlook".to_string(),
            display_name: "Outlook / Office 365".to_string(),
            imap: ImapConfig {
                host: "outlook.office365.com".to_string(),
                port: 993,
                use_tls: true,
                use_starttls: false,
            },
            smtp: SmtpConfig {
                host: "smtp.office365.com".to_string(),
                port: 587,
                use_tls: false,
                use_starttls: true,
            },
            oauth_supported: true,
            oauth_client_id: None,
        },
        
        // QQ 邮箱
        ProviderConfig {
            name: "qq".to_string(),
            display_name: "QQ 邮箱".to_string(),
            imap: ImapConfig {
                host: "imap.qq.com".to_string(),
                port: 993,
                use_tls: true,
                use_starttls: false,
            },
            smtp: SmtpConfig {
                host: "smtp.qq.com".to_string(),
                port: 587,
                use_tls: false,
                use_starttls: true,
            },
            oauth_supported: false,
            oauth_client_id: None,
        },
        
        // 163 邮箱
        ProviderConfig {
            name: "163".to_string(),
            display_name: "网易 163 邮箱".to_string(),
            imap: ImapConfig {
                host: "imap.163.com".to_string(),
                port: 993,
                use_tls: true,
                use_starttls: false,
            },
            smtp: SmtpConfig {
                host: "smtp.163.com".to_string(),
                port: 465,
                use_tls: true,
                use_starttls: false,
            },
            oauth_supported: false,
            oauth_client_id: None,
        },
        
        // 126 邮箱
        ProviderConfig {
            name: "126".to_string(),
            display_name: "网易 126 邮箱".to_string(),
            imap: ImapConfig {
                host: "imap.126.com".to_string(),
                port: 993,
                use_tls: true,
                use_starttls: false,
            },
            smtp: SmtpConfig {
                host: "smtp.126.com".to_string(),
                port: 465,
                use_tls: true,
                use_starttls: false,
            },
            oauth_supported: false,
            oauth_client_id: None,
        },
        
        // iCloud
        ProviderConfig {
            name: "icloud".to_string(),
            display_name: "iCloud Mail".to_string(),
            imap: ImapConfig {
                host: "imap.mail.me.com".to_string(),
                port: 993,
                use_tls: true,
                use_starttls: false,
            },
            smtp: SmtpConfig {
                host: "smtp.mail.me.com".to_string(),
                port: 587,
                use_tls: false,
                use_starttls: true,
            },
            oauth_supported: false,
            oauth_client_id: None,
        },
    ]
}

/// 根据邮箱地址自动检测服务商
pub fn detect_provider(email: &str) -> Option<ProviderConfig> {
    let domain = email.split('@').nth(1)?;
    
    let providers = get_provider_configs();
    
    match domain.to_lowercase().as_str() {
        "gmail.com" => providers.iter().find(|p| p.name == "gmail").cloned(),
        "outlook.com" | "hotmail.com" | "live.com" => {
            providers.iter().find(|p| p.name == "outlook").cloned()
        }
        "qq.com" => providers.iter().find(|p| p.name == "qq").cloned(),
        "163.com" => providers.iter().find(|p| p.name == "163").cloned(),
        "126.com" => providers.iter().find(|p| p.name == "126").cloned(),
        "icloud.com" | "me.com" | "mac.com" => {
            providers.iter().find(|p| p.name == "icloud").cloned()
        }
        _ => None,
    }
}

