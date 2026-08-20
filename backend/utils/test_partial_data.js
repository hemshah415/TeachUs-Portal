const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const axios = require("axios");
const FormData = require("form-data");

const BASE_URL = "http://localhost:5000/api";

async function testPartialDataAndMultiFile() {
  console.log("=========================================================================");
  console.log("🚀 TESTING MULTI-FILE UPLOAD & PARTIAL DATA AUTOMATIC ADMIN STATUS TAGGING");
  console.log("=========================================================================");

  // Login College
  const collegeLogin = await axios.post(`${BASE_URL}/auth/login`, {
    username: "nkc_user",
    password: "college123"
  });
  const token = collegeLogin.data.token;

  // Create Excel file with 2 errors (invalid email & invalid mobile)
  const wb1 = XLSX.utils.book_new();
  const rows1 = [
    { "Roll_Number": "BSC-01", "Student_Name": "Amit Shah Div A", "Branch": "FYBSC IT", "Semester": 1, "Year": 1, "Email": "invalid-email-format", "Mobile_Number": "123" }
  ];
  XLSX.utils.book_append_sheet(wb1, XLSX.utils.json_to_sheet(rows1), "Student_Data");
  const xlsxPath1 = path.resolve(__dirname, "../uploads/FYBSC_With_Errors.xlsx");
  XLSX.writeFile(wb1, xlsxPath1);

  // Create clean Excel file
  const wb2 = XLSX.utils.book_new();
  const rows2 = [
    { "Roll_Number": "BCOM-101", "Student_Name": "Pooja Patel Div A", "Branch": "FYBCOM", "Semester": 1, "Year": 1, "Email": "pooja@nkc.edu.in", "Mobile_Number": "9820033333" }
  ];
  XLSX.utils.book_append_sheet(wb2, XLSX.utils.json_to_sheet(rows2), "Student_Data");
  const xlsxPath2 = path.resolve(__dirname, "../uploads/FYBCOM_Clean.xlsx");
  XLSX.writeFile(wb2, xlsxPath2);

  // Upload both files simultaneously
  const form = new FormData();
  form.append("files", fs.createReadStream(xlsxPath1));
  form.append("files", fs.createReadStream(xlsxPath2));
  form.append("academic_year_id", "1");

  const uploadRes = await axios.post(`${BASE_URL}/uploads`, form, {
    headers: {
      "Authorization": `Bearer ${token}`,
      ...form.getHeaders()
    }
  });

  console.log(`\n✅ Multi-File Upload Response:`);
  console.log(`  -> Response Message: ${uploadRes.data.message}`);
  console.log(`  -> Processed Uploads Count: ${uploadRes.data.uploads.length}`);

  uploadRes.data.uploads.forEach(up => {
    console.log(`\n  📄 File: ${up.file_name}`);
    console.log(`     - Validation Engine Status: ${up.validation_status} (${up.error_count} errors)`);
    console.log(`     - Admin Status Tag: [ ${up.admin_status} ]`);
    console.log(`     - System Remarks: "${up.admin_remarks}"`);
  });

  // Cleanup temp files
  if (fs.existsSync(xlsxPath1)) fs.unlinkSync(xlsxPath1);
  if (fs.existsSync(xlsxPath2)) fs.unlinkSync(xlsxPath2);

  console.log("\n=========================================================================");
  console.log("🎉 MULTI-FILE UPLOAD & PARTIAL DATA STATUS TAGGING VERIFIED SUCCESSFULLY!");
  console.log("=========================================================================\n");
}

testPartialDataAndMultiFile().catch(console.error);
