fn main() {
    // 尝试加载 .env 文件中的环境变量（用于编译时）
    // 如果 .env 文件不存在，会静默失败（这是正常的，因为 CI/CD 可能使用系统环境变量）
    if let Err(e) = dotenvy::dotenv() {
        println!("cargo:warning=Failed to load .env file: {}. Using system environment variables.", e);
    }

    // 检查是否设置了 OAuth 凭据
    let gmail_id = std::env::var("GMAIL_CLIENT_ID").ok();
    let gmail_secret = std::env::var("GMAIL_CLIENT_SECRET").ok();
    let outlook_id = std::env::var("OUTLOOK_CLIENT_ID").ok();
    let outlook_secret = std::env::var("OUTLOOK_CLIENT_SECRET").ok();

    if gmail_id.is_none() || gmail_secret.is_none() {
        println!("cargo:warning=Gmail OAuth credentials not set. Users will need to provide their own credentials.");
    }

    if outlook_id.is_none() || outlook_secret.is_none() {
        println!("cargo:warning=Outlook OAuth credentials not set. Users will need to provide their own credentials.");
    }

    tauri_build::build()
}
