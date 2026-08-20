import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import AnimatedCounter from "../components/AnimatedCounter";
import TableSearchBar from "../components/TableSearchBar";
import SubmissionStepper from "../components/SubmissionStepper";
import DataHealthGauge from "../components/DataHealthGauge";
import EmptyState from "../components/EmptyState";
import ExportHub from "../components/ExportHub";
import { 
  FileSpreadsheet, UploadCloud, Download, CheckCircle, AlertTriangle, 
  XCircle, Clock, FileCheck, RefreshCw, Trash2, Eye, FileText, CheckCircle2, GraduationCap, Award
} from "lucide-react";

const CollegeDashboard = () => {
  const { user } = useContext(AuthContext);
  const { addToast } = useToast();
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [uploads, setUploads] = useState([]);
  
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "" });
  
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [uploadDetails, setUploadDetails] = useState(null);

  const [previewModalData, setPreviewModalData] = useState(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [uploadHistorySearch, setUploadHistorySearch] = useState("");

  const fetchStudentPreview = async (uploadId) => {
    try {
      const res = await api.get(`/uploads/${uploadId}`);
      setPreviewModalData(res.data);
      setStudentSearch("");
    } catch (err) {
      if (addToast) addToast("Failed to load student preview data", "error");
    }
  };

  const [collegeDetails, setCollegeDetails] = useState(null);

  const fetchMyCollegeStatus = async () => {
    try {
      const res = await api.get("/colleges/my-status");
      setCollegeDetails(res.data);
    } catch (err) {
      console.error("Failed to fetch college status", err);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
    fetchActiveTemplate();
    fetchMyCollegeStatus();
  }, []);

  useEffect(() => {
    fetchUploads();
    const interval = setInterval(() => {
      fetchUploads();
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedYear]);

  const fetchAcademicYears = async () => {
    try {
      const res = await api.get("/academic-years");
      setAcademicYears(res.data);
    } catch (err) {
      console.error("Failed to load academic years", err);
    }
  };

  const fetchActiveTemplate = async () => {
    try {
      const res = await api.get("/templates/active");
      setActiveTemplate(res.data);
    } catch (err) {
      console.error("Failed to fetch template", err);
    }
  };

  const fetchUploads = async () => {
    try {
      const res = await api.get("/uploads", {
        params: selectedYear ? { academic_year_id: selectedYear } : {}
      });
      setUploads(res.data);
    } catch (err) {
      console.error("Failed to load uploads", err);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      setMsg({ text: "Please select one or more Excel files to upload", type: "danger" });
      return;
    }

    setUploading(true);
    setMsg({ text: "", type: "" });
    setValidationResult(null);

    const formData = new FormData();
    files.forEach(f => {
      formData.append("files", f);
    });
    const uploadYear = selectedYear || (academicYears.length > 0 ? academicYears[0].id : 1);
    formData.append("academic_year_id", uploadYear);

    try {
      const res = await api.post("/uploads", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setUploading(false);
      setFiles([]);
      if (res.data.uploads && res.data.uploads.length > 0) {
        setValidationResult(res.data.uploads[0]);
      }
      fetchUploads();

      const count = res.data.total_files || (res.data.uploads ? res.data.uploads.length : 1);
      const successMsg = `Successfully processed and validated ${count} file(s). View validation details below.`;
      setMsg({ text: successMsg, type: "success" });
      if (addToast) addToast(successMsg, "success");
    } catch (err) {
      setUploading(false);
      const errMsg = err.response?.data?.error || "File upload failed";
      setMsg({ text: errMsg, type: "danger" });
      if (addToast) addToast(errMsg, "error");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get("/templates/download", { responseType: "blob" });
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Official_Academic_Data_Template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      if (addToast) addToast("Official Academic Data Template downloaded (.xlsx)", "info");
    } catch (err) {
      if (addToast) addToast("Failed to download template", "error");
    }
  };

  const handleDownloadErrorReport = (uploadId) => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
    window.open(`${apiBase}/uploads/error-report/${uploadId}`, "_blank");
  };

  const viewUploadDetailsModal = async (uploadId) => {
    try {
      const res = await api.get(`/uploads/${uploadId}`);
      setUploadDetails(res.data);
      setSelectedUpload(uploadId);
    } catch (err) {
      console.error("Error loading upload details", err);
    }
  };

  const handleDeleteUpload = async (uploadId) => {
    if (!window.confirm(`Are you sure you want to delete submission #${uploadId}?`)) return;

    try {
      await api.delete(`/uploads/${uploadId}`);
      const delMsg = `Submission #${uploadId} deleted successfully.`;
      setMsg({ text: delMsg, type: "success" });
      if (addToast) addToast(delMsg, "info");
      fetchUploads();
      if (validationResult && validationResult.upload_id === uploadId) {
        setValidationResult(null);
      }
    } catch (err) {
      console.error("Error deleting upload", err);
      setMsg({ text: err.response?.data?.error || "Failed to delete submission", type: "danger" });
    }
  };

  return (
    <div className="min-vh-100 pb-5" style={{ background: '#f8fafc' }}>
      <Navbar />

      <div className="container-fluid px-4 pt-4">
        
        {/* Banner Section */}
        <div className="glass-panel p-4 mb-4 bg-white border border-danger border-opacity-25 shadow-sm">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <span className="badge bg-danger mb-2 px-3 py-2 fw-bold" style={{ fontSize: '0.8rem' }}>College User Portal</span>
              <h3 className="fw-extrabold text-dark font-outfit mb-1">{user?.college_name || 'Academic Institution'}</h3>
              <p className="text-secondary mb-0 fw-medium">Download the official template, upload completed academic data Excel, and view instant automatic validation feedback.</p>
            </div>

            <div className="d-flex align-items-center gap-3">
              <div>
                <label className="text-dark small fw-bold text-uppercase d-block mb-1">Academic Session</label>
                <select 
                  className="form-select bg-white text-dark border-secondary rounded-3 px-3 py-2 fw-semibold"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  <option value="">All Academic Sessions (All Files)</option>
                  {academicYears.map(ay => (
                    <option key={ay.id} value={ay.id}>AY {ay.year_label} {ay.is_open ? '(Submission Open)' : '(Closed)'}</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={handleDownloadTemplate}
                className="btn btn-danger rounded-3 d-flex align-items-center gap-2 py-2 px-3 mt-4 fw-bold shadow-sm"
              >
                <Download size={18} />
                <span>Download Official Template</span>
              </button>
            </div>
          </div>
        </div>

        {/* College Training & Onboarding Compliance Status Banner */}
        <div className="glass-panel p-3 mb-4 bg-white border border-danger border-opacity-25 shadow-sm">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div className="d-flex align-items-center gap-3">
              <div className="bg-danger bg-opacity-10 p-2 rounded-circle text-danger">
                <GraduationCap size={24} />
              </div>
              <div>
                <h6 className="fw-bold mb-1 font-outfit text-dark">
                  Institutional Training & Onboarding Compliance Status
                </h6>
                <p className="mb-0 small text-secondary">
                  <strong>Assigned Trainer:</strong> {(collegeDetails || user)?.trainer_name || 'TeachUs Support Team'}
                  {(collegeDetails || user)?.training_notes && <span className="ms-2">| <strong>Session Notes:</strong> {(collegeDetails || user)?.training_notes}</span>}
                </p>
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <span className={`badge ${(collegeDetails || user)?.faculty_training_status === 'Done' || (collegeDetails || user)?.faculty_training_status === 'Completed' ? 'bg-success text-white' : (collegeDetails || user)?.faculty_training_status === 'In Progress' ? 'bg-info text-dark' : (collegeDetails || user)?.faculty_training_status === 'Scheduled' ? 'bg-warning text-dark' : 'bg-secondary text-white'} px-3 py-2 fw-bold`}>
                Faculty Training: {(collegeDetails || user)?.faculty_training_status || 'Pending'}
                {(collegeDetails || user)?.faculty_training_date && ` (${new Date((collegeDetails || user).faculty_training_date).toLocaleDateString()})`}
              </span>
              <span className={`badge ${(collegeDetails || user)?.dashboard_training_status === 'Done' || (collegeDetails || user)?.dashboard_training_status === 'Completed' ? 'bg-success text-white' : (collegeDetails || user)?.dashboard_training_status === 'In Progress' ? 'bg-info text-dark' : (collegeDetails || user)?.dashboard_training_status === 'Scheduled' ? 'bg-warning text-dark' : 'bg-secondary text-white'} px-3 py-2 fw-bold`}>
                Dashboard Training: {(collegeDetails || user)?.dashboard_training_status || 'Pending'}
                {(collegeDetails || user)?.dashboard_training_date && ` (${new Date((collegeDetails || user).dashboard_training_date).toLocaleDateString()})`}
              </span>
              <span className={`badge ${(collegeDetails || user)?.admin_training_status === 'Done' || (collegeDetails || user)?.admin_training_status === 'Completed' ? 'bg-success text-white' : (collegeDetails || user)?.admin_training_status === 'In Progress' ? 'bg-info text-dark' : (collegeDetails || user)?.admin_training_status === 'Scheduled' ? 'bg-warning text-dark' : 'bg-secondary text-white'} px-3 py-2 fw-bold`}>
                Admin Training: {(collegeDetails || user)?.admin_training_status || 'Pending'}
                {(collegeDetails || user)?.admin_training_date && ` (${new Date((collegeDetails || user).admin_training_date).toLocaleDateString()})`}
              </span>
            </div>
          </div>
        </div>

        {uploads.length > 0 && (
          <div className="glass-panel p-4 bg-white border border-slate-200 shadow-sm mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="fw-bold text-dark font-outfit mb-0">Latest Submission Live Stepper</h6>
                <small className="text-secondary">Track real-time verification and admin approval stages.</small>
              </div>
              <span className="badge bg-danger text-white fw-bold px-3 py-1 font-monospace">
                File: {uploads[0].file_name}
              </span>
            </div>
            <SubmissionStepper status={uploads[0].admin_status || uploads[0].status} />
          </div>
        )}

        {uploads.length > 0 && (uploads[0].admin_remarks || uploads[0].admin_status === 'Correction Requested' || uploads[0].admin_status === 'Rejected' || uploads[0].admin_status === 'In Process') && (
          <div className={`alert ${
            uploads[0].admin_status === 'Correction Requested' ? 'alert-warning border-warning' :
            uploads[0].admin_status === 'Rejected' ? 'alert-danger border-danger' :
            uploads[0].admin_status === 'Approved' ? 'alert-success border-success' : 'alert-info border-info'
          } p-3 mb-4 shadow-sm border-2 rounded-3`}>
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <AlertTriangle size={24} className={uploads[0].admin_status === 'Rejected' ? 'text-danger' : 'text-warning'} />
                <div>
                  <h6 className="fw-bold mb-1">
                    Admin Status Update: <span className="badge bg-dark ms-1">{uploads[0].admin_status}</span>
                  </h6>
                  <p className="mb-0 small fw-semibold">
                    <strong>Admin Remarks:</strong> {uploads[0].admin_remarks || 'Admin has reviewed your file submission.'}
                  </p>
                </div>
              </div>
              {uploads[0].admin_status === 'Correction Requested' && (
                <span className="badge bg-warning text-dark fw-bold px-3 py-2">Action Required: Upload Corrected File</span>
              )}
            </div>
          </div>
        )}

        {msg.text && (
          <div className={`alert alert-${msg.type} alert-dismissible fade show d-flex align-items-center gap-2 mb-4 fw-semibold shadow-sm`} role="alert">
            <div>{msg.text}</div>
            <button type="button" className="btn-close" onClick={() => setMsg({ text: "", type: "" })}></button>
          </div>
        )}

        <div className="row g-4">
          
          {/* File Upload Dropzone Card */}
          <div className="col-lg-5">
            <div className="glass-panel p-4 h-100 bg-white border border-slate-200 shadow-sm">
              <div className="d-flex align-items-center gap-2 mb-3">
                <UploadCloud className="text-danger" size={26} />
                <h5 className="fw-bold text-dark mb-0 font-outfit">Step 2: Upload Completed Excel</h5>
              </div>
              <p className="text-secondary small mb-4 fw-medium">
                Upload your college's completed Excel file (.xlsx). The validation engine instantly verifies headers, student roll numbers, email formats, and mobile numbers.
              </p>

              <form onSubmit={handleUploadSubmit}>
                <div className={`dropzone mb-3 ${files.length > 0 ? 'pulse-dropzone-active' : ''}`} onClick={() => document.getElementById("excelInput").click()}>
                  <FileSpreadsheet size={48} className="text-danger mb-2" />
                  {files.length > 0 ? (
                    <div>
                      <h6 className="fw-bold text-success mb-1">{files.length} File(s) Selected</h6>
                      <small className="text-secondary fw-semibold d-block text-truncate" style={{ maxWidth: '300px' }}>
                        {files.map(f => f.name).join(", ")}
                      </small>
                    </div>
                  ) : (
                    <div>
                      <h6 className="fw-bold text-dark mb-1">Click to select or Drag & Drop Excel File</h6>
                      <small className="text-secondary fw-medium">Supports single or multi-program `.xlsx` files</small>
                    </div>
                  )}
                  <input
                    id="excelInput"
                    type="file"
                    accept=".xlsx"
                    multiple
                    className="d-none"
                    onChange={handleFileChange}
                  />
                </div>

                {files.length > 0 && (
                  <div className="p-3 bg-light rounded-3 border border-slate-200 mb-3 d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-2">
                      <FileText size={20} className="text-danger" />
                      <div>
                        <span className="fw-bold text-dark d-block small">{files[0].name}</span>
                        <small className="text-secondary">{(files[0].size / 1024).toFixed(1)} KB - Ready for validation</small>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFiles([]); }}
                      className="btn btn-outline-danger btn-sm rounded-circle p-1"
                      title="Clear Selection"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={uploading || files.length === 0}
                  className="btn btn-gradient-primary w-100 py-3 d-flex align-items-center justify-content-center gap-2 shadow"
                >
                  {uploading ? (
                    <>
                      <span className="spinner-border spinner-border-sm"></span>
                      <span>Validating Excel Data...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck size={18} />
                      <span className="fw-bold">Upload & Execute Auto-Validation</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Live Validation Result */}
          <div className="col-lg-7">
            <div className="glass-panel p-4 h-100 bg-white border border-slate-200 shadow-sm">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center gap-2">
                  <CheckCircle className="text-danger" size={26} />
                  <h5 className="fw-bold text-dark mb-0 font-outfit">Validation Engine Results</h5>
                </div>
                {validationResult && (
                  <span className={`badge-status ${validationResult.validation_status === 'Passed' ? 'badge-passed' : 'badge-failed'}`}>
                    Status: {validationResult.validation_status}
                  </span>
                )}
              </div>

              {validationResult ? (
                <div>
                  <div className="row g-3 mb-4">
                    <div className="col-4">
                      <div className="glass-card text-center p-3 bg-light border border-slate-200">
                        <small className="text-secondary d-block uppercase fw-bold mb-1">Total Verified</small>
                        <h4 className="fw-extrabold text-dark mb-0">{validationResult.student_count + validationResult.error_count}</h4>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="glass-card text-center p-3 bg-light border border-slate-200">
                        <small className="text-secondary d-block uppercase fw-bold mb-1">Valid Records</small>
                        <h4 className="fw-extrabold text-success mb-0">{validationResult.student_count}</h4>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="glass-card text-center p-3 bg-light border border-slate-200">
                        <small className="text-secondary d-block uppercase fw-bold mb-1">Error Count</small>
                        <h4 className={`fw-extrabold mb-0 ${validationResult.error_count > 0 ? 'text-danger' : 'text-secondary'}`}>
                          {validationResult.error_count}
                        </h4>
                      </div>
                    </div>
                  </div>

                  {validationResult.error_count > 0 && (
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="fw-bold text-danger mb-0">Validation Error Details</h6>
                        <button 
                          onClick={() => handleDownloadErrorReport(validationResult.upload_id)}
                          className="btn btn-danger btn-sm rounded-pill d-flex align-items-center gap-1 fw-bold shadow-sm"
                        >
                          <Download size={14} />
                          <span>Download Excel Error Report</span>
                        </button>
                      </div>

                      <div className="table-responsive rounded-3 border border-slate-200" style={{ maxHeight: '250px' }}>
                        <table className="table table-custom mb-0">
                          <thead>
                            <tr>
                              <th>Row #</th>
                              <th>Column</th>
                              <th>Error Description</th>
                              <th>Severity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {validationResult.errors.map((err, idx) => (
                              <tr key={idx}>
                                <td className="fw-bold text-danger">{err.row || 'N/A'}</td>
                                <td className="fw-bold text-dark">{err.column}</td>
                                <td className="text-dark small fw-medium">{err.error}</td>
                                <td><span className="badge bg-danger">{err.severity || 'ERROR'}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-5">
                  <Clock size={48} className="text-muted mb-3 opacity-50" />
                  <h6 className="text-secondary fw-semibold">No recent validation result active in memory.</h6>
                  <small className="text-secondary">Select an Excel file from the left panel and click 'Upload & Execute Auto-Validation'.</small>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Upload History Table */}
        <div className="glass-panel p-4 mt-4 bg-white border border-slate-200 shadow-sm">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold text-dark mb-0 font-outfit">Submission History & Admin Status Tracker</h5>
            <button onClick={fetchUploads} className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 fw-semibold">
              <RefreshCw size={14} />
              <span>Refresh History</span>
            </button>
          </div>

          <TableSearchBar
            searchTerm={uploadHistorySearch}
            setSearchTerm={setUploadHistorySearch}
            placeholder="Search submission file, status..."
            count={
              uploads.filter(up => 
                (up.file_name || "").toLowerCase().includes(uploadHistorySearch.toLowerCase()) ||
                (up.admin_status || up.status || "").toLowerCase().includes(uploadHistorySearch.toLowerCase())
              ).length
            }
          />

          <div className="table-responsive">
            <table className="table table-custom">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>File Name</th>
                  <th>Uploaded At</th>
                  <th>Validation Status</th>
                  <th>Admin Review Status</th>
                  <th>Admin Remarks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {uploads.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-secondary fw-semibold">
                      No Excel file submissions found for this academic session.
                    </td>
                  </tr>
                ) : (
                  uploads
                    .filter(up => 
                      (up.file_name || "").toLowerCase().includes(uploadHistorySearch.toLowerCase()) ||
                      (up.admin_status || up.status || "").toLowerCase().includes(uploadHistorySearch.toLowerCase())
                    )
                    .map((up, idx) => (
                    <tr key={up.id || up.upload_id || idx}>
                      <td className="fw-bold text-danger">#{up.id}</td>
                      <td className="fw-bold text-dark">{up.file_name}</td>
                      <td className="text-secondary small fw-medium">
                        {up.uploaded_at || up.upload_date ? new Date(up.uploaded_at || up.upload_date).toLocaleString() : 'N/A'}
                      </td>
                      <td className="fw-bold text-dark">{up.student_count || 0}</td>
                      <td>
                        <span className={`badge-status ${up.validation_status === 'Passed' ? 'badge-passed' : 'badge-failed'}`}>
                          {up.validation_status || 'Passed'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge-status ${
                          (up.admin_status || up.status) === 'Approved' ? 'badge-approved' : 
                          (up.admin_status || up.status) === 'Rejected' ? 'badge-rejected' :
                          (up.admin_status || up.status) === 'In Process' ? 'badge-in-process' :
                          (up.admin_status || up.status) === 'Partial Data' ? 'badge-correction' :
                          (up.admin_status || up.status) === 'Correction Requested' ? 'badge-correction' : 'badge-pending'
                        }`}>
                          {up.admin_status || up.status || 'Under Review'}
                        </span>
                      </td>
                      <td className="small text-dark fw-semibold" style={{ maxWidth: '220px' }}>
                        {up.admin_remarks ? (
                          <span className="bg-light p-1 px-2 rounded border border-secondary border-opacity-25 d-block text-truncate" title={up.admin_remarks}>
                            {up.admin_remarks}
                          </span>
                        ) : (
                          <span className="text-secondary opacity-50">No remarks</span>
                        )}
                      </td>
                      <td>
                        {up.error_count > 0 ? (
                          <button 
                            onClick={() => handleDownloadErrorReport(up.id || up.upload_id)}
                            className="btn btn-outline-danger btn-sm rounded-pill d-flex align-items-center gap-1 fw-bold"
                            style={{ fontSize: '0.75rem' }}
                          >
                            <Download size={12} />
                            <span>{up.error_count} Errors Report</span>
                          </button>
                        ) : (
                          <span className="text-success small fw-bold">Clean (0 Errors)</span>
                        )}
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <button 
                            onClick={() => fetchStudentPreview(up.id || up.upload_id)}
                            className="btn btn-outline-danger btn-sm rounded-3 fw-bold d-flex align-items-center gap-1"
                            style={{ fontSize: '0.75rem' }}
                            title="Preview uploaded student data"
                          >
                            <Eye size={12} />
                            <span>Preview Data</span>
                          </button>
                          <button 
                            onClick={() => viewUploadDetailsModal(up.id || up.upload_id)}
                            className="btn btn-outline-dark btn-sm rounded-3 fw-bold"
                            style={{ fontSize: '0.75rem' }}
                          >
                            View Details
                          </button>
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

      {/* Details Modal */}
      {selectedUpload && uploadDetails && (
        <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content glass-panel bg-white text-dark border-danger border-opacity-25 shadow-lg">
              <div className="modal-header border-slate-200">
                <h5 className="modal-title font-outfit fw-bold text-dark">Submission Details #{uploadDetails.upload.id}</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedUpload(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <span className="text-secondary small d-block fw-bold">File Name</span>
                    <strong className="text-dark">{uploadDetails.upload.file_name}</strong>
                  </div>
                  <div className="col-md-6">
                    <span className="text-secondary small d-block fw-bold">Academic Session</span>
                    <strong className="text-dark">{uploadDetails.upload.year_label}</strong>
                  </div>
                  <div className="col-md-6">
                    <span className="text-secondary small d-block fw-bold">System Validation</span>
                    <span className={`badge-status ${uploadDetails.upload.validation_status === 'Passed' ? 'badge-passed' : 'badge-failed'}`}>
                      {uploadDetails.upload.validation_status}
                    </span>
                  </div>
                  <div className="col-md-6">
                    <span className="text-secondary small d-block fw-bold">Admin Status</span>
                    <span className="badge bg-danger text-white">{uploadDetails.upload.admin_status}</span>
                  </div>
                  {uploadDetails.upload.admin_remarks && (
                    <div className="col-12">
                      <div className="alert alert-warning py-2 mb-0 fw-medium">
                        <strong>Admin Remarks:</strong> {uploadDetails.upload.admin_remarks}
                      </div>
                    </div>
                  )}
                </div>

                <h6 className="fw-bold mt-4 mb-2 text-danger">Validation Errors ({uploadDetails.errors.length})</h6>
                <div className="table-responsive" style={{ maxHeight: '200px' }}>
                  <table className="table table-custom mb-0">
                    <thead>
                      <tr>
                        <th>Row #</th>
                        <th>Column</th>
                        <th>Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadDetails.errors.length === 0 ? (
                        <tr><td colSpan="3" className="text-center text-secondary fw-semibold">No validation errors detected</td></tr>
                      ) : (
                        uploadDetails.errors.map(e => (
                          <tr key={e.id}>
                            <td className="fw-bold text-danger">{e.row_number}</td>
                            <td className="text-dark fw-bold">{e.column_name}</td>
                            <td className="small text-dark fw-medium">{e.error_message}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer border-slate-200">
                <button type="button" className="btn btn-secondary rounded-3 fw-bold" onClick={() => setSelectedUpload(null)}>Close</button>
              </div>
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
                    Uploaded Student Data Preview: {previewModalData.upload.file_name}
                  </h5>
                  <small className="text-secondary fw-semibold">
                    Session: {previewModalData.upload.year_label} | Total Verified: {previewModalData.students ? previewModalData.students.length : 0} Students
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

    </div>
  );
};

export default CollegeDashboard;
