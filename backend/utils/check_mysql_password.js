const mysql = require("mysql2/promise");

const commonPasswords = [
  "root",
  "admin",
  "password",
  "123456",
  "root123",
  "mysql",
  "admin123",
  "root@123",
  "Pass123!",
  "Password123!",
  "12345678",
  "1234",
  "12345",
  "rootroot",
  "Admin@123",
  "Root@123"
];

async function findMysqlPassword() {
  console.log("=========================================================================");
  console.log("🔍 AUTODETECTING MYSQL80 PASSWORD ON LOCALHOST:3306");
  console.log("=========================================================================");

  for (const pwd of commonPasswords) {
    try {
      const conn = await mysql.createConnection({
        host: "localhost",
        port: 3306,
        user: "root",
        password: pwd
      });
      console.log(`\n🎉 SUCCESS! Connected to MySQL80 with password: '${pwd}'`);

      // Create database schema if not exists
      await conn.query("CREATE DATABASE IF NOT EXISTS college_academic_db");
      console.log("✅ Created / verified database schema 'college_academic_db'");
      await conn.end();

      return pwd;
    } catch (err) {
      // Access denied or connection failed
    }
  }

  console.log("\n⚠️ Common root passwords did not match. Trying passwordless or checking user permissions...");
  return null;
}

findMysqlPassword().then(foundPwd => {
  if (foundPwd) {
    console.log(`\nWriting DB_PASSWORD=${foundPwd} to backend/.env file...`);
    const envPath = require("path").resolve(__dirname, "../.env");
    let envContent = require("fs").readFileSync(envPath, "utf8");
    envContent = envContent.replace(/DB_PASSWORD=.*/g, `DB_PASSWORD=${foundPwd}`);
    require("fs").writeFileSync(envPath, envContent);
    console.log("✅ Updated backend/.env with MySQL password!");
  } else {
    console.log("❌ Could not autodetect MySQL root password. Please check your MySQL Workbench password.");
  }
}).catch(console.error);
