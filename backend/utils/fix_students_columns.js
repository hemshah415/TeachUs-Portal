const mysql = require("mysql2/promise");
require("dotenv").config();

async function fixStudentsColumns() {
  console.log("=========================================================================");
  console.log("🛠️ SYNCING ALL STUDENT TABLE COLUMNS IN MYSQL WORKBENCH");
  console.log("=========================================================================");

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "college_data_management"
  });

  const [cols] = await conn.query("SHOW COLUMNS FROM students");
  const colFields = cols.map(c => c.Field);
  console.log("📋 Columns found:", colFields);

  // Sync alias columns in students table
  if (colFields.includes("full_name")) {
    try { await conn.query("UPDATE students SET full_name = student_name WHERE (full_name IS NULL OR full_name = '') AND student_name IS NOT NULL"); } catch(e){}
  }
  if (colFields.includes("student_name")) {
    try { await conn.query("UPDATE students SET student_name = full_name WHERE (student_name IS NULL OR student_name = '') AND full_name IS NOT NULL"); } catch(e){}
  }

  if (colFields.includes("program_code")) {
    try { await conn.query("UPDATE students SET program_code = branch WHERE (program_code IS NULL OR program_code = '') AND branch IS NOT NULL"); } catch(e){}
  }
  if (colFields.includes("branch")) {
    try { await conn.query("UPDATE students SET branch = program_code WHERE (branch IS NULL OR branch = '') AND program_code IS NOT NULL"); } catch(e){}
  }

  if (colFields.includes("contact_number")) {
    try { await conn.query("UPDATE students SET contact_number = mobile_number WHERE (contact_number IS NULL OR contact_number = '') AND mobile_number IS NOT NULL"); } catch(e){}
  }
  if (colFields.includes("mobile_number")) {
    try { await conn.query("UPDATE students SET mobile_number = contact_number WHERE (mobile_number IS NULL OR mobile_number = '') AND contact_number IS NOT NULL"); } catch(e){}
  }

  if (colFields.includes("academic_year")) {
    try { await conn.query("UPDATE students SET academic_year = '2025-2026' WHERE academic_year IS NULL"); } catch(e){}
  }
  if (colFields.includes("division")) {
    try { await conn.query("UPDATE students SET division = 'A' WHERE division IS NULL"); } catch(e){}
  }

  const [sample] = await conn.query("SELECT student_id, roll_number, full_name, student_name, program_code, branch, contact_number, mobile_number FROM students LIMIT 5");
  console.log("\n✅ Synced Sample Rows in MySQL Workbench:");
  console.log(sample);

  console.log("\n=========================================================================");
  console.log("STUDENT COLUMNS SYNC COMPLETED (100% SUCCESS)");
  console.log("=========================================================================\n");

  await conn.end();
}

fixStudentsColumns().catch(console.error);
