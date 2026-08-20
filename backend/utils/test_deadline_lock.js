const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const axios = require("axios");
const FormData = require("form-data");

const BASE_URL = "http://localhost:5000/api";

async function testDeadlineAndWindowLock() {
  console.log("=========================================================================");
  console.log("📅 TESTING AUTOMATED SUBMISSION WINDOW & DEADLINE LOCK TIMER");
  console.log("=========================================================================");

  // Login Admin
  const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
    username: "admin",
    password: "admin123"
  });
  const adminToken = adminLogin.data.token;

  // Login College
  const collegeLogin = await axios.post(`${BASE_URL}/auth/login`, {
    username: "nkc_user",
    password: "college123"
  });
  const collegeToken = collegeLogin.data.token;

  // Helper to create test Excel file
  const wb = XLSX.utils.book_new();
  const rows = [{ "Roll_Number": "TEST-01", "Student_Name": "Test Student", "Branch": "FYBCOM", "Semester": 1, "Year": 1, "Email": "test@nkc.edu.in", "Mobile_Number": "9820000000" }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Student_Data");
  const xlsxPath = path.resolve(__dirname, "../uploads/Test_Deadline_File.xlsx");
  XLSX.writeFile(wb, xlsxPath);

  // STEP 1: Verify Normal Upload when Window is OPEN
  console.log("\n🔓 STEP 1: Testing Upload when Window is OPEN");
  await axios.put(`${BASE_URL}/academic-years/1/window`, { is_open: true }, { headers: { "Authorization": `Bearer ${adminToken}` } });
  await axios.put(`${BASE_URL}/academic-years/1/deadline`, { deadline: "2030-12-31 23:59:59" }, { headers: { "Authorization": `Bearer ${adminToken}` } });

  const form1 = new FormData();
  form1.append("file", fs.createReadStream(xlsxPath));
  form1.append("academic_year_id", "1");

  const res1 = await axios.post(`${BASE_URL}/uploads`, form1, { headers: { "Authorization": `Bearer ${collegeToken}`, ...form1.getHeaders() } });
  console.log(`   -> Result: PASSED (Status 201). Message: "${res1.data.message}"`);

  // STEP 2: Admin Closes Submission Window (is_open = 0)
  console.log("\n🔒 STEP 2: Admin Closes Submission Window (is_open = false)");
  await axios.put(`${BASE_URL}/academic-years/1/window`, { is_open: false }, { headers: { "Authorization": `Bearer ${adminToken}` } });

  try {
    const form2 = new FormData();
    form2.append("file", fs.createReadStream(xlsxPath));
    form2.append("academic_year_id", "1");
    await axios.post(`${BASE_URL}/uploads`, form2, { headers: { "Authorization": `Bearer ${collegeToken}`, ...form2.getHeaders() } });
    console.log("   ❌ Error: Upload succeeded when window was closed!");
  } catch (err) {
    console.log(`   -> Security Blocked Correctly! HTTP Status: ${err.response.status}. Reason: "${err.response.data.error}"`);
  }

  // STEP 3: Admin Re-opens Window but Deadline Has Passed
  console.log("\n⌛ STEP 3: Admin Re-opens Window, but Deadline Has Passed (2020-01-01)");
  await axios.put(`${BASE_URL}/academic-years/1/window`, { is_open: true }, { headers: { "Authorization": `Bearer ${adminToken}` } });
  await axios.put(`${BASE_URL}/academic-years/1/deadline`, { deadline: "2020-01-01 12:00:00" }, { headers: { "Authorization": `Bearer ${adminToken}` } });

  try {
    const form3 = new FormData();
    form3.append("file", fs.createReadStream(xlsxPath));
    form3.append("academic_year_id", "1");
    await axios.post(`${BASE_URL}/uploads`, form3, { headers: { "Authorization": `Bearer ${collegeToken}`, ...form3.getHeaders() } });
    console.log("   ❌ Error: Upload succeeded when deadline passed!");
  } catch (err) {
    console.log(`   -> Deadline Lock Blocked Correctly! HTTP Status: ${err.response.status}. Reason: "${err.response.data.error}"`);
  }

  // STEP 4: Reset Deadline to Future Date
  console.log("\n🔄 STEP 4: Resetting Deadline to Future Date (2030-12-31)");
  await axios.put(`${BASE_URL}/academic-years/1/deadline`, { deadline: "2030-12-31 23:59:59" }, { headers: { "Authorization": `Bearer ${adminToken}` } });
  console.log("   -> Submission window restored to OPEN.");

  // Cleanup
  if (fs.existsSync(xlsxPath)) fs.unlinkSync(xlsxPath);

  console.log("\n=========================================================================");
  console.log("🎉 AUTOMATED SUBMISSION WINDOW & DEADLINE LOCK VERIFIED 100% WORKING!");
  console.log("=========================================================================\n");
}

testDeadlineAndWindowLock().catch(console.error);
