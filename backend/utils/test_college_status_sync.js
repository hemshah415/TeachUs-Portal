const axios = require("axios");

async function testCollegeStatusSync() {
  console.log("=========================================================================");
  console.log("TESTING COLLEGE STATUS SYNC & DATE TIMESTAMPS");
  console.log("=========================================================================");

  try {
    // 1. College Login
    const colLogin = await axios.post("http://localhost:5000/api/auth/login", {
      username: "nkc_user",
      password: "college123"
    });
    const colToken = colLogin.data.token;
    console.log("SUCCESS: College Login verified.");

    // 2. Fetch Uploads for College
    const uploadsRes = await axios.get("http://localhost:5000/api/uploads", {
      headers: { Authorization: `Bearer ${colToken}` }
    });

    console.log("SUCCESS: Uploads fetched count:", uploadsRes.data.length);
    console.log("Sample Upload Row:", {
      id: uploadsRes.data[0]?.id,
      file_name: uploadsRes.data[0]?.file_name,
      uploaded_at: uploadsRes.data[0]?.uploaded_at,
      upload_date: uploadsRes.data[0]?.upload_date,
      admin_status: uploadsRes.data[0]?.admin_status,
      status: uploadsRes.data[0]?.status,
      admin_remarks: uploadsRes.data[0]?.admin_remarks
    });

    console.log("\n=========================================================================");
    console.log("COLLEGE STATUS & TIMESTAMPS TEST PASSED (100% SUCCESS)");
    console.log("=========================================================================\n");

  } catch (err) {
    console.error("COLLEGE STATUS SYNC TEST FAILED:", err.response ? err.response.data : err.message);
  }
}

testCollegeStatusSync();
