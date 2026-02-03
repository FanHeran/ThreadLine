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

    // 2. Insert Projects with tags
    conn.execute(
        r#"INSERT INTO projects (id, name, description, status, is_pinned, email_count, attachment_count, tags) VALUES
        (1, 'Client A - 2024 Cooperation', 'Annual framework agreement negotiation', 'active', 1, 12, 8, '["Contract", "Legal", "High Priority"]'),
        (2, 'Product X Tech Integration', 'API v2 integration discussions', 'active', 0, 23, 15, '["API", "Development", "Integration", "Backend"]'),
        (3, 'Vendor B Inquiry', 'Hardware procurement', 'active', 0, 8, 3, '["Procurement", "Hardware"]'),
        (4, 'Q1 Marketing Campaign', 'Social media assets review', 'archived', 0, 45, 20, '["Marketing", "Design", "Social Media"]')"#,
        [],
    )?;

    // 3. Insert Emails for Project 1 with varied dates for testing time grouping
    // Get current date for realistic testing
    let now = chrono::Local::now();
    let today = now.format("%Y-%m-%d").to_string();
    let yesterday = (now - chrono::Duration::days(1)).format("%Y-%m-%d").to_string();
    let last_week = (now - chrono::Duration::days(5)).format("%Y-%m-%d").to_string();
    let last_month = (now - chrono::Duration::days(20)).format("%Y-%m-%d").to_string();

    // Thread 1: "th_1" (Payment terms) - Today
    conn.execute(
        &format!("INSERT INTO emails (id, message_id, account_id, thread_id, project_id, subject, sender, date, body_text) VALUES
        (1, 'msg_1@example.com', 1, 'th_1', 1, 'Payment Terms Discussion', 'Finance Dept <finance@client-a.com>', '{} 09:00:00', 'We have reviewed the payment terms and they look good. The 30-day net payment schedule works for us. We can proceed with signing once legal approves.'),
        (2, 'msg_2@example.com', 1, 'th_1', 1, 'Re: Payment Terms Discussion', 'Me <me@example.com>', '{} 08:20:00', 'Can we confirm the payment schedule? I want to make sure we are aligned on the 30-day net terms and the milestone-based payment structure.')", today, today),
        [],
    )?;

    // Email 3: Independent (Contract V3) - Yesterday
    conn.execute(
        &format!("INSERT INTO emails (id, message_id, account_id, thread_id, project_id, subject, sender, date, body_text) VALUES
        (3, 'msg_3@example.com', 1, NULL, 1, 'Contract V3 - Final Review', 'Me <me@example.com>', '{} 10:00:00', 'Please check the modified contract version v3. I have incorporated all the feedback from the legal team and updated the payment terms section. The key changes are highlighted in yellow.')", yesterday),
        [],
    )?;

    // Email 4: Linked to Milestone (Signed Contract) - Last week
    conn.execute(
        &format!("INSERT INTO emails (id, message_id, account_id, thread_id, project_id, subject, sender, date, body_text) VALUES
        (4, 'msg_4@example.com', 1, NULL, 1, 'Contract Signed - Next Steps', 'Zhang San <zhang@client-a.com>', '{} 14:30:00', 'Great news! The contract has been signed by our CEO. I am attaching the signed PDF. We can now proceed with the project kickoff meeting next week.')", last_week),
        [],
    )?;

    // Email 5: Project kickoff - Last month
    conn.execute(
        &format!("INSERT INTO emails (id, message_id, account_id, thread_id, project_id, subject, sender, date, body_text) VALUES
        (5, 'msg_5@example.com', 1, NULL, 1, 'Project Kickoff Meeting', 'Project Manager <pm@client-a.com>', '{} 11:00:00', 'Thank you for the productive kickoff meeting yesterday. As discussed, I am sharing the project timeline and deliverables document. Please review and let me know if you have any questions.')", last_month),
        [],
    )?;

    // 4. Insert Milestones for Project 1
    conn.execute(
        &format!("INSERT INTO milestones (id, project_id, email_id, type, title, date) VALUES
        (1, 1, 4, 'signed', 'Contract Signed', '{} 14:30:00'),
        (2, 1, NULL, 'draft', 'Initial Draft Submitted', '{} 09:30:00')", last_week, last_month),
        [],
    )?;

    // 5. Insert Attachments for Project 1 with varied file types
    conn.execute(
        "INSERT INTO attachments (id, email_id, project_id, filename, file_type, file_size, mime_type) VALUES
        (1, 4, 1, 'contract_signed.pdf', 'pdf', 2400000, 'application/pdf'),
        (2, 2, 1, 'payment_schedule.xlsx', 'xlsx', 85000, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
        (3, 3, 1, 'legal_review_comments.docx', 'docx', 156000, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        (4, 3, 1, 'contract_v3_final.pdf', 'pdf', 2100000, 'application/pdf'),
        (5, 5, 1, 'project_timeline.png', 'png', 450000, 'image/png'),
        (6, 5, 1, 'deliverables.zip', 'zip', 1200000, 'application/zip')",
        [],
    )?;

    println!("Mock data seeded successfully.");
    Ok(())
}
