// แปลง richmenu.html เป็นภาพ PNG 2500×1686 ด้วย Chrome/Edge แบบ headless (ไม่ต้องติดตั้งแพ็กเกจเพิ่ม)
// ได้ 2 ภาพ: richmenu.png (ยังไม่เชื่อมบัญชี) และ richmenu-linked.png (เชื่อมแล้ว)
//   npm run line:richmenu:image
//   CHROME_PATH=/path/to/chrome npm run line:richmenu:image   (เมื่อหาเบราว์เซอร์อัตโนมัติไม่เจอ)
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { pathToFileURL } = require("url");
const { WIDTH, HEIGHT, validateImage } = require("../../services/line/richMenu");

const TEMPLATE = path.join(__dirname, "richmenu.html");
const OUTPUT_DIR = path.join(__dirname, "..", "..", "assets", "line");
const VARIANTS = [
  { hash: "", output: path.join(OUTPUT_DIR, "richmenu.png") },
  { hash: "#linked", output: path.join(OUTPUT_DIR, "richmenu-linked.png") },
];

const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

const browser = CANDIDATES.find((candidate) => candidate && fs.existsSync(candidate));
if (!browser) {
  console.error("ไม่พบ Chrome/Edge — ตั้งค่า CHROME_PATH ให้ชี้ไปยังไฟล์เบราว์เซอร์ หรือออกแบบภาพ 2500×1686 เองแล้วบันทึกที่ " + OUTPUT_DIR);
  process.exit(1);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

for (const { hash, output } of VARIANTS) {
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "richmenu-chrome-"));
  const result = spawnSync(
    browser,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--log-level=3",
      "--no-first-run",
      "--disable-background-networking",
      "--force-device-scale-factor=1",
      `--user-data-dir=${profileDir}`,
      `--window-size=${WIDTH},${HEIGHT}`,
      `--screenshot=${output}`,
      "--virtual-time-budget=3000", // รอฟอนต์โหลดก่อนจับภาพ
      pathToFileURL(TEMPLATE).href + hash,
    ],
    { stdio: "inherit", timeout: 60_000 }
  );
  fs.rmSync(profileDir, { recursive: true, force: true });

  if (result.status !== 0 || !fs.existsSync(output)) {
    console.error(`สร้างภาพไม่สำเร็จ: ${output}`);
    process.exit(1);
  }

  const image = fs.readFileSync(output);
  try {
    validateImage(image);
  } catch (error) {
    console.error(`ภาพที่ได้ใช้ไม่ได้ (${output}): ${error.message}`);
    process.exit(1);
  }
  console.log(`Saved ${output} (${WIDTH}x${HEIGHT}, ${(image.length / 1024).toFixed(0)} KB)`);
}
