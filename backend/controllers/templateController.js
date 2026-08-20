const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const { getDb } = require("../config/db");
const XLSX = require("xlsx");

// Get Active Template details
async function getActiveTemplate(req, res) {
  try {
    const { pool } = await getDb();
    const [rows] = await pool.query(
      `SELECT t.*, ay.year_label 
       FROM templates t 
       LEFT JOIN academic_years ay ON t.academic_year_id = ay.id 
       WHERE t.is_active = 1 
       ORDER BY t.id DESC LIMIT 1`
    );

    if (rows.length === 0) {
      // Return default template reference if none in DB
      const defaultTemplatePath = path.resolve(__dirname, "../uploads/Official_Academic_Data_Template.xlsx");
      return res.json({
        id: 0,
        name: "Official_Academic_Data_Template.xlsx",
        version: "v1.0",
        file_path: defaultTemplatePath,
        uploaded_at: new Date()
      });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error("Get template error:", error);
    return res.status(500).json({ error: "Failed to fetch template" });
  }
}

// Download Active Template
async function downloadTemplate(req, res) {
  try {
    const { pool } = await getDb();
    const [rows] = await pool.query(`SELECT file_path, name, version FROM templates WHERE is_active = 1 ORDER BY id DESC LIMIT 1`);

    let templatePath = rows.length > 0 && fs.existsSync(rows[0].file_path)
      ? rows[0].file_path
      : path.resolve(__dirname, "../uploads/Official_Academic_Data_Template.xlsx");

    let downloadFilename = rows.length > 0 && rows[0].name 
      ? rows[0].name 
      : "Official_Academic_Data_Template.xlsx";

    if (!downloadFilename.toLowerCase().endsWith(".xlsx")) {
      downloadFilename += ".xlsx";
    }

    // Generate if missing using XLSX library
    if (!fs.existsSync(templatePath)) {
      const sampleStudentData = [
        {
          Roll_Number: "NKC-001",
          Student_Name: "Rohan Sharma",
          Branch: "B.Com",
          Semester: "Sem 1",
          Year: "FY",
          Gender: "Male",
          DOB: "2005-05-15",
          Email: "rohan.sharma@example.com",
          Mobile_Number: "9876543210",
          CGPA: "8.5",
          Percentage: "78.5",
          Enrollment_Number: "ENR2026001"
        }
      ];
      const worksheet = XLSX.utils.json_to_sheet(sampleStudentData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Student_Data");
      XLSX.writeFile(workbook, templatePath);
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${downloadFilename}"`);
    return res.sendFile(path.resolve(templatePath));
  } catch (error) {
    console.error("Download template error:", error);
    return res.status(500).json({ error: "Failed to download template" });
  }
}

// Upload New Template (Admin only)
async function uploadTemplate(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "No template file uploaded" });
  }

  const { version, academic_year_id } = req.body;

  try {
    const { pool } = await getDb();
    
    // Deactivate previous active templates
    await pool.query(`UPDATE templates SET is_active = 0`);

    const [tRes] = await pool.query(
      `INSERT INTO templates (name, version, file_path, academic_year_id, is_active) VALUES (?, ?, ?, ?, 1)`,
      [req.file.originalname, version || "v1.1", req.file.path, academic_year_id || null]
    );

    await pool.query(
      `INSERT INTO audit_logs (user_id, username, action, details) VALUES (?, ?, 'UPLOAD_TEMPLATE', ?)`,
      [req.user.id, req.user.username, `Uploaded official template version ${version || 'v1.1'}`]
    );

    return res.status(201).json({ message: "New template uploaded and set as active", template_id: tRes.insertId });
  } catch (error) {
    console.error("Upload template error:", error);
    return res.status(500).json({ error: "Failed to upload template" });
  }
}

function os_exec(cmd) {
  return new Promise(resolve => exec(cmd, resolve));
}

module.exports = { getActiveTemplate, downloadTemplate, uploadTemplate };
