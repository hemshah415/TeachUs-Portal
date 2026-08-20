import React from "react";
import { Check, Clock, AlertCircle } from "lucide-react";

const SubmissionStepper = ({ status = "Under Review" }) => {
  const steps = [
    { key: "uploaded", label: "Uploaded" },
    { key: "verified", label: "Header Verified" },
    { key: "validated", label: "Auto-Validated" },
    { key: "review", label: "Admin Review" },
    { key: "approved", label: "Final Approved" }
  ];

  const getActiveStepIndex = (st) => {
    const norm = (st || "").toLowerCase();
    if (norm === "approved") return 4;
    if (norm === "rejected") return 3;
    if (norm === "correction requested") return 3;
    if (norm === "in process" || norm === "under review") return 3;
    if (norm === "passed") return 2;
    return 1;
  };

  const activeIndex = getActiveStepIndex(status);

  return (
    <div className="py-2">
      <div className="d-flex align-items-center justify-content-between position-relative">
        {steps.map((step, idx) => {
          const isCompleted = idx < activeIndex;
          const isActive = idx === activeIndex;
          const isRejected = status === "Rejected" && idx === activeIndex;

          return (
            <React.Fragment key={step.key}>
              <div className="d-flex flex-column align-items-center position-relative" style={{ zIndex: 2 }}>
                <div
                  className={`stepper-node ${
                    isRejected
                      ? "bg-danger text-white"
                      : isCompleted
                      ? "completed"
                      : isActive
                      ? "active"
                      : "pending"
                  }`}
                >
                  {isCompleted ? <Check size={16} /> : isRejected ? <AlertCircle size={16} /> : idx + 1}
                </div>
                <small
                  className={`mt-1 fw-bold text-center ${
                    isActive ? "text-danger" : isCompleted ? "text-success" : "text-secondary"
                  }`}
                  style={{ fontSize: "0.72rem", maxWidth: "80px" }}
                >
                  {step.label}
                </small>
              </div>

              {idx < steps.length - 1 && (
                <div
                  className={`stepper-line ${idx < activeIndex ? "active" : ""}`}
                  style={{ marginTop: "-20px" }}
                ></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default SubmissionStepper;
