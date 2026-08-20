import React, { useState, useEffect, useRef } from "react";
import api from "../services/api";
import { Bell, CheckCheck, Clock, Check, X, AlertTriangle, AlertCircle, Info } from "lucide-react";

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications");
      setUnreadCount(res.data.unreadCount || 0);
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error("Error fetching notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error("Error marking notification read", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put("/notifications/read-all");
      fetchNotifications();
    } catch (err) {
      console.error("Error marking all read", err);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === "UNREAD") return n.is_read === 0;
    return true;
  });

  const getTypeBadge = (type) => {
    switch (type) {
      case "SUCCESS":
        return <span className="badge bg-success-subtle text-success border border-success border-opacity-25 px-2 py-1">SUCCESS</span>;
      case "WARNING":
        return <span className="badge bg-warning-subtle text-dark border border-warning border-opacity-25 px-2 py-1">WARNING</span>;
      case "URGENT":
        return <span className="badge bg-danger text-white px-2 py-1">URGENT</span>;
      case "DEADLINE":
        return <span className="badge bg-danger-subtle text-danger border border-danger border-opacity-25 px-2 py-1">DEADLINE</span>;
      default:
        return <span className="badge bg-info-subtle text-info border border-info border-opacity-25 px-2 py-1">INFO</span>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="position-relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-light rounded-circle p-2 shadow-sm position-relative d-flex align-items-center justify-content-center border-danger border-opacity-25"
        style={{ width: "42px", height: "42px" }}
        title="Notifications Center"
      >
        <Bell size={20} className="text-danger" />
        {unreadCount > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger shadow-sm border border-white" style={{ fontSize: "0.75rem" }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="position-absolute end-0 mt-2 bg-white rounded-3 shadow-lg border border-secondary border-opacity-25 p-0 overflow-hidden"
          style={{ width: "360px", maxWidth: "90vw", zIndex: 1050 }}
        >
          <div className="bg-danger text-white px-3 py-2.5 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <Bell size={18} />
              <span className="fw-bold fs-6">Notifications Hub</span>
              {unreadCount > 0 && (
                <span className="badge bg-white text-danger font-monospace px-2">{unreadCount} New</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="btn btn-sm btn-outline-light py-0 px-2 rounded-2 text-decoration-none"
                style={{ fontSize: "0.75rem" }}
              >
                Mark All Read
              </button>
            )}
          </div>

          <div className="bg-light px-3 py-2 border-bottom d-flex gap-2">
            <button
              onClick={() => setFilter("ALL")}
              className={`btn btn-xs rounded-pill px-3 ${filter === "ALL" ? "btn-danger fw-bold" : "btn-outline-secondary"}`}
              style={{ fontSize: "0.75rem" }}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("UNREAD")}
              className={`btn btn-xs rounded-pill px-3 ${filter === "UNREAD" ? "btn-danger fw-bold" : "btn-outline-secondary"}`}
              style={{ fontSize: "0.75rem" }}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <div style={{ maxHeight: "350px", overflowY: "auto" }}>
            {filteredNotifications.length === 0 ? (
              <div className="p-4 text-center text-muted" style={{ fontSize: "0.85rem" }}>
                No notifications found.
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 border-bottom d-flex align-items-start gap-2 transition-all ${
                    item.is_read === 0 ? "bg-danger bg-opacity-10" : "bg-white"
                  }`}
                >
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      {getTypeBadge(item.type)}
                      <small className="text-muted text-nowrap ms-2" style={{ fontSize: "0.7rem" }}>
                        {formatDate(item.created_at)}
                      </small>
                    </div>
                    <h6 className="mb-1 text-dark fw-bold" style={{ fontSize: "0.85rem" }}>
                      {item.title}
                    </h6>
                    <p className="mb-0 text-secondary" style={{ fontSize: "0.78rem", lineHeight: "1.3" }}>
                      {item.message}
                    </p>
                  </div>
                  {item.is_read === 0 && (
                    <button
                      onClick={(e) => handleMarkAsRead(item.id, e)}
                      className="btn btn-sm btn-outline-danger p-1 rounded-circle"
                      title="Mark as Read"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
