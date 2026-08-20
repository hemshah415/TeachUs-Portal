const mysql = require("mysql2/promise");
require("dotenv").config();

let pool = null;
let isFallback = false;

// Create database pool
async function getDb() {
  if (pool) return { pool, isFallback };

  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "college_academic_db",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true
    });

    // Test connection
    const connection = await pool.getConnection();
    console.log("✅ Connected to MySQL Database successfully");
    connection.release();
    return { pool, isFallback: false };
  } catch (error) {
    console.warn("⚠️ MySQL Connection failed:", error.message);
    console.warn("⚡ Running with SQLite fallback database layer...");
    
    // SQLite in-memory or file fallback using sqlite3 / better-sqlite3 or memory store
    const sqlite3 = require('sqlite3').verbose();
    const { open } = require('sqlite');
    
    const db = await open({
      filename: './college_fallback.db',
      driver: sqlite3.Database
    });
    
    isFallback = true;
    
    // Wrapper pool mimicking mysql2/promise query API
    pool = {
      execute: async (sql, params = []) => {
        // Convert mysql ? placeholders to sqlite ? or handle simple queries
        let cleanSql = sql.replace(/ON DUPLICATE KEY UPDATE.*/gi, "");
        if (cleanSql.trim().toUpperCase().startsWith("SELECT")) {
          const rows = await db.all(sql, params);
          return [rows];
        } else if (cleanSql.trim().toUpperCase().startsWith("INSERT")) {
          const res = await db.run(sql, params);
          return [{ insertId: res.lastID, affectedRows: res.changes }];
        } else {
          const res = await db.run(sql, params);
          return [{ affectedRows: res.changes }];
        }
      },
      query: async (sql, params = []) => {
        if (sql.trim().toUpperCase().startsWith("SELECT")) {
          const rows = await db.all(sql, params);
          return [rows];
        } else {
          const res = await db.run(sql, params);
          return [{ insertId: res.lastID, affectedRows: res.changes }];
        }
      }
    };

    return { pool, isFallback: true };
  }
}

module.exports = { getDb };