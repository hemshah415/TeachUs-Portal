const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const { initDb } = require("./utils/initDb");
const { runAutoPurgeBackground } = require("./controllers/retentionController");
const apiRoutes = require("./routes/api");

const app = express();

// Ensure upload folders exist
const uploadsDir = path.resolve(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Mount API Routes
app.use("/api", apiRoutes);

// Base route
app.get("/", (req, res) => {
  res.json({
    message: "TeachUs - College Academic Data Management & Validation API Running",
    status: "Healthy",
    time: new Date()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("API Error:", err);
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});

// Initialize database and start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  await initDb();

  // Run initial retention auto-purge check on startup
  runAutoPurgeBackground();

  // Schedule daily auto-purge check (every 24 hours)
  setInterval(() => {
    runAutoPurgeBackground();
  }, 24 * 60 * 60 * 1000);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`====================================================`);
    console.log(`✅ Backend Server listening on http://127.0.0.1:${PORT}`);
    console.log(`====================================================`);
  });
}

startServer();