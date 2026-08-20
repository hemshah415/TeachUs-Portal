import React, { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";
import { Moon, Sun } from "lucide-react";

const ThemeToggle = ({ className = "" }) => {
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <button
      onClick={toggleTheme}
      className={`btn btn-sm d-flex align-items-center gap-2 rounded-pill px-3 py-2 transition-all shadow-sm ${
        theme === "dark"
          ? "btn-dark text-warning border border-secondary"
          : "btn-light text-danger border border-danger border-opacity-25"
      } ${className}`}
      title={theme === "dark" ? "Switch to Light Mode" : "Switch to Red & Black Dark Mode"}
      style={{ fontSize: "0.82rem", fontWeight: 700 }}
    >
      {theme === "dark" ? (
        <>
          <Sun size={16} className="text-warning" />
          <span>Light Mode</span>
        </>
      ) : (
        <>
          <Moon size={16} className="text-danger" />
          <span>Dark Mode</span>
        </>
      )}
    </button>
  );
};

export default ThemeToggle;
