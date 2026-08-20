import React from "react";

export const TableSkeleton = ({ rows = 5, cols = 6 }) => {
  return (
    <div className="table-responsive">
      <table className="table table-custom">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, idx) => (
              <th key={idx}>
                <div className="skeleton-box" style={{ height: "16px", width: "80%" }}></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rIdx) => (
            <tr key={rIdx}>
              {Array.from({ length: cols }).map((_, cIdx) => (
                <td key={cIdx}>
                  <div className="skeleton-box" style={{ height: "20px", width: cIdx === 0 ? "40%" : "85%" }}></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const CardSkeleton = ({ count = 3 }) => {
  return (
    <div className="row g-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="col-md-4">
          <div className="glass-card p-4 bg-white border border-slate-200 shadow-sm rounded-3">
            <div className="skeleton-box mb-2" style={{ height: "24px", width: "50%" }}></div>
            <div className="skeleton-box mb-3" style={{ height: "36px", width: "75%" }}></div>
            <div className="skeleton-box" style={{ height: "14px", width: "90%" }}></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TableSkeleton;
