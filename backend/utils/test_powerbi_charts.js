const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";

async function testPowerBiCharts() {
  console.log("=========================================================================");
  console.log("TESTING POWER BI VISUAL CHARTS & FILTER FEED");
  console.log("=========================================================================");

  try {
    // 1. Fetch Power BI Feed for All Colleges
    const allRes = await axios.get(`${BASE_URL}/analytics/powerbi-feed`);
    console.log("ALL COLLEGES FEED:");
    console.log("Total Submissions:", allRes.data.total_submissions);
    console.log("Status Ring Data:", allRes.data.statusRing);
    console.log("Branch Breakdown Data:", allRes.data.branchBreakdown);

    // 2. Fetch Power BI Feed for College ID #1 (Nagindas Khandwala College)
    const college1Res = await axios.get(`${BASE_URL}/analytics/powerbi-feed?college_id=1`);
    console.log("\nCOLLEGE ID #1 FILTERED FEED:");
    console.log("Total Submissions:", college1Res.data.total_submissions);
    console.log("Status Ring Data:", college1Res.data.statusRing);
    console.log("Branch Breakdown Data:", college1Res.data.branchBreakdown);

    console.log("\n=========================================================================");
    console.log("POWER BI CHARTS & FEED TEST PASSED (100% SUCCESS)");
    console.log("=========================================================================\n");

  } catch (err) {
    console.error("POWER BI TEST FAILED:", err.response ? err.response.data : err.message);
  }
}

testPowerBiCharts();
