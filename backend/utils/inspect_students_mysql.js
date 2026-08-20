const mysql = require("mysql2/promise");
require("dotenv").config();

async function inspectStudents() {
  console.log("=========================================================================");
  console.log("🔍 INSPECTING STUDENTS TABLE IN MYSQL WORKBENCH");
  console.log("=========================================================================");

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "college_data_management"
  });

  const [cols] = await conn.query("SHOW COLUMNS FROM students");
  console.log("📋 Columns in 'students' table:", cols.map(c => c.Field));

  const [rows] = await conn.query("SELECT * FROM students LIMIT 10");
  console.log("\n📦 Sample Rows (First 5):");
  console.log(rows.slice(0, 5));

  await conn.end();
}

inspectStudents().catch(console.error);
