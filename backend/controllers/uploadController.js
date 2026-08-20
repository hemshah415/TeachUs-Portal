const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");
const XLSX = require("xlsx");
const AdmZip = require("adm-zip");
const { getDb } = require("../config/db");
const { createNotification } = require("./notificationController");

// System Completeness Audit Engine
function performAiCompletenessAudit(allStudents, fileList = []) {
  if (!allStudents || allStudents.length === 0) {
    return {
      auditText: "System Audit: No valid student records found in submission.",
      hasWarning: true,
      warnings: ["No valid student records found"]
    };
  }

  const courseDivMap = {};

  allStudents.forEach(st => {
    const course = String(st.branch || "General").trim().toUpperCase();
    
    // Extract Division (e.g. Div A, Division B, Section A, or trailing A/B)
    let div = "A";
    const divMatch = (st.student_name || "").match(/Div[ision\s]*([A-Z])/i) || 
                     (st.branch || "").match(/Div[ision\s]*([A-Z])/i) ||
                     (st.branch || "").match(/\b([A-C])\b/i);
    if (divMatch) {
      div = divMatch[1].toUpperCase();
    }

    if (!courseDivMap[course]) courseDivMap[course] = new Set();
    courseDivMap[course].add(div);
  });

  const courseSummaries = [];
  const warnings = [];

  Object.keys(courseDivMap).forEach(course => {
    const divs = Array.from(courseDivMap[course]).sort();
    courseSummaries.push(`${course} (Div ${divs.join(", ")})`);

    // Check for missing divisions
    if (divs.includes("A") && !divs.includes("B") && (course.includes("BCOM") || course.includes("BAMMC") || course.includes("BSC"))) {
      warnings.push(`${course} Division B data is missing`);
    }
  });

  let auditText = `System Audit: Detected ${Object.keys(courseDivMap).length} Course(s) [${courseSummaries.join("; ")}].`;

  if (warnings.length > 0) {
    auditText += ` Notice: ${warnings.join("; ")}. Total ${allStudents.length} student records verified.`;
  } else {
    auditText += ` Course and Division structure verified complete. Total ${allStudents.length} student records verified.`;
  }

  return {
    auditText,
    hasWarning: warnings.length > 0,
    warnings
  };
}

// Helper to recursively find Excel files in a directory
function findExcelFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!file.startsWith("__MACOSX") && !file.startsWith(".")) {
        findExcelFiles(filePath, filesList);
      }
    } else if (file.match(/\.(xlsx|xls)$/i) && !file.startsWith("~$") && !file.startsWith(".")) {
      filesList.push(filePath);
    }
  }
  return filesList;
}

// Run Python validator CLI
function runPythonValidator(inputFile, jsonOut, excelErrOut) {
  return new Promise((resolve) => {
    const validatorPath = path.resolve(__dirname, "../../validator/validate.py");
    
    execFile("python", [validatorPath, inputFile, jsonOut, excelErrOut], {
      env: { ...process.env, PYTHONIOENCODING: "utf-8" }
    }, (error, stdout, stderr) => {
      if (error) {
        console.warn("⚠️ Python validator execution error, utilizing JS fallback parsing:", error.message, stderr);
        return resolve(null);
      }
      try {
        if (fs.existsSync(jsonOut)) {
          const raw = fs.readFileSync(jsonOut, "utf-8");
          return resolve(JSON.parse(raw));
        }
      } catch (err) {
        console.error("Error reading JSON validation output:", err);
      }
      return resolve(null);
    });
  });
}

// Robust JS Validator with Header Auto-Detection & Legacy Column Mapping
function runJsValidator(inputFile) {
  const workbook = XLSX.readFile(inputFile);
  const sheetName = workbook.SheetNames.includes("Student_Data") ? "Student_Data" : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const errors = [];

  if (!rawRows || rawRows.length === 0) {
    return {
      status: "Failed",
      total_rows: 0,
      passed_rows: 0,
      error_count: 1,
      errors: [{ row: 1, column: "Sheet", error: "Uploaded Excel file is empty.", severity: "ERROR" }],
      students: []
    };
  }

  // Locate header row
  let headerIdx = 0;
  const targetKeywords = ["roll_number", "roll no", "student_name", "student name", "name", "email", "mobile_number", "mobile"];

  for (let idx = 0; idx < Math.min(15, rawRows.length); idx++) {
    const rowStr = (rawRows[idx] || []).map(v => String(v).toLowerCase()).join(" ");
    const matches = targetKeywords.filter(kw => rowStr.includes(kw)).length;
    if (matches >= 2) {
      headerIdx = idx;
      break;
    }
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { range: headerIdx });
  const students = [];
  const seenRolls = new Set();

  // Check header column existence
  const headerKeys = rows.length > 0 ? Object.keys(rows[0]).map(k => String(k).trim().toLowerCase().replace(/[\s\.]+/g, "_")) : [];
  const hasRollCol = headerKeys.some(k => k.includes("roll"));
  const hasNameCol = headerKeys.some(k => k.includes("name"));

  if (rows.length > 0 && !hasRollCol && !hasNameCol) {
    errors.push({
      row: headerIdx + 1,
      column: "Header_Format",
      error: "Required columns 'Roll_Number' and 'Student_Name' not found. Please download official template for correct column format.",
      severity: "ERROR"
    });
  }

  rows.forEach((r, idx) => {
    const rowNum = headerIdx + idx + 2;
    if (!r || Object.keys(r).length === 0) return;

    // Auto-map column names
    let roll = "", name = "", branch = "", sem = 1, year = 1, gender = "", dob = "", email = "", mobile = "", cgpa = null, percentage = null, enrollment = "";

    Object.keys(r).forEach(k => {
      const cleanK = String(k).trim().toLowerCase().replace(/[\s\.]+/g, "_");
      const val = String(r[k] || "").trim();

      if (cleanK.includes("roll")) roll = val;
      else if (cleanK.includes("student_name") || cleanK.includes("name_of") || cleanK === "name") name = val;
      else if (cleanK.includes("branch") || cleanK.includes("course") || cleanK.includes("section") || cleanK.includes("program")) branch = val;
      else if (cleanK.includes("sem")) sem = Number(r[k]) || 1;
      else if (cleanK.includes("year") && !cleanK.includes("academic")) year = Number(r[k]) || 1;
      else if (cleanK.includes("gender")) gender = val;
      else if (cleanK.includes("dob") || cleanK.includes("birth")) dob = val;
      else if (cleanK.includes("email")) email = val;
      else if (cleanK.includes("mobile") || cleanK.includes("phone") || cleanK.includes("contact")) mobile = val;
      else if (cleanK.includes("cgpa")) cgpa = r[k] !== undefined && r[k] !== null && r[k] !== "" ? Number(r[k]) : null;
      else if (cleanK.includes("percent")) percentage = r[k] !== undefined && r[k] !== null && r[k] !== "" ? Number(r[k]) : null;
      else if (cleanK.includes("enroll") || cleanK.includes("id") || cleanK.includes("sr")) enrollment = val;
    });

    let rowHasError = false;

    if (!roll) {
      errors.push({ row: rowNum, column: "Roll_Number", error: "Roll Number cannot be empty.", severity: "ERROR" });
      rowHasError = true;
    } else if (seenRolls.has(roll)) {
      errors.push({ row: rowNum, column: "Roll_Number", error: `Duplicate Roll Number '${roll}' detected. Roll numbers must be unique per student.`, severity: "ERROR" });
      rowHasError = true;
    } else {
      seenRolls.add(roll);
    }

    if (!name) {
      errors.push({ row: rowNum, column: "Student_Name", error: "Student Name cannot be empty.", severity: "ERROR" });
      rowHasError = true;
    }

    if (!branch) {
      errors.push({ row: rowNum, column: "Branch", error: "Branch / Course cannot be empty.", severity: "ERROR" });
      rowHasError = true;
    }

    if (email && !/^[\w\.-]+@[\w\.-]+\.\w+$/.test(email)) {
      errors.push({ row: rowNum, column: "Email", error: `Invalid Email address format '${email}'. Must be standard email (e.g. student@college.edu.in).`, severity: "ERROR" });
      rowHasError = true;
    }

    if (mobile && mobile.replace(/\D/g, '').length !== 10) {
      errors.push({ row: rowNum, column: "Mobile_Number", error: `Invalid Mobile Number '${mobile}'. Must be exactly 10 digits.`, severity: "ERROR" });
      rowHasError = true;
    }

    if (cgpa !== null && (isNaN(cgpa) || cgpa < 0 || cgpa > 10)) {
      errors.push({ row: rowNum, column: "CGPA", error: `Invalid CGPA '${cgpa}'. CGPA must be between 0.00 and 10.00.`, severity: "ERROR" });
      rowHasError = true;
    }

    if (percentage !== null && (isNaN(percentage) || percentage < 0 || percentage > 100)) {
      errors.push({ row: rowNum, column: "Percentage", error: `Invalid Percentage '${percentage}'. Percentage must be between 0.00 and 100.00.`, severity: "ERROR" });
      rowHasError = true;
    }

    if (sem < 1 || sem > 8) {
      errors.push({ row: rowNum, column: "Semester", error: `Invalid Semester '${sem}'. Must be between 1 and 8.`, severity: "ERROR" });
      rowHasError = true;
    }

    if (!rowHasError) {
      students.push({
        roll_number: roll,
        student_name: name,
        branch: branch,
        semester: sem,
        year: year,
        gender: gender,
        dob: dob,
        email: email,
        mobile_number: mobile.replace(/\D/g, ''),
        cgpa: cgpa,
        percentage: percentage,
        enrollment_number: enrollment
      });
    }
  });

  return {
    status: errors.length === 0 ? "Passed" : "Failed",
    total_rows: rows.length,
    passed_rows: students.length,
    error_count: errors.length,
    errors,
    students
  };
}

// Upload Excel or ZIP Handler (Supports Single/Multiple Files)
async function uploadExcel(req, res) {
  let fileArray = [];
  if (req.files) {
    if (Array.isArray(req.files)) {
      fileArray = req.files;
    } else if (typeof req.files === "object") {
      fileArray = [...(req.files.files || []), ...(req.files.file || [])];
    }
  } else if (req.file) {
    fileArray = [req.file];
  }
  
  if (fileArray.length === 0) {
    return res.status(400).json({ error: "No Excel or ZIP files uploaded" });
  }

  let academic_year_id = req.body.academic_year_id;
  const college_id = req.user.college_id;
  const college_name = req.user.college_name || "College";

  try {
    const { pool } = await getDb();

    if (!academic_year_id || academic_year_id === "undefined" || academic_year_id === "null" || academic_year_id === "") {
      const [openAy] = await pool.query(`SELECT id FROM academic_years WHERE is_open = 1 ORDER BY id DESC LIMIT 1`);
      academic_year_id = openAy[0]?.id || 1;
    }

    // Check Academic Year Window & Deadline Lock
    const [ayRows] = await pool.query(`SELECT * FROM academic_years WHERE id = ?`, [academic_year_id]);
    if (ayRows.length > 0) {
      const ay = ayRows[0];
      if (ay.is_open === 0) {
        return res.status(403).json({ error: "Submissions for this academic session are currently locked by Administrator." });
      }
      if (ay.deadline && new Date() > new Date(ay.deadline)) {
        return res.status(403).json({ error: `Submission deadline (${new Date(ay.deadline).toLocaleString()}) has passed. Submissions are closed.` });
      }
    }

    const processedUploads = [];

    for (const fileObj of fileArray) {
      const filePath = fileObj.path;
      const fileName = fileObj.originalname;
      const fileExt = path.extname(fileName).toLowerCase();
      const fileBasename = path.basename(filePath, path.extname(filePath));
      const outputDir = path.dirname(filePath);

      if (fileExt === ".zip") {
        // ZIP Archive Handling
        const zip = new AdmZip(filePath);
        const zipExtractDir = path.join(outputDir, `zip_${fileBasename}_${Date.now()}`);
        fs.mkdirSync(zipExtractDir, { recursive: true });
        zip.extractAllTo(zipExtractDir, true);

        const excelFiles = findExcelFiles(zipExtractDir);
        const allBatchStudents = [];
        const zipUploads = [];

        for (const excelPath of excelFiles) {
          const innerFileName = path.basename(excelPath);
          const innerBasename = path.basename(excelPath, path.extname(excelPath));
          const jsonOutPath = path.join(outputDir, `${innerBasename}_result.json`);
          const excelErrPath = path.join(outputDir, `ErrorReport_${innerBasename}.xlsx`);

          let valResult = runJsValidator(excelPath);
          if (!valResult) {
            valResult = await runPythonValidator(excelPath, jsonOutPath, excelErrPath);
          }

          const valStatus = valResult.status;
          const studentCount = valResult.passed_rows;
          const errorCount = valResult.error_count;
          const reportPath = errorCount > 0 ? excelErrPath : null;

          // Cross-College Anti-Fraud Check
          const crossCollegeDupes = [];
          if (valResult.students && valResult.students.length > 0) {
            for (const st of valResult.students) {
              const [crossRows] = await pool.query(
                `SELECT s.*, c.name as other_college_name 
                 FROM students s 
                 JOIN colleges c ON s.college_id = c.id 
                 WHERE s.college_id != ? AND (s.roll_number = ? OR (s.mobile_number = ? AND s.mobile_number != ''))`,
                [college_id, st.roll_number, st.mobile_number]
              );
              if (crossRows.length > 0) {
                crossCollegeDupes.push(`Roll '${st.roll_number}' registered at ${crossRows[0].other_college_name}`);
              }
            }
          }

          const auditObj = performAiCompletenessAudit(valResult.students || []);
          let initialAdminStatus = (valStatus === "Failed" || errorCount > 0 || auditObj.hasWarning || crossCollegeDupes.length > 0) ? "Partial Data" : "Under Review";
          let initialRemarks = auditObj.auditText;

          if (crossCollegeDupes.length > 0) {
            initialRemarks += ` Cross-College Alert: ${crossCollegeDupes.length} Duplicate(s) [${crossCollegeDupes.slice(0, 2).join("; ")}].`;
          }
          if (valStatus === "Failed" || errorCount > 0) {
            initialRemarks = `System Audit: Partial Data Received (${errorCount} error(s)). ${initialRemarks}`;
          }

          const [upRes] = await pool.query(
            `INSERT INTO uploads (college_id, academic_year_id, file_name, file_path, student_count, validation_status, admin_status, admin_remarks, error_count, uploaded_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [college_id, academic_year_id, `${fileName} ➔ ${innerFileName}`, excelPath, studentCount, valStatus, initialAdminStatus, initialRemarks, errorCount]
          );

          const uploadId = upRes.insertId;

          await pool.query(
            `INSERT INTO validation_results (upload_id, total_rows, passed_rows, error_count, report_path, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [uploadId, valResult.total_rows, studentCount, errorCount, reportPath, valStatus]
          );

          if (valResult.errors && valResult.errors.length > 0) {
            const errPromises = valResult.errors.map(err => 
              pool.query(
                `INSERT INTO validation_errors (upload_id, row_num, column_name, error_message, severity)
                 VALUES (?, ?, ?, ?, ?)`,
                [uploadId, err.row || 0, err.column || "General", err.error || "Validation error", err.severity || "ERROR"]
              )
            );
            await Promise.all(errPromises);
          }

          if (valStatus === "Passed" && valResult.students && valResult.students.length > 0) {
            const studentPromises = valResult.students.map(st => 
              pool.query(
                `INSERT INTO students (upload_id, college_id, academic_year_id, roll_number, student_name, branch, semester, year, gender, dob, email, mobile_number, cgpa, percentage, enrollment_number)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  uploadId, college_id, academic_year_id, st.roll_number, st.student_name,
                  st.branch, st.semester, st.year, st.gender, st.dob, st.email, st.mobile_number,
                  st.cgpa, st.percentage, st.enrollment_number
                ]
              )
            );
            await Promise.all(studentPromises);
            allBatchStudents.push(...valResult.students);
          }

          zipUploads.push({
            upload_id: uploadId,
            file_name: innerFileName,
            validation_status: valStatus,
            admin_status: initialAdminStatus,
            admin_remarks: initialRemarks,
            student_count: studentCount,
            error_count: errorCount
          });
        }

        processedUploads.push(...zipUploads);

      } else {
        // Single Excel File
        const jsonOutPath = path.join(outputDir, `${fileBasename}_result.json`);
        const excelErrPath = path.join(outputDir, `ErrorReport_${fileBasename}.xlsx`);

        let valResult = runJsValidator(filePath);
        if (!valResult) {
          valResult = await runPythonValidator(filePath, jsonOutPath, excelErrPath);
        }

        const valStatus = valResult.status;
        const studentCount = valResult.passed_rows;
        const errorCount = valResult.error_count;
        const reportPath = errorCount > 0 ? excelErrPath : null;

        // Cross-College Anti-Fraud Check
        const crossCollegeDupes = [];
        if (valResult.students && valResult.students.length > 0) {
          for (const st of valResult.students) {
            const [crossRows] = await pool.query(
              `SELECT s.*, c.name as other_college_name 
               FROM students s 
               JOIN colleges c ON s.college_id = c.id 
               WHERE s.college_id != ? AND (s.roll_number = ? OR (s.mobile_number = ? AND s.mobile_number != ''))`,
              [college_id, st.roll_number, st.mobile_number]
            );
            if (crossRows.length > 0) {
              crossCollegeDupes.push(`Roll '${st.roll_number}' registered at ${crossRows[0].other_college_name}`);
            }
          }
        }

        const auditObj = performAiCompletenessAudit(valResult.students || []);
        let initialAdminStatus = (valStatus === "Failed" || errorCount > 0 || auditObj.hasWarning || crossCollegeDupes.length > 0) ? "Partial Data" : "Under Review";
        let initialRemarks = auditObj.auditText;

        if (crossCollegeDupes.length > 0) {
          initialRemarks += ` Anti-Fraud Alert: ${crossCollegeDupes.length} Cross-College Duplicate(s) [${crossCollegeDupes.slice(0, 2).join("; ")}].`;
        }
        if (valStatus === "Failed" || errorCount > 0) {
          initialRemarks = `System Audit: Partial Data Received (${errorCount} error(s)). ${initialRemarks}`;
        }

        const [upRes] = await pool.query(
          `INSERT INTO uploads (college_id, academic_year_id, file_name, file_path, student_count, validation_status, admin_status, admin_remarks, error_count, uploaded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [college_id, academic_year_id, fileName, filePath, studentCount, valStatus, initialAdminStatus, initialRemarks, errorCount]
        );

        const uploadId = upRes.insertId;
        try {
          const ext = fileName.split('.').pop().toUpperCase();
          await pool.query(
            `UPDATE uploads SET status = ?, total_records = ?, upload_date = CURRENT_TIMESTAMP, file_type = ? WHERE id = ? OR upload_id = ?`,
            [initialAdminStatus, studentCount, ext, uploadId, uploadId]
          );
        } catch (e) {}

        await pool.query(
          `INSERT INTO validation_results (upload_id, total_rows, passed_rows, error_count, report_path, status)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [uploadId, valResult.total_rows, studentCount, errorCount, reportPath, valStatus]
        );

        if (valResult.errors && valResult.errors.length > 0) {
          const errPromises = valResult.errors.map(err => 
            pool.query(
              `INSERT INTO validation_errors (upload_id, row_num, column_name, error_message, severity)
               VALUES (?, ?, ?, ?, ?)`,
              [uploadId, err.row || 0, err.column || "General", err.error || "Validation error", err.severity || "ERROR"]
            )
          );
          await Promise.all(errPromises);
        }

        if (valStatus === "Passed" && valResult.students && valResult.students.length > 0) {
          const studentPromises = valResult.students.map(st => 
            pool.query(
              `INSERT INTO students (upload_id, college_id, academic_year_id, roll_number, student_name, full_name, branch, program_code, semester, year, gender, dob, email, mobile_number, contact_number, cgpa, percentage, enrollment_number)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                uploadId, college_id, academic_year_id, st.roll_number, st.student_name, st.student_name,
                st.branch, st.branch, st.semester, st.year, st.gender, st.dob, st.email, st.mobile_number, st.mobile_number,
                st.cgpa, st.percentage, st.enrollment_number
              ]
            )
          );
          await Promise.all(studentPromises);
        }

        await pool.query(
          `INSERT INTO audit_logs (user_id, username, college_name, action, details) VALUES (?, ?, ?, 'UPLOAD_EXCEL', ?)`,
          [req.user.id, req.user.username, college_name, `Uploaded file '${fileName}' (${valStatus}, ${studentCount} records, ${errorCount} errors). Remarks: ${initialRemarks}`]
        );

        try {
          await pool.query(
            `INSERT INTO notifications (user_id, college_id, title, message, type, is_read) VALUES (NULL, NULL, ?, ?, 'INFO', 0)`,
            [
              `New Submission Received: ${college_name}`,
              `${college_name} has submitted a new academic dataset '${fileName}' (${studentCount} student records, Review Status: ${initialAdminStatus}).`
            ]
          );
        } catch (errNotif) {
          console.error("Failed to insert admin upload notification:", errNotif.message);
        }

        processedUploads.push({
          upload_id: uploadId,
          file_name: fileName,
          validation_status: valStatus,
          admin_status: initialAdminStatus,
          admin_remarks: initialRemarks,
          student_count: studentCount,
          error_count: errorCount,
          error_report_url: reportPath ? `/api/uploads/error-report/${uploadId}` : null
        });
      }
    }

    return res.status(201).json({
      message: `${processedUploads.length} file(s) uploaded and validated successfully!`,
      total_files: processedUploads.length,
      uploads: processedUploads
    });

  } catch (error) {
    console.error("Upload controller error:", error);
    return res.status(500).json({ error: error.message || "File upload and validation failed" });
  }
}

// Fetch College Uploads (for College Dashboard & Admin Dashboard)
async function getUploads(req, res) {
  const { college_id, academic_year_id, status } = req.query;

  try {
    const { pool } = await getDb();
    let query = `
      SELECT u.*, c.name as college_name, c.code as college_code, ay.year_label
      FROM uploads u
      JOIN colleges c ON u.college_id = c.id
      LEFT JOIN academic_years ay ON u.academic_year_id = ay.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === "COLLEGE") {
      query += ` AND u.college_id = ?`;
      params.push(req.user.college_id);
    } else if (college_id) {
      query += ` AND u.college_id = ?`;
      params.push(college_id);
    }

    if (academic_year_id) {
      query += ` AND u.academic_year_id = ?`;
      params.push(academic_year_id);
    }

    if (status) {
      query += ` AND u.validation_status = ?`;
      params.push(status);
    }

    query += ` ORDER BY u.id DESC`;

    const [rows] = await pool.query(query, params);
    return res.json(rows);
  } catch (error) {
    console.error("Get uploads error:", error);
    return res.status(500).json({ error: "Failed to fetch uploads" });
  }
}

// Get detailed single upload preview
async function getUploadDetails(req, res) {
  const { id } = req.params;

  try {
    const { pool } = await getDb();
    const [uploads] = await pool.query(
      `SELECT u.*, c.name as college_name, ay.year_label 
       FROM uploads u 
       JOIN colleges c ON u.college_id = c.id 
       LEFT JOIN academic_years ay ON u.academic_year_id = ay.id 
       WHERE u.id = ?`,
      [id]
    );

    if (uploads.length === 0) {
      return res.status(404).json({ error: "Upload record not found" });
    }

    const upload = uploads[0];
    const targetUploadId = upload.id || id;
    const [errors] = await pool.query(`SELECT * FROM validation_errors WHERE upload_id = ? ORDER BY id ASC`, [targetUploadId]);
    const [students] = await pool.query(`SELECT * FROM students WHERE upload_id = ? ORDER BY roll_number ASC`, [targetUploadId]);

    return res.json({ upload, errors, students });
  } catch (error) {
    console.error("Get upload details error:", error);
    return res.status(500).json({ error: `Failed to fetch upload details: ${error.message}` });
  }
}

// Download Error Report Excel File
async function downloadErrorReport(req, res) {
  const { id } = req.params;

  try {
    const { pool } = await getDb();
    const [rows] = await pool.query(`SELECT report_path FROM validation_results WHERE upload_id = ?`, [id]);

    if (rows.length === 0 || !rows[0].report_path || !fs.existsSync(rows[0].report_path)) {
      return res.status(404).json({ error: "Error report file not available" });
    }

    return res.download(rows[0].report_path);
  } catch (error) {
    console.error("Download error report failed:", error);
    return res.status(500).json({ error: "Failed to download error report" });
  }
}

// Download Uploaded Original Excel File
async function downloadUploadedFile(req, res) {
  const { id } = req.params;

  try {
    const { pool } = await getDb();
    const [rows] = await pool.query(`SELECT file_path, file_name FROM uploads WHERE id = ?`, [id]);

    if (rows.length === 0 || !rows[0].file_path || !fs.existsSync(rows[0].file_path)) {
      return res.status(404).json({ error: "Uploaded file not found on server" });
    }

    return res.download(rows[0].file_path, rows[0].file_name);
  } catch (error) {
    console.error("Download uploaded file failed:", error);
    return res.status(500).json({ error: "Failed to download file" });
  }
}

// Admin Review (Approve / Reject / Correction Requested)
async function updateAdminStatus(req, res) {
  const { id } = req.params;
  const { admin_status, admin_remarks } = req.body;

  if (!admin_status) {
    return res.status(400).json({ error: "Admin status is required" });
  }

  try {
    const { pool } = await getDb();
    await pool.query(
      `UPDATE uploads SET admin_status = ?, status = ?, admin_remarks = ? WHERE id = ?`,
      [admin_status, admin_status, admin_remarks || "", id]
    );

    const [up] = await pool.query(`SELECT u.file_name, u.college_id, c.name as college_name FROM uploads u JOIN colleges c ON u.college_id = c.id WHERE u.id = ?`, [id]);
    const colName = up[0]?.college_name || "College";
    const fileName = up[0]?.file_name || `Batch #${id}`;
    const collegeId = up[0]?.college_id;

    // Trigger Notification for College
    const notifType = admin_status === "Approved" ? "SUCCESS" : admin_status === "Rejected" ? "URGENT" : "WARNING";
    await createNotification({
      college_id: collegeId,
      user_id: null,
      title: `Submission Status Updated: ${admin_status}`,
      message: `Admin review for file '${fileName}' from ${colName} was marked as '${admin_status}'. Remarks: ${admin_remarks || 'None'}`,
      type: notifType
    });

    await pool.query(
      `INSERT INTO audit_logs (user_id, username, college_name, action, details) VALUES (?, ?, ?, 'ADMIN_REVIEW', ?)`,
      [req.user.id, req.user.username, colName, `Updated submission ID ${id} status to '${admin_status}'. Remarks: ${admin_remarks || 'None'}`]
    );

    return res.json({ message: `Submission admin status updated to ${admin_status}` });
  } catch (error) {
    console.error("Update admin status error:", error);
    return res.status(500).json({ error: "Failed to update admin status" });
  }
}

// Delete Uploaded File (College User or Admin)
async function deleteUpload(req, res) {
  const { id } = req.params;

  try {
    const { pool } = await getDb();
    const [rows] = await pool.query(`SELECT * FROM uploads WHERE id = ?`, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Upload record not found" });
    }

    const upload = rows[0];

    // Security check: College user can only delete their own college uploads
    if (req.user.role === 'COLLEGE' && upload.college_id !== req.user.college_id) {
      return res.status(403).json({ error: "Unauthorized to delete this submission" });
    }

    // Delete associated physical files
    if (upload.file_path && fs.existsSync(upload.file_path)) {
      try { fs.unlinkSync(upload.file_path); } catch (e) {}
    }

    // Delete associated error report if exists
    const [valRes] = await pool.query(`SELECT report_path FROM validation_results WHERE upload_id = ?`, [id]);
    if (valRes.length > 0 && valRes[0].report_path && fs.existsSync(valRes[0].report_path)) {
      try { fs.unlinkSync(valRes[0].report_path); } catch (e) {}
    }

    // Delete database records
    await pool.query(`DELETE FROM students WHERE upload_id = ?`, [id]);
    await pool.query(`DELETE FROM validation_errors WHERE upload_id = ?`, [id]);
    await pool.query(`DELETE FROM validation_results WHERE upload_id = ?`, [id]);
    await pool.query(`DELETE FROM uploads WHERE id = ?`, [id]);

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, username, college_name, action, details) VALUES (?, ?, ?, 'DELETE_UPLOAD', ?)`,
      [req.user.id, req.user.username, req.user.college_name || "College", `Deleted upload #${id} (${upload.file_name})`]
    );

    return res.json({ message: `Submission #${id} deleted successfully` });
  } catch (error) {
    console.error("Delete upload error:", error);
    return res.status(500).json({ error: "Failed to delete submission" });
  }
}

module.exports = {
  uploadExcel,
  getUploads,
  getUploadDetails,
  downloadErrorReport,
  downloadUploadedFile,
  updateAdminStatus,
  deleteUpload
};
