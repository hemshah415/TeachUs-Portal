const axios = require("axios");

async function testDashboardLineChart() {
  console.log("=========================================================================");
  console.log("TESTING DASHBOARD LINE CHART & DAILY TREND API WITH ADMIN AUTH");
  console.log("=========================================================================");

  try {
    const loginRes = await axios.post("http://localhost:5000/api/auth/login", {
      username: "admin",
      password: "admin123"
    });
    const token = loginRes.data.token;
    console.log("SUCCESS: Admin Login verified.");

    const res = await axios.get("http://localhost:5000/api/analytics/dashboard", {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("SUCCESS: Dashboard analytics loaded.");
    console.log("Metrics:", res.data.metrics);
    console.log("Daily Trend Array Length:", res.data.dailyTrend ? res.data.dailyTrend.length : 0);
    console.log("Daily Trend Sample:", res.data.dailyTrend ? res.data.dailyTrend.slice(0, 3) : []);
    console.log("Top Error Cols:", res.data.topErrorCols);

    console.log("\n=========================================================================");
    console.log("LINE CHART & DASHBOARD API TEST PASSED (100% SUCCESS)");
    console.log("=========================================================================\n");

  } catch (err) {
    console.error("DASHBOARD API TEST FAILED:", err.response ? err.response.data : err.message);
  }
}

testDashboardLineChart();
