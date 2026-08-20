const fs = require("fs");

function addHostsAlias() {
  const hostsPath = "C:\\Windows\\System32\\drivers\\etc\\hosts";
  try {
    let content = fs.readFileSync(hostsPath, "utf8");
    if (!content.includes("teachus.local")) {
      fs.appendFileSync(hostsPath, "\n127.0.0.1   teachus.local\n");
      console.log("SUCCESS: Added teachus.local to Windows hosts file.");
    } else {
      console.log("INFO: teachus.local is already configured in Windows hosts file.");
    }
  } catch (err) {
    console.log("Notice: Unable to write to hosts file directly (Permission restricted). User can run batch file as Administrator.");
  }
}

addHostsAlias();
