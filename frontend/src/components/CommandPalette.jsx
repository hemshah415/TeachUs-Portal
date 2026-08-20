import React, { useState, useEffect, useRef } from "react";
import { Search, Building2, FileSpreadsheet, Command, X, ArrowRight } from "lucide-react";
import api from "../services/api";

const CommandPalette = ({ isOpen, onClose, onSelectTab, onInspectCollege }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ colleges: [], uploads: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      fetchAllSearchData();
    }
  }, [isOpen]);

  const fetchAllSearchData = async () => {
    try {
      setLoading(true);
      const [colRes, upRes] = await Promise.all([
        api.get("/colleges").catch(() => ({ data: [] })),
        api.get("/uploads").catch(() => ({ data: [] }))
      ]);
      setResults({
        colleges: colRes.data || [],
        uploads: upRes.data || []
      });
    } catch (e) {
      console.error("Command palette fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredColleges = (results.colleges || []).filter(c =>
    (c.name || "").toLowerCase().includes(query.toLowerCase()) ||
    (c.code || "").toLowerCase().includes(query.toLowerCase())
  ).slice(0, 4);

  const filteredUploads = (results.uploads || []).filter(u =>
    (u.file_name || "").toLowerCase().includes(query.toLowerCase()) ||
    (u.admin_status || u.status || "").toLowerCase().includes(query.toLowerCase())
  ).slice(0, 4);

  return (
    <div className="cmd-palette-backdrop" onClick={onClose}>
      <div className="cmd-palette-container font-outfit" onClick={e => e.stopPropagation()}>
        {/* Search Input Bar */}
        <div className="d-flex align-items-center px-3 py-2 border-bottom border-secondary border-opacity-25">
          <Search size={20} className="text-secondary me-2 ms-1" />
          <input
            ref={inputRef}
            type="text"
            className="form-control border-0 bg-transparent text-dark fw-semibold shadow-none fs-5 py-2"
            placeholder="Type to search colleges, files, status... (Ctrl + K)"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button onClick={onClose} className="btn btn-link text-secondary p-1 border-0">
            <X size={20} />
          </button>
        </div>

        {/* Search Results Area */}
        <div className="p-3" style={{ maxHeight: "380px", overflowY: "auto" }}>
          {loading ? (
            <div className="text-center py-4 text-secondary small">Searching database...</div>
          ) : query.length > 0 && filteredColleges.length === 0 && filteredUploads.length === 0 ? (
            <div className="text-center py-4 text-secondary">
              <span className="fw-semibold d-block">No matching records found for "{query}"</span>
              <small>Try searching by college code (NKC001), institution name, or submission file status.</small>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {/* Colleges Group */}
              {filteredColleges.length > 0 && (
                <div>
                  <small className="text-secondary fw-bold uppercase ms-2 d-block mb-1">Colleges & Institutions</small>
                  {filteredColleges.map(col => (
                    <div
                      key={col.id || col.college_id}
                      onClick={() => {
                        if (onInspectCollege) onInspectCollege(col);
                        if (onSelectTab) onSelectTab("COLLEGES");
                        onClose();
                      }}
                      className="p-2 px-3 rounded-3 d-flex align-items-center justify-content-between hover-bg-light cursor-pointer border border-transparent hover-border-danger transition-all"
                    >
                      <div className="d-flex align-items-center gap-2">
                        <Building2 size={18} className="text-danger" />
                        <div>
                          <span className="fw-bold text-dark d-block small">{col.name}</span>
                          <small className="text-secondary font-monospace">Code: {col.code}</small>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-secondary" />
                    </div>
                  ))}
                </div>
              )}

              {/* Submissions Group */}
              {filteredUploads.length > 0 && (
                <div>
                  <small className="text-secondary fw-bold uppercase ms-2 d-block mb-1">Uploaded Excel Data Submissions</small>
                  {filteredUploads.map(up => (
                    <div
                      key={up.id || up.upload_id}
                      onClick={() => {
                        if (onSelectTab) onSelectTab("SUBMISSIONS");
                        onClose();
                      }}
                      className="p-2 px-3 rounded-3 d-flex align-items-center justify-content-between hover-bg-light cursor-pointer border border-transparent hover-border-danger transition-all"
                    >
                      <div className="d-flex align-items-center gap-2">
                        <FileSpreadsheet size={18} className="text-primary" />
                        <div>
                          <span className="fw-bold text-dark d-block small">{up.file_name}</span>
                          <small className="text-secondary">Status: {up.admin_status || up.status}</small>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-secondary" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-light p-2 px-3 border-top border-secondary border-opacity-25 d-flex justify-content-between align-items-center text-secondary small">
          <span className="fw-medium">ProTip: Use <kbd className="bg-dark text-white px-1 rounded ms-1">Ctrl + K</kbd> to launch anywhere.</span>
          <span>Press <kbd className="bg-dark text-white px-1 rounded me-1">Esc</kbd> to exit.</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
