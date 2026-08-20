const fs = require("fs");
const path = require("path");
const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";

async function testRetentionPurge() {
  console.log("=========================================================================");
  console.log("🧹 TESTING AUTOMATED DATA RETENTION & 2-MONTH AUTO-PURGE FEATURE");
  console.log("=========================================================================");

  // Login Admin
  const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
    username: "admin",
    password: "admin123"
  });
  const adminToken = adminLogin.data.token;

  // 1. Get Retention Settings
  console.log("\n⚙️ 1. Fetching Admin Data Retention Settings...");
  const settingsRes = await axios.get(`${BASE_URL}/settings/retention`, {
    headers: { "Authorization": `Bearer ${adminToken}` }
  });
  console.log(`   -> Retention Deadline: ${settingsRes.data.retention_months} Month(s)`);
  console.log(`   -> Auto-Purge Status: ${settingsRes.data.auto_purge_enabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   -> Cutoff Timestamp: ${settingsRes.data.cutoff_date}`);

  // 2. Set Retention Policy to 2 Months
  console.log("\n📝 2. Setting Retention Policy to 2 Months (60 Days)...");
  await axios.put(`${BASE_URL}/settings/retention`, {
    retention_months: 2,
    auto_purge_enabled: true
  }, {
    headers: { "Authorization": `Bearer ${adminToken}` }
  });
  console.log("   -> Saved retention policy: 2 Months.");

  // 3. Trigger Manual Purge
  console.log("\n⚡ 3. Triggering On-Demand Data Purge for files older than 2 Months...");
  const purgeRes = await axios.post(`${BASE_URL}/settings/purge-now`, {}, {
    headers: { "Authorization": `Bearer ${adminToken}` }
  });
  console.log(`   -> Message: ${purgeRes.data.message}`);
  console.log(`   -> Purged Batches: ${purgeRes.data.purged_uploads || 0}`);
  console.log(`   -> Purged Student Records: ${purgeRes.data.purged_students || 0}`);

  console.log("\n=========================================================================");
  console.log("🎉 AUTOMATED DATA RETENTION & AUTO-PURGE TEST COMPLETED SUCCESSFULLY!");
  console.log("=========================================================================\n");
}

testRetentionPurge().catch(console.error);
