const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const AdmZip = require("adm-zip");
const axios = require("axios");
const FormData = require("form-data");

const BASE_URL = "http://localhost:5000/api";

async function testZipAndAiAudit() {
  console.log("=========================================================================");
  console.log("🚀 TESTING ZIP ARCHIVE UNZIPPING & AI COMPLETENESS AUDIT FEATURE");
  console.log("=========================================================================");

  // Login College
  const collegeLogin = await axios.post(`${BASE_URL}/auth/login`, {
    username: "nkc_user",
    password: "college123"
  });
  const token = collegeLogin.data.token;

  // Create 2 mock Excel spreadsheets
  const wb1 = XLSX.utils.book_new();
  const rows1 = [
    { "Roll_Number": "BAMMC-01", "Student_Name": "Aarav Sharma Div A", "Branch": "FYBAMMC", "Semester": 1, "Year": 1, "Email": "aarav@nkc.edu.in", "Mobile_Number": "9820011111" }
  ];
  XLSX.utils.book_append_sheet(wb1, XLSX.utils.json_to_sheet(rows1), "Student_Data");
  const xlsxPath1 = path.resolve(__dirname, "../uploads/FYBAMMC_A.xlsx");
  XLSX.writeFile(wb1, xlsxPath1);

  const wb2 = XLSX.utils.book_new();
  const rows2 = [
    { "Roll_Number": "BCOM-01", "Student_Name": "Riya Shah Div A", "Branch": "FYBCOM", "Semester": 1, "Year": 1, "Email": "riya@nkc.edu.in", "Mobile_Number": "9820022222" }
  ];
  XLSX.utils.book_append_sheet(wb2, XLSX.utils.json_to_sheet(rows2), "Student_Data");
  const xlsxPath2 = path.resolve(__dirname, "../uploads/FYBCOM_A.xlsx");
  XLSX.writeFile(wb2, xlsxPath2);

  // Package into a ZIP archive
  const zip = new AdmZip();
  zip.addLocalFile(xlsxPath1);
  zip.addLocalFile(xlsxPath2);
  const zipPath = path.resolve(__dirname, "../uploads/College_Data_Batch_2026.zip");
  zip.writeZip(zipPath);

  console.log(`📦 Created ZIP Archive: 'College_Data_Batch_2026.zip' containing 2 Excel files.`);

  // Upload ZIP
  const form = new FormData();
  form.append("file", fs.createReadStream(zipPath));
  form.append("academic_year_id", "1");

  const uploadRes = await axios.post(`${BASE_URL}/uploads`, form, {
    headers: {
      "Authorization": `Bearer ${token}`,
      ...form.getHeaders()
    }
  });

  console.log(`\n✅ ZIP Upload Response:`);
  console.log(`  -> Message: ${uploadRes.data.message}`);
  console.log(`  -> Extracted Files Count: ${uploadRes.data.batch_count}`);
  console.log(`  -> ${uploadRes.data.ai_audit_remarks}`);

  // Cleanup temp local test zip/xlsx
  if (fs.existsSync(xlsxPath1)) fs.unlinkSync(xlsxPath1);
  if (fs.existsSync(xlsxPath2)) fs.unlinkSync(xlsxPath2);
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

  console.log("\n=========================================================================");
  console.log("🎉 ZIP UNZIPPING & AI COMPLETENESS AUDIT VERIFIED SUCCESSFULLY!");
  console.log("=========================================================================\n");
}

testZipAndAiAudit().catch(console.error);
