// สร้าง/อัปเดต Rich Menu ผ่าน LINE Messaging API แล้วตั้งเป็นเมนูเริ่มต้นของทุกคนที่เพิ่มเพื่อน
//
//   npm run line:richmenu                 สร้างหรือใช้เมนูเดิม + ตั้งเป็นค่าเริ่มต้น + ลบเวอร์ชันเก่า
//   npm run line:richmenu -- --dry-run    แสดง JSON ของเมนูโดยไม่เรียก LINE API
//   npm run line:richmenu -- --no-prune   ไม่ลบเมนูเวอร์ชันเก่า
//   npm run line:richmenu -- --image path/to/menu.png
//
// ต้องตั้ง LINE_CHANNEL_ACCESS_TOKEN และ APP_BASE_URL ใน backend/.env
const fs = require("fs");
const path = require("path");
const client = require("../../services/line/lineClient");
const { getLineConfig } = require("../../services/line/config");
const { buildRichMenu, deployRichMenu, validateImage } = require("../../services/line/richMenu");

const DEFAULT_IMAGE = path.join(__dirname, "..", "..", "assets", "line", "richmenu.png");

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const main = async () => {
  const { appBaseUrl, channelAccessToken } = getLineConfig();
  const imagePath = path.resolve(option("--image") || DEFAULT_IMAGE);

  if (flag("--dry-run")) {
    console.log(JSON.stringify(buildRichMenu(appBaseUrl), null, 2));
    return;
  }

  if (!channelAccessToken) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set in backend/.env");
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Rich menu image not found: ${imagePath}\nสร้างภาพด้วย: npm run line:richmenu:image`);
  }
  const image = fs.readFileSync(imagePath);
  validateImage(image);

  const result = await deployRichMenu({ client, appBaseUrl, image, prune: !flag("--no-prune") });
  console.log("\nRich menu deployed");
  console.log(`  id:              ${result.richMenuId}`);
  console.log(`  name:            ${result.name}`);
  console.log(`  created:         ${result.created ? "yes (new version)" : "no (reused existing)"}`);
  console.log(`  image uploaded:  ${result.imageUploaded ? "yes" : "no (already present)"}`);
  console.log(`  default changed: ${result.defaultChanged ? "yes" : "no (already default)"}`);
  console.log(`  old menus removed: ${result.deleted.length}`);
  result.definition.areas.forEach((area) => console.log(`    • ${area.action.label} → ${area.action.uri}`));
};

main().catch((error) => {
  console.error(`\nRich menu deployment failed: ${error.message}`);
  process.exit(1);
});
