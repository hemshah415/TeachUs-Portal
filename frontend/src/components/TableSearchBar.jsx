import React from "react";
import { Search, X } from "lucide-react";

const TableSearchBar = ({ searchTerm, setSearchTerm, placeholder = "Search records live...", count = 0 }) => {
  return (
    <div className="d-flex align-items-center gap-2 mb-3">
      <div className="input-group" style={{ maxWidth: "340px" }}>
        <span className="input-group-text bg-white border-secondary border-opacity-25 text-danger">
          <Search size={16} />
        </span>
        <input
          type="text"
          className="form-control bg-white border-secondary border-opacity-25 text-dark fw-medium py-2"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="btn btn-outline-secondary border-opacity-25 bg-white text-secondary"
            type="button"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {searchTerm && (
        <span className="badge bg-danger text-white rounded-pill px-3 py-2 fw-bold" style={{ fontSize: "0.78rem" }}>
          Matches Found: {count}
        </span>
      )}
    </div>
  );
};

export default TableSearchBar;
