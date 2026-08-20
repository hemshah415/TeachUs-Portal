const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getDb } = require("../config/db");
const { JWT_SECRET } = require("../middleware/authMiddleware");

// Login controller
async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

  try {
    const { pool } = await getDb();
    
    // Fetch user with college info
    const [rows] = await pool.query(
      `SELECT u.*, c.name as college_name, c.code as college_code 
       FROM users u 
       LEFT JOIN colleges c ON u.college_id = c.id 
       WHERE LOWER(u.username) = LOWER(?) OR LOWER(u.email) = LOWER(?)`,
      [cleanUsername, cleanUsername]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = rows[0];

    if (user.status === "DISABLED") {
      return res.status(403).json({ error: "Your account has been disabled. Please contact administrator." });
    }

    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(cleanPassword, user.password);
    } catch (bErr) {
      isMatch = false;
    }

    // Direct password fallback in case of legacy unhashed seed password
    if (!isMatch && (user.password === cleanPassword || user.password === cleanPassword.toLowerCase())) {
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      college_id: user.college_id,
      college_name: user.college_name,
      college_code: user.college_code
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "24h" });

    // Log login (non-blocking)
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, username, college_name, action, details) VALUES (?, ?, ?, ?, ?)`,
        [user.id, user.username, user.college_name || "Admin Portal", "USER_LOGIN", `User ${user.username} logged in successfully`]
      );
    } catch (aErr) {
      console.error("Non-critical audit log error during login:", aErr.message);
    }

    return res.json({
      message: "Login successful",
      token,
      user: tokenPayload
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Server error during authentication" });
  }
}

// Get current profile
async function getProfile(req, res) {
  try {
    const { pool } = await getDb();
    const userPayload = { ...req.user };
    if (req.user.college_id) {
      const [cols] = await pool.query(
        `SELECT c.* FROM colleges c WHERE c.id = ?`,
        [req.user.college_id]
      );
      if (cols.length > 0) {
        userPayload.faculty_training_status = cols[0].faculty_training_status || 'Pending';
        userPayload.faculty_training_date = cols[0].faculty_training_date;
        userPayload.dashboard_training_status = cols[0].dashboard_training_status || 'Pending';
        userPayload.dashboard_training_date = cols[0].dashboard_training_date;
        userPayload.trainer_name = cols[0].trainer_name || 'TeachUs Support Team';
        userPayload.training_notes = cols[0].training_notes;
      }
    }
    return res.json({ user: userPayload });
  } catch (err) {
    return res.json({ user: req.user });
  }
}

module.exports = { login, getProfile };
