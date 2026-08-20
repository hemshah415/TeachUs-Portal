const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";

async function debugEndpoints() {
  console.log("=========================================================================");
  console.log("🔍 DEBUGGING API ENDPOINTS CONNECTED TO MYSQL WORKBENCH");
  console.log("=========================================================================");

  try {
    // 1. Admin Login
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      username: "admin",
      password: "admin123"
    });
    const token = adminLogin.data.token;
    console.log("✅ Admin Login Successful");

    // 2. Fetch Dashboard Analytics
    const dashRes = await axios.get(`${BASE_URL}/analytics/dashboard`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    console.log(`✅ Dashboard Metrics Fetched: Total Students: ${dashRes.data.metrics.totalStudents}`);

    // 3. Fetch Uploads List
    const uploadsRes = await axios.get(`${BASE_URL}/uploads`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    console.log(`✅ Submissions History Fetched: Count = ${uploadsRes.data.length}`);

  } catch (err) {
    console.error("❌ API ERROR:", err.response ? err.response.data : err.message);
  }
}

debugEndpoints();
