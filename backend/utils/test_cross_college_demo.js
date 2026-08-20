const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const axios = require("axios");
const FormData = require("form-data");

const BASE_URL = "http://localhost:5000/api";

async function demoCrossCollegeAntiFraud() {
  console.log("=========================================================================");
  console.log("🔍 TESTING CROSS-COLLEGE ANTI-FRAUD & DUPLICATE DETECTOR");
  console.log("=========================================================================");

  // Step 1: Login College 1 (Nagindas Khandwala College)
  const nkcLogin = await axios.post(`${BASE_URL}/auth/login`, {
    username: "nkc_user",
    password: "college123"
  });
  const nkcToken = nkcLogin.data.token;
  console.log("\n🔑 1. Logged in as College 1: Nagindas Khandwala College (nkc_user)");

  // Create Excel file for NKC
  const wb1 = XLSX.utils.book_new();
  const rows1 = [
    { "Roll_Number": "UNI-2026-99", "Student_Name": "Rohan Verma", "Branch": "FYBCOM Div A", "Semester": 1, "Year": 1, "Email": "rohan@nkc.edu.in", "Mobile_Number": "9988776655" }
  ];
  XLSX.utils.book_append_sheet(wb1, XLSX.utils.json_to_sheet(rows1), "Student_Data");
  const xlsxPath1 = path.resolve(__dirname, "../uploads/NKC_Student_Rohan.xlsx");
  XLSX.writeFile(wb1, xlsxPath1);

  // Upload file from NKC
  const form1 = new FormData();
  form1.append("file", fs.createReadStream(xlsxPath1));
  form1.append("academic_year_id", "1");

  const upRes1 = await axios.post(`${BASE_URL}/uploads`, form1, {
    headers: { "Authorization": `Bearer ${nkcToken}`, ...form1.getHeaders() }
  });
  console.log(`   -> Uploaded Student 'Rohan Verma' (Roll: UNI-2026-99, Mobile: 9988776655) under NKC.`);

  // Step 2: Login College 2 (Lala Lajpat Rai College)
  const lalaLogin = await axios.post(`${BASE_URL}/auth/login`, {
    username: "lala_user",
    password: "college123"
  });
  const lalaToken = lalaLogin.data.token;
  console.log("\n🔑 2. Logged in as College 2: Lala Lajpat Rai College (lala_user)");

  // Create Excel file for Lala Lajpat Rai College with DUPLICATE Roll & Mobile
  const wb2 = XLSX.utils.book_new();
  const rows2 = [
    { "Roll_Number": "UNI-2026-99", "Student_Name": "Rohan Verma (Duplicate Claim)", "Branch": "FYBCOM Div A", "Semester": 1, "Year": 1, "Email": "rohan@lala.edu.in", "Mobile_Number": "9988776655" }
  ];
  XLSX.utils.book_append_sheet(wb2, XLSX.utils.json_to_sheet(rows2), "Student_Data");
  const xlsxPath2 = path.resolve(__dirname, "../uploads/Lala_Student_Duplicate.xlsx");
  XLSX.writeFile(wb2, xlsxPath2);

  // Upload file from Lala Lajpat Rai College
  const form2 = new FormData();
  form2.append("file", fs.createReadStream(xlsxPath2));
  form2.append("academic_year_id", "1");

  const upRes2 = await axios.post(`${BASE_URL}/uploads`, form2, {
    headers: { "Authorization": `Bearer ${lalaToken}`, ...form2.getHeaders() }
  });

  const dupeUpload = upRes2.data.uploads[0];
  console.log(`\n🚨 3. Result for College 2 (Lala Lajpat Rai College) Upload:`);
  console.log(`   -> Admin Status Tag: [ ${dupeUpload.admin_status} ]`);
  console.log(`   -> System Anti-Fraud Remarks: "${dupeUpload.admin_remarks}"`);

  // Cleanup
  if (fs.existsSync(xlsxPath1)) fs.unlinkSync(xlsxPath1);
  if (fs.existsSync(xlsxPath2)) fs.unlinkSync(xlsxPath2);

  console.log("\n=========================================================================");
  console.log("🎉 CROSS-COLLEGE ANTI-FRAUD DETECTOR TEST COMPLETED SUCCESSFULLY!");
  console.log("=========================================================================\n");
}

demoCrossCollegeAntiFraud().catch(console.error);
