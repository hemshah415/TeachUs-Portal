import React from "react";
import { Download, FileText, Share2, Copy } from "lucide-react";
import { useToast } from "../context/ToastContext";

const ExportHub = ({ onExportPdf, onExportExcel, powerBiUrl }) => {
  const { addToast } = useToast();

  const handleCopyPowerBiLink = () => {
    const feedUrl = powerBiUrl || "http://127.0.0.1:5000/api/analytics/powerbi-feed";
    navigator.clipboard.writeText(feedUrl);
    if (addToast) addToast("Power BI OData API feed link copied to clipboard!", "success");
  };

  const handlePrintPdfReport = () => {
    window.print();
  };

  return (
    <div className="d-flex flex-wrap align-items-center gap-2">
      <button
        onClick={handlePrintPdfReport}
        className="btn btn-outline-secondary btn-sm fw-bold d-flex align-items-center gap-1 rounded-3"
        title="Print Executive PDF Summary Report"
      >
        <FileText size={14} className="text-danger" />
        <span>Print PDF Report</span>
      </button>

      <button
        onClick={handleCopyPowerBiLink}
        className="btn btn-outline-secondary btn-sm fw-bold d-flex align-items-center gap-1 rounded-3"
        title="Copy Direct Power BI Feed URL"
      >
        <Copy size={14} className="text-primary" />
        <span>Copy Power BI Feed</span>
      </button>
    </div>
  );
};

export default ExportHub;
