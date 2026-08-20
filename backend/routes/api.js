const express = require("express");
const multer = require("multer");
const path = require("path");

const { authenticateToken, isAdmin, isCollege } = require("../middleware/authMiddleware");
const authController = require("../controllers/authController");
const collegeController = require("../controllers/collegeController");
const academicYearController = require("../controllers/academicYearController");
const templateController = require("../controllers/templateController");
const uploadController = require("../controllers/uploadController");
const analyticsController = require("../controllers/analyticsController");
const retentionController = require("../controllers/retentionController");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

// Storage setup for Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(__dirname, "../uploads");
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.(xlsx|xls|zip)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel (.xlsx, .xls) and ZIP archives (.zip) are allowed!"));
    }
  }
});

// Auth Routes
router.post("/auth/login", authController.login);
router.get("/auth/profile", authenticateToken, authController.getProfile);

// College Routes
router.get("/colleges", authenticateToken, collegeController.getAllColleges);
router.post("/colleges", authenticateToken, isAdmin, collegeController.addCollege);
router.post("/colleges/bulk-import", authenticateToken, isAdmin, upload.single("file"), collegeController.bulkImportColleges);
router.get("/colleges/template/excel", authenticateToken, isAdmin, collegeController.downloadCollegeTemplate);
router.put("/colleges/:id/status", authenticateToken, isAdmin, collegeController.toggleCollegeStatus);
router.post("/colleges/reset-password", authenticateToken, isAdmin, collegeController.resetCollegePassword);
router.get("/colleges/training", authenticateToken, isAdmin, collegeController.getCollegesTraining);
router.get("/colleges/my-status", authenticateToken, collegeController.getMyCollegeStatus);
router.put("/colleges/:id/training", authenticateToken, isAdmin, collegeController.updateCollegeTraining);

// Academic Year Routes
router.get("/academic-years", authenticateToken, academicYearController.getAcademicYears);
router.post("/academic-years", authenticateToken, isAdmin, academicYearController.createAcademicYear);
router.put("/academic-years/:id/window", authenticateToken, isAdmin, academicYearController.toggleSubmissionWindow);
router.put("/academic-years/:id/deadline", authenticateToken, isAdmin, academicYearController.updateDeadline);

// Template Routes
router.get("/templates/active", authenticateToken, templateController.getActiveTemplate);
router.get("/templates/download", templateController.downloadTemplate);
router.post("/templates", authenticateToken, isAdmin, upload.single("template"), templateController.uploadTemplate);

const uploadMiddleware = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      console.error("Multer upload error:", err);
      return res.status(400).json({ error: err.message || "File upload error" });
    }
    next();
  });
};

// Upload & Validation Routes (Supports Multiple Excel Files & ZIP Archives)
router.post("/uploads", authenticateToken, isCollege, uploadMiddleware, uploadController.uploadExcel);
router.get("/uploads", authenticateToken, uploadController.getUploads);
router.get("/uploads/:id", authenticateToken, uploadController.getUploadDetails);
router.get("/uploads/error-report/:id", authenticateToken, uploadController.downloadErrorReport);
router.get("/uploads/file/:id", authenticateToken, uploadController.downloadUploadedFile);
router.put("/uploads/:id/admin-status", authenticateToken, isAdmin, uploadController.updateAdminStatus);
router.delete("/uploads/:id", authenticateToken, uploadController.deleteUpload);

// Analytics & Audit Routes
router.get("/analytics/dashboard", authenticateToken, analyticsController.getDashboardMetrics);
router.get("/analytics/audit-logs", authenticateToken, isAdmin, analyticsController.getAuditLogs);
router.get("/analytics/powerbi-feed", analyticsController.getPowerBiDataFeed);

// Data Retention & Auto-Purge Routes (Admin Only)
router.get("/settings/retention", authenticateToken, isAdmin, retentionController.getRetentionSettings);
router.put("/settings/retention", authenticateToken, isAdmin, retentionController.updateRetentionSettings);
router.post("/settings/purge-now", authenticateToken, isAdmin, retentionController.executeDataPurge);

// In-App Notification Center Routes
router.get("/notifications", authenticateToken, notificationController.getNotifications);
router.put("/notifications/read-all", authenticateToken, notificationController.markAllAsRead);
router.put("/notifications/:id/read", authenticateToken, notificationController.markAsRead);
router.post("/notifications/broadcast", authenticateToken, isAdmin, notificationController.sendBroadcast);

module.exports = router;
