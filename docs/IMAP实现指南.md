# IMAP 客户端实现指南

## 📧 支持的邮箱服务商

ThreadLine 已内置以下常见邮箱服务商的配置：

| 服务商 | IMAP 服务器 | 端口 | OAuth 支持 | 备注 |
|--------|------------|------|-----------|------|
| **Gmail** | imap.gmail.com | 993 | ✅ | 需要开启"允许不够安全的应用"或使用 OAuth |
| **Outlook/Office 365** | outlook.office365.com | 993 | ✅ | 推荐使用 OAuth |
| **QQ 邮箱** | imap.qq.com | 993 | ❌ | 需要开启 IMAP 服务并使用授权码 |
| **网易 163** | imap.163.com | 993 | ❌ | 需要开启 IMAP 服务并使用授权码 |
| **网易 126** | imap.126.com | 993 | ❌ | 需要开启 IMAP 服务并使用授权码 |
| **iCloud** | imap.mail.me.com | 993 | ❌ | 需要使用应用专用密码 |

---

## 🔐 认证方式

### 1. 用户名密码认证

```rust
use crate::mail::imap_client::{ImapConnection, AuthMethod};
use crate::mail::providers::detect_provider;

// 自动检测服务商
let provider = detect_provider("user@gmail.com").unwrap();

// 使用密码认证
let auth = AuthMethod::Password {
    username: "user@gmail.com".to_string(),
    password: "your_password".to_string(),
};

let mut conn = ImapConnection::connect_with_provider(&provider, auth).await?;
```

### 2. OAuth 2.0 认证（Gmail / Outlook）

```rust
// 使用 OAuth 2.0
let auth = AuthMethod::OAuth {
    username: "user@gmail.com".to_string(),
    access_token: "ya29.a0AfH6SMB...".to_string(),
};

let mut conn = ImapConnection::connect_with_provider(&provider, auth).await?;
```

---

## 📝 使用示例

### 1. 连接并列出文件夹

```rust
use crate::mail::imap_client::{ImapConnection, AuthMethod};
use crate::mail::providers::get_provider_configs;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 获取 Gmail 配置
    let providers = get_provider_configs();
    let gmail = providers.iter().find(|p| p.name == "gmail").unwrap();
    
    // 连接
    let auth = AuthMethod::Password {
        username: "user@gmail.com".to_string(),
        password: "app_password".to_string(),
    };
    
    let mut conn = ImapConnection::connect_with_provider(gmail, auth).await?;
    
    // 列出所有文件夹
    let folders = conn.list_folders().await?;
    for folder in folders {
        println!("📁 {}", folder);
    }
    
    // 登出
    conn.logout().await?;
    Ok(())
}
```

### 2. 获取收件箱邮件

```rust
// 选择收件箱
let count = conn.select_folder("INBOX").await?;
println!("收件箱有 {} 封邮件", count);

// 获取最新 10 封邮件的 UID
let uids = conn.fetch_uids("1:10").await?;

// 获取第一封邮件内容
if let Some(&uid) = uids.first() {
    let email_data = conn.fetch_email(uid).await?;
    println!("邮件大小: {} bytes", email_data.len());
}
```

### 3. 增量同步（基于 UID）

```rust
// 获取上次同步的最大 UID（从数据库读取）
let last_uid = 12345;

// 只获取新邮件
let new_uids = conn.fetch_uids(&format!("{}:*", last_uid + 1)).await?;

for uid in new_uids {
    let email_data = conn.fetch_email(uid).await?;
    // 解析并保存到数据库
    // ...
}
```

---

## 🔧 常见邮箱配置说明

### Gmail

1. **开启 IMAP**：设置 → 转发和 POP/IMAP → 启用 IMAP
2. **认证方式**：
   - **推荐**：使用 OAuth 2.0
   - **备选**：生成应用专用密码（需要开启两步验证）

### QQ 邮箱

1. **开启 IMAP**：设置 → 账户 → POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务
2. **获取授权码**：点击"生成授权码"，使用授权码代替密码

### 网易邮箱（163/126）

1. **开启 IMAP**：设置 → POP3/SMTP/IMAP → 开启 IMAP/SMTP 服务
2. **获取授权码**：使用授权码代替密码

### Outlook / Office 365

1. **开启 IMAP**：默认已开启
2. **认证方式**：
   - **推荐**：使用 OAuth 2.0
   - **备选**：使用账户密码（可能需要开启"允许不够安全的应用"）

### iCloud

1. **生成应用专用密码**：
   - 访问 appleid.apple.com
   - 安全 → 应用专用密码 → 生成密码
2. **使用应用专用密码**：在密码字段使用生成的密码

---

## ⚠️ 常见问题

### 1. 认证失败

**Gmail**: 
- 确保开启了 IMAP
- 使用应用专用密码或 OAuth 2.0
- 检查"允许不够安全的应用"设置

**QQ/163/126**:
- 必须使用授权码，不能使用登录密码
- 确保已开启 IMAP 服务

### 2. 连接超时

- 检查网络连接
- 确认防火墙没有阻止 993 端口
- 某些企业网络可能阻止 IMAP 连接

### 3. TLS 证书错误

- 确保系统时间正确
- 更新系统根证书

---

## 🚀 下一步

- [ ] 实现邮件解析器（`mail-parser` crate）
- [ ] 实现增量同步逻辑
- [ ] 添加 IMAP IDLE 支持（实时推送）
- [ ] 实现 OAuth 2.0 流程
- [ ] 添加连接池管理

