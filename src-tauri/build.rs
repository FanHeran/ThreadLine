fn main() {
    println!("cargo:rerun-if-changed=.env");

    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap_or_else(|_| ".".to_string());
    let env_path = std::path::Path::new(&manifest_dir).join(".env");

    // 尝试加载 .env 文件中的环境变量（用于编译时）
    if let Err(e) = dotenvy::from_path(&env_path) {
        println!("cargo:warning=Failed to load .env file from {:?}: {}. Using system environment variables.", env_path, e);
    }

    // 检查是否设置了 OAuth 凭据
    let gmail_id = std::env::var("GMAIL_CLIENT_ID").ok();
    let gmail_secret = std::env::var("GMAIL_CLIENT_SECRET").ok();
    let outlook_id = std::env::var("OUTLOOK_CLIENT_ID").ok();
    let outlook_secret = std::env::var("OUTLOOK_CLIENT_SECRET").ok();

    if let Some(id) = &gmail_id {
        println!("cargo:rustc-env=GMAIL_CLIENT_ID={}", id);
    }
    if let Some(secret) = &gmail_secret {
        println!("cargo:rustc-env=GMAIL_CLIENT_SECRET={}", secret);
    }
    if let Some(id) = &outlook_id {
        println!("cargo:rustc-env=OUTLOOK_CLIENT_ID={}", id);
    }
    if let Some(secret) = &outlook_secret {
        println!("cargo:rustc-env=OUTLOOK_CLIENT_SECRET={}", secret);
    }

    if gmail_id.is_none() || gmail_secret.is_none() {
        println!("cargo:warning=Gmail OAuth credentials not set. Users will need to provide their own credentials.");
    }

    if outlook_id.is_none() || outlook_secret.is_none() {
        println!("cargo:warning=Outlook OAuth credentials not set. Users will need to provide their own credentials.");
    }

    tauri_build::build()
}
