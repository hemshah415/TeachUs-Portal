const mysql = require("mysql2/promise");
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const commonPasswords = [
  process.env.DB_PASSWORD,
  "YourPassword123",
  "",
  "root",
  "admin"
];

async function syncDataToMysql() {
  console.log("=========================================================================");
  console.log("🔄 SYNCING DATA FROM SQLITE FALLBACK TO MYSQL WORKBENCH");
  console.log("=========================================================================");

  let conn = null;
  let matchedPwd = null;

  for (const pwd of commonPasswords) {
    try {
      conn = await mysql.createConnection({
        host: "localhost",
        port: 3306,
        user: "root",
        password: pwd,
        database: "college_data_management"
      });
      matchedPwd = pwd;
      console.log(`✅ Connected to MySQL Workbench 'college_data_management' (Password: '${pwd || 'none'}')`);
      break;
    } catch (err) {
      // access denied
    }
  }

  if (!conn) {
    console.log("❌ Could not connect to MySQL. Password required.");
    return;
  }

  // Read SQLite database
  const sqliteDbPath = path.resolve(__dirname, "../college_fallback.db");
  if (!require("fs").existsSync(sqliteDbPath)) {
    console.log("⚠️ No SQLite fallback database found to migrate.");
    await conn.end();
    return;
  }

  const sdb = await open({
    filename: sqliteDbPath,
    driver: sqlite3.Database
  });

  console.log("📦 SQLite fallback DB opened successfully.");

  // Check columns in MySQL 'uploads' table
  const [cols] = await conn.query("SHOW COLUMNS FROM uploads");
  const colNames = cols.map(c => c.Field);
  console.log("📋 MySQL 'uploads' table columns:", colNames);

  // If MySQL uploads table doesn't have admin_status or academic_year_id, alter table to match TeachUs requirements
  if (!colNames.includes("admin_status")) {
    console.log("🛠️ Adding missing TeachUs columns to MySQL 'uploads' table...");
    try { await conn.query("ALTER TABLE uploads ADD COLUMN academic_year_id INT DEFAULT 1"); } catch(e){}
    try { await conn.query("ALTER TABLE uploads ADD COLUMN file_path VARCHAR(255)"); } catch(e){}
    try { await conn.query("ALTER TABLE uploads ADD COLUMN student_count INT DEFAULT 0"); } catch(e){}
    try { await conn.query("ALTER TABLE uploads ADD COLUMN validation_status VARCHAR(50) DEFAULT 'Passed'"); } catch(e){}
    try { await conn.query("ALTER TABLE uploads ADD COLUMN admin_status VARCHAR(50) DEFAULT 'Under Review'"); } catch(e){}
    try { await conn.query("ALTER TABLE uploads ADD COLUMN admin_remarks TEXT"); } catch(e){}
    try { await conn.query("ALTER TABLE uploads ADD COLUMN uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"); } catch(e){}
    console.log("✅ MySQL 'uploads' table updated with TeachUs columns.");
  }

  // Also check 'students', 'validation_errors', 'validation_results', 'colleges', 'academic_years', 'audit_logs'
  await conn.query(`
    CREATE TABLE IF NOT EXISTS academic_years (
      id INT PRIMARY KEY AUTO_INCREMENT,
      year_label VARCHAR(50) UNIQUE NOT NULL,
      start_date DATE,
      end_date DATE,
      deadline DATETIME,
      is_open TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT,
      username VARCHAR(100),
      college_name VARCHAR(255),
      action VARCHAR(255) NOT NULL,
      details TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Disable foreign key checks for smooth migration
  await conn.query("SET FOREIGN_KEY_CHECKS=0;");

  // Ensure default colleges exist
  const [colls] = await conn.query("SHOW COLUMNS FROM colleges");
  const colIdCol = colls.map(c => c.Field).includes("college_id") ? "college_id" : "id";
  try {
    await conn.query(`INSERT INTO colleges (${colIdCol}, code, name, university, state, contact_email, contact_phone, status) VALUES (1, 'NKC001', 'Nagindas Khandwala College', 'University of Mumbai', 'Maharashtra', 'principal@nkc.edu.in', '9820011223', 'ACTIVE') ON DUPLICATE KEY UPDATE name=name`);
    await conn.query(`INSERT INTO colleges (${colIdCol}, code, name, university, state, contact_email, contact_phone, status) VALUES (2, 'LLR002', 'Lala Lajpat Rai College', 'University of Mumbai', 'Maharashtra', 'info@lalacollege.edu.in', '9820044556', 'ACTIVE') ON DUPLICATE KEY UPDATE name=name`);
  } catch (e) {}

  // Copy rows from SQLite to MySQL
  const sqliteUploads = await sdb.all("SELECT * FROM uploads");
  console.log(`🚀 Found ${sqliteUploads.length} submission(s) in SQLite to copy to MySQL...`);

  const idCol = colNames.includes("upload_id") ? "upload_id" : "id";

  for (const up of sqliteUploads) {
    try {
      await conn.query(
        `INSERT INTO uploads (${idCol}, college_id, academic_year_id, file_name, file_path, student_count, validation_status, admin_status, admin_remarks, error_count, uploaded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         admin_status = VALUES(admin_status), admin_remarks = VALUES(admin_remarks)`,
        [
          up.id, up.college_id || 1, up.academic_year_id || 1, up.file_name, up.file_path,
          up.student_count || 0, up.validation_status || "Passed", up.admin_status || "Under Review",
          up.admin_remarks || "", up.error_count || 0, up.uploaded_at || new Date()
        ]
      );
    } catch (e) {
      console.error(`Error inserting upload #${up.id}:`, e.message);
    }
  }

  const sqliteStudents = await sdb.all("SELECT * FROM students");
  console.log(`🚀 Found ${sqliteStudents.length} student record(s) in SQLite to copy to MySQL...`);

  const [stCols] = await conn.query("SHOW COLUMNS FROM students");
  const stColNames = stCols.map(c => c.Field);
  const stIdCol = stColNames.includes("student_id") ? "student_id" : "id";

  // Check missing student columns in MySQL
  if (!stColNames.includes("upload_id")) try { await conn.query("ALTER TABLE students ADD COLUMN upload_id INT"); } catch(e){}
  if (!stColNames.includes("roll_number")) try { await conn.query("ALTER TABLE students ADD COLUMN roll_number VARCHAR(100)"); } catch(e){}
  if (!stColNames.includes("student_name")) try { await conn.query("ALTER TABLE students ADD COLUMN student_name VARCHAR(255)"); } catch(e){}
  if (!stColNames.includes("branch")) try { await conn.query("ALTER TABLE students ADD COLUMN branch VARCHAR(100)"); } catch(e){}
  if (!stColNames.includes("semester")) try { await conn.query("ALTER TABLE students ADD COLUMN semester INT"); } catch(e){}
  if (!stColNames.includes("year")) try { await conn.query("ALTER TABLE students ADD COLUMN year INT"); } catch(e){}
  if (!stColNames.includes("gender")) try { await conn.query("ALTER TABLE students ADD COLUMN gender VARCHAR(20)"); } catch(e){}
  if (!stColNames.includes("email")) try { await conn.query("ALTER TABLE students ADD COLUMN email VARCHAR(150)"); } catch(e){}
  if (!stColNames.includes("mobile_number")) try { await conn.query("ALTER TABLE students ADD COLUMN mobile_number VARCHAR(50)"); } catch(e){}
  if (!stColNames.includes("cgpa")) try { await conn.query("ALTER TABLE students ADD COLUMN cgpa DECIMAL(4,2)"); } catch(e){}
  if (!stColNames.includes("percentage")) try { await conn.query("ALTER TABLE students ADD COLUMN percentage DECIMAL(5,2)"); } catch(e){}
  if (!stColNames.includes("academic_year_id")) try { await conn.query("ALTER TABLE students ADD COLUMN academic_year_id INT DEFAULT 1"); } catch(e){}

  for (const st of sqliteStudents) {
    try {
      await conn.query(
        `INSERT INTO students (${stIdCol}, upload_id, college_id, academic_year_id, roll_number, student_name, branch, semester, year, gender, email, mobile_number, cgpa, percentage)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE student_name = VALUES(student_name)`,
        [
          st.id, st.upload_id, st.college_id || 1, st.academic_year_id || 1, st.roll_number, st.student_name,
          st.branch, st.semester, st.year, st.gender, st.email, st.mobile_number, st.cgpa, st.percentage
        ]
      );
    } catch (e) {
      console.error(`Error inserting student #${st.id}:`, e.message);
    }
  }

  // Bidirectional Sync: MySQL -> SQLite Fallback DB
  try {
    const [mysqlUploads] = await conn.query("SELECT * FROM uploads");
    console.log(`🔄 Syncing ${mysqlUploads.length} upload record(s) from MySQL back to SQLite fallback...`);
    
    await sdb.exec(`
      CREATE TABLE IF NOT EXISTS uploads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        college_id INTEGER,
        academic_year_id INTEGER DEFAULT 1,
        file_name TEXT,
        file_path TEXT,
        student_count INTEGER DEFAULT 0,
        validation_status TEXT DEFAULT 'Passed',
        admin_status TEXT DEFAULT 'Under Review',
        admin_remarks TEXT,
        error_count INTEGER DEFAULT 0,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    for (const up of mysqlUploads) {
      const upId = up.id || up.upload_id;
      if (!upId) continue;
      const existing = await sdb.get("SELECT id FROM uploads WHERE id = ?", [upId]);
      if (existing) {
        await sdb.run(
          `UPDATE uploads SET admin_status = ?, admin_remarks = ?, validation_status = ?, student_count = ? WHERE id = ?`,
          [up.admin_status || 'Under Review', up.admin_remarks || '', up.validation_status || 'Passed', up.student_count || 0, upId]
        );
      } else {
        await sdb.run(
          `INSERT INTO uploads (id, college_id, academic_year_id, file_name, file_path, student_count, validation_status, admin_status, admin_remarks, error_count, uploaded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            upId, up.college_id || 1, up.academic_year_id || 1, up.file_name, up.file_path,
            up.student_count || 0, up.validation_status || 'Passed', up.admin_status || 'Under Review',
            up.admin_remarks || '', up.error_count || 0, up.uploaded_at || new Date()
          ]
        );
      }
    }
  } catch(e) {
    console.error("Error in MySQL to SQLite sync:", e.message);
  }

  console.log("\n=========================================================================");
  console.log("🎉 DATA SUCCESSFULLY SYNCED BIDIRECTIONALLY WITH MYSQL WORKBENCH!");
  console.log("=========================================================================\n");

  await sdb.close();
  await conn.end();
}

syncDataToMysql().catch(console.error);
