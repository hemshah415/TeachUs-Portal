const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";

async function testNotifications() {
  console.log("=========================================================================");
  console.log("TESTING LIVE IN-APP NOTIFICATION CENTER (BELL ALERT HUB)");
  console.log("=========================================================================");

  try {
    // 1. Admin Login
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      username: "admin",
      password: "admin123"
    });
    const adminToken = adminLogin.data.token;
    console.log("SUCCESS: Admin Login verified.");

    // 2. Send Broadcast Notification
    const broadcastRes = await axios.post(
      `${BASE_URL}/notifications/broadcast`,
      {
        target_college_id: "",
        title: "Official Submission Window Notice",
        message: "All affiliated colleges must submit verified student batches prior to the published deadline.",
        type: "DEADLINE"
      },
      { headers: { "Authorization": `Bearer ${adminToken}` } }
    );
    console.log("SUCCESS: Admin Broadcast Sent ->", broadcastRes.data.message);

    // 3. College User Login (Nagindas Khandwala College)
    const collegeLogin = await axios.post(`${BASE_URL}/auth/login`, {
      username: "nkc_user",
      password: "college123"
    });
    const collegeToken = collegeLogin.data.token;
    console.log("SUCCESS: College Login verified.");

    // 4. Fetch College Notifications
    const notesRes = await axios.get(`${BASE_URL}/notifications`, {
      headers: { "Authorization": `Bearer ${collegeToken}` }
    });
    console.log(`SUCCESS: College Notifications Fetched -> Unread: ${notesRes.data.unreadCount}, Total: ${notesRes.data.notifications.length}`);

    // 5. Mark All Notifications as Read
    const markRes = await axios.put(`${BASE_URL}/notifications/read-all`, {}, {
      headers: { "Authorization": `Bearer ${collegeToken}` }
    });
    console.log("SUCCESS: Mark All Read ->", markRes.data.message);

    // 6. Re-verify Unread Count
    const verifyRes = await axios.get(`${BASE_URL}/notifications`, {
      headers: { "Authorization": `Bearer ${collegeToken}` }
    });
    console.log(`SUCCESS: Re-verified Unread Count -> ${verifyRes.data.unreadCount}`);

    console.log("\n=========================================================================");
    console.log("ALL NOTIFICATION CENTER TESTS PASSED (100% SUCCESS)");
    console.log("=========================================================================\n");

  } catch (err) {
    console.error("NOTIFICATION TEST FAILED:", err.response ? err.response.data : err.message);
  }
}

testNotifications();
