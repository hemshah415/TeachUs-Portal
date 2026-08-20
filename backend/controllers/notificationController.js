const { getDb } = require("../config/db");

// Helper function to create notification internally
async function createNotification({ user_id = null, college_id = null, title, message, type = "INFO" }) {
  try {
    const { pool } = await getDb();
    await pool.query(
      `INSERT INTO notifications (user_id, college_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?, 0)`,
      [user_id, college_id, title, message, type]
    );
  } catch (error) {
    console.error("Error creating notification:", error.message);
  }
}

// Get notifications for logged-in user
async function getNotifications(req, res) {
  try {
    const { pool } = await getDb();
    const userId = req.user.id;
    const collegeId = req.user.college_id;
    const role = req.user.role;

    let query = "";
    let params = [];

    if (role === "ADMIN") {
      query = `
        SELECT * FROM notifications 
        WHERE user_id = ? OR (user_id IS NULL AND college_id IS NULL) OR title LIKE 'New Submission Received%'
        ORDER BY id DESC LIMIT 50
      `;
      params = [userId];
    } else {
      query = `
        SELECT * FROM notifications 
        WHERE (user_id = ? OR college_id = ?) AND title NOT LIKE 'New Submission Received%'
        ORDER BY id DESC LIMIT 50
      `;
      params = [userId, collegeId];
    }

    const [rows] = await pool.query(query, params);
    const unreadCount = rows.filter(n => n.is_read === 0).length;

    return res.json({
      unreadCount,
      notifications: rows
    });

  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
}

// Mark single notification as read
async function markAsRead(req, res) {
  const { id } = req.params;

  try {
    const { pool } = await getDb();
    await pool.query(
      `UPDATE notifications SET is_read = 1 WHERE id = ?`,
      [id]
    );
    return res.json({ message: "Notification marked as read" });

  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({ error: "Failed to update notification" });
  }
}

// Mark all notifications as read for current user
async function markAllAsRead(req, res) {
  try {
    const { pool } = await getDb();
    const userId = req.user.id;
    const collegeId = req.user.college_id;

    if (req.user.role === "ADMIN") {
      await pool.query(
        `UPDATE notifications SET is_read = 1 WHERE user_id = ? OR (user_id IS NULL AND college_id IS NULL)`,
        [userId]
      );
    } else {
      await pool.query(
        `UPDATE notifications SET is_read = 1 WHERE user_id = ? OR college_id = ? OR (user_id IS NULL AND college_id IS NULL)`,
        [userId, collegeId]
      );
    }

    return res.json({ message: "All notifications marked as read" });

  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return res.status(500).json({ error: "Failed to update notifications" });
  }
}

// Send broadcast announcement (Admin only)
async function sendBroadcast(req, res) {
  const { target_college_id, title, message, type } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: "Title and message are required for announcement" });
  }

  try {
    const collegeId = target_college_id ? parseInt(target_college_id) : null;
    await createNotification({
      college_id: collegeId,
      title: title.trim(),
      message: message.trim(),
      type: type || "INFO"
    });

    const { pool } = await getDb();
    await pool.query(
      `INSERT INTO audit_logs (user_id, username, college_name, action, details) VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.id,
        req.user.username,
        "System Administration",
        "NOTIFICATION_BROADCAST",
        `Broadcast announcement sent: ${title.trim()} (Target: ${collegeId ? 'College ID ' + collegeId : 'All Colleges'})`
      ]
    );

    return res.status(201).json({ message: "Notification broadcast successfully sent" });

  } catch (error) {
    console.error("Error sending broadcast notification:", error);
    return res.status(500).json({ error: "Failed to send notification broadcast" });
  }
}

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  sendBroadcast
};
