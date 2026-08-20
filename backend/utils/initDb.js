const bcrypt = require("bcrypt");
const { getDb } = require("../config/db");

async function initDb() {
  const { pool, isFallback } = await getDb();
  console.log("🔄 Initializing Database Tables & Seed Data...");

  const autoPk = isFallback ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT PRIMARY KEY AUTO_INCREMENT';

  try {
    // 1. Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id ${autoPk},
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        role VARCHAR(20) NOT NULL DEFAULT 'COLLEGE',
        college_id INT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Colleges table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS colleges (
        id ${autoPk},
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        university VARCHAR(255) DEFAULT 'University of Mumbai',
        state VARCHAR(100) DEFAULT 'Maharashtra',
        contact_email VARCHAR(150) NOT NULL,
        contact_phone VARCHAR(50),
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        faculty_training_status VARCHAR(50) DEFAULT 'Pending',
        faculty_training_date DATETIME,
        dashboard_training_status VARCHAR(50) DEFAULT 'Pending',
        dashboard_training_date DATETIME,
        admin_training_status VARCHAR(50) DEFAULT 'Pending',
        admin_training_date DATETIME,
        trainer_name VARCHAR(150) DEFAULT 'TeachUs Support Team',
        training_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Academic Years table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS academic_years (
        id ${autoPk},
        year_label VARCHAR(50) NOT NULL UNIQUE,
        start_date DATE,
        end_date DATE,
        deadline DATETIME,
        is_open TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Templates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id ${autoPk},
        name VARCHAR(255) NOT NULL,
        version VARCHAR(50) NOT NULL DEFAULT 'v1.0',
        file_path VARCHAR(500) NOT NULL,
        academic_year_id INT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active TINYINT(1) DEFAULT 1
      )
    `);

    // 5. Uploads table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS uploads (
        id ${autoPk},
        college_id INT NOT NULL,
        academic_year_id INT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        student_count INT DEFAULT 0,
        validation_status VARCHAR(50) DEFAULT 'Pending',
        admin_status VARCHAR(50) DEFAULT 'Under Review',
        admin_remarks TEXT,
        error_count INT DEFAULT 0,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Validation Results table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS validation_results (
        id ${autoPk},
        upload_id INT NOT NULL UNIQUE,
        total_rows INT DEFAULT 0,
        passed_rows INT DEFAULT 0,
        error_count INT DEFAULT 0,
        report_path VARCHAR(500),
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 7. Validation Errors table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS validation_errors (
        id ${autoPk},
        upload_id INT NOT NULL,
        \`row_number\` INT NOT NULL,
        column_name VARCHAR(100) NOT NULL,
        error_message TEXT NOT NULL,
        severity VARCHAR(20) DEFAULT 'ERROR',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 8. Students table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id ${autoPk},
        upload_id INT NOT NULL,
        college_id INT NOT NULL,
        academic_year_id INT NOT NULL,
        roll_number VARCHAR(100) NOT NULL,
        student_name VARCHAR(255) NOT NULL,
        branch VARCHAR(100),
        semester INT,
        year INT,
        gender VARCHAR(20),
        dob VARCHAR(50),
        email VARCHAR(150),
        mobile_number VARCHAR(50),
        cgpa DECIMAL(4,2),
        percentage DECIMAL(5,2),
        enrollment_number VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. Audit Logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id ${autoPk},
        user_id INT,
        username VARCHAR(100),
        college_name VARCHAR(255),
        action VARCHAR(255) NOT NULL,
        details TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 10. System Settings table (Data Retention & Auto-Purge Config)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 11. Notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id ${autoPk},
        user_id INT NULL,
        college_id INT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'INFO',
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed System Settings if empty
    const [existingSettings] = await pool.query(`SELECT COUNT(*) as cnt FROM system_settings`);
    const countSettings = existingSettings[0]?.cnt || existingSettings[0]?.['COUNT(*)'] || 0;
    if (countSettings === 0) {
      await pool.query(`
        INSERT INTO system_settings (setting_key, setting_value) VALUES
        ('retention_months', '2'),
        ('auto_purge_enabled', '1')
      `);
      console.log("Default System Settings Seeded (retention_months=2, auto_purge_enabled=1)");
    }

    // Seed Default Notification if empty
    const [existingNotes] = await pool.query(`SELECT COUNT(*) as cnt FROM notifications`);
    const countNotes = existingNotes[0]?.cnt || existingNotes[0]?.['COUNT(*)'] || 0;
    if (countNotes === 0) {
      await pool.query(`
        INSERT INTO notifications (user_id, college_id, title, message, type, is_read) VALUES
        (NULL, NULL, 'System Window Open', 'Academic Data Submission Portal is active for Academic Session 2025-2026.', 'INFO', 0)
      `);
    }

    // Seed Colleges
    const [existingColleges] = await pool.query(`SELECT COUNT(*) as cnt FROM colleges`);
    const countColleges = existingColleges[0]?.cnt || existingColleges[0]?.['COUNT(*)'] || 0;
    
    if (countColleges === 0) {
      await pool.query(`
        INSERT INTO colleges (code, name, university, state, contact_email, contact_phone, status) VALUES
        ('NKC001', 'Nagindas Khandwala College', 'University of Mumbai', 'Maharashtra', 'principal@nkc.edu.in', '9820011223', 'ACTIVE'),
        ('LLR002', 'Lala Lajpat Rai College', 'University of Mumbai', 'Maharashtra', 'info@lalacollege.edu.in', '9820044556', 'ACTIVE'),
        ('VAL003', 'Valia Chhaganlal Laljibhai College', 'University of Mumbai', 'Maharashtra', 'contact@valiacollege.edu.in', '9820077889', 'ACTIVE'),
        ('BHV004', 'Bhavans College', 'University of Mumbai', 'Maharashtra', 'admin@bhavans.ac.in', '9820099001', 'ACTIVE')
      `);
      console.log("🌱 Default Colleges Seeded");
    }

    // Seed Academic Years
    const [existingYears] = await pool.query(`SELECT COUNT(*) as cnt FROM academic_years`);
    const countYears = existingYears[0]?.cnt || existingYears[0]?.['COUNT(*)'] || 0;
    
    if (countYears === 0) {
      await pool.query(`
        INSERT INTO academic_years (year_label, start_date, end_date, deadline, is_open) VALUES
        ('2025-2026', '2025-06-01', '2026-05-31', '2026-10-31 23:59:59', 1),
        ('2026-2027', '2026-06-01', '2027-05-31', '2027-10-31 23:59:59', 1)
      `);
      console.log("🌱 Default Academic Years Seeded");
    }

    // Seed/Ensure Default Users (admin:admin123, college:college123)
    const adminPass = await bcrypt.hash("admin123", 10);
    const collegePass = await bcrypt.hash("college123", 10);

    const defaultUsers = [
      { username: 'admin', password: adminPass, email: 'admin@edtechplatform.com', role: 'ADMIN', college_id: null },
      { username: 'nkc_user', password: collegePass, email: 'principal@nkc.edu.in', role: 'COLLEGE', college_id: 1 },
      { username: 'lala_user', password: collegePass, email: 'info@lalacollege.edu.in', role: 'COLLEGE', college_id: 2 },
      { username: 'valia_user', password: collegePass, email: 'contact@valiacollege.edu.in', role: 'COLLEGE', college_id: 3 },
      { username: 'bhavans_user', password: collegePass, email: 'admin@bhavans.ac.in', role: 'COLLEGE', college_id: 4 }
    ];

    for (const u of defaultUsers) {
      const [uCheck] = await pool.query(`SELECT id FROM users WHERE LOWER(username) = LOWER(?)`, [u.username]);
      if (uCheck.length === 0) {
        await pool.query(
          `INSERT INTO users (username, password, email, role, college_id, status) VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
          [u.username, u.password, u.email, u.role, u.college_id]
        );
      } else {
        await pool.query(
          `UPDATE users SET password = ? WHERE id = ?`,
          [u.password, uCheck[0].id]
        );
      }
    }
    console.log("🌱 Default Admin & College User accounts ensured & updated (admin:admin123, college:college123)");

    // Log init action
    await pool.query(`
      INSERT INTO audit_logs (username, college_name, action, details) VALUES
      ('SYSTEM', 'Central System', 'SYSTEM_INIT', 'Database tables and seed data initialized successfully')
    `);

    console.log("✅ Database Initialization Complete");
  } catch (err) {
    console.error("❌ Error initializing database:", err);
  }
}

module.exports = { initDb };
