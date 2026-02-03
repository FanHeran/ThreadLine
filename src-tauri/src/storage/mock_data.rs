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

    // 1. Insert Accounts
    conn.execute(
        "INSERT INTO accounts (id, email, provider) VALUES (1, 'me@example.com', 'gmail')",
        [],
    )?;

    // 2. Insert Projects
    conn.execute(
        "INSERT INTO projects (id, name, description, status, is_pinned, email_count, attachment_count) VALUES 
        (1, 'Client A - 2024 Cooperation', 'Annual framework agreement negotiation', 'active', 1, 12, 8),
        (2, 'Product X Tech Integration', 'API v2 integration discussions', 'active', 0, 23, 15),
        (3, 'Vendor B Inquiry', 'Hardware procurement', 'active', 0, 8, 3),
        (4, 'Q1 Marketing Campaign', 'Social media assets review', 'archived', 0, 45, 20)",
        [],
    )?;

    // 3. Insert Emails for Project 1
    // Thread 1: "th_1" (Payment terms)
    conn.execute(
        "INSERT INTO emails (id, message_id, account_id, thread_id, project_id, subject, sender, date, body_text) VALUES 
        (1, 'msg_1@example.com', 1, 'th_1', 1, 'Payment Terms', 'Finance Dept <finance@client-a.com>', '2024-01-14 09:00:00', 'Payment terms approved.'),
        (2, 'msg_2@example.com', 1, 'th_1', 1, 'Re: Payment Terms', 'Me <me@example.com>', '2024-01-13 16:20:00', 'Can we confirm the payment schedule?')",
        [],
    )?;

    // Email 3: Independent (Contract V3)
    conn.execute(
        "INSERT INTO emails (id, message_id, account_id, thread_id, project_id, subject, sender, date, body_text) VALUES 
        (3, 'msg_3@example.com', 1, 'th_2', 1, 'Contract V3', 'Me <me@example.com>', '2024-01-10 10:00:00', 'Please check the modified contract version v3.')",
        [],
    )?;

    // Email 4: Linked to Milestone (Signed Contract)
    conn.execute(
        "INSERT INTO emails (id, message_id, account_id, thread_id, project_id, subject, sender, date, body_text) VALUES 
        (4, 'msg_4@example.com', 1, 'th_3', 1, 'Signed Contract', 'Zhang San <zhang@client-a.com>', '2024-01-15 14:30:00', 'The contract has been signed.')",
        [],
    )?;

    // 4. Insert Milestones for Project 1
    conn.execute(
        "INSERT INTO milestones (id, project_id, email_id, type, title, date) VALUES 
        (1, 1, 4, 'signed', 'Contract Signed', '2024-01-15 14:30:00'),
        (2, 1, NULL, 'draft', 'Draft Submitted', '2024-01-02 09:30:00')",
        [],
    )?;

    // 5. Insert Attachments for Project 1
    conn.execute(
        "INSERT INTO attachments (id, email_id, project_id, filename, file_type, file_size, mime_type) VALUES 
        (1, 4, 1, 'contract_signed.pdf', 'pdf', 2400000, 'application/pdf'),
        (2, 2, 1, 'contract_v3_final.pdf', 'pdf', 2100000, 'application/pdf'),
        (3, 3, 1, 'legal_review_comments.docx', 'docx', 156000, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        (4, NULL, 1, 'project_brief.pdf', 'pdf', 500000, 'application/pdf')",
        [],
    )?;

    println!("Mock data seeded successfully.");
    Ok(())
}
