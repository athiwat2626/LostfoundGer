// แปลง scripts/og-image.html เป็น public/og-image.png (1200×630) ด้วย Chrome/Edge แบบ headless
//   node scripts/render-og-image.js
//   CHROME_PATH=/path/to/chrome node scripts/render-og-image.js   (เมื่อหาเบราว์เซอร์อัตโนมัติไม่เจอ)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const WIDTH = 1200;
const HEIGHT = 630;
const here = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(here, "og-image.html");
const OUTPUT = path.join(here, "..", "public", "og-image.png");

const browser = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((candidate) => candidate && fs.existsSync(candidate));
if (!browser) {
  console.error("ไม่พบ Chrome/Edge — ตั้งค่า CHROME_PATH");
  process.exit(1);
}

const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "og-chrome-"));
const result = spawnSync(
  browser,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--log-level=3",
    "--no-first-run",
    "--force-device-scale-factor=1",
    `--user-data-dir=${profileDir}`,
    `--window-size=${WIDTH},${HEIGHT}`,
    `--screenshot=${OUTPUT}`,
    "--virtual-time-budget=3000", // รอฟอนต์/รูปโหลดก่อนจับภาพ
    pathToFileURL(TEMPLATE).href,
  ],
  { stdio: "inherit", timeout: 60_000 }
);
fs.rmSync(profileDir, { recursive: true, force: true });

if (result.status !== 0 || !fs.existsSync(OUTPUT)) {
  console.error("สร้างภาพไม่สำเร็จ");
  process.exit(1);
}
console.log(`Saved ${OUTPUT} (${(fs.statSync(OUTPUT).size / 1024).toFixed(0)} KB)`);
