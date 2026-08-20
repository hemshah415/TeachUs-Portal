const { getDb } = require("../config/db");

// Dashboard Overview Analytics
async function getDashboardMetrics(req, res) {
  try {
    const { pool } = await getDb();

    const [totalCollegesRows] = await pool.query(`SELECT COUNT(*) as count FROM colleges WHERE status = 'ACTIVE'`);
    const totalColleges = totalCollegesRows[0]?.count || totalCollegesRows[0]?.['COUNT(*)'] || 0;

    const [submittedCollegesRows] = await pool.query(`SELECT COUNT(DISTINCT college_id) as count FROM uploads`);
    const submittedColleges = submittedCollegesRows[0]?.count || submittedCollegesRows[0]?.['COUNT(*)'] || 0;

    const pendingColleges = Math.max(0, totalColleges - submittedColleges);

    const [approvedRows] = await pool.query(`SELECT COUNT(*) as count FROM uploads WHERE admin_status = 'Approved'`);
    const approvedCount = approvedRows[0]?.count || approvedRows[0]?.['COUNT(*)'] || 0;

    const [rejectedRows] = await pool.query(`SELECT COUNT(*) as count FROM uploads WHERE admin_status = 'Rejected'`);
    const rejectedCount = rejectedRows[0]?.count || rejectedRows[0]?.['COUNT(*)'] || 0;

    const [errorCountRows] = await pool.query(`SELECT COUNT(*) as count FROM validation_errors`);
    const totalValidationErrors = errorCountRows[0]?.count || errorCountRows[0]?.['COUNT(*)'] || 0;

    const [studentsRows] = await pool.query(`SELECT COUNT(*) as count FROM students`);
    const totalStudents = studentsRows[0]?.count || studentsRows[0]?.['COUNT(*)'] || 0;

    // Submissions breakdown by college
    const [collegeSubmissions] = await pool.query(`
      SELECT c.id, c.code, c.name, c.university,
             u.id as last_upload_id, u.file_name, u.validation_status, u.admin_status, u.admin_remarks,
             u.student_count, u.error_count, u.uploaded_at
      FROM colleges c
      LEFT JOIN (
        SELECT u1.* FROM uploads u1
        INNER JOIN (
          SELECT college_id, MAX(id) as max_id FROM uploads GROUP BY college_id
        ) u2 ON u1.id = u2.max_id
      ) u ON c.id = u.college_id
      ORDER BY c.name ASC
    `);

    // Validation status count breakdown
    const [statusBreakdown] = await pool.query(`
      SELECT validation_status, COUNT(*) as count FROM uploads GROUP BY validation_status
    `);

    // Top Error Columns Breakdown
    const [topErrorCols] = await pool.query(`
      SELECT column_name, COUNT(*) as count FROM validation_errors GROUP BY column_name ORDER BY count DESC LIMIT 5
    `);

    // All individual file uploads for multi-file review
    const [allUploads] = await pool.query(`
      SELECT u.*, 
             COALESCE(c.name, 'Nagindas Khandwala College') as college_name, 
             COALESCE(c.code, 'NKC001') as college_code, 
             ay.year_label
      FROM uploads u
      LEFT JOIN colleges c ON (u.college_id = c.id OR u.college_id = c.college_id)
      LEFT JOIN academic_years ay ON u.academic_year_id = ay.id
      ORDER BY u.id DESC
    `);

    // Daily Submission & Error Timeline Trend for Line Chart
    const [dailyTrend] = await pool.query(`
      SELECT DATE(COALESCE(uploaded_at, CURRENT_DATE)) as upload_date, 
             COUNT(*) as upload_count, 
             SUM(COALESCE(error_count, 0)) as total_errors,
             SUM(COALESCE(student_count, 0)) as total_students
      FROM uploads
      GROUP BY DATE(COALESCE(uploaded_at, CURRENT_DATE))
      ORDER BY upload_date ASC
      LIMIT 14
    `);

    return res.json({
      metrics: {
        totalColleges,
        submittedColleges,
        pendingColleges,
        approvedCount,
        rejectedCount,
        totalValidationErrors,
        totalStudents
      },
      collegeSubmissions,
      allUploads,
      statusBreakdown,
      topErrorCols,
      dailyTrend
    });

  } catch (error) {
    console.error("Dashboard metrics error:", error);
    return res.status(500).json({ error: "Failed to load dashboard metrics" });
  }
}

// Audit Logs
async function getAuditLogs(req, res) {
  try {
    const { pool } = await getDb();
    const [logs] = await pool.query(`SELECT * FROM audit_logs ORDER BY id DESC LIMIT 200`);
    return res.json(logs);
  } catch (error) {
    console.error("Get audit logs error:", error);
    return res.status(500).json({ error: "Failed to fetch audit logs" });
  }
}

// Power BI Data Feed API
async function getPowerBiDataFeed(req, res) {
  const { college_id } = req.query;

  try {
    const { pool } = await getDb();

    let subQuery = `
      SELECT c.id as college_id, c.name as college_name, c.code, c.university, c.state,
             ay.year_label, u.file_name, u.student_count, u.validation_status,
             u.admin_status, u.error_count, u.uploaded_at
      FROM uploads u
      JOIN colleges c ON (u.college_id = c.id OR u.college_id = c.college_id)
      LEFT JOIN academic_years ay ON u.academic_year_id = ay.id
    `;
    const params = [];

    if (college_id) {
      subQuery += ` WHERE u.college_id = ?`;
      params.push(college_id);
    }

    subQuery += ` ORDER BY u.id DESC`;

    const [submissions] = await pool.query(subQuery, params);

    let errQuery = `
      SELECT ve.column_name, ve.error_message, COALESCE(ve.severity, 'ERROR') as severity, COUNT(*) as error_frequency
      FROM validation_errors ve
      JOIN uploads u ON (ve.upload_id = u.id OR ve.upload_id = u.upload_id)
    `;
    const errParams = [];

    if (college_id) {
      errQuery += ` WHERE u.college_id = ?`;
      errParams.push(college_id);
    }

    errQuery += ` GROUP BY ve.column_name, ve.error_message, ve.severity`;

    const [errorSummary] = await pool.query(errQuery, errParams);

    // Status Ring Breakdown for Doughnut Chart
    let statusQuery = `SELECT admin_status, COUNT(*) as count FROM uploads u JOIN colleges c ON (u.college_id = c.id OR u.college_id = c.college_id)`;
    const statusParams = [];
    if (college_id) {
      statusQuery += ` WHERE u.college_id = ?`;
      statusParams.push(college_id);
    }
    statusQuery += ` GROUP BY admin_status`;
    const [statusRing] = await pool.query(statusQuery, statusParams);

    // Branch / Stream Student Breakdown for Bar Chart
    let branchQuery = `SELECT s.branch, COUNT(*) as count FROM students s JOIN uploads u ON (s.upload_id = u.id OR s.upload_id = u.upload_id)`;
    const branchParams = [];
    if (college_id) {
      branchQuery += ` WHERE u.college_id = ?`;
      branchParams.push(college_id);
    }
    branchQuery += ` GROUP BY s.branch ORDER BY count DESC LIMIT 8`;
    const [branchBreakdown] = await pool.query(branchQuery, branchParams);

    const totalStudents = submissions.reduce((acc, curr) => acc + (curr.student_count || 0), 0);
    const totalErrors = submissions.reduce((acc, curr) => acc + (curr.error_count || 0), 0);
    const qualityScore = totalStudents > 0 ? Number(Math.max(0, 100 - (totalErrors / totalStudents * 100)).toFixed(1)) : 100.0;

    return res.json({
      timestamp: new Date(),
      filtered_college_id: college_id || "ALL",
      total_submissions: submissions.length,
      total_students: totalStudents,
      data_quality_score: qualityScore,
      statusRing,
      branchBreakdown,
      submissions,
      errorSummary
    });
  } catch (error) {
    console.error("Power BI data feed error:", error);
    return res.status(500).json({ error: "Failed to generate Power BI data feed" });
  }
}

module.exports = { getDashboardMetrics, getAuditLogs, getPowerBiDataFeed };
