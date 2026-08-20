const fs = require("fs");
const path = require("path");

function copyLogo() {
  const src = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\da2d1998-9e4a-4083-8eef-f13b4cd1f8ff\\.user_uploaded\\media_1786426644279.png";
  const pubDir = "C:\\Users\\Admin\\Desktop\\Collegedatamanagementsystem\\frontend\\public";

  if (!fs.existsSync(pubDir)) {
    fs.mkdirSync(pubDir, { recursive: true });
  }

  fs.copyFileSync(src, path.join(pubDir, "logo.png"));
  fs.copyFileSync(src, path.join(pubDir, "favicon.png"));
  fs.copyFileSync(src, path.join(pubDir, "favicon.ico"));

  console.log("SUCCESS: Brand logo copied to frontend/public directory.");
}

copyLogo();
