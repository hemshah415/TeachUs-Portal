import React, { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import AnimatedCounter from "../components/AnimatedCounter";
import TableSearchBar from "../components/TableSearchBar";
import ChartModal from "../components/ChartModal";
import DataHealthGauge from "../components/DataHealthGauge";
import SubmissionStepper from "../components/SubmissionStepper";
import CollegeMatrixCard from "../components/CollegeMatrixCard";
import { TableSkeleton, CardSkeleton } from "../components/SkeletonLoader";
import ExportHub from "../components/ExportHub";
import EmptyState from "../components/EmptyState";
import { 
  Building2, CheckCircle2, XCircle, AlertCircle, Users, FileSpreadsheet, 
  Plus, Key, ShieldAlert, Download, RefreshCw, BarChart3, Clock, CheckSquare, XSquare, Eye, Trash2, Bell, Send, Maximize2,
  GraduationCap, Award, BookOpen, Edit, Check, Upload
} from "lucide-react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, Filler);

const AdminDashboard = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState("SUBMISSIONS");
  const [metrics, setMetrics] = useState(null);
  const [collegeSubmissions, setCollegeSubmissions] = useState([]);
  const [allUploads, setAllUploads] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [topErrorCols, setTopErrorCols] = useState([]);
  const [dailyTrend, setDailyTrend] = useState([]);

  const [previewModalData, setPreviewModalData] = useState(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [submissionSearch, setSubmissionSearch] = useState("");
  const [collegeSearch, setCollegeSearch] = useState("");

  const lineChartRef = useRef(null);
  const doughnutChartRef = useRef(null);
  const barChartRef = useRef(null);
  const [expandedChart, setExpandedChart] = useState({ isOpen: false, title: "", ref: null, type: null });

  const fetchStudentPreview = async (uploadId) => {
    try {
      const res = await api.get(`/uploads/${uploadId}`);
      setPreviewModalData(res.data);
      setStudentSearch("");
    } catch (err) {
      if (addToast) addToast("Failed to load student preview data", "error");
    }
  };

  const [colleges, setColleges] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [powerBiData, setPowerBiData] = useState(null);

  const [filterYear, setFilterYear] = useState("");
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [adminRemarks, setAdminRemarks] = useState("");
  
  const [newCollege, setNewCollege] = useState({
    code: "", name: "", university: "University of Mumbai", state: "Maharashtra",
    contact_email: "", contact_phone: "", username: "", password: ""
  });

  const [newYear, setNewYear] = useState({
    year_label: "2026-2027", start_date: "", end_date: "", deadline: ""
  });

  const [templateFile, setTemplateFile] = useState(null);
  const [templateVersion, setTemplateVersion] = useState("v1.2");
  const [resetPassData, setResetPassData] = useState({ collegeId: null, newPassword: "" });

  const [broadcastForm, setBroadcastForm] = useState({
    target_college_id: "", title: "", message: "", type: "INFO"
  });

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastForm.title || !broadcastForm.message) {
      setMsg({ text: "Title and message are required for announcement", type: "warning" });
      return;
    }

    try {
      const res = await api.post("/notifications/broadcast", broadcastForm);
      setMsg({ text: res.data.message || "Notification broadcast sent successfully", type: "success" });
      setBroadcastForm({ target_college_id: "", title: "", message: "", type: "INFO" });
    } catch (err) {
      setMsg({ text: "Failed to send notification broadcast", type: "danger" });
    }
  };

  useEffect(() => {
    fetchDashboardMetrics();
    fetchColleges();
    fetchAcademicYears();
    const interval = setInterval(() => {
      fetchDashboardMetrics();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const [activePublishedTemplate, setActivePublishedTemplate] = useState(null);

  const fetchActiveTemplate = async () => {
    try {
      const res = await api.get("/templates/active");
      setActivePublishedTemplate(res.data);
    } catch (err) {
      console.error("Failed to fetch active template", err);
    }
  };

  const handleDownloadPublishedTemplate = async () => {
    try {
      const response = await api.get("/templates/download", { responseType: "blob" });
      let fileName = activePublishedTemplate?.name || "Official_Academic_Data_Template.xlsx";
      if (!fileName.toLowerCase().endsWith(".xlsx")) {
        fileName += ".xlsx";
      }
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      if (addToast) addToast("Published template downloaded successfully (.xlsx)", "info");
    } catch (err) {
      if (addToast) addToast("Failed to download published template", "error");
    }
  };

  useEffect(() => {
    if (activeTab === "AUDIT") fetchAuditLogs();
    if (activeTab === "POWERBI") fetchPowerBiFeed();
    if (activeTab === "ACADEMIC_YEARS") fetchRetentionSettings();
    if (activeTab === "TRAINING") fetchTrainingTracker();
    if (activeTab === "TEMPLATES") fetchActiveTemplate();
  }, [activeTab]);

  const [trainingData, setTrainingData] = useState({ colleges: [], summary: null });
  const [trainingSearch, setTrainingSearch] = useState("");
  const [selectedTrainingCollege, setSelectedTrainingCollege] = useState(null);
  const [trainingForm, setTrainingForm] = useState({
    faculty_training_status: "Pending",
    faculty_training_date: "",
    dashboard_training_status: "Pending",
    dashboard_training_date: "",
    trainer_name: "TeachUs Support Team",
    training_notes: ""
  });

  const fetchTrainingTracker = async () => {
    try {
      const res = await api.get("/colleges/training");
      setTrainingData(res.data);
    } catch (err) {
      console.error("Failed to fetch training tracker data", err);
    }
  };

  const [selectedInspectorCollege, setSelectedInspectorCollege] = useState(null);

  const handleOpenTrainingModal = (col) => {
    setSelectedTrainingCollege(col);
    setTrainingForm({
      faculty_training_status: col.faculty_training_status || "Pending",
      faculty_training_date: col.faculty_training_date ? col.faculty_training_date.split("T")[0] : "",
      dashboard_training_status: col.dashboard_training_status || "Pending",
      dashboard_training_date: col.dashboard_training_date ? col.dashboard_training_date.split("T")[0] : "",
      admin_training_status: col.admin_training_status || "Pending",
      admin_training_date: col.admin_training_date ? col.admin_training_date.split("T")[0] : "",
      trainer_name: col.trainer_name || "TeachUs Support Team",
      training_notes: col.training_notes || ""
    });
  };

  const handleUpdateTraining = async (e) => {
    e.preventDefault();
    if (!selectedTrainingCollege) return;
    try {
      await api.put(`/colleges/${selectedTrainingCollege.id || selectedTrainingCollege.college_id}/training`, trainingForm);
      if (addToast) addToast(`Training schedule for '${selectedTrainingCollege.name}' updated!`, "success");
      
      const updatedCollege = {
        ...selectedTrainingCollege,
        ...trainingForm
      };
      setSelectedInspectorCollege(updatedCollege);
      setSelectedTrainingCollege(null);
      
      fetchColleges();
      fetchTrainingTracker();
    } catch (err) {
      if (addToast) addToast("Failed to update training record", "error");
    }
  };

  const [retentionInfo, setRetentionInfo] = useState({
    retention_months: 2,
    auto_purge_enabled: true,
    expired_submissions_count: 0,
    expired_students_count: 0
  });

  const fetchRetentionSettings = async () => {
    try {
      const res = await api.get("/settings/retention");
      setRetentionInfo(res.data);
    } catch (err) {
      console.error("Error fetching retention settings", err);
    }
  };

  const handleSaveRetention = async (months, autoPurge) => {
    try {
      const res = await api.put("/settings/retention", {
        retention_months: months,
        auto_purge_enabled: autoPurge
      });
      setMsg({ text: res.data.message, type: "success" });
      fetchRetentionSettings();
    } catch (err) {
      setMsg({ text: "Failed to update retention policy", type: "danger" });
    }
  };

  const handleExecutePurge = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete all submission files and student data older than ${retentionInfo.retention_months} month(s)? This action cannot be undone.`)) return;
    try {
      const res = await api.post("/settings/purge-now");
      setMsg({ text: res.data.message, type: "success" });
      fetchRetentionSettings();
      fetchDashboardMetrics();
    } catch (err) {
      setMsg({ text: "Failed to execute data purge", type: "danger" });
    }
  };

  const fetchDashboardMetrics = async () => {
    try {
      const res = await api.get("/analytics/dashboard");
      setMetrics(res.data.metrics);
      setCollegeSubmissions(res.data.collegeSubmissions || []);
      setAllUploads(res.data.allUploads || []);
      setStatusBreakdown(res.data.statusBreakdown || []);
      setTopErrorCols(res.data.topErrorCols || []);
      setDailyTrend(res.data.dailyTrend || []);
    } catch (err) {
      console.error("Error fetching metrics", err);
    }
  };

  const fetchColleges = async () => {
    try {
      const res = await api.get("/colleges");
      setColleges(res.data);
    } catch (err) {
      console.error("Error fetching colleges", err);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const res = await api.get("/academic-years");
      setAcademicYears(res.data);
      if (res.data.length > 0 && !filterYear) {
        setFilterYear(res.data[0].id);
      }
    } catch (err) {
      console.error("Error fetching academic years", err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await api.get("/analytics/audit-logs");
      setAuditLogs(res.data);
    } catch (err) {
      console.error("Error fetching audit logs", err);
    }
  };

  const [selectedPowerBiCollege, setSelectedPowerBiCollege] = useState("");

  const fetchPowerBiFeed = async (collegeId = selectedPowerBiCollege) => {
    try {
      const res = await api.get("/analytics/powerbi-feed", {
        params: collegeId ? { college_id: collegeId } : {}
      });
      setPowerBiData(res.data);
    } catch (err) {
      console.error("Error fetching power bi feed", err);
    }
  };

  const handleAdminReview = async (uploadId, status) => {
    try {
      await api.put(`/uploads/${uploadId}/admin-status`, {
        admin_status: status,
        admin_remarks: adminRemarks
      });
      const successMsg = `Submission updated to ${status}`;
      setMsg({ text: successMsg, type: "success" });
      if (addToast) addToast(successMsg, "success");
      setSelectedSubmission(null);
      setAdminRemarks("");
      fetchDashboardMetrics();
    } catch (err) {
      const errMsg = "Failed to update review status";
      setMsg({ text: errMsg, type: "danger" });
      if (addToast) addToast(errMsg, "error");
    }
  };

  const [registrationMode, setRegistrationMode] = useState("SINGLE"); // "SINGLE" | "BULK"
  const [bulkCollegeFile, setBulkCollegeFile] = useState(null);
  const [bulkImportResult, setBulkImportResult] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);

  const handleDownloadCollegeTemplate = async () => {
    try {
      const response = await api.get("/colleges/template/excel", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Bulk_College_Registration_Template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      if (addToast) addToast("Excel Template downloaded successfully", "info");
    } catch (err) {
      if (addToast) addToast("Failed to download Excel template", "error");
    }
  };

  const handleBulkImportSubmit = async (e) => {
    e.preventDefault();
    if (!bulkCollegeFile) {
      if (addToast) addToast("Please select an Excel file to import", "warning");
      return;
    }
    setBulkUploading(true);
    setBulkImportResult(null);

    const formData = new FormData();
    formData.append("file", bulkCollegeFile);

    try {
      const res = await api.post("/colleges/bulk-import", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setBulkUploading(false);
      setBulkImportResult(res.data);
      setBulkCollegeFile(null);
      if (addToast) addToast(res.data.message, "success");
      fetchColleges();
      fetchDashboardMetrics();
    } catch (err) {
      setBulkUploading(false);
      const errMsg = err.response?.data?.error || "Failed to process bulk import";
      if (addToast) addToast(errMsg, "error");
    }
  };

  const handleAddCollege = async (e) => {
    e.preventDefault();
    try {
      await api.post("/colleges", newCollege);
      const successMsg = `College '${newCollege.name}' added successfully!`;
      setMsg({ text: successMsg, type: "success" });
      if (addToast) addToast(successMsg, "success");
      setNewCollege({
        code: "", name: "", university: "University of Mumbai", state: "Maharashtra",
        contact_email: "", contact_phone: "", username: "", password: ""
      });
      fetchColleges();
      fetchDashboardMetrics();
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed to add college";
      setMsg({ text: errMsg, type: "danger" });
      if (addToast) addToast(errMsg, "error");
    }
  };

  const handleToggleCollegeStatus = async (collegeId, currentStatus) => {
    const nextStatus = currentStatus === "ACTIVE" ? "DISABLED" : "ACTIVE";
    try {
      await api.put(`/colleges/${collegeId}/status`, { status: nextStatus });
      const successMsg = `College status updated to ${nextStatus}`;
      setMsg({ text: successMsg, type: "success" });
      if (addToast) addToast(successMsg, "info");
      fetchColleges();
    } catch (err) {
      const errMsg = "Failed to update college status";
      setMsg({ text: errMsg, type: "danger" });
      if (addToast) addToast(errMsg, "error");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await api.post("/colleges/reset-password", resetPassData);
      const successMsg = "College password reset successfully";
      setMsg({ text: successMsg, type: "success" });
      if (addToast) addToast(successMsg, "success");
      setResetPassData({ collegeId: null, newPassword: "" });
    } catch (err) {
      const errMsg = "Failed to reset password";
      setMsg({ text: errMsg, type: "danger" });
      if (addToast) addToast(errMsg, "error");
    }
  };

  const handleCreateYear = async (e) => {
    e.preventDefault();
    try {
      await api.post("/academic-years", newYear);
      setMsg({ text: `Academic Year ${newYear.year_label} created`, type: "success" });
      fetchAcademicYears();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || "Failed to create academic year", type: "danger" });
    }
  };

  const handleToggleWindow = async (yearId, currentOpen) => {
    try {
      await api.put(`/academic-years/${yearId}/window`, { is_open: !currentOpen });
      setMsg({ text: `Submission window updated to ${!currentOpen ? 'OPEN' : 'CLOSED'}`, type: "success" });
      fetchAcademicYears();
    } catch (err) {
      setMsg({ text: "Failed to update submission window", type: "danger" });
    }
  };

  const handleUploadTemplate = async (e) => {
    e.preventDefault();
    if (!templateFile) return;

    const formData = new FormData();
    formData.append("template", templateFile);
    formData.append("version", templateVersion);

    try {
      await api.post("/templates", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const successMsg = `Official template version '${templateVersion}' published successfully!`;
      setMsg({ text: successMsg, type: "success" });
      if (addToast) addToast(successMsg, "success");
      setTemplateFile(null);
      setTemplateVersion("v1.2");
      fetchActiveTemplate();
    } catch (err) {
      setMsg({ text: "Failed to upload template", type: "danger" });
      if (addToast) addToast("Failed to upload template", "error");
    }
  };

  // Chart Data Setup
  const doughnutData = {
    labels: ['Passed', 'Failed', 'Pending'],
    datasets: [
      {
        data: [
          statusBreakdown.find(s => s.validation_status === 'Passed')?.count || 0,
          statusBreakdown.find(s => s.validation_status === 'Failed')?.count || 0,
          statusBreakdown.find(s => s.validation_status === 'Pending')?.count || 0
        ],
        backgroundColor: ['#10b981', '#dc2626', '#d97706'],
        borderWidth: 0
      }
    ]
  };

  const lineChartData = {
    labels: dailyTrend.map(d => d.upload_date ? new Date(d.upload_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Today'),
    datasets: [
      {
        label: 'Upload Batches Received',
        data: dailyTrend.map(d => d.upload_count || 0),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.12)',
        borderWidth: 3,
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#2563eb',
        pointRadius: 4
      },
      {
        label: 'Validation Errors Detected',
        data: dailyTrend.map(d => d.total_errors || 0),
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220, 38, 38, 0.12)',
        borderWidth: 3,
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#dc2626',
        pointRadius: 4
      }
    ]
  };

  return (
    <div className="min-vh-100 pb-5" style={{ background: '#f8fafc' }}>
      <Navbar
        onSelectTab={setActiveTab}
        onInspectCollege={(col) => {
          setSelectedInspectorCollege(col);
          setActiveTab("COLLEGES");
        }}
      />

      <div className="container-fluid px-4 pt-4">

        {/* Admin Metric Cards */}
        {metrics && (
          <div className="row g-3 mb-4">
            <div className="col-xl-2 col-md-4 col-6">
              <div className="glass-card text-center p-3 bg-white border border-slate-200 shadow-sm">
                <Building2 size={24} className="text-danger mb-1" />
                <small className="text-secondary d-block uppercase fw-bold">Total Colleges</small>
                <h3 className="fw-extrabold text-dark mb-0">
                  <AnimatedCounter value={metrics.totalColleges} />
                </h3>
              </div>
            </div>

            <div className="col-xl-2 col-md-4 col-6">
              <div className="glass-card text-center p-3 bg-white border border-slate-200 shadow-sm">
                <CheckCircle2 size={24} className="text-success mb-1" />
                <small className="text-secondary d-block uppercase fw-bold">Submitted</small>
                <h3 className="fw-extrabold text-success mb-0">
                  <AnimatedCounter value={metrics.submittedColleges} />
                </h3>
              </div>
            </div>

            <div className="col-xl-2 col-md-4 col-6">
              <div className="glass-card text-center p-3 bg-white border border-slate-200 shadow-sm">
                <Clock size={24} className="text-warning mb-1" />
                <small className="text-secondary d-block uppercase fw-bold">Pending Submission</small>
                <h3 className="fw-extrabold text-warning mb-0">
                  <AnimatedCounter value={metrics.pendingColleges} />
                </h3>
              </div>
            </div>

            <div className="col-xl-2 col-md-4 col-6">
              <div className="glass-card text-center p-3 bg-white border border-slate-200 shadow-sm">
                <CheckSquare size={24} className="text-primary mb-1" />
                <small className="text-secondary d-block uppercase fw-bold">Approved Uploads</small>
                <h3 className="fw-extrabold text-primary mb-0">
                  <AnimatedCounter value={metrics.approvedCount} />
                </h3>
              </div>
            </div>

            <div className="col-xl-2 col-md-4 col-6">
              <div className="glass-card text-center p-3 bg-white border border-slate-200 shadow-sm">
                <XSquare size={24} className="text-danger mb-1" />
                <small className="text-secondary d-block uppercase fw-bold">Rejected Uploads</small>
                <h3 className="fw-extrabold text-danger mb-0">
                  <AnimatedCounter value={metrics.rejectedCount} />
                </h3>
              </div>
            </div>

            <div className="col-xl-2 col-md-4 col-6">
              <div className="glass-card text-center p-3 bg-white border border-slate-200 shadow-sm">
                <Users size={24} className="text-dark mb-1" />
                <small className="text-secondary d-block uppercase fw-bold">Verified Students</small>
                <h3 className="fw-extrabold text-dark mb-0">
                  <AnimatedCounter value={metrics.totalStudents} />
                </h3>
              </div>
            </div>
          </div>
        )}

        {/* Data Quality Radial Gauge Bar */}
        {metrics && (
          <div className="mb-4">
            <DataHealthGauge
              score={metrics.totalStudents > 0 ? Number(Math.max(0, 100 - (metrics.totalValidationErrors / metrics.totalStudents * 100)).toFixed(1)) : 100}
              totalSubmissions={allUploads.length}
              validRecords={metrics.totalStudents}
            />
          </div>
        )}

        {msg.text && (
          <div className={`alert alert-${msg.type} alert-dismissible fade show d-flex align-items-center gap-2 mb-4 fw-semibold shadow-sm`} role="alert">
            <div>{msg.text}</div>
            <button type="button" className="btn-close" onClick={() => setMsg({ text: "", type: "" })}></button>
          </div>
        )}

        {/* Admin Navigation Tabs */}
        <div className="d-flex flex-wrap gap-2 mb-4 p-2 glass-panel bg-white border border-slate-200 shadow-sm">
          {[
            { id: 'SUBMISSIONS', label: 'Submissions Tracker', icon: FileSpreadsheet },
            { id: 'COLLEGES', label: 'College Manager', icon: Building2 },
            { id: 'ACADEMIC_YEARS', label: 'Academic Sessions', icon: Clock },
            { id: 'TEMPLATES', label: 'Upload Official Template', icon: FileSpreadsheet },
            { id: 'BROADCAST', label: 'Broadcast Notifications', icon: Bell },
            { id: 'AUDIT', label: 'System Audit Logs', icon: ShieldAlert },
            { id: 'POWERBI', label: 'Power BI Direct Feed', icon: BarChart3 }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`btn d-flex align-items-center gap-2 fw-bold px-3 py-2 rounded-3 transition-all ${
                activeTab === tab.id ? 'btn-danger shadow' : 'text-secondary border-0 bg-transparent'
              }`}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: Submissions Tracker */}
        {activeTab === 'SUBMISSIONS' && (
          <div className="tab-fade-in">
            <div className="row g-4 mb-4">
              {/* Daily Submission & Error Trend Line Chart */}
              <div className="col-lg-8">
                <div className="glass-panel p-4 h-100 bg-white border border-slate-200 shadow-sm">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h6 className="fw-bold text-dark mb-0 font-outfit">Submission Activity & Error Rate Timeline</h6>
                      <small className="text-secondary">Tracks daily upload volume vs automated validation error spikes over time.</small>
                    </div>
                    <span className="badge bg-light text-dark border px-3 py-2 fw-bold">Live Activity Trend</span>
                  </div>
                  <div style={{ height: '220px' }}>
                    <Line 
                      data={lineChartData} 
                      options={{ 
                        responsive: true,
                        maintainAspectRatio: false, 
                        plugins: { 
                          legend: { position: 'top', labels: { boxWidth: 12, font: { weight: 'bold' } } } 
                        },
                        scales: { 
                          x: { ticks: { color: '#475569', font: { weight: 'bold' } } }, 
                          y: { beginAtZero: true, ticks: { color: '#475569', stepSize: 1 } } 
                        } 
                      }} 
                    />
                  </div>
                </div>
              </div>

              {/* Actionable Error Diagnostics Cards */}
              <div className="col-lg-4">
                <div className="glass-panel p-4 h-100 bg-white border border-slate-200 shadow-sm">
                  <h6 className="fw-bold text-dark mb-1 font-outfit">Top Validation Error Diagnostics</h6>
                  <small className="text-secondary d-block mb-3">Most frequent data discrepancies across submissions.</small>

                  {topErrorCols.length === 0 ? (
                    <div className="text-muted small py-4 text-center">No validation errors recorded. All datasets are clean.</div>
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      {topErrorCols.map((err, idx) => (
                        <div key={idx} className="p-2 px-3 bg-light rounded-3 border border-slate-200 d-flex justify-content-between align-items-center">
                          <div>
                            <span className="fw-bold text-dark d-block small">{err.column_name || 'General Data'}</span>
                            <small className="text-secondary">Field validation error</small>
                          </div>
                          <span className="badge bg-danger text-white px-2 py-1 fs-6 font-monospace">
                            {err.count} error(s)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submissions Table */}
            <div className="glass-panel p-4 bg-white border border-slate-200 shadow-sm">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
                <div>
                  <h5 className="fw-bold text-dark mb-1 font-outfit">All Multi-File Submissions & Review Queue</h5>
                  <p className="text-secondary small mb-0">View, download, and review every Excel file submitted across all colleges.</p>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <ExportHub />
                  <button onClick={fetchDashboardMetrics} className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 fw-bold">
                    <RefreshCw size={14} />
                    <span>Refresh Queue</span>
                  </button>
                </div>
              </div>

              {/* Table Live Search Bar */}
              <TableSearchBar
                searchTerm={submissionSearch}
                setSearchTerm={setSubmissionSearch}
                placeholder="Search college code, file name, status..."
                count={
                  allUploads.filter(up => 
                    (up.college_name || "").toLowerCase().includes(submissionSearch.toLowerCase()) ||
                    (up.college_code || "").toLowerCase().includes(submissionSearch.toLowerCase()) ||
                    (up.file_name || "").toLowerCase().includes(submissionSearch.toLowerCase()) ||
                    (up.admin_status || up.status || "").toLowerCase().includes(submissionSearch.toLowerCase())
                  ).length
                }
              />

              <div className="table-responsive">
                <table className="table table-custom">
                  <thead>
                    <tr>
                      <th>Upload ID</th>
                      <th>College Name</th>
                      <th>Uploaded File Name</th>
                      <th>Date Uploaded</th>
                      <th>Students</th>
                      <th>Engine Status</th>
                      <th>Admin Status</th>
                      <th>Admin Remarks</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUploads.filter(up => 
                      (up.college_name || "").toLowerCase().includes(submissionSearch.toLowerCase()) ||
                      (up.college_code || "").toLowerCase().includes(submissionSearch.toLowerCase()) ||
                      (up.file_name || "").toLowerCase().includes(submissionSearch.toLowerCase()) ||
                      (up.admin_status || up.status || "").toLowerCase().includes(submissionSearch.toLowerCase())
                    ).length === 0 ? (
                      <tr>
                        <td colSpan="9">
                          <EmptyState
                            title="No Submissions Found"
                            subtitle={submissionSearch ? `No uploaded files match "${submissionSearch}".` : "No college dataset files uploaded yet."}
                            onResetSearch={submissionSearch ? () => setSubmissionSearch("") : null}
                          />
                        </td>
                      </tr>
                    ) : (
                      allUploads
                        .filter(up => 
                          (up.college_name || "").toLowerCase().includes(submissionSearch.toLowerCase()) ||
                          (up.college_code || "").toLowerCase().includes(submissionSearch.toLowerCase()) ||
                          (up.file_name || "").toLowerCase().includes(submissionSearch.toLowerCase()) ||
                          (up.admin_status || up.status || "").toLowerCase().includes(submissionSearch.toLowerCase())
                        )
                        .map((up, idx) => (
                        <tr key={up.id || up.upload_id || idx}>
                          <td className="fw-bold text-danger">#{up.id}</td>
                          <td className="fw-bold text-dark">
                            {up.college_name} <small className="text-secondary font-monospace">({up.college_code})</small>
                          </td>
                          <td className="fw-bold text-dark">{up.file_name}</td>
                          <td className="text-secondary small fw-medium">
                            {up.uploaded_at ? new Date(up.uploaded_at).toLocaleString() : 'N/A'}
                          </td>
                          <td className="fw-bold text-dark">{up.student_count || 0}</td>
                          <td>
                            <span className={`badge-status ${up.validation_status === 'Passed' ? 'badge-passed' : 'badge-failed'}`}>
                              {up.validation_status} ({up.error_count || 0} errors)
                            </span>
                          </td>
                          <td>
                            <span className={`badge-status ${
                              up.admin_status === 'Approved' ? 'badge-approved' :
                              up.admin_status === 'Rejected' ? 'badge-rejected' :
                              up.admin_status === 'In Process' ? 'badge-in-process' :
                              up.admin_status === 'Partial Data' ? 'badge-correction' :
                              up.admin_status === 'Correction Requested' ? 'badge-correction' : 'badge-pending'
                            }`}>
                              {up.admin_status || 'Under Review'}
                            </span>
                          </td>
                          <td className="small text-dark fw-semibold" style={{ maxWidth: '180px' }}>
                            {up.admin_remarks ? (
                              <span className="bg-light p-1 rounded border border-secondary border-opacity-25 d-block text-truncate" title={up.admin_remarks}>
                                {up.admin_remarks}
                              </span>
                            ) : (
                              <span className="text-secondary opacity-50">No remarks</span>
                            )}
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              <button 
                                onClick={() => {
                                  setSelectedSubmission(up);
                                  setAdminRemarks(up.admin_remarks || "");
                                }}
                                className="btn btn-danger btn-sm rounded-3 fw-bold shadow-sm"
                                style={{ fontSize: '0.75rem' }}
                              >
                                Review & Remarks
                              </button>
                              <button 
                                onClick={() => fetchStudentPreview(up.id || up.upload_id)}
                                className="btn btn-outline-danger btn-sm rounded-3 fw-bold d-flex align-items-center gap-1"
                                style={{ fontSize: '0.75rem' }}
                                title="Interactive In-Browser Data Preview"
                              >
                                <Eye size={12} />
                                <span>Preview</span>
                              </button>
                              <a 
                                href={`http://127.0.0.1:5000/api/uploads/file/${up.id || up.upload_id}?token=${localStorage.getItem('token')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-outline-dark btn-sm rounded-3 fw-bold d-flex align-items-center gap-1"
                                style={{ fontSize: '0.75rem' }}
                                title="Open & Download Excel File"
                              >
                                <Download size={12} />
                                <span>Open Excel</span>
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Connected Colleges & Training Inspector */}
        {activeTab === 'COLLEGES' && (
          <div className="row g-4 tab-fade-in">
            <div className="col-12">
              <div className="glass-panel p-4 bg-white border border-slate-200 shadow-sm mb-4">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
                  <div>
                    <h5 className="fw-bold text-dark mb-1 font-outfit">College Status & Training Inspector</h5>
                    <p className="text-secondary small mb-0">Select any college from the dropdown to view its overall account status, training completion, and assigned trainers.</p>
                  </div>
                  <div style={{ minWidth: '320px' }}>
                    <select
                      className="form-select bg-white text-dark border-secondary border-opacity-50 fw-bold py-2"
                      value={selectedInspectorCollege ? (selectedInspectorCollege.id || selectedInspectorCollege.college_id) : ""}
                      onChange={(e) => {
                        const targetId = parseInt(e.target.value);
                        const found = colleges.find(c => (c.id === targetId || c.college_id === targetId));
                        if (found) setSelectedInspectorCollege(found);
                      }}
                    >
                      <option value="">Select a College to View Overall Status & Training...</option>
                      {colleges.map(col => (
                        <option key={col.id || col.college_id} value={col.id || col.college_id}>
                          {col.name} ({col.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Overall Selected College Inspector Summary Card */}
                {selectedInspectorCollege && (
                  <div className="p-3 bg-light rounded-3 border border-danger border-opacity-25 mt-3">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                      <div>
                        <h6 className="fw-bold text-danger mb-1 font-outfit fs-5">
                          {selectedInspectorCollege.name} <small className="text-secondary font-monospace">({selectedInspectorCollege.code})</small>
                        </h6>
                        <div className="d-flex flex-wrap gap-2 align-items-center mt-2">
                          <span className={`badge ${selectedInspectorCollege.status === 'ACTIVE' ? 'bg-success' : 'bg-danger'} px-3 py-2 fw-bold`}>
                            Account: {selectedInspectorCollege.status}
                          </span>
                          <span className={`badge ${selectedInspectorCollege.faculty_training_status === 'Done' || selectedInspectorCollege.faculty_training_status === 'Completed' ? 'bg-success text-white' : selectedInspectorCollege.faculty_training_status === 'In Progress' ? 'bg-info text-dark' : selectedInspectorCollege.faculty_training_status === 'Scheduled' ? 'bg-warning text-dark' : 'bg-secondary text-white'} px-3 py-2 fw-bold`}>
                            Faculty Training: {selectedInspectorCollege.faculty_training_status || 'Pending'}
                            {selectedInspectorCollege.faculty_training_date && ` (${new Date(selectedInspectorCollege.faculty_training_date).toLocaleDateString()})`}
                          </span>
                          <span className={`badge ${selectedInspectorCollege.dashboard_training_status === 'Done' || selectedInspectorCollege.dashboard_training_status === 'Completed' ? 'bg-success text-white' : selectedInspectorCollege.dashboard_training_status === 'In Progress' ? 'bg-info text-dark' : selectedInspectorCollege.dashboard_training_status === 'Scheduled' ? 'bg-warning text-dark' : 'bg-secondary text-white'} px-3 py-2 fw-bold`}>
                            Dashboard Training: {selectedInspectorCollege.dashboard_training_status || 'Pending'}
                            {selectedInspectorCollege.dashboard_training_date && ` (${new Date(selectedInspectorCollege.dashboard_training_date).toLocaleDateString()})`}
                          </span>
                          <span className={`badge ${selectedInspectorCollege.admin_training_status === 'Done' || selectedInspectorCollege.admin_training_status === 'Completed' ? 'bg-success text-white' : selectedInspectorCollege.admin_training_status === 'In Progress' ? 'bg-info text-dark' : selectedInspectorCollege.admin_training_status === 'Scheduled' ? 'bg-warning text-dark' : 'bg-secondary text-white'} px-3 py-2 fw-bold`}>
                            Admin Training: {selectedInspectorCollege.admin_training_status || 'Pending'}
                            {selectedInspectorCollege.admin_training_date && ` (${new Date(selectedInspectorCollege.admin_training_date).toLocaleDateString()})`}
                          </span>
                        </div>
                        <p className="small text-secondary mb-0 mt-2">
                          <strong>Assigned Trainer:</strong> {selectedInspectorCollege.trainer_name || 'TeachUs Support Team'}
                          {selectedInspectorCollege.training_notes && <span className="ms-2">| <strong>Session Notes:</strong> {selectedInspectorCollege.training_notes}</span>}
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenTrainingModal(selectedInspectorCollege)}
                        className="btn btn-gradient-primary btn-sm fw-bold shadow-sm d-flex align-items-center gap-1 px-3 py-2"
                      >
                        <Edit size={14} />
                        <span>Schedule / Edit Training</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Visual College Compliance Matrix Cards */}
              {colleges.length > 0 && (
                <div className="row g-3 mb-4">
                  {colleges.slice(0, 3).map(col => (
                    <div key={col.id || col.college_id} className="col-md-4">
                      <CollegeMatrixCard
                        college={col}
                        onScheduleTraining={(targetCol) => handleOpenTrainingModal(targetCol)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Register New College Institution Card Form (Single + Bulk Excel Import) */}
              <div className="glass-panel p-4 bg-white border border-danger border-opacity-25 shadow-sm mb-4">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3 border-bottom pb-3">
                  <div>
                    <h5 className="fw-bold text-dark mb-1 font-outfit d-flex align-items-center gap-2">
                      <Plus size={20} className="text-danger" />
                      Register College Institutions & Credentials
                    </h5>
                    <p className="text-secondary small mb-0">Register single college manually or upload an Excel sheet to bulk register multiple colleges at once.</p>
                  </div>

                  <div className="btn-group p-1 bg-light rounded-3 border border-secondary border-opacity-25">
                    <button
                      type="button"
                      onClick={() => setRegistrationMode("SINGLE")}
                      className={`btn btn-sm fw-bold rounded-2 ${registrationMode === "SINGLE" ? "btn-danger text-white shadow-sm" : "btn-light text-dark"}`}
                    >
                      Single College Form
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegistrationMode("BULK")}
                      className={`btn btn-sm fw-bold rounded-2 ${registrationMode === "BULK" ? "btn-danger text-white shadow-sm" : "btn-light text-dark"}`}
                    >
                      Bulk Excel Upload (.xlsx)
                    </button>
                  </div>
                </div>

                {registrationMode === "SINGLE" ? (
                  <form onSubmit={handleAddCollege}>
                    <div className="row g-3">
                      <div className="col-md-3">
                        <label className="form-label text-dark fw-bold small">College Code</label>
                        <input
                          type="text"
                          className="form-control bg-white text-dark border-secondary border-opacity-50 fw-semibold"
                          placeholder="e.g. KCC003"
                          required
                          value={newCollege.code}
                          onChange={e => setNewCollege({ ...newCollege, code: e.target.value })}
                        />
                      </div>
                      <div className="col-md-5">
                        <label className="form-label text-dark fw-bold small">College Name</label>
                        <input
                          type="text"
                          className="form-control bg-white text-dark border-secondary border-opacity-50 fw-semibold"
                          placeholder="e.g. K.C. College of Arts & Commerce"
                          required
                          value={newCollege.name}
                          onChange={e => setNewCollege({ ...newCollege, name: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label text-dark fw-bold small">University</label>
                        <input
                          type="text"
                          className="form-control bg-white text-dark border-secondary border-opacity-50 fw-semibold"
                          placeholder="e.g. University of Mumbai"
                          value={newCollege.university}
                          onChange={e => setNewCollege({ ...newCollege, university: e.target.value })}
                        />
                      </div>

                      <div className="col-md-3">
                        <label className="form-label text-dark fw-bold small">Contact Email</label>
                        <input
                          type="email"
                          className="form-control bg-white text-dark border-secondary border-opacity-50 fw-semibold"
                          placeholder="info@college.edu.in"
                          value={newCollege.contact_email}
                          onChange={e => setNewCollege({ ...newCollege, contact_email: e.target.value })}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label text-dark fw-bold small">Contact Phone</label>
                        <input
                          type="text"
                          className="form-control bg-white text-dark border-secondary border-opacity-50 fw-semibold"
                          placeholder="9820011223"
                          value={newCollege.contact_phone}
                          onChange={e => setNewCollege({ ...newCollege, contact_phone: e.target.value })}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label text-dark fw-bold small">Portal Login Username</label>
                        <input
                          type="text"
                          className="form-control bg-white text-dark border-secondary border-opacity-50 fw-bold text-danger"
                          placeholder="e.g. kc_user"
                          required
                          value={newCollege.username}
                          onChange={e => setNewCollege({ ...newCollege, username: e.target.value })}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label text-dark fw-bold small">Portal Login Password</label>
                        <input
                          type="password"
                          className="form-control bg-white text-dark border-secondary border-opacity-50 fw-bold"
                          placeholder="e.g. college123"
                          required
                          value={newCollege.password}
                          onChange={e => setNewCollege({ ...newCollege, password: e.target.value })}
                        />
                      </div>
                      <div className="col-12 text-end">
                        <button type="submit" className="btn btn-gradient-primary btn-sm fw-bold px-4 py-2 shadow">
                          Register Single College
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div>
                    <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 p-3 bg-light rounded-3 border border-secondary border-opacity-25 mb-3">
                      <div>
                        <h6 className="fw-bold text-dark mb-1 font-outfit">Download Official Bulk Import Excel Template</h6>
                        <p className="text-secondary small mb-0">Use this pre-formatted Excel template with sample headers: <strong>Code, Name, University, State, Contact_Email, Contact_Phone, Username, Password</strong>.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadCollegeTemplate}
                        className="btn btn-outline-danger btn-sm fw-bold d-flex align-items-center gap-2 text-nowrap px-3 py-2"
                      >
                        <Download size={16} />
                        <span>Download Bulk Template (.xlsx)</span>
                      </button>
                    </div>

                    <form onSubmit={handleBulkImportSubmit}>
                      <div className="mb-3">
                        <label className="form-label text-dark fw-bold small">Upload Completed Excel File (.xlsx, .xls)</label>
                        <input
                          type="file"
                          accept=".xlsx, .xls"
                          className="form-control bg-white text-dark border-secondary border-opacity-50 fw-semibold"
                          onChange={e => setBulkCollegeFile(e.target.files[0])}
                          required
                        />
                        {bulkCollegeFile && (
                          <div className="form-text text-success fw-semibold mt-1">
                            Selected File: {bulkCollegeFile.name} ({(bulkCollegeFile.size / 1024).toFixed(1)} KB)
                          </div>
                        )}
                      </div>

                      <div className="text-end">
                        <button
                          type="submit"
                          disabled={bulkUploading}
                          className="btn btn-gradient-primary btn-sm fw-bold px-4 py-2 shadow d-inline-flex align-items-center gap-2"
                        >
                          {bulkUploading ? (
                            <>
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                              <span>Registering Colleges...</span>
                            </>
                          ) : (
                            <>
                              <Upload size={16} />
                              <span>Bulk Register Colleges from Excel</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>

                    {bulkImportResult && (
                      <div className="mt-3 p-3 rounded-3 bg-white border border-secondary border-opacity-25 shadow-sm">
                        <h6 className="fw-bold text-dark font-outfit mb-2">Import Results Summary</h6>
                        <div className="d-flex gap-3 mb-2">
                          <span className="badge bg-success px-3 py-2">Success: {bulkImportResult.successCount} College(s)</span>
                          <span className="badge bg-danger px-3 py-2">Errors: {bulkImportResult.errorCount} Row(s)</span>
                        </div>

                        {bulkImportResult.errors && bulkImportResult.errors.length > 0 && (
                          <div className="p-2 bg-light rounded text-danger small font-monospace mt-2" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                            {bulkImportResult.errors.map((errItem, idx) => (
                              <div key={idx}>• {errItem}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Main Colleges Table */}
              <div className="glass-panel p-4 bg-white border border-slate-200 shadow-sm">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h5 className="fw-bold text-dark mb-1 font-outfit">Connected Colleges & Training Compliance</h5>
                    <p className="text-secondary small mb-0">Manage credentials, account access, and faculty/dashboard training records.</p>
                  </div>
                  <button onClick={fetchColleges} className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 fw-bold">
                    <RefreshCw size={14} />
                    <span>Refresh List</span>
                  </button>
                </div>

                <TableSearchBar
                  searchTerm={collegeSearch}
                  setSearchTerm={setCollegeSearch}
                  placeholder="Search college code, name, email..."
                  count={
                    colleges.filter(col =>
                      (col.name || "").toLowerCase().includes(collegeSearch.toLowerCase()) ||
                      (col.code || "").toLowerCase().includes(collegeSearch.toLowerCase()) ||
                      (col.contact_email || "").toLowerCase().includes(collegeSearch.toLowerCase())
                    ).length
                  }
                />

                <div className="table-responsive">
                  <table className="table table-custom">
                    <thead>
                      <tr>
                        <th>Code & Name</th>
                        <th>Username</th>
                        <th>Contact Email</th>
                        <th>Account Status</th>
                        <th>Faculty Training</th>
                        <th>Dashboard Training</th>
                        <th>Admin Training</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {colleges
                        .filter(col =>
                          (col.name || "").toLowerCase().includes(collegeSearch.toLowerCase()) ||
                          (col.code || "").toLowerCase().includes(collegeSearch.toLowerCase()) ||
                          (col.contact_email || "").toLowerCase().includes(collegeSearch.toLowerCase())
                        )
                        .map((col, idx) => (
                        <tr key={col.id || col.college_id || idx}>
                          <td>
                            <span className="fw-bold text-danger d-block">{col.name}</span>
                            <small className="text-secondary font-monospace">({col.code})</small>
                          </td>
                          <td className="text-dark fw-semibold">{col.username || 'N/A'}</td>
                          <td className="text-secondary small fw-medium">{col.contact_email}</td>
                          <td>
                            <span className={`badge ${col.status === 'ACTIVE' ? 'bg-success' : 'bg-danger'}`}>
                              {col.status}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${col.faculty_training_status === 'Done' || col.faculty_training_status === 'Completed' ? 'bg-success text-white' : col.faculty_training_status === 'In Progress' ? 'bg-info text-dark' : col.faculty_training_status === 'Scheduled' ? 'bg-warning text-dark' : 'bg-secondary text-white'}`}>
                              {col.faculty_training_status || 'Pending'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${col.dashboard_training_status === 'Done' || col.dashboard_training_status === 'Completed' ? 'bg-success text-white' : col.dashboard_training_status === 'In Progress' ? 'bg-info text-dark' : col.dashboard_training_status === 'Scheduled' ? 'bg-warning text-dark' : 'bg-secondary text-white'}`}>
                              {col.dashboard_training_status || 'Pending'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${col.admin_training_status === 'Done' || col.admin_training_status === 'Completed' ? 'bg-success text-white' : col.admin_training_status === 'In Progress' ? 'bg-info text-dark' : col.admin_training_status === 'Scheduled' ? 'bg-warning text-dark' : 'bg-secondary text-white'}`}>
                              {col.admin_training_status || 'Pending'}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              <button
                                onClick={() => handleOpenTrainingModal(col)}
                                className="btn btn-outline-danger btn-sm fw-bold d-flex align-items-center gap-1"
                                style={{ fontSize: '0.75rem' }}
                                title="Update Training Status & Notes"
                              >
                                <Edit size={12} />
                                <span>Training</span>
                              </button>
                              <button 
                                onClick={() => handleToggleCollegeStatus(col.id, col.status)}
                                className={`btn btn-sm fw-bold ${col.status === 'ACTIVE' ? 'btn-outline-warning' : 'btn-outline-success'}`}
                                style={{ fontSize: '0.75rem' }}
                              >
                                {col.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                              </button>
                              <button 
                                onClick={() => setResetPassData({ collegeId: col.id, newPassword: "" })}
                                className="btn btn-outline-dark btn-sm fw-bold"
                                style={{ fontSize: '0.75rem' }}
                              >
                                Reset Pass
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: Training Tracker */}
        {activeTab === 'TRAINING' && (
          <div className="tab-fade-in">
            {/* Training Summary Cards */}
            {trainingData.summary && (
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <div className="glass-card text-center p-3 bg-white border border-slate-200 shadow-sm">
                    <GraduationCap size={28} className="text-danger mb-1" />
                    <small className="text-secondary d-block uppercase fw-bold">Faculty Training Completed</small>
                    <h3 className="fw-extrabold text-danger mb-0">
                      <AnimatedCounter value={trainingData.summary.facultyDone} /> / {trainingData.summary.totalColleges} ({trainingData.summary.facultyPct}%)
                    </h3>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="glass-card text-center p-3 bg-white border border-slate-200 shadow-sm">
                    <BookOpen size={28} className="text-primary mb-1" />
                    <small className="text-secondary d-block uppercase fw-bold">Dashboard Training Completed</small>
                    <h3 className="fw-extrabold text-primary mb-0">
                      <AnimatedCounter value={trainingData.summary.dashboardDone} /> / {trainingData.summary.totalColleges} ({trainingData.summary.dashboardPct}%)
                    </h3>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="glass-card text-center p-3 bg-white border border-slate-200 shadow-sm">
                    <Award size={28} className="text-success mb-1" />
                    <small className="text-secondary d-block uppercase fw-bold">Fully Certified Institutions</small>
                    <h3 className="fw-extrabold text-success mb-0">
                      <AnimatedCounter value={trainingData.summary.bothDone} /> / {trainingData.summary.totalColleges}
                    </h3>
                  </div>
                </div>
              </div>
            )}

            {/* Training Tracker Table Card */}
            <div className="glass-panel p-4 bg-white border border-slate-200 shadow-sm">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="fw-bold text-dark mb-1 font-outfit">College Faculty & Dashboard Training Compliance</h5>
                  <p className="text-secondary small mb-0">Track which institutions have completed faculty data training and dashboard onboarding.</p>
                </div>
                <button onClick={fetchTrainingTracker} className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 fw-bold">
                  <RefreshCw size={14} />
                  <span>Refresh Status</span>
                </button>
              </div>

              <TableSearchBar
                searchTerm={trainingSearch}
                setSearchTerm={setTrainingSearch}
                placeholder="Search college code, name, trainer..."
                count={
                  (trainingData.colleges || []).filter(c => 
                    (c.name || "").toLowerCase().includes(trainingSearch.toLowerCase()) ||
                    (c.code || "").toLowerCase().includes(trainingSearch.toLowerCase()) ||
                    (c.trainer_name || "").toLowerCase().includes(trainingSearch.toLowerCase()) ||
                    (c.faculty_training_status || "").toLowerCase().includes(trainingSearch.toLowerCase()) ||
                    (c.dashboard_training_status || "").toLowerCase().includes(trainingSearch.toLowerCase())
                  ).length
                }
              />

              <div className="table-responsive">
                <table className="table table-custom">
                  <thead>
                    <tr>
                      <th>College Code & Name</th>
                      <th>Faculty Training</th>
                      <th>Dashboard Training</th>
                      <th>Trainer Assigned</th>
                      <th>Training Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(trainingData.colleges || [])
                      .filter(c => 
                        (c.name || "").toLowerCase().includes(trainingSearch.toLowerCase()) ||
                        (c.code || "").toLowerCase().includes(trainingSearch.toLowerCase()) ||
                        (c.trainer_name || "").toLowerCase().includes(trainingSearch.toLowerCase()) ||
                        (c.faculty_training_status || "").toLowerCase().includes(trainingSearch.toLowerCase()) ||
                        (c.dashboard_training_status || "").toLowerCase().includes(trainingSearch.toLowerCase())
                      )
                      .map((c, idx) => (
                        <tr key={c.id || c.college_id || idx}>
                          <td>
                            <span className="fw-bold text-danger d-block">{c.name}</span>
                            <small className="text-secondary font-monospace">({c.code})</small>
                          </td>
                          <td>
                            <span className={`badge ${c.faculty_training_status === 'Completed' ? 'bg-success text-white' : c.faculty_training_status === 'Scheduled' ? 'bg-warning text-dark' : 'bg-secondary text-white'}`}>
                              {c.faculty_training_status}
                            </span>
                            {c.faculty_training_date && (
                              <small className="d-block text-secondary" style={{ fontSize: '0.72rem' }}>
                                {new Date(c.faculty_training_date).toLocaleDateString()}
                              </small>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${c.dashboard_training_status === 'Completed' ? 'bg-success text-white' : c.dashboard_training_status === 'Scheduled' ? 'bg-warning text-dark' : 'bg-secondary text-white'}`}>
                              {c.dashboard_training_status}
                            </span>
                            {c.dashboard_training_date && (
                              <small className="d-block text-secondary" style={{ fontSize: '0.72rem' }}>
                                {new Date(c.dashboard_training_date).toLocaleDateString()}
                              </small>
                            )}
                          </td>
                          <td className="fw-semibold text-dark small">{c.trainer_name || 'TeachUs Team'}</td>
                          <td className="text-secondary small">{c.training_notes || 'No training notes recorded.'}</td>
                          <td>
                            <button
                              onClick={() => handleOpenTrainingModal(c)}
                              className="btn btn-outline-danger btn-sm rounded-3 fw-bold d-flex align-items-center gap-1"
                              style={{ fontSize: '0.75rem' }}
                            >
                              <Edit size={12} />
                              <span>Update Training</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Academic Years */}
        {activeTab === 'ACADEMIC_YEARS' && (
          <div className="row g-4">
            <div className="col-lg-4">
              <div className="glass-panel p-4 bg-white border border-slate-200 shadow-sm">
                <h5 className="fw-bold text-dark mb-3 font-outfit d-flex align-items-center gap-2">
                  <Plus size={20} className="text-danger" />
                  Create Academic Session
                </h5>
                <form onSubmit={handleCreateYear}>
                  <div className="mb-2">
                    <label className="form-label text-dark fw-bold small mb-1">Academic Year Label</label>
                    <input type="text" className="form-control bg-white border-secondary border-opacity-50 text-dark fw-semibold" placeholder="2026-2027" value={newYear.year_label} onChange={e => setNewYear({...newYear, year_label: e.target.value})} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small mb-1">Submission Deadline</label>
                    <input type="datetime-local" className="form-control bg-white border-secondary border-opacity-50 text-dark fw-semibold" value={newYear.deadline} onChange={e => setNewYear({...newYear, deadline: e.target.value})} required />
                  </div>
                  <button type="submit" className="btn btn-gradient-primary w-100 fw-bold shadow">Create Academic Session</button>
                </form>
              </div>
            </div>

            <div className="col-lg-8">
              <div className="glass-panel p-4 bg-white border border-slate-200 shadow-sm">
                <h5 className="fw-bold text-dark mb-3 font-outfit">Academic Sessions & Window Deadlines</h5>
                <div className="table-responsive">
                  <table className="table table-custom">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Year Label</th>
                        <th>Submission Deadline</th>
                        <th>Window Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {academicYears.map(ay => (
                        <tr key={ay.id}>
                          <td className="fw-bold">#{ay.id}</td>
                          <td className="fw-bold text-danger">{ay.year_label}</td>
                          <td className="text-dark small fw-medium">{new Date(ay.deadline).toLocaleString()}</td>
                          <td>
                            <span className={`badge ${ay.is_open ? 'bg-success' : 'bg-secondary'}`}>
                              {ay.is_open ? 'OPEN' : 'CLOSED'}
                            </span>
                          </td>
                          <td>
                            <button 
                              onClick={() => handleToggleWindow(ay.id, ay.is_open)}
                              className={`btn btn-sm fw-bold ${ay.is_open ? 'btn-outline-warning' : 'btn-outline-success'}`}
                            >
                              {ay.is_open ? 'Close Window' : 'Open Window'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Data Retention Policy & Auto-Purge Manager Card */}
            <div className="col-12 mt-4">
              <div className="glass-panel p-4 bg-white border border-slate-200 shadow-sm">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-bold text-dark mb-0 font-outfit d-flex align-items-center gap-2">
                    <Trash2 className="text-danger" size={22} />
                    Automated Data Retention & Auto-Deletion Manager (Admin Rights Only)
                  </h5>
                  <span className="badge bg-dark px-3 py-2 fw-bold">Admin Only</span>
                </div>
                <p className="text-secondary small mb-3">
                  Set the maximum retention period for uploaded student files. Submissions older than the configured deadline (default <strong>2 Months</strong>) are automatically purged from server disk storage and database.
                </p>

                <div className="row g-3 align-items-end">
                  <div className="col-md-4">
                    <label className="form-label text-dark fw-bold small mb-1">Data Retention Period</label>
                    <select 
                      className="form-select bg-white border-secondary border-opacity-50 text-dark fw-bold"
                      value={retentionInfo.retention_months}
                      onChange={e => handleSaveRetention(parseInt(e.target.value, 10), retentionInfo.auto_purge_enabled)}
                    >
                      <option value={1}>1 Month (30 Days)</option>
                      <option value={2}>2 Months (60 Days - Default)</option>
                      <option value={3}>3 Months (90 Days)</option>
                      <option value={6}>6 Months (180 Days)</option>
                      <option value={12}>1 Year (365 Days)</option>
                    </select>
                  </div>

                  <div className="col-md-4">
                    <div className="form-check form-switch mb-2">
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        id="autoPurgeSwitch" 
                        checked={retentionInfo.auto_purge_enabled}
                        onChange={e => handleSaveRetention(retentionInfo.retention_months, e.target.checked)}
                      />
                      <label className="form-check-label text-dark fw-bold small" htmlFor="autoPurgeSwitch">
                        Enable Daily Background Auto-Purge
                      </label>
                    </div>
                    <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                      Daily background task deletes files older than {retentionInfo.retention_months} month(s).
                    </small>
                  </div>

                  <div className="col-md-4 text-end">
                    <button 
                      onClick={handleExecutePurge}
                      className="btn btn-danger fw-bold rounded-3 d-flex align-items-center gap-2 ms-auto py-2 px-3 shadow-sm"
                    >
                      <Trash2 size={16} />
                      <span>Purge Expired Data Now ({retentionInfo.expired_submissions_count} Pending)</span>
                    </button>
                  </div>
                </div>

                {retentionInfo.expired_submissions_count > 0 ? (
                  <div className="alert alert-warning border-warning border-2 p-3 mt-3 mb-0 rounded-3 d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-2">
                      <AlertCircle size={20} className="text-warning" />
                      <span className="small text-dark fw-semibold">
                        Found <strong>{retentionInfo.expired_submissions_count} submission batch(es)</strong> ({retentionInfo.expired_students_count} student records) older than <strong>{retentionInfo.retention_months} month(s)</strong> ready for auto-deletion.
                      </span>
                    </div>
                    <span className="badge bg-warning text-dark fw-bold px-3 py-2">Action Ready</span>
                  </div>
                ) : (
                  <div className="alert alert-success border-success border-2 p-3 mt-3 mb-0 rounded-3 d-flex align-items-center gap-2">
                    <CheckCircle2 size={20} className="text-success" />
                    <span className="small text-dark fw-semibold">
                      All submission data is within the active <strong>{retentionInfo.retention_months}-month retention window</strong>. Zero expired files pending deletion.
                    </span>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: Templates Manager */}
        {activeTab === 'TEMPLATES' && (
          <div className="row g-4 tab-fade-in">
            {/* Left Card: Currently Published Active Template Info */}
            <div className="col-lg-6">
              <div className="glass-panel p-4 bg-white border border-danger border-opacity-25 shadow-sm h-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-bold text-dark mb-0 font-outfit d-flex align-items-center gap-2">
                    <FileSpreadsheet className="text-danger" size={24} />
                    Currently Published Official Template
                  </h5>
                  <span className="badge bg-success px-3 py-2 fw-bold">ACTIVE PUBLISHED</span>
                </div>

                <p className="text-secondary small mb-4">
                  This is the official Excel file template currently published by Admin. All colleges downloading the template from their portal will receive this exact version.
                </p>

                {activePublishedTemplate ? (
                  <div className="p-3 bg-light rounded-3 border border-slate-200 mb-4">
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="text-secondary small fw-bold text-uppercase d-block mb-1">Published Template File Name</label>
                        <span className="fw-bold text-dark font-monospace fs-6">{activePublishedTemplate.name}</span>
                      </div>
                      <div className="col-6">
                        <label className="text-secondary small fw-bold text-uppercase d-block mb-1">Active Version</label>
                        <span className="badge bg-danger px-3 py-2 fw-bold fs-6">{activePublishedTemplate.version || 'v1.0'}</span>
                      </div>
                      <div className="col-6">
                        <label className="text-secondary small fw-bold text-uppercase d-block mb-1">Associated Session</label>
                        <span className="fw-bold text-dark">{activePublishedTemplate.year_label || 'All Academic Sessions'}</span>
                      </div>
                      <div className="col-12">
                        <label className="text-secondary small fw-bold text-uppercase d-block mb-1">Published Timestamp</label>
                        <span className="small text-muted fw-semibold">
                          <Clock size={14} className="me-1 ms-1" />
                          {new Date(activePublishedTemplate.uploaded_at || Date.now()).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-light rounded-3 text-secondary small mb-4">
                    Loading active published template info...
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleDownloadPublishedTemplate}
                  className="btn btn-outline-danger w-100 fw-bold d-flex align-items-center justify-content-center gap-2 py-2 shadow-sm"
                >
                  <Download size={18} />
                  <span>Download & Verify Active Published Template (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Right Card: Upload & Publish New Template Version */}
            <div className="col-lg-6">
              <div className="glass-panel p-4 bg-white border border-slate-200 shadow-sm h-100">
                <h5 className="fw-bold text-dark mb-3 font-outfit d-flex align-items-center gap-2">
                  <Upload className="text-danger" size={24} />
                  Publish New Template Version
                </h5>
                <p className="text-secondary small mb-3">
                  Upload an updated `.xlsx` file to instantly replace and publish a new official template version across the entire system.
                </p>

                <form onSubmit={handleUploadTemplate}>
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small mb-1">New Version Label</label>
                    <input
                      type="text"
                      className="form-control bg-white border-secondary border-opacity-50 text-dark fw-bold text-danger"
                      placeholder="e.g. v1.2"
                      value={templateVersion}
                      onChange={e => setTemplateVersion(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="form-label text-dark fw-bold small mb-1">Select Replacement Excel File (.xlsx)</label>
                    <input
                      type="file"
                      accept=".xlsx"
                      className="form-control bg-white border-secondary border-opacity-50 text-dark fw-semibold"
                      onChange={e => setTemplateFile(e.target.files[0])}
                      required
                    />
                    {templateFile && (
                      <div className="form-text text-success fw-semibold mt-1">
                        Selected: {templateFile.name} ({(templateFile.size / 1024).toFixed(1)} KB)
                      </div>
                    )}
                  </div>

                  <button type="submit" className="btn btn-gradient-primary w-100 fw-bold py-2 shadow d-flex align-items-center justify-content-center gap-2">
                    <Upload size={18} />
                    <span>Upload & Publish New Template</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Audit Logs */}
        {activeTab === 'AUDIT' && (
          <div className="glass-panel p-4 bg-white border border-slate-200 shadow-sm">
            <h5 className="fw-bold text-dark mb-3 font-outfit">System Audit Logs & Security Trail</h5>
            <div className="table-responsive">
              <table className="table table-custom">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>College Name</th>
                    <th>Action</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                      <td className="text-secondary small fw-medium">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="fw-bold text-danger">{log.username}</td>
                      <td className="text-dark small fw-semibold">{log.college_name || 'N/A'}</td>
                      <td><span className="badge bg-danger">{log.action}</span></td>
                      <td className="text-dark small fw-medium">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: Power BI Feed */}
        {activeTab === 'POWERBI' && (
          <div className="glass-panel p-4 bg-white border border-slate-200 shadow-sm">
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-3">
              <div>
                <h5 className="fw-bold text-dark mb-0 font-outfit">Power BI Direct Data Feed</h5>
                <small className="text-secondary fw-semibold">
                  Select a college to filter real-time analytics and stream dedicated Power BI metrics.
                </small>
              </div>

              <div className="d-flex align-items-center gap-2">
                <label className="fw-bold text-dark small mb-0 me-1">Filter College:</label>
                <select 
                  className="form-select form-select-sm bg-white border-secondary border-opacity-50 text-dark fw-bold" 
                  style={{ width: '240px' }}
                  value={selectedPowerBiCollege} 
                  onChange={e => {
                    const cid = e.target.value;
                    setSelectedPowerBiCollege(cid);
                    fetchPowerBiFeed(cid);
                  }}
                >
                  <option value="">All Connected Colleges</option>
                  {colleges.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>

                <a 
                  href={`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/analytics/powerbi-feed${selectedPowerBiCollege ? `?college_id=${selectedPowerBiCollege}` : ''}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn btn-outline-danger btn-sm fw-bold d-flex align-items-center gap-1"
                >
                  <Download size={14} />
                  <span>Direct JSON Stream</span>
                </a>
              </div>
            </div>

            {powerBiData && (
              <div>
                <div className="row g-3 mb-4">
                  <div className="col-md-3">
                    <div className="p-3 bg-light rounded-3 border text-center">
                      <span className="text-secondary small fw-bold d-block">Submissions Analyzed</span>
                      <span className="fs-4 fw-bold text-dark">{powerBiData.total_submissions || 0} Batch(es)</span>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="p-3 bg-light rounded-3 border text-center">
                      <span className="text-secondary small fw-bold d-block">Verified Student Records</span>
                      <span className="fs-4 fw-bold text-danger">{powerBiData.total_students || 0} Students</span>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="p-3 bg-light rounded-3 border text-center">
                      <span className="text-secondary small fw-bold d-block">Data Quality Score</span>
                      <span className="fs-4 fw-bold text-success">{powerBiData.data_quality_score}%</span>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="p-3 bg-light rounded-3 border text-center">
                      <span className="text-secondary small fw-bold d-block">Filter Status</span>
                      <span className="badge bg-dark mt-1 px-3 py-2">
                        {selectedPowerBiCollege ? colleges.find(c => String(c.id) === String(selectedPowerBiCollege))?.name || `College ID #${selectedPowerBiCollege}` : 'All Connected Institutions'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interactive Visual Charts Section */}
                <div className="row g-4 mb-4">
                  <div className="col-lg-5">
                    <div className="p-3 bg-light rounded-3 border border-slate-200 h-100">
                      <h6 className="fw-bold text-dark font-outfit mb-3 text-center">
                        Submission Status Ring ({selectedPowerBiCollege ? colleges.find(c => String(c.id) === String(selectedPowerBiCollege))?.code || 'Selected' : 'All'})
                      </h6>
                      <div style={{ height: '240px' }} className="d-flex align-items-center justify-content-center">
                        {powerBiData.statusRing && powerBiData.statusRing.length > 0 ? (
                          <Doughnut
                            data={{
                              labels: powerBiData.statusRing.map(s => s.admin_status || 'Under Review'),
                              datasets: [{
                                data: powerBiData.statusRing.map(s => s.count),
                                backgroundColor: [
                                  '#16a34a', '#2563eb', '#ca8a04', '#dc2626', '#9333ea', '#64748b'
                                ],
                                borderWidth: 2,
                                borderColor: '#ffffff'
                              }]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { position: 'bottom', labels: { boxWidth: 12, font: { weight: 'bold' } } }
                              }
                            }}
                          />
                        ) : (
                          <div className="text-muted small">No submission status records found for this selection.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-7">
                    <div className="p-3 bg-light rounded-3 border border-slate-200 h-100">
                      <h6 className="fw-bold text-dark font-outfit mb-3 text-center">
                        Student Distribution by Academic Stream / Branch
                      </h6>
                      <div style={{ height: '240px' }}>
                        {powerBiData.branchBreakdown && powerBiData.branchBreakdown.length > 0 ? (
                          <Bar
                            data={{
                              labels: powerBiData.branchBreakdown.map(b => b.branch || 'General'),
                              datasets: [{
                                label: 'Enrolled Students',
                                data: powerBiData.branchBreakdown.map(b => b.count),
                                backgroundColor: '#dc2626',
                                borderRadius: 6
                              }]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { display: false }
                              },
                              scales: {
                                y: { beginAtZero: true, ticks: { stepSize: 1 } }
                              }
                            }}
                          />
                        ) : (
                          <div className="text-muted small text-center py-5">No branch breakdown records available for this selection.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <h6 className="fw-bold text-dark font-outfit mb-2">Live Stream JSON Data Feed:</h6>
                <pre className="bg-light p-3 rounded-3 text-dark small border border-slate-200 fw-mono" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  {JSON.stringify(powerBiData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: Broadcast Notifications */}
        {activeTab === 'BROADCAST' && (
          <div className="glass-panel p-4 bg-white border border-slate-200 shadow-sm">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className="p-2 rounded-3 bg-danger bg-opacity-10 text-danger">
                <Bell size={22} />
              </div>
              <div>
                <h5 className="fw-bold text-dark mb-0 font-outfit">Broadcast Notification Center</h5>
                <small className="text-secondary fw-semibold">
                  Send official announcements, deadline alerts, or correction notices directly to college user dashboards.
                </small>
              </div>
            </div>

            <form onSubmit={handleSendBroadcast} className="bg-light p-4 rounded-3 border border-slate-200">
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label text-dark fw-bold small">Target Recipient</label>
                  <select
                    className="form-select bg-white border-secondary border-opacity-50 text-dark fw-semibold"
                    value={broadcastForm.target_college_id}
                    onChange={e => setBroadcastForm({ ...broadcastForm, target_college_id: e.target.value })}
                  >
                    <option value="">All Colleges (System Broadcast)</option>
                    {colleges.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label text-dark fw-bold small">Notification Priority Level</label>
                  <select
                    className="form-select bg-white border-secondary border-opacity-50 text-dark fw-semibold"
                    value={broadcastForm.type}
                    onChange={e => setBroadcastForm({ ...broadcastForm, type: e.target.value })}
                  >
                    <option value="INFO">Information (Blue)</option>
                    <option value="SUCCESS">Success (Green)</option>
                    <option value="WARNING">Warning (Yellow)</option>
                    <option value="DEADLINE">Deadline Alert (Dark Red)</option>
                    <option value="URGENT">Urgent Action Required (Red)</option>
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label text-dark fw-bold small">Notification Title</label>
                  <input
                    type="text"
                    className="form-control bg-white border-secondary border-opacity-50 text-dark fw-bold"
                    placeholder="Enter short, descriptive title (e.g. Submission Deadline Reminder)..."
                    value={broadcastForm.title}
                    onChange={e => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="col-12">
                  <label className="form-label text-dark fw-bold small">Announcement Message</label>
                  <textarea
                    className="form-control bg-white border-secondary border-opacity-50 text-dark fw-semibold"
                    rows="4"
                    placeholder="Enter complete notification details to display in college header bell hubs..."
                    value={broadcastForm.message}
                    onChange={e => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                    required
                  ></textarea>
                </div>
              </div>

              <div className="d-flex justify-content-end">
                <button type="submit" className="btn btn-danger fw-bold d-flex align-items-center gap-2 px-4 py-2 shadow-sm">
                  <Send size={18} />
                  <span>Send Broadcast Notification</span>
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* Review Modal */}
      {selectedSubmission && (
        <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content glass-panel bg-white text-dark border-danger border-opacity-25 shadow-lg">
              <div className="modal-header border-slate-200">
                <h5 className="modal-title font-outfit fw-bold text-dark">
                  Admin Review: {selectedSubmission.file_name || selectedSubmission.name}
                </h5>
                <button type="button" className="btn-close" onClick={() => setSelectedSubmission(null)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-4 p-3 bg-light rounded-3 border border-slate-200">
                  <small className="text-secondary fw-bold uppercase d-block mb-2 ms-1">Submission Live Pipeline Stage</small>
                  <SubmissionStepper status={selectedSubmission.admin_status || selectedSubmission.status} />
                </div>
                <p className="small text-secondary fw-semibold">
                  Assign manual status and enter review remarks for <strong>{selectedSubmission.college_name || selectedSubmission.name}</strong>.
                </p>
                <div className="mb-3">
                  <label className="form-label text-dark fw-bold small mb-1">Admin Remarks / Reason</label>
                  <textarea 
                    className="form-control bg-white border-secondary border-opacity-50 text-dark fw-semibold" 
                    rows="3"
                    value={adminRemarks}
                    onChange={e => setAdminRemarks(e.target.value)}
                    placeholder="Enter detailed remarks or requested corrections for the college..."
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer border-slate-200 d-flex flex-wrap justify-content-between gap-2">
                <button type="button" className="btn text-white fw-bold" style={{ background: '#7e22ce' }} onClick={() => handleAdminReview(selectedSubmission.id || selectedSubmission.last_upload_id, 'In Process')}>
                  Mark In Process
                </button>
                <button type="button" className="btn btn-warning text-dark fw-bold" onClick={() => handleAdminReview(selectedSubmission.id || selectedSubmission.last_upload_id, 'Correction Requested')}>
                  Request Correction
                </button>
                <button type="button" className="btn btn-danger fw-bold" onClick={() => handleAdminReview(selectedSubmission.id || selectedSubmission.last_upload_id, 'Rejected')}>
                  Reject Submission
                </button>
                <button type="button" className="btn btn-success fw-bold" onClick={() => handleAdminReview(selectedSubmission.id || selectedSubmission.last_upload_id, 'Approved')}>
                  Approve Submission
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPassData.collegeId && (
        <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content glass-panel bg-white text-dark border-danger border-opacity-25 shadow-lg">
              <div className="modal-header border-slate-200">
                <h5 className="modal-title font-outfit fw-bold text-dark">Reset College User Password</h5>
                <button type="button" className="btn-close" onClick={() => setResetPassData({ collegeId: null, newPassword: "" })}></button>
              </div>
              <form onSubmit={handleResetPassword}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small mb-1">New Password</label>
                    <input 
                      type="password" 
                      className="form-control bg-white border-secondary border-opacity-50 text-dark fw-semibold" 
                      value={resetPassData.newPassword}
                      onChange={e => setResetPassData({...resetPassData, newPassword: e.target.value})}
                      required 
                    />
                  </div>
                </div>
                <div className="modal-footer border-slate-200">
                  <button type="button" className="btn btn-secondary fw-bold" onClick={() => setResetPassData({ collegeId: null, newPassword: "" })}>Cancel</button>
                  <button type="submit" className="btn btn-gradient-primary fw-bold">Save New Password</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Student Data Preview Modal */}
      {previewModalData && (
        <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content glass-panel bg-white text-dark border-danger border-opacity-25 shadow-lg">
              <div className="modal-header border-slate-200 d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="modal-title font-outfit fw-bold text-dark mb-0">
                    In-Browser Student Data Preview: {previewModalData.upload.file_name}
                  </h5>
                  <small className="text-secondary fw-semibold">
                    College: {previewModalData.upload.college_name} | Session: {previewModalData.upload.year_label} | Total: {previewModalData.students ? previewModalData.students.length : 0} Students
                  </small>
                </div>
                <button type="button" className="btn-close" onClick={() => setPreviewModalData(null)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <input 
                    type="text" 
                    className="form-control form-control-sm w-50 border-secondary border-opacity-50"
                    placeholder="Search by Roll Number, Student Name, or Branch..."
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                  />
                  <span className="badge bg-danger px-3 py-2 fw-bold font-outfit">
                    {previewModalData.students ? previewModalData.students.length : 0} Verified Students
                  </span>
                </div>

                <div className="table-responsive" style={{ maxHeight: '420px' }}>
                  <table className="table table-custom table-hover align-middle mb-0">
                    <thead className="table-light sticky-top">
                      <tr>
                        <th>Roll #</th>
                        <th>Student Name</th>
                        <th>Branch</th>
                        <th>Sem</th>
                        <th>Year</th>
                        <th>Gender</th>
                        <th>Email</th>
                        <th>Mobile</th>
                        <th>CGPA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!previewModalData.students || previewModalData.students.length === 0 ? (
                        <tr><td colSpan="9" className="text-center py-4 text-secondary fw-semibold">No student records found in this upload.</td></tr>
                      ) : (
                        previewModalData.students
                          .filter(s => {
                            if (!studentSearch) return true;
                            const q = studentSearch.toLowerCase();
                            return (s.roll_number || "").toLowerCase().includes(q) ||
                                   (s.student_name || "").toLowerCase().includes(q) ||
                                   (s.branch || "").toLowerCase().includes(q);
                          })
                          .map((s, idx) => (
                            <tr key={idx}>
                              <td className="fw-bold text-danger">{s.roll_number}</td>
                              <td className="fw-bold text-dark">{s.student_name}</td>
                              <td className="fw-semibold text-secondary">{s.branch}</td>
                              <td className="fw-bold">{s.semester}</td>
                              <td className="fw-bold">{s.year}</td>
                              <td><small className="fw-medium text-uppercase">{s.gender || 'N/A'}</small></td>
                              <td className="small text-secondary">{s.email || 'N/A'}</td>
                              <td className="small text-dark font-monospace">{s.mobile_number || 'N/A'}</td>
                              <td className="fw-bold text-success">{s.cgpa !== null ? s.cgpa : 'N/A'}</td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer border-slate-200">
                <button type="button" className="btn btn-secondary fw-bold" onClick={() => setPreviewModalData(null)}>Close Preview</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Root-Level Modal for Scheduling & Managing College Training */}
      {selectedTrainingCollege && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content glass-panel border-danger border-opacity-25 shadow-lg bg-white">
              <div className="modal-header border-bottom border-slate-200 px-4 py-3">
                <h5 className="modal-title fw-bold text-dark font-outfit">Manage Training & Onboarding: {selectedTrainingCollege.name}</h5>
                <button onClick={() => setSelectedTrainingCollege(null)} className="btn-close"></button>
              </div>
              <form onSubmit={handleUpdateTraining}>
                <div className="modal-body p-4 bg-white">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">Faculty Training Status</label>
                      <select
                        className="form-select bg-white text-dark border-secondary border-opacity-50 fw-semibold"
                        value={trainingForm.faculty_training_status}
                        onChange={e => setTrainingForm({ ...trainingForm, faculty_training_status: e.target.value })}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Done">Done (Completed)</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">Faculty Training Date</label>
                      <input
                        type="date"
                        className="form-control bg-white text-dark border-secondary border-opacity-50 fw-semibold"
                        value={trainingForm.faculty_training_date}
                        onChange={e => setTrainingForm({ ...trainingForm, faculty_training_date: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">Dashboard Training Status</label>
                      <select
                        className="form-select bg-white text-dark border-secondary border-opacity-50 fw-semibold"
                        value={trainingForm.dashboard_training_status}
                        onChange={e => setTrainingForm({ ...trainingForm, dashboard_training_status: e.target.value })}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Done">Done (Completed)</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">Dashboard Training Date</label>
                      <input
                        type="date"
                        className="form-control bg-white text-dark border-secondary border-opacity-50 fw-semibold"
                        value={trainingForm.dashboard_training_date}
                        onChange={e => setTrainingForm({ ...trainingForm, dashboard_training_date: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">Admin Training Status</label>
                      <select
                        className="form-select bg-white text-dark border-secondary border-opacity-50 fw-semibold"
                        value={trainingForm.admin_training_status}
                        onChange={e => setTrainingForm({ ...trainingForm, admin_training_status: e.target.value })}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Done">Done (Completed)</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">Admin Training Date</label>
                      <input
                        type="date"
                        className="form-control bg-white text-dark border-secondary border-opacity-50 fw-semibold"
                        value={trainingForm.admin_training_date}
                        onChange={e => setTrainingForm({ ...trainingForm, admin_training_date: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label text-dark fw-bold small">Trainer / Support Assigned</label>
                      <input
                        type="text"
                        className="form-control bg-white text-dark border-secondary border-opacity-50 fw-semibold"
                        placeholder="e.g. TeachUs Support Team"
                        value={trainingForm.trainer_name}
                        onChange={e => setTrainingForm({ ...trainingForm, trainer_name: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label text-dark fw-bold small">Training Session Notes</label>
                      <textarea
                        rows="3"
                        className="form-control bg-white text-dark border-secondary border-opacity-50 fw-semibold"
                        placeholder="Notes on session completion, attendance, or feedback..."
                        value={trainingForm.training_notes}
                        onChange={e => setTrainingForm({ ...trainingForm, training_notes: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top border-slate-200 px-4 py-3 bg-light">
                  <button type="button" onClick={() => setSelectedTrainingCollege(null)} className="btn btn-secondary btn-sm fw-bold">Cancel</button>
                  <button type="submit" className="btn btn-gradient-primary btn-sm fw-bold shadow">Save Training Record</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
