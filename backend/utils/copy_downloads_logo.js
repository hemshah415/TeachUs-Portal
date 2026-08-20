const fs = require("fs");
const path = require("path");

function copyDownloadsLogo() {
  const downloadsSrc = "C:\\Users\\Admin\\Downloads\\unnamed.png";
  const pubDir = "C:\\Users\\Admin\\Desktop\\Collegedatamanagementsystem\\frontend\\public";
  const assetsDir = "C:\\Users\\Admin\\Desktop\\Collegedatamanagementsystem\\frontend\\src\\assets";

  console.log("Checking for logo in Downloads folder:", downloadsSrc);

  if (!fs.existsSync(downloadsSrc)) {
    console.error("Error: Could not find 'unnamed.png' in C:\\Users\\Admin\\Downloads\\");
    process.exit(1);
  }

  const srcStats = fs.statSync(downloadsSrc);
  console.log(`Found 'unnamed.png' (${srcStats.size} bytes).`);

  if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  fs.copyFileSync(downloadsSrc, path.join(pubDir, "logo.png"));
  fs.copyFileSync(downloadsSrc, path.join(pubDir, "favicon.png"));
  fs.copyFileSync(downloadsSrc, path.join(pubDir, "favicon.ico"));

  fs.copyFileSync(downloadsSrc, path.join(assetsDir, "logo.png"));

  console.log("SUCCESS: Copied 'unnamed.png' from Downloads into frontend/src/assets/logo.png and frontend/public/logo.png");
}

copyDownloadsLogo();
