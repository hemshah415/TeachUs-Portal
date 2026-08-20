import React from "react";
import { Maximize2, Download, X } from "lucide-react";

const ChartModal = ({ title, isOpen, onClose, chartRef, children }) => {
  if (!isOpen) return null;

  const handleExportPNG = () => {
    if (!chartRef || !chartRef.current) return;
    const chartInstance = chartRef.current;
    const url = chartInstance.toBase64Image ? chartInstance.toBase64Image() : null;

    if (url) {
      const link = document.createElement("a");
      link.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_chart.png`;
      link.href = url;
      link.click();
    }
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(6px)", zIndex: 1060 }}
    >
      <div className="modal-dialog modal-xl modal-dialog-centered">
        <div className="modal-content glass-panel border-danger border-opacity-25 shadow-lg bg-white">
          <div className="modal-header border-bottom border-slate-200 px-4 py-3 d-flex align-items-center justify-content-between">
            <h5 className="modal-title fw-bold text-dark font-outfit m-0">{title} (Fullscreen High Definition View)</h5>
            <div className="d-flex align-items-center gap-2">
              <button
                onClick={handleExportPNG}
                className="btn btn-gradient-primary btn-sm d-flex align-items-center gap-2 px-3 fw-bold"
              >
                <Download size={16} />
                <span>Export HD Chart Image</span>
              </button>
              <button onClick={onClose} className="btn btn-outline-secondary btn-sm rounded-circle p-2">
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="modal-body p-4 bg-white d-flex align-items-center justify-content-center" style={{ minHeight: "450px" }}>
            <div className="w-100 h-100" style={{ maxHeight: "550px" }}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartModal;
