const { getDb } = require("../config/db");
const { createNotification } = require("./notificationController");

// Get all Academic Years
async function getAcademicYears(req, res) {
  try {
    const { pool } = await getDb();
    const [rows] = await pool.query(`SELECT * FROM academic_years ORDER BY id DESC`);
    return res.json(rows);
  } catch (error) {
    console.error("Fetch academic years error:", error);
    return res.status(500).json({ error: "Failed to fetch academic years" });
  }
}

// Create Academic Year
async function createAcademicYear(req, res) {
  const { year_label, start_date, end_date, deadline } = req.body;

  if (!year_label || !deadline) {
    return res.status(400).json({ error: "Year label and deadline are required" });
  }

  try {
    const { pool } = await getDb();
    const [result] = await pool.query(
      `INSERT INTO academic_years (year_label, start_date, end_date, deadline, is_open) VALUES (?, ?, ?, ?, 1)`,
      [year_label, start_date || null, end_date || null, deadline]
    );

    await createNotification({
      title: `New Academic Session Created: ${year_label}`,
      message: `Academic Session ${year_label} created. Submission deadline set to ${deadline}.`,
      type: "INFO"
    });

    await pool.query(
      `INSERT INTO audit_logs (user_id, username, action, details) VALUES (?, ?, 'CREATE_ACADEMIC_YEAR', ?)`,
      [req.user.id, req.user.username, `Created Academic Year ${year_label} with deadline ${deadline}`]
    );

    return res.status(201).json({ message: "Academic Year created successfully", id: result.insertId });
  } catch (error) {
    console.error("Create academic year error:", error);
    return res.status(500).json({ error: error.message || "Failed to create academic year" });
  }
}

// Toggle Submission Window
async function toggleSubmissionWindow(req, res) {
  const { id } = req.params;
  const { is_open } = req.body;

  try {
    const { pool } = await getDb();
    await pool.query(`UPDATE academic_years SET is_open = ? WHERE id = ?`, [is_open ? 1 : 0, id]);

    const [ay] = await pool.query(`SELECT year_label FROM academic_years WHERE id = ?`, [id]);
    const yearLabel = ay[0]?.year_label || `ID ${id}`;

    await createNotification({
      title: `Submission Window Update: ${yearLabel}`,
      message: `The academic data submission window for ${yearLabel} has been set to ${is_open ? 'OPEN' : 'CLOSED'} by Administrator.`,
      type: is_open ? "INFO" : "WARNING"
    });

    await pool.query(
      `INSERT INTO audit_logs (user_id, username, action, details) VALUES (?, ?, 'TOGGLE_WINDOW', ?)`,
      [req.user.id, req.user.username, `Set submission window for Academic Year ID ${id} to ${is_open ? 'OPEN' : 'CLOSED'}`]
    );

    return res.json({ message: `Submission window set to ${is_open ? 'OPEN' : 'CLOSED'}` });
  } catch (error) {
    console.error("Toggle submission window error:", error);
    return res.status(500).json({ error: "Failed to update submission window" });
  }
}

// Update Submission Deadline
async function updateDeadline(req, res) {
  const { id } = req.params;
  const { deadline } = req.body;

  try {
    const { pool } = await getDb();
    await pool.query(`UPDATE academic_years SET deadline = ? WHERE id = ?`, [deadline || null, id]);

    const [ay] = await pool.query(`SELECT year_label FROM academic_years WHERE id = ?`, [id]);
    const yearLabel = ay[0]?.year_label || `ID ${id}`;

    await createNotification({
      title: `Deadline Update: ${yearLabel}`,
      message: `The submission deadline for Academic Session ${yearLabel} has been set to ${deadline || 'No Deadline'}.`,
      type: "DEADLINE"
    });

    await pool.query(
      `INSERT INTO audit_logs (user_id, username, action, details) VALUES (?, ?, 'UPDATE_DEADLINE', ?)`,
      [req.user.id, req.user.username, `Updated submission deadline for Academic Year ID ${id} to ${deadline}`]
    );

    return res.json({ message: "Submission deadline updated successfully" });
  } catch (error) {
    console.error("Update deadline error:", error);
    return res.status(500).json({ error: "Failed to update deadline" });
  }
}

module.exports = { getAcademicYears, createAcademicYear, toggleSubmissionWindow, updateDeadline };
