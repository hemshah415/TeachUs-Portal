const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "college_academic_jwt_secret_key_2026";

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  let token = authHeader && authHeader.split(" ")[1];
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Access token missing or invalid" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
}

function isAdmin(req, res, next) {
  if (req.user && req.user.role === "ADMIN") {
    next();
  } else {
    res.status(403).json({ error: "Access denied. Administrator privilege required." });
  }
}

function isCollege(req, res, next) {
  if (req.user && (req.user.role === "COLLEGE" || req.user.role === "ADMIN")) {
    next();
  } else {
    res.status(403).json({ error: "Access denied. College User privilege required." });
  }
}

module.exports = { authenticateToken, isAdmin, isCollege, JWT_SECRET };
