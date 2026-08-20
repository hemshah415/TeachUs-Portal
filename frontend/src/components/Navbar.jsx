import React, { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { Building2, LogOut, ShieldCheck, User, Search, Command } from "lucide-react";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
import CommandPalette from "./CommandPalette";
import logoImg from "../assets/logo.png";

const Navbar = ({ onSelectTab, onInspectCollege }) => {
  const { user, logoutUser } = useContext(AuthContext);
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!user) return null;

  return (
    <>
      <nav className="navbar navbar-dark navbar-custom px-4 py-3 sticky-top">
        <div className="container-fluid d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-3">
            <div className="p-1 rounded-3 bg-white shadow-sm d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
              <img src={logoImg} alt="TeachUs Logo" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
            </div>
            <div>
              <h4 className="mb-0 fw-extrabold text-white font-outfit">TeachUs Portal</h4>
              <small className="text-white text-opacity-75" style={{ fontSize: '0.8rem' }}>
                College Academic Data Management & Automated Validation System
              </small>
            </div>
          </div>

          <div className="d-flex align-items-center gap-3">
            <button
              onClick={() => setCmdOpen(true)}
              className="btn btn-dark btn-sm rounded-pill d-flex align-items-center gap-2 px-3 py-2 border border-secondary border-opacity-50 text-white shadow-sm"
              title="Search Colleges, Files & Navigation (Ctrl + K)"
            >
              <Search size={14} className="text-danger" />
              <span className="small fw-semibold d-none d-md-inline">Quick Search...</span>
              <kbd className="bg-secondary bg-opacity-25 text-white px-2 py-1 rounded small font-monospace" style={{ fontSize: "0.7rem" }}>
                Ctrl + K
              </kbd>
            </button>

            <ThemeToggle />
            <NotificationBell />

            <div className="d-flex align-items-center gap-2 px-3 py-2 rounded-pill bg-white shadow-sm border border-danger border-opacity-25">
              {user.role === 'ADMIN' ? (
                <ShieldCheck size={18} className="text-danger" />
              ) : (
                <User size={18} className="text-primary" />
              )}
              <span className="fw-bold text-dark me-1">{user.college_name || user.username}</span>
              <span className={`badge ${user.role === 'ADMIN' ? 'bg-danger text-white' : 'bg-primary text-white'}`} style={{ fontSize: '0.7rem' }}>
                {user.role}
              </span>
            </div>

            <button 
              onClick={logoutUser}
              className="btn btn-light text-danger fw-semibold btn-sm rounded-pill d-flex align-items-center gap-2 px-3 py-2 shadow-sm"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <CommandPalette
        isOpen={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onSelectTab={onSelectTab}
        onInspectCollege={onInspectCollege}
      />
    </>
  );
};

export default Navbar;
