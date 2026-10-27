// สร้าง/อัปเดต Rich Menu ผ่าน LINE Messaging API
//   เมนูเริ่มต้น (ปุ่ม "เชื่อมบัญชี")          → ตั้งเป็นค่าเริ่มต้นของทุกคนที่เพิ่มเพื่อน
//   เมนูเชื่อมแล้ว (ปุ่ม "ยกเลิกการเชื่อมบัญชี") → ผูกให้ทุกคนที่เชื่อมบัญชีแล้ว (อ่านจากฐานข้อมูล)
//
//   npm run line:richmenu                 สร้างหรือใช้เมนูเดิม + ตั้งเป็นค่าเริ่มต้น + ลบเวอร์ชันเก่า
//   npm run line:richmenu -- --dry-run    แสดง JSON ของเมนูโดยไม่เรียก LINE API
//   npm run line:richmenu -- --no-prune   ไม่ลบเมนูเวอร์ชันเก่า
//   npm run line:richmenu -- --image path/to/menu.png --linked-image path/to/menu-linked.png
//
// ต้องตั้ง LINE_CHANNEL_ACCESS_TOKEN, APP_BASE_URL และค่าฐานข้อมูลใน backend/.env
const fs = require("fs");
const path = require("path");
const client = require("../../services/line/lineClient");
const { getLineConfig } = require("../../services/line/config");
const { buildRichMenu, deployRichMenu, validateImage } = require("../../services/line/richMenu");

const IMAGE_DIR = path.join(__dirname, "..", "..", "assets", "line");
const DEFAULT_IMAGE = path.join(IMAGE_DIR, "richmenu.png");
const DEFAULT_LINKED_IMAGE = path.join(IMAGE_DIR, "richmenu-linked.png");

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const readImage = (imagePath) => {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Rich menu image not found: ${imagePath}\nสร้างภาพด้วย: npm run line:richmenu:image`);
  }
  const image = fs.readFileSync(imagePath);
  validateImage(image);
  return image;
};

const printAreas = (definition) =>
  definition.areas.forEach((area) => console.log(`    • ${area.action.label} → ${area.action.uri || area.action.text || area.action.data}`));

const main = async () => {
  const { appBaseUrl, channelAccessToken } = getLineConfig();

  if (flag("--dry-run")) {
    console.log(JSON.stringify({ main: buildRichMenu(appBaseUrl), linked: buildRichMenu(appBaseUrl, { linked: true }) }, null, 2));
    return;
  }

  if (!channelAccessToken) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set in backend/.env");
  const image = readImage(path.resolve(option("--image") || DEFAULT_IMAGE));
  const linkedImage = readImage(path.resolve(option("--linked-image") || DEFAULT_LINKED_IMAGE));

  // โหลดฐานข้อมูลเฉพาะตอน deploy จริง (dry-run ไม่ต้องมีฐานข้อมูล)
  const db = require("../../db");
  const { createLineRepository } = require("../../services/line/lineRepository");
  const linkedUserIds = await createLineRepository(db).listLinkedLineUserIds();

  const result = await deployRichMenu({ client, appBaseUrl, image, linkedImage, linkedUserIds, prune: !flag("--no-prune") });
  console.log("\nRich menu deployed");
  console.log(`  id:              ${result.richMenuId}`);
  console.log(`  name:            ${result.name}`);
  console.log(`  created:         ${result.created ? "yes (new version)" : "no (reused existing)"}`);
  console.log(`  image uploaded:  ${result.imageUploaded ? "yes" : "no (already present)"}`);
  console.log(`  default changed: ${result.defaultChanged ? "yes" : "no (already default)"}`);
  printAreas(result.definition);
  console.log(`\n  linked menu id:  ${result.linked.richMenuId}`);
  console.log(`  name:            ${result.linked.name}`);
  console.log(`  created:         ${result.linked.created ? "yes (new version)" : "no (reused existing)"}`);
  console.log(`  users switched:  ${result.linked.usersLinked}`);
  printAreas(result.linked.definition);
  console.log(`\n  old menus removed: ${result.deleted.length}`);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`\nRich menu deployment failed: ${error.message}`);
    process.exit(1);
  });
