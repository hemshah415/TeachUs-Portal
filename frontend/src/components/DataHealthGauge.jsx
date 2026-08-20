import React from "react";
import AnimatedCounter from "./AnimatedCounter";

const DataHealthGauge = ({ score = 98.5, totalSubmissions = 0, validRecords = 0 }) => {
  const normalizedScore = Math.min(100, Math.max(0, score));
  const strokeDashoffset = 283 - (283 * normalizedScore) / 100;

  const getGrade = (s) => {
    if (s >= 95) return { label: "GRADE A+ EXCELLENT", color: "text-success", badge: "bg-success" };
    if (s >= 85) return { label: "GRADE A GOOD", color: "text-primary", badge: "bg-primary" };
    if (s >= 70) return { label: "GRADE B SATISFACTORY", color: "text-warning", badge: "bg-warning text-dark" };
    return { label: "ATTENTION REQUIRED", color: "text-danger", badge: "bg-danger" };
  };

  const grade = getGrade(normalizedScore);

  return (
    <div className="glass-panel p-3 bg-white border border-slate-200 shadow-sm d-flex align-items-center justify-content-between gap-3">
      <div className="d-flex align-items-center gap-3">
        {/* SVG Radial Progress Ring */}
        <div style={{ position: "relative", width: "72px", height: "72px" }}>
          <svg width="72" height="72" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="10"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={normalizedScore >= 85 ? "#16a34a" : normalizedScore >= 70 ? "#eab308" : "#dc2626"}
              strokeWidth="10"
              strokeDasharray="283"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "0.95rem"
            }}
            className="text-dark"
          >
            {normalizedScore}%
          </div>
        </div>

        <div>
          <small className="text-secondary uppercase fw-bold d-block" style={{ fontSize: "0.75rem" }}>
            Institutional Data Quality Gauge
          </small>
          <h6 className="fw-extrabold text-dark mb-1 font-outfit">
            System Data Health & Accuracy
          </h6>
          <span className={`badge ${grade.badge} fw-bold`}>{grade.label}</span>
        </div>
      </div>

      <div className="text-end d-none d-md-block">
        <small className="text-secondary d-block fw-semibold" style={{ fontSize: "0.75rem" }}>
          Active Submissions
        </small>
        <h5 className="fw-extrabold text-danger mb-0">
          <AnimatedCounter value={totalSubmissions} /> File(s)
        </h5>
      </div>
    </div>
  );
};

export default DataHealthGauge;
