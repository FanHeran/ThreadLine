use rusqlite::Connection;
use tauri::{AppHandle, Manager};

// Temporary helper to seed database
pub fn seed_mock_data(app: &AppHandle) -> anyhow::Result<()> {
    let app_dir = app.path().app_data_dir()?;
    let db_path = app_dir.join("threadline.db");
    let conn = Connection::open(db_path)?;

    // Check if we already have projects
    let mut stmt = conn.prepare("SELECT count(*) FROM projects")?;
    let count: i64 = stmt.query_row([], |row| row.get(0))?;

    if count > 0 {
        return Ok(()); // Already seeded
    }

    println!("Seeding mock data...");

    // 1. Insert Projects
    conn.execute(
        "INSERT INTO projects (id, name, description, status, is_pinned, email_count, attachment_count) VALUES 
        (1, 'Client A - 2024 Cooperation', 'Annual framework agreement negotiation', 'active', 1, 12, 8),
        (2, 'Product X Tech Integration', 'API v2 integration discussions', 'active', 0, 23, 15),
        (3, 'Vendor B Inquiry', 'Hardware procurement', 'active', 0, 8, 3),
        (4, 'Q1 Marketing Campaign', 'Social media assets review', 'archived', 0, 45, 20)",
        [],
    )?;

    // 2. Insert Accounts
    conn.execute(
        "INSERT INTO accounts (id, email, provider) VALUES (1, 'me@example.com', 'gmail')",
        [],
    )?;

    println!("Mock data seeded successfully.");
    Ok(())
}
