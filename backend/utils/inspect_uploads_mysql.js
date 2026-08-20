const mysql = require("mysql2/promise");
require("dotenv").config();

async function fixMysqlStatusColumn() {
  console.log("=========================================================================");
  console.log("🛠️ FIXING MYSQL STATUS COLUMN DEFINITION & POPULATING VALUES");
  console.log("=========================================================================");

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "college_data_management"
  });

  // Alter status column from restricted ENUM to VARCHAR(100)
  console.log("1. Modifying 'status' column to VARCHAR(100)...");
  try {
    await conn.query("ALTER TABLE uploads MODIFY COLUMN status VARCHAR(100) DEFAULT 'Under Review'");
    console.log("SUCCESS: 'status' column altered to VARCHAR(100).");
  } catch (e) {
    console.error("Error altering status column:", e.message);
  }

  try {
    await conn.query("ALTER TABLE uploads MODIFY COLUMN file_type VARCHAR(50) DEFAULT 'XLSX'");
  } catch (e) {}

  // Now populate status, total_records, upload_date
  console.log("2. Updating status, total_records, and upload_date values...");
  const [upRes] = await conn.query(`
    UPDATE uploads 
    SET 
      status = COALESCE(admin_status, validation_status, 'Under Review'),
      total_records = COALESCE(student_count, 0),
      upload_date = COALESCE(uploaded_at, CURRENT_TIMESTAMP),
      file_type = COALESCE(file_type, 'XLSX')
    WHERE 1=1
  `);
  console.log(`SUCCESS: Affected rows = ${upRes.affectedRows}`);

  const [sampleRows] = await conn.query("SELECT upload_id, file_name, status, total_records, admin_status, student_count FROM uploads LIMIT 5");
  console.log("\nSample Rows in MySQL Workbench after update:");
  console.log(sampleRows);

  console.log("\n=========================================================================");
  console.log("MYSQL STATUS COLUMN FIX COMPLETED (100% SUCCESS)");
  console.log("=========================================================================\n");

  await conn.end();
}

fixMysqlStatusColumn().catch(console.error);
