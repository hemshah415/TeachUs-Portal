const fs = require("fs");
const path = require("path");
const { getDb } = require("../config/db");

// Get Data Retention Settings & Expired Submission Stats
async function getRetentionSettings(req, res) {
  try {
    const { pool } = await getDb();

    const [rows] = await pool.query(`SELECT setting_key, setting_value FROM system_settings`);
    const settings = {};
    rows.forEach(r => { settings[r.setting_key] = r.setting_value; });

    const retentionMonths = parseInt(settings.retention_months || "2", 10);
    const autoPurgeEnabled = settings.auto_purge_enabled === "1";

    // Calculate cutoff date based on retention months (e.g. 2 months ago)
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);
    const cutoffStr = cutoffDate.toISOString().slice(0, 19).replace('T', ' ');

    // Find expired uploads
    const [expiredRows] = await pool.query(
      `SELECT COUNT(*) as count, SUM(student_count) as total_students FROM uploads WHERE uploaded_at < ?`,
      [cutoffStr]
    );

    const expiredCount = expiredRows[0]?.count || expiredRows[0]?.['COUNT(*)'] || 0;
    const expiredStudents = expiredRows[0]?.total_students || 0;

    return res.json({
      retention_months: retentionMonths,
      auto_purge_enabled: autoPurgeEnabled,
      cutoff_date: cutoffStr,
      expired_submissions_count: expiredCount,
      expired_students_count: expiredStudents
    });
  } catch (error) {
    console.error("Get retention settings error:", error);
    return res.status(500).json({ error: "Failed to fetch data retention settings" });
  }
}

// Update Data Retention Settings (Admin Only)
async function updateRetentionSettings(req, res) {
  const { retention_months, auto_purge_enabled } = req.body;

  if (retention_months === undefined) {
    return res.status(400).json({ error: "Retention months value is required" });
  }

  try {
    const { pool } = await getDb();
    const monthsVal = String(Math.max(1, parseInt(retention_months, 10) || 2));
    const enabledVal = auto_purge_enabled ? "1" : "0";

    await pool.query(`DELETE FROM system_settings WHERE setting_key = 'retention_months'`);
    await pool.query(`INSERT INTO system_settings (setting_key, setting_value) VALUES ('retention_months', ?)`, [monthsVal]);

    await pool.query(`DELETE FROM system_settings WHERE setting_key = 'auto_purge_enabled'`);
    await pool.query(`INSERT INTO system_settings (setting_key, setting_value) VALUES ('auto_purge_enabled', ?)`, [enabledVal]);

    await pool.query(
      `INSERT INTO audit_logs (user_id, username, action, details) VALUES (?, ?, 'UPDATE_RETENTION_POLICY', ?)`,
      [req.user.id, req.user.username, `Updated Data Retention Policy: Period=${monthsVal} month(s), Auto-Purge=${enabledVal === '1' ? 'ENABLED' : 'DISABLED'}`]
    );

    return res.json({
      message: `Retention policy updated: Data older than ${monthsVal} month(s) will be auto-deleted.`,
      retention_months: parseInt(monthsVal, 10),
      auto_purge_enabled: enabledVal === "1"
    });
  } catch (error) {
    console.error("Update retention settings error:", error);
    return res.status(500).json({ error: "Failed to update retention settings" });
  }
}

// Execute Data Purge (Delete submissions older than retention_months)
async function executeDataPurge(req, res) {
  try {
    const { pool } = await getDb();

    // Fetch retention_months setting
    const [settings] = await pool.query(`SELECT setting_value FROM system_settings WHERE setting_key = 'retention_months'`);
    const retentionMonths = parseInt(settings[0]?.setting_value || "2", 10);

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);
    const cutoffStr = cutoffDate.toISOString().slice(0, 19).replace('T', ' ');

    const [expiredUploads] = await pool.query(`SELECT * FROM uploads WHERE uploaded_at < ?`, [cutoffStr]);

    if (expiredUploads.length === 0) {
      if (res) {
        return res.json({ message: `No expired submission data older than ${retentionMonths} month(s) found.`, purged_count: 0 });
      }
      return { purged_uploads: 0, purged_students: 0 };
    }

    let purgedFilesCount = 0;
    let purgedStudentsCount = 0;

    for (const upload of expiredUploads) {
      // Unlink original Excel/ZIP file
      if (upload.file_path && fs.existsSync(upload.file_path)) {
        try { fs.unlinkSync(upload.file_path); } catch (e) {}
      }

      // Unlink error report file if exists
      const [valRes] = await pool.query(`SELECT report_path FROM validation_results WHERE upload_id = ?`, [upload.id]);
      if (valRes.length > 0 && valRes[0].report_path && fs.existsSync(valRes[0].report_path)) {
        try { fs.unlinkSync(valRes[0].report_path); } catch (e) {}
      }

      // Delete DB records
      await pool.query(`DELETE FROM students WHERE upload_id = ?`, [upload.id]);
      await pool.query(`DELETE FROM validation_errors WHERE upload_id = ?`, [upload.id]);
      await pool.query(`DELETE FROM validation_results WHERE upload_id = ?`, [upload.id]);
      await pool.query(`DELETE FROM uploads WHERE id = ?`, [upload.id]);

      purgedFilesCount++;
      purgedStudentsCount += (upload.student_count || 0);
    }

    const username = req?.user?.username || "SYSTEM_JOB";
    const userId = req?.user?.id || null;

    await pool.query(
      `INSERT INTO audit_logs (user_id, username, action, details) VALUES (?, ?, 'DATA_PURGE_EXECUTED', ?)`,
      [userId, username, `Permanently purged ${purgedFilesCount} submission batch(es) and ${purgedStudentsCount} student record(s) older than ${retentionMonths} month(s) (Cutoff: ${cutoffStr})`]
    );

    if (res) {
      return res.json({
        message: `Successfully purged ${purgedFilesCount} expired submission batch(es) older than ${retentionMonths} month(s).`,
        purged_uploads: purgedFilesCount,
        purged_students: purgedStudentsCount,
        cutoff_date: cutoffStr
      });
    }

    return { purged_uploads: purgedFilesCount, purged_students: purgedStudentsCount };
  } catch (error) {
    console.error("Execute data purge error:", error);
    if (res) return res.status(500).json({ error: "Failed to execute data purge" });
  }
}

// Background Auto-Purge Task (Called on server startup / cron)
async function runAutoPurgeBackground() {
  try {
    const { pool } = await getDb();
    const [settings] = await pool.query(`SELECT setting_key, setting_value FROM system_settings`);
    const cfg = {};
    settings.forEach(r => { cfg[r.setting_key] = r.setting_value; });

    if (cfg.auto_purge_enabled === "1") {
      console.log(`🧹 Running Automated Data Retention Background Check (Policy: ${cfg.retention_months || 2} Months)...`);
      const result = await executeDataPurge(null, null);
      if (result && result.purged_uploads > 0) {
        console.log(`✅ Auto-Purge Completed: Removed ${result.purged_uploads} expired submission(s).`);
      } else {
        console.log(`✅ Auto-Purge Check Completed: No expired files to delete.`);
      }
    }
  } catch (err) {
    console.error("Background auto purge error:", err);
  }
}

module.exports = {
  getRetentionSettings,
  updateRetentionSettings,
  executeDataPurge,
  runAutoPurgeBackground
};
