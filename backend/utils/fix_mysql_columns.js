const mysql = require("mysql2/promise");
require("dotenv").config();

async function fixMysqlColumns() {
  console.log("=========================================================================");
  console.log("🛠️ ADAPTING MYSQL TABLE COLUMNS FOR 'college_data_management'");
  console.log("=========================================================================");

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "college_data_management"
  });

  // Check 'colleges' table columns
  const [colls] = await conn.query("SHOW COLUMNS FROM colleges");
  const colNames = colls.map(c => c.Field);
  console.log("📋 MySQL 'colleges' table columns:", colNames);

  // Add 'id' or 'college_id' alias if missing
  if (!colNames.includes("id") && colNames.includes("college_id")) {
    try { await conn.query("ALTER TABLE colleges ADD COLUMN id INT PRIMARY KEY AUTO_INCREMENT"); } catch(e){}
  }
  if (!colNames.includes("name")) {
    try { await conn.query("ALTER TABLE colleges ADD COLUMN name VARCHAR(255)"); } catch(e){}
    try { await conn.query("UPDATE colleges SET name = college_name WHERE name IS NULL AND college_name IS NOT NULL"); } catch(e){}
  }
  if (!colNames.includes("code")) {
    try { await conn.query("ALTER TABLE colleges ADD COLUMN code VARCHAR(50)"); } catch(e){}
    try { await conn.query("UPDATE colleges SET code = college_code WHERE code IS NULL AND college_code IS NOT NULL"); } catch(e){}
  }
  if (!colNames.includes("university")) try { await conn.query("ALTER TABLE colleges ADD COLUMN university VARCHAR(255) DEFAULT 'University of Mumbai'"); } catch(e){}
  if (!colNames.includes("state")) try { await conn.query("ALTER TABLE colleges ADD COLUMN state VARCHAR(100) DEFAULT 'Maharashtra'"); } catch(e){}
  if (!colNames.includes("contact_email")) try { await conn.query("ALTER TABLE colleges ADD COLUMN contact_email VARCHAR(150) DEFAULT 'principal@college.edu.in'"); } catch(e){}
  if (!colNames.includes("contact_phone")) try { await conn.query("ALTER TABLE colleges ADD COLUMN contact_phone VARCHAR(50) DEFAULT '9820011223'"); } catch(e){}
  if (!colNames.includes("status")) try { await conn.query("ALTER TABLE colleges ADD COLUMN status VARCHAR(20) DEFAULT 'ACTIVE'"); } catch(e){}

  // Ensure default colleges exist
  const [cCount] = await conn.query("SELECT COUNT(*) as count FROM colleges");
  if (cCount[0].count === 0) {
    await conn.query(`
      INSERT INTO colleges (code, name, university, state, contact_email, contact_phone, status) VALUES
      ('NKC001', 'Nagindas Khandwala College', 'University of Mumbai', 'Maharashtra', 'principal@nkc.edu.in', '9820011223', 'ACTIVE'),
      ('LLR002', 'Lala Lajpat Rai College', 'University of Mumbai', 'Maharashtra', 'info@lalacollege.edu.in', '9820044556', 'ACTIVE'),
      ('VAL003', 'Valia Chhaganlal Laljibhai College', 'University of Mumbai', 'Maharashtra', 'contact@valiacollege.edu.in', '9820077889', 'ACTIVE'),
      ('BHV004', 'Bhavans College', 'University of Mumbai', 'Maharashtra', 'admin@bhavans.ac.in', '9820099001', 'ACTIVE')
    `);
  }

  // Check 'users' table
  const [usersExist] = await conn.query("SHOW TABLES LIKE 'users'");
  if (usersExist.length === 0) {
    await conn.query(`
      CREATE TABLE users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        role VARCHAR(20) NOT NULL DEFAULT 'COLLEGE',
        college_id INT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  const bcrypt = require("bcrypt");
  const adminPass = await bcrypt.hash("admin123", 10);
  const collegePass = await bcrypt.hash("college123", 10);

  const [uCount] = await conn.query("SELECT COUNT(*) as count FROM users");
  if (uCount[0].count === 0) {
    await conn.query(`
      INSERT INTO users (username, password, email, role, college_id, status) VALUES
      ('admin', '${adminPass}', 'admin@edtechplatform.com', 'ADMIN', NULL, 'ACTIVE'),
      ('nkc_user', '${collegePass}', 'principal@nkc.edu.in', 'COLLEGE', 1, 'ACTIVE'),
      ('lala_user', '${collegePass}', 'info@lalacollege.edu.in', 'COLLEGE', 2, 'ACTIVE'),
      ('valia_user', '${collegePass}', 'contact@valiacollege.edu.in', 'COLLEGE', 3, 'ACTIVE'),
      ('bhavans_user', '${collegePass}', 'admin@bhavans.ac.in', 'COLLEGE', 4, 'ACTIVE')
    `);
    console.log("🌱 Default Users Seeded");
  }

  console.log("✅ MySQL Schema adaptation complete!");
  await conn.end();
}

fixMysqlColumns().catch(console.error);
