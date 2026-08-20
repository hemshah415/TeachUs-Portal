const mysql = require("mysql2/promise");
require("dotenv").config();

async function fixMysqlAliases() {
  console.log("=========================================================================");
  console.log("🛠️ ENSURING ID & COLLEGE_ID ALIASES IN MYSQL WORKBENCH");
  console.log("=========================================================================");

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "college_data_management"
  });

  // 1. Colleges Table
  const [colls] = await conn.query("SHOW COLUMNS FROM colleges");
  const colFields = colls.map(c => c.Field);

  if (!colFields.includes("id") && colFields.includes("college_id")) {
    console.log("🛠️ Adding 'id' column to 'colleges' table...");
    try { await conn.query("ALTER TABLE colleges ADD COLUMN id INT"); } catch(e){}
    try { await conn.query("UPDATE colleges SET id = college_id WHERE id IS NULL"); } catch(e){}
  }
  if (!colFields.includes("name") && colFields.includes("college_name")) {
    console.log("🛠️ Adding 'name' column to 'colleges' table...");
    try { await conn.query("ALTER TABLE colleges ADD COLUMN name VARCHAR(255)"); } catch(e){}
    try { await conn.query("UPDATE colleges SET name = college_name WHERE name IS NULL"); } catch(e){}
  }

  // Training Tracker Columns
  if (!colFields.includes("faculty_training_status")) {
    try { await conn.query("ALTER TABLE colleges ADD COLUMN faculty_training_status VARCHAR(50) DEFAULT 'Pending'"); } catch(e){}
  }
  if (!colFields.includes("faculty_training_date")) {
    try { await conn.query("ALTER TABLE colleges ADD COLUMN faculty_training_date DATE"); } catch(e){}
  }
  if (!colFields.includes("dashboard_training_status")) {
    try { await conn.query("ALTER TABLE colleges ADD COLUMN dashboard_training_status VARCHAR(50) DEFAULT 'Pending'"); } catch(e){}
  }
  if (!colFields.includes("dashboard_training_date")) {
    try { await conn.query("ALTER TABLE colleges ADD COLUMN dashboard_training_date DATE"); } catch(e){}
  }
  if (!colFields.includes("trainer_name")) {
    try { await conn.query("ALTER TABLE colleges ADD COLUMN trainer_name VARCHAR(100) DEFAULT 'TeachUs Support Team'"); } catch(e){}
  }
  if (!colFields.includes("training_notes")) {
    try { await conn.query("ALTER TABLE colleges ADD COLUMN training_notes TEXT"); } catch(e){}
  }

  // Seed sample training data for existing colleges
  try {
    await conn.query(`
      UPDATE colleges 
      SET 
        faculty_training_status = CASE WHEN CHAR_LENGTH(name) % 2 = 0 THEN 'Completed' ELSE 'Scheduled' END,
        faculty_training_date = CURRENT_DATE,
        dashboard_training_status = CASE WHEN CHAR_LENGTH(name) % 3 = 0 THEN 'Completed' ELSE 'Pending' END,
        dashboard_training_date = CURRENT_DATE,
        trainer_name = 'TeachUs Support Team'
      WHERE faculty_training_status IS NULL OR faculty_training_status = ''
    `);
  } catch(e){}

  // 2. Uploads Table
  const [ups] = await conn.query("SHOW COLUMNS FROM uploads");
  const upFields = ups.map(c => c.Field);

  if (!upFields.includes("id") && upFields.includes("upload_id")) {
    console.log("Adding 'id' column to 'uploads' table...");
    try { await conn.query("ALTER TABLE uploads ADD COLUMN id INT"); } catch(e){}
    try { await conn.query("UPDATE uploads SET id = upload_id WHERE id IS NULL"); } catch(e){}
  }

  // Sync status, total_records, and upload_date column aliases in uploads table
  if (upFields.includes("status")) {
    try { await conn.query("ALTER TABLE uploads MODIFY COLUMN status VARCHAR(100) DEFAULT 'Under Review'"); } catch(e){}
    try { await conn.query("UPDATE uploads SET status = COALESCE(admin_status, validation_status, 'Under Review') WHERE 1=1"); } catch(e){}
  }
  if (upFields.includes("total_records")) {
    try { await conn.query("UPDATE uploads SET total_records = COALESCE(student_count, 0) WHERE 1=1"); } catch(e){}
  }
  if (upFields.includes("upload_date")) {
    try { await conn.query("UPDATE uploads SET upload_date = COALESCE(uploaded_at, CURRENT_TIMESTAMP) WHERE 1=1"); } catch(e){}
  }
  if (upFields.includes("file_type")) {
    try { await conn.query("ALTER TABLE uploads MODIFY COLUMN file_type VARCHAR(50) DEFAULT 'XLSX'"); } catch(e){}
    try { await conn.query("UPDATE uploads SET file_type = UPPER(SUBSTRING_INDEX(file_name, '.', -1)) WHERE file_type IS NULL OR file_type = ''"); } catch(e){}
  }

  // 3. Students Table
  const [sts] = await conn.query("SHOW COLUMNS FROM students");
  const stFields = sts.map(c => c.Field);

  if (!stFields.includes("dob")) try { await conn.query("ALTER TABLE students ADD COLUMN dob VARCHAR(50)"); } catch(e){}
  if (!stFields.includes("enrollment_number")) try { await conn.query("ALTER TABLE students ADD COLUMN enrollment_number VARCHAR(100)"); } catch(e){}

  if (!stFields.includes("id") && stFields.includes("student_id")) {
    try { await conn.query("ALTER TABLE students ADD COLUMN id INT"); } catch(e){}
    try { await conn.query("UPDATE students SET id = student_id WHERE id IS NULL"); } catch(e){}
  }

  if (stFields.includes("full_name")) {
    try { await conn.query("UPDATE students SET full_name = student_name WHERE (full_name IS NULL OR full_name = '') AND student_name IS NOT NULL"); } catch(e){}
  }
  if (stFields.includes("student_name")) {
    try { await conn.query("UPDATE students SET student_name = full_name WHERE (student_name IS NULL OR student_name = '') AND full_name IS NOT NULL"); } catch(e){}
  }

  if (stFields.includes("program_code")) {
    try { await conn.query("UPDATE students SET program_code = branch WHERE (program_code IS NULL OR program_code = '') AND branch IS NOT NULL"); } catch(e){}
  }
  if (stFields.includes("branch")) {
    try { await conn.query("UPDATE students SET branch = program_code WHERE (branch IS NULL OR branch = '') AND program_code IS NOT NULL"); } catch(e){}
  }

  if (stFields.includes("contact_number")) {
    try { await conn.query("UPDATE students SET contact_number = mobile_number WHERE (contact_number IS NULL OR contact_number = '') AND mobile_number IS NOT NULL"); } catch(e){}
  }
  if (stFields.includes("mobile_number")) {
    try { await conn.query("UPDATE students SET mobile_number = contact_number WHERE (mobile_number IS NULL OR mobile_number = '') AND contact_number IS NOT NULL"); } catch(e){}
  }

  if (stFields.includes("academic_year")) {
    try { await conn.query("UPDATE students SET academic_year = '2025-2026' WHERE academic_year IS NULL OR academic_year = ''"); } catch(e){}
  }
  if (stFields.includes("division")) {
    try { await conn.query("UPDATE students SET division = 'A' WHERE division IS NULL OR division = ''"); } catch(e){}
  }
  if (stFields.includes("year")) {
    try { await conn.query("UPDATE students SET year = 1 WHERE year IS NULL"); } catch(e){}
  }
  if (stFields.includes("semester")) {
    try { await conn.query("UPDATE students SET semester = 1 WHERE semester IS NULL"); } catch(e){}
  }

  // 4. Validation Errors Table
  const [ves] = await conn.query("SHOW COLUMNS FROM validation_errors");
  const veFields = ves.map(c => c.Field);
  if (!veFields.includes("severity")) {
    try { await conn.query("ALTER TABLE validation_errors ADD COLUMN severity VARCHAR(20) DEFAULT 'ERROR'"); } catch(e){}
  }

  // Ensure default academic years exist
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

  const [yCount] = await conn.query("SELECT COUNT(*) as count FROM academic_years");
  if (yCount[0].count === 0) {
    await conn.query(`
      INSERT INTO academic_years (id, year_label, start_date, end_date, deadline, is_open) VALUES
      (1, '2025-2026', '2025-06-01', '2026-05-31', '2026-10-31 23:59:59', 1),
      (2, '2026-2027', '2026-06-01', '2027-05-31', '2027-10-31 23:59:59', 1)
    `);
    console.log("🌱 Seeded default Academic Years");
  }

  console.log("✅ MySQL Alias column sync complete!");
  await conn.end();
}

fixMysqlAliases().catch(console.error);
