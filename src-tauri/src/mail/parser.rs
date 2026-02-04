/// 邮件解析器
use mail_parser::{MessageParser, MimeHeaders};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedEmail {
    pub message_id: String,
    pub subject: String,
    pub from: String,
    pub to: Vec<String>,
    pub cc: Vec<String>,
    pub date: String,
    pub body_text: Option<String>,
    pub body_html: Option<String>,
    pub attachments: Vec<ParsedAttachment>,
    pub in_reply_to: Option<String>,
    pub references: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedAttachment {
    pub filename: String,
    pub content_type: String,
    pub size: usize,
    pub data: Vec<u8>,
}

/// 解析邮件
pub fn parse_email(raw_data: &[u8]) -> Result<ParsedEmail, String> {
    let message = MessageParser::default()
        .parse(raw_data)
        .ok_or_else(|| "Failed to parse email".to_string())?;

    // 提取 Message-ID
    let message_id = message
        .message_id()
        .map(|id| id.to_string())
        .unwrap_or_else(|| format!("generated-{}", chrono::Utc::now().timestamp()));

    // 提取主题
    let subject = message
        .subject()
        .unwrap_or("(No Subject)")
        .to_string();

    // 提取发件人
    let from = message
        .from()
        .and_then(|addrs| addrs.first())
        .map(|addr| format_address(addr))
        .unwrap_or_else(|| "Unknown".to_string());

    // 提取收件人
    let to = message
        .to()
        .map(|addrs| addrs.iter().map(format_address).collect())
        .unwrap_or_default();

    // 提取抄送
    let cc = message
        .cc()
        .map(|addrs| addrs.iter().map(format_address).collect())
        .unwrap_or_default();

    // 提取日期
    let date = message
        .date()
        .map(|dt| dt.to_rfc3339())
        .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

    // 提取正文
    let body_text = message.body_text(0).map(|s| s.to_string());
    let body_html = message.body_html(0).map(|s| s.to_string());

    // 提取附件
    let mut attachments = Vec::new();
    for attachment in message.attachments() {
        if let Some(filename) = attachment.attachment_name() {
            let content_type = attachment
                .content_type()
                .map(|ct| ct.ctype().to_string())
                .unwrap_or_else(|| "application/octet-stream".to_string());

            let data = attachment.contents().to_vec();
            let size = data.len();

            attachments.push(ParsedAttachment {
                filename: filename.to_string(),
                content_type,
                size,
                data,
            });
        }
    }

    // 提取 In-Reply-To (返回 &HeaderValue，不是 Option)
    let in_reply_to = match message.in_reply_to() {
        mail_parser::HeaderValue::Text(text) => Some(text.to_string()),
        mail_parser::HeaderValue::TextList(list) if !list.is_empty() => {
            Some(list[0].to_string())
        }
        _ => None,
    };

    // 提取 References (返回 &HeaderValue，不是 Option)
    let references = match message.references() {
        mail_parser::HeaderValue::TextList(list) => {
            list.iter().map(|s| s.to_string()).collect()
        }
        mail_parser::HeaderValue::Text(text) => vec![text.to_string()],
        _ => vec![],
    };

    Ok(ParsedEmail {
        message_id,
        subject,
        from,
        to,
        cc,
        date,
        body_text,
        body_html,
        attachments,
        in_reply_to,
        references,
    })
}

/// 格式化邮件地址
fn format_address(addr: &mail_parser::Addr) -> String {
    if let Some(name) = addr.name() {
        if let Some(email) = addr.address() {
            format!("{} <{}>", name, email)
        } else {
            name.to_string()
        }
    } else if let Some(email) = addr.address() {
        email.to_string()
    } else {
        "Unknown".to_string()
    }
}

/// 生成线程 ID（基于 References 和 In-Reply-To）
pub fn generate_thread_id(parsed: &ParsedEmail) -> String {
    // 如果有 references，使用第一个作为线程 ID
    if let Some(first_ref) = parsed.references.first() {
        return first_ref.clone();
    }

    // 如果有 in_reply_to，使用它作为线程 ID
    if let Some(reply_to) = &parsed.in_reply_to {
        return reply_to.clone();
    }

    // 否则使用自己的 message_id 作为新线程
    parsed.message_id.clone()
}
