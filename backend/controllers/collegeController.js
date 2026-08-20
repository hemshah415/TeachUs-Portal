const bcrypt = require("bcrypt");
const { getDb } = require("../config/db");

// Get all colleges
async function getAllColleges(req, res) {
  try {
    const { pool } = await getDb();
    const [rows] = await pool.query(
      `SELECT c.*, u.username, u.id as user_id,
              COALESCE(c.faculty_training_status, 'Pending') as faculty_training_status,
              c.faculty_training_date,
              COALESCE(c.dashboard_training_status, 'Pending') as dashboard_training_status,
              c.dashboard_training_date,
              COALESCE(c.admin_training_status, 'Pending') as admin_training_status,
              c.admin_training_date,
              COALESCE(c.trainer_name, 'TeachUs Support Team') as trainer_name,
              c.training_notes
       FROM colleges c 
       LEFT JOIN users u ON u.college_id = c.id 
       ORDER BY c.id DESC`
    );
    return res.json(rows);
  } catch (error) {
    console.error("Error fetching colleges:", error);
    return res.status(500).json({ error: "Failed to fetch colleges" });
  }
}

// Add College
async function addCollege(req, res) {
  const { code, name, university, state, contact_email, contact_phone, username, password } = req.body;

  if (!code || !name || !contact_email || !username || !password) {
    return res.status(400).json({ error: "Code, Name, Email, Username, and Password are required" });
  }

  try {
    const { pool } = await getDb();
    
    // Insert college
    const [colRes] = await pool.query(
      `INSERT INTO colleges (code, name, university, state, contact_email, contact_phone) VALUES (?, ?, ?, ?, ?, ?)`,
      [code, name, university || "University of Mumbai", state || "Maharashtra", contact_email, contact_phone || ""]
    );
    
    const collegeId = colRes.insertId;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create college user
    await pool.query(
      `INSERT INTO users (username, password, email, role, college_id, status) VALUES (?, ?, ?, 'COLLEGE', ?, 'ACTIVE')`,
      [username, hashedPassword, contact_email, collegeId]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, username, college_name, action, details) VALUES (?, ?, ?, 'ADD_COLLEGE', ?)`,
      [req.user.id, req.user.username, name, `Added new college ${name} (${code}) with username ${username}`]
    );

    return res.status(201).json({ message: "College added successfully", collegeId });
  } catch (error) {
    console.error("Add college error:", error);
    return res.status(500).json({ error: error.message || "Failed to add college" });
  }
}

// Toggle College Status
async function toggleCollegeStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body; // 'ACTIVE' or 'DISABLED'

  try {
    const { pool } = await getDb();
    await pool.query(`UPDATE colleges SET status = ? WHERE id = ?`, [status, id]);
    await pool.query(`UPDATE users SET status = ? WHERE college_id = ?`, [status, id]);

    await pool.query(
      `INSERT INTO audit_logs (user_id, username, action, details) VALUES (?, ?, 'TOGGLE_COLLEGE_STATUS', ?)`,
      [req.user.id, req.user.username, `Updated college ID ${id} status to ${status}`]
    );

    return res.json({ message: `College status updated to ${status}` });
  } catch (error) {
    console.error("Toggle college error:", error);
    return res.status(500).json({ error: "Failed to update college status" });
  }
}

// Reset Password
async function resetCollegePassword(req, res) {
  const { collegeId, newPassword } = req.body;

  if (!collegeId || !newPassword) {
    return res.status(400).json({ error: "College ID and new password are required" });
  }

  try {
    const { pool } = await getDb();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await pool.query(`UPDATE users SET password = ? WHERE college_id = ?`, [hashedPassword, collegeId]);

    await pool.query(
      `INSERT INTO audit_logs (user_id, username, action, details) VALUES (?, ?, 'RESET_PASSWORD', ?)`,
      [req.user.id, req.user.username, `Reset password for college ID ${collegeId}`]
    );

    return res.json({ message: "College user password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ error: "Failed to reset password" });
  }
}

// Get Training Tracker Records & Executive Summary
async function getCollegesTraining(req, res) {
  try {
    const { pool } = await getDb();
    const [rows] = await pool.query(
      `SELECT id, college_id, code, name, university, state, contact_email, contact_phone,
              COALESCE(faculty_training_status, 'Pending') as faculty_training_status,
              faculty_training_date,
              COALESCE(dashboard_training_status, 'Pending') as dashboard_training_status,
              dashboard_training_date,
              COALESCE(trainer_name, 'TeachUs Support Team') as trainer_name,
              training_notes
       FROM colleges
       ORDER BY id DESC`
    );

    const totalColleges = rows.length;
    const facultyDone = rows.filter(c => c.faculty_training_status === 'Completed').length;
    const dashboardDone = rows.filter(c => c.dashboard_training_status === 'Completed').length;
    const bothDone = rows.filter(c => c.faculty_training_status === 'Completed' && c.dashboard_training_status === 'Completed').length;

    return res.json({
      colleges: rows,
      summary: {
        totalColleges,
        facultyDone,
        dashboardDone,
        bothDone,
        facultyPct: totalColleges > 0 ? ((facultyDone / totalColleges) * 100).toFixed(1) : 0,
        dashboardPct: totalColleges > 0 ? ((dashboardDone / totalColleges) * 100).toFixed(1) : 0
      }
    });
  } catch (error) {
    console.error("Error fetching training tracker data:", error);
    return res.status(500).json({ error: "Failed to fetch training records" });
  }
}

// Update College Training Record
async function updateCollegeTraining(req, res) {
  const { id } = req.params;
  const { 
    faculty_training_status, faculty_training_date, 
    dashboard_training_status, dashboard_training_date, 
    admin_training_status, admin_training_date,
    trainer_name, training_notes 
  } = req.body;

  try {
    const { pool } = await getDb();
    await pool.query(
      `UPDATE colleges 
       SET faculty_training_status = ?,
           faculty_training_date = ?,
           dashboard_training_status = ?,
           dashboard_training_date = ?,
           admin_training_status = ?,
           admin_training_date = ?,
           trainer_name = ?,
           training_notes = ?
       WHERE id = ? OR college_id = ?`,
      [
        faculty_training_status || 'Pending',
        faculty_training_date || null,
        dashboard_training_status || 'Pending',
        dashboard_training_date || null,
        admin_training_status || 'Pending',
        admin_training_date || null,
        trainer_name || 'TeachUs Support Team',
        training_notes || '',
        id, id
      ]
    );

    await pool.query(
      `INSERT INTO audit_logs (user_id, username, action, details) VALUES (?, ?, 'UPDATE_TRAINING', ?)`,
      [req.user.id, req.user.username, `Updated Faculty, Dashboard & Admin training status for College ID ${id}`]
    );

    // Trigger in-app notification to College User
    const [cols] = await pool.query(`SELECT name, id FROM colleges WHERE id = ? OR college_id = ?`, [id, id]);
    const collegeId = cols[0]?.id || id;

    let notifMsg = `Training Update from Admin: Faculty Training: '${faculty_training_status || 'Pending'}', Dashboard Training: '${dashboard_training_status || 'Pending'}', Admin Training: '${admin_training_status || 'Pending'}'. Trainer: ${trainer_name || 'TeachUs Support Team'}`;

    try {
      await pool.query(
        `INSERT INTO notifications (college_id, title, message, type, is_read) VALUES (?, ?, ?, 'INFO', 0)`,
        [collegeId, `Training & Compliance Update`, notifMsg]
      );
    } catch (e) {
      console.error("Failed to insert training notification", e);
    }

    return res.json({ message: "Training record and schedule updated successfully" });
  } catch (error) {
    console.error("Update training record error:", error);
    return res.status(500).json({ error: "Failed to update training record" });
  }
}

// Get logged-in College user's profile and training status
async function getMyCollegeStatus(req, res) {
  try {
    const { pool } = await getDb();
    const college_id = req.user.college_id;
    if (!college_id) {
      return res.status(400).json({ error: "College ID missing from session" });
    }

    const [rows] = await pool.query(
      `SELECT c.*,
              COALESCE(c.faculty_training_status, 'Pending') as faculty_training_status,
              c.faculty_training_date,
              COALESCE(c.dashboard_training_status, 'Pending') as dashboard_training_status,
              c.dashboard_training_date,
              COALESCE(c.admin_training_status, 'Pending') as admin_training_status,
              c.admin_training_date,
              COALESCE(c.trainer_name, 'TeachUs Support Team') as trainer_name,
              c.training_notes
       FROM colleges c
       WHERE c.id = ?`,
      [college_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "College details not found" });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching my college status:", error);
    return res.status(500).json({ error: "Failed to fetch college status" });
  }
}

const XLSX = require("xlsx");

// Bulk Import Colleges from Excel
async function bulkImportColleges(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "Please upload an Excel file (.xlsx or .xls)" });
  }

  try {
    const { pool } = await getDb();
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet);

    if (!rawData || rawData.length === 0) {
      return res.status(400).json({ error: "The uploaded Excel sheet contains no college data." });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNum = i + 2; // Row number in Excel sheet

      // Flexibly extract headers
      const code = (row.Code || row.code || row["College Code"] || row["COLLEGE_CODE"] || "").toString().trim();
      const name = (row.Name || row.name || row["College Name"] || row["COLLEGE_NAME"] || "").toString().trim();
      const university = (row.University || row.university || row["University Name"] || "University of Mumbai").toString().trim();
      const state = (row.State || row.state || "Maharashtra").toString().trim();
      const email = (row.Contact_Email || row.email || row.Email || row["Contact Email"] || "").toString().trim();
      const phone = (row.Contact_Phone || row.phone || row.Phone || row["Contact Phone"] || "").toString().trim();
      const username = (row.Username || row.username || row["Login Username"] || row["USER_NAME"] || "").toString().trim();
      const password = (row.Password || row.password || row["Login Password"] || "").toString().trim();

      if (!code || !name || !username || !password) {
        errorCount++;
        errors.push(`Row ${rowNum}: Code, Name, Username, and Password are required.`);
        continue;
      }

      // Check duplicate college code or username
      const [existingCol] = await pool.query(`SELECT id FROM colleges WHERE code = ?`, [code]);
      if (existingCol.length > 0) {
        errorCount++;
        errors.push(`Row ${rowNum}: College Code '${code}' already exists.`);
        continue;
      }

      const [existingUser] = await pool.query(`SELECT id FROM users WHERE username = ?`, [username]);
      if (existingUser.length > 0) {
        errorCount++;
        errors.push(`Row ${rowNum}: Username '${username}' is already taken.`);
        continue;
      }

      // Insert into colleges table
      const [colRes] = await pool.query(
        `INSERT INTO colleges (code, name, university, state, contact_email, contact_phone) VALUES (?, ?, ?, ?, ?, ?)`,
        [code, name, university, state, email || `${username}@teachus.edu.in`, phone]
      );
      const collegeId = colRes.insertId;

      // Hash password & insert into users table
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        `INSERT INTO users (username, password, email, role, college_id, status) VALUES (?, ?, ?, 'COLLEGE', ?, 'ACTIVE')`,
        [username, hashedPassword, email || `${username}@teachus.edu.in`, collegeId]
      );

      successCount++;
    }

    await pool.query(
      `INSERT INTO audit_logs (user_id, username, action, details) VALUES (?, ?, 'BULK_IMPORT_COLLEGES', ?)`,
      [req.user.id, req.user.username, `Bulk registered ${successCount} college(s) from Excel file '${req.file.originalname}'. Errors: ${errorCount}`]
    );

    return res.json({
      message: `Bulk import finished: ${successCount} college(s) successfully registered.`,
      totalRows: rawData.length,
      successCount,
      errorCount,
      errors
    });
  } catch (error) {
    console.error("Bulk college import error:", error);
    return res.status(500).json({ error: "Failed to process bulk college import: " + error.message });
  }
}

// Download Excel Template for College Registration
async function downloadCollegeTemplate(req, res) {
  try {
    const sampleData = [
      {
        Code: "KC003",
        Name: "K.C. College of Arts & Commerce",
        University: "University of Mumbai",
        State: "Maharashtra",
        Contact_Email: "info@kccollege.edu.in",
        Contact_Phone: "9820011223",
        Username: "kc_user",
        Password: "college123"
      },
      {
        Code: "HR004",
        Name: "H.R. College of Commerce & Economics",
        University: "University of Mumbai",
        State: "Maharashtra",
        Contact_Email: "contact@hrcollege.edu.in",
        Contact_Phone: "9820044556",
        Username: "hr_user",
        Password: "college123"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Colleges");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=Bulk_College_Registration_Template.xlsx");
    return res.send(buffer);
  } catch (error) {
    console.error("Error generating college registration template:", error);
    return res.status(500).json({ error: "Failed to generate Excel template" });
  }
}

module.exports = { 
  getAllColleges, 
  addCollege, 
  toggleCollegeStatus, 
  resetCollegePassword,
  getCollegesTraining,
  updateCollegeTraining,
  bulkImportColleges,
  downloadCollegeTemplate,
  getMyCollegeStatus
};
