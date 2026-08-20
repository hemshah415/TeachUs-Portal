const axios = require("axios");

async function testPreviewApi() {
  console.log("=========================================================================");
  console.log("TESTING PREVIEW DATA API");
  console.log("=========================================================================");

  try {
    const loginRes = await axios.post("http://localhost:5000/api/auth/login", {
      username: "admin",
      password: "admin123"
    });
    const token = loginRes.data.token;
    console.log("SUCCESS: Admin Login verified.");

    const res = await axios.get("http://localhost:5000/api/uploads/9", {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("SUCCESS: Preview endpoint response:");
    console.log("Upload Object:", res.data.upload);
    console.log("Students Count:", res.data.students ? res.data.students.length : 0);
    console.log("Errors Count:", res.data.errors ? res.data.errors.length : 0);
    console.log("Students Sample:", res.data.students ? res.data.students.slice(0, 2) : []);

    console.log("\n=========================================================================");
    console.log("PREVIEW API TEST COMPLETED");
    console.log("=========================================================================\n");

  } catch (err) {
    console.error("PREVIEW API TEST FAILED:", err.response ? err.response.data : err.message);
  }
}

testPreviewApi();
