import React from "react";
import { Building2, Edit, GraduationCap, BookOpen, ShieldCheck } from "lucide-react";

const CollegeMatrixCard = ({ college, onScheduleTraining }) => {
  const getBadgeClass = (st) => {
    if (st === "Done" || st === "Completed") return "bg-success text-white";
    if (st === "In Progress") return "bg-info text-dark";
    if (st === "Scheduled") return "bg-warning text-dark";
    return "bg-secondary text-white";
  };

  const getCompletionPercent = (col) => {
    let score = 0;
    if (col.status === "ACTIVE") score += 25;
    if (col.faculty_training_status === "Done" || col.faculty_training_status === "Completed") score += 25;
    else if (col.faculty_training_status === "In Progress" || col.faculty_training_status === "Scheduled") score += 12;
    if (col.dashboard_training_status === "Done" || col.dashboard_training_status === "Completed") score += 25;
    else if (col.dashboard_training_status === "In Progress" || col.dashboard_training_status === "Scheduled") score += 12;
    if (col.admin_training_status === "Done" || col.admin_training_status === "Completed") score += 25;
    else if (col.admin_training_status === "In Progress" || col.admin_training_status === "Scheduled") score += 12;
    return Math.min(100, score);
  };

  const percent = getCompletionPercent(college);

  return (
    <div className="glass-card p-3 bg-white border border-slate-200 shadow-sm rounded-3 h-100 d-flex flex-column justify-content-between transition-all hover-shadow-md">
      <div>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center gap-2">
            <div className="bg-danger bg-opacity-10 p-2 rounded-circle text-danger">
              <Building2 size={20} />
            </div>
            <div>
              <h6 className="fw-bold text-dark mb-0 font-outfit text-truncate" style={{ maxWidth: "180px" }}>
                {college.name}
              </h6>
              <small className="text-secondary font-monospace">({college.code})</small>
            </div>
          </div>
          <span className={`badge ${college.status === "ACTIVE" ? "bg-success" : "bg-danger"}`}>
            {college.status}
          </span>
        </div>

        {/* Readiness Progress Bar */}
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center small mb-1">
            <span className="text-secondary fw-semibold">Onboarding Readiness</span>
            <span className="fw-extrabold text-danger">{percent}%</span>
          </div>
          <div className="progress" style={{ height: "6px" }}>
            <div
              className={`progress-bar ${percent >= 90 ? "bg-success" : percent >= 50 ? "bg-warning" : "bg-danger"}`}
              role="progressbar"
              style={{ width: `${percent}%` }}
            ></div>
          </div>
        </div>

        {/* Matrix Badges */}
        <div className="d-flex flex-column gap-2 mb-3">
          <div className="p-2 bg-light rounded-3 d-flex align-items-center justify-content-between small">
            <span className="d-flex align-items-center gap-1 text-dark fw-semibold">
              <GraduationCap size={14} className="text-danger" /> Faculty Training
            </span>
            <span className={`badge ${getBadgeClass(college.faculty_training_status)}`}>
              {college.faculty_training_status || "Pending"}
            </span>
          </div>

          <div className="p-2 bg-light rounded-3 d-flex align-items-center justify-content-between small">
            <span className="d-flex align-items-center gap-1 text-dark fw-semibold">
              <BookOpen size={14} className="text-primary" /> Dashboard Training
            </span>
            <span className={`badge ${getBadgeClass(college.dashboard_training_status)}`}>
              {college.dashboard_training_status || "Pending"}
            </span>
          </div>

          <div className="p-2 bg-light rounded-3 d-flex align-items-center justify-content-between small">
            <span className="d-flex align-items-center gap-1 text-dark fw-semibold">
              <ShieldCheck size={14} className="text-success" /> Admin Training
            </span>
            <span className={`badge ${getBadgeClass(college.admin_training_status)}`}>
              {college.admin_training_status || "Pending"}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={() => onScheduleTraining(college)}
        className="btn btn-outline-danger btn-sm rounded-3 fw-bold w-100 d-flex align-items-center justify-content-center gap-1 py-2"
        style={{ fontSize: "0.78rem" }}
      >
        <Edit size={14} />
        <span>Manage Training & Notes</span>
      </button>
    </div>
  );
};

export default CollegeMatrixCard;
