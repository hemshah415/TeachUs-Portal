const fs = require("fs");
const path = require("path");

function copyLogoToAssets() {
  const src = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\da2d1998-9e4a-4083-8eef-f13b4cd1f8ff\\.user_uploaded\\media_1786426644279.png";
  const pubDir = "C:\\Users\\Admin\\Desktop\\Collegedatamanagementsystem\\frontend\\public";
  const assetsDir = "C:\\Users\\Admin\\Desktop\\Collegedatamanagementsystem\\frontend\\src\\assets";

  if (!fs.existsSync(pubDir)) {
    fs.mkdirSync(pubDir, { recursive: true });
  }
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const srcStats = fs.statSync(src);
  console.log(`Source Image Size: ${srcStats.size} bytes`);

  fs.copyFileSync(src, path.join(pubDir, "logo.png"));
  fs.copyFileSync(src, path.join(pubDir, "favicon.png"));
  fs.copyFileSync(src, path.join(pubDir, "favicon.ico"));

  fs.copyFileSync(src, path.join(assetsDir, "logo.png"));
  fs.copyFileSync(src, path.join(assetsDir, "logo.jpg"));

  console.log("SUCCESS: Brand logo copied to frontend/src/assets and frontend/public.");
}

copyLogoToAssets();
