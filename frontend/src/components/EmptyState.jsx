import React from "react";
import { SearchX, FileQuestion, RefreshCw } from "lucide-react";

const EmptyState = ({
  title = "No Matching Records Found",
  subtitle = "We couldn't find any data matching your search or filters.",
  onResetSearch,
  actionLabel = "Clear Search Filter"
}) => {
  return (
    <div className="text-center py-5 px-3 tab-fade-in">
      <div className="d-inline-flex p-3 rounded-circle bg-danger bg-opacity-10 text-danger mb-3 shadow-sm">
        <SearchX size={44} />
      </div>
      <h5 className="fw-bold text-dark font-outfit mb-1">{title}</h5>
      <p className="text-secondary small mb-3" style={{ maxWidth: "450px", margin: "0 auto" }}>
        {subtitle}
      </p>
      {onResetSearch && (
        <button
          onClick={onResetSearch}
          className="btn btn-outline-danger btn-sm fw-bold d-inline-flex align-items-center gap-1 rounded-3 px-3 py-2 shadow-sm"
        >
          <RefreshCw size={14} />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};

export default EmptyState;
