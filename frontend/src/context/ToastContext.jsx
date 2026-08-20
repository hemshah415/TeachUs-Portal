import React, { createContext, useState, useContext, useCallback } from "react";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Floating Toast Hub */}
      <div
        className="position-fixed bottom-0 end-0 p-3 d-flex flex-column gap-2"
        style={{ zIndex: 9999, maxWidth: "420px", width: "100%" }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-slide-in p-3 rounded-3 shadow-lg d-flex align-items-center justify-content-between text-white ${
              toast.type === "success"
                ? "bg-success border border-success"
                : toast.type === "error"
                ? "bg-danger border border-danger"
                : toast.type === "warning"
                ? "bg-warning text-dark border border-warning"
                : "bg-dark border border-secondary"
            }`}
            style={{ backdropFilter: "blur(8px)" }}
          >
            <div className="d-flex align-items-center gap-2">
              {toast.type === "success" && <CheckCircle2 size={20} />}
              {toast.type === "error" && <XCircle size={20} />}
              {toast.type === "warning" && <AlertTriangle size={20} />}
              {toast.type === "info" && <Info size={20} />}
              <span className="fw-semibold small ms-1">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="btn btn-link text-white p-0 ms-2 border-0 opacity-75 opacity-100-hover"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  return context || { addToast: () => {}, removeToast: () => {} };
};
