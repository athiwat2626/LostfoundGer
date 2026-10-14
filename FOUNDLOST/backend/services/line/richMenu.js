// Rich Menu ของ KULost&Found: 6 ช่อง (2 แถว × 3 คอลัมน์) เปิดหน้าเว็บแอปด้วย action ประเภท URI
// deployRichMenu ทำงานซ้ำได้: เมนู+ภาพเหมือนเดิม → ใช้ของเดิม / เปลี่ยน → สร้างใหม่ ตั้งเป็นค่าเริ่มต้น แล้วลบเวอร์ชันเก่า
const crypto = require("crypto");

const WIDTH = 2500;
const HEIGHT = 1686;
const MAX_IMAGE_BYTES = 1024 * 1024;
const NAME_PREFIX = "kulostfound-main-";

// path ต้องตรงกับ route ใน frontend/src/App.jsx
const MENU_ITEMS = [
  { key: "report-lost", icon: "📢", label: "แจ้งของหาย", hint: "Report lost item", path: "/lostItem" },
  { key: "search", icon: "🔎", label: "ค้นหาของ", hint: "Search items", path: "/home" },
  { key: "my-items", icon: "📦", label: "รายการของฉัน", hint: "My posts", path: "/my-posts" },
  { key: "report-found", icon: "📍", label: "แจ้งพบของ", hint: "Report found item", path: "/foundItem" },
  { key: "notifications", icon: "🔔", label: "การแจ้งเตือน", hint: "Notifications", path: "/notifications" },
  { key: "account", icon: "👤", label: "บัญชีของฉัน", hint: "My account & LINE", path: "/profile" },
];

const COLUMN_X = [0, 833, 1666, WIDTH];
const ROW_Y = [0, 843, HEIGHT];

const normalizeBaseUrl = (appBaseUrl) => {
  const value = String(appBaseUrl || "").trim().replace(/\/+$/, "");
  if (!value) throw new Error("APP_BASE_URL is not set — กรุณาตั้ง URL จริงของเว็บแอป (เช่น https://lostfound.example.ac.th)");
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`APP_BASE_URL is not a valid URL: ${value}`);
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("APP_BASE_URL must start with https:// (or http:// for local testing)");
  return value;
};

const buildRichMenu = (appBaseUrl) => {
  const base = normalizeBaseUrl(appBaseUrl);
  return {
    size: { width: WIDTH, height: HEIGHT },
    selected: true, // แสดงเมนูเปิดไว้ตั้งแต่เข้าห้องแชต
    name: NAME_PREFIX, // เติม hash ตอน deploy
    chatBarText: "เมนูหลัก",
    areas: MENU_ITEMS.map((item, index) => {
      const col = index % 3;
      const rowIndex = Math.floor(index / 3);
      return {
        bounds: {
          x: COLUMN_X[col],
          y: ROW_Y[rowIndex],
          width: COLUMN_X[col + 1] - COLUMN_X[col],
          height: ROW_Y[rowIndex + 1] - ROW_Y[rowIndex],
        },
        action: { type: "uri", label: item.label, uri: `${base}${item.path}` },
      };
    }),
  };
};

// อ่านชนิดและขนาดภาพจาก header (PNG IHDR / JPEG SOF) โดยไม่ต้องใช้ไลบรารี
const readImageInfo = (buffer) => {
  if (buffer.length > 24 && buffer.readUInt32BE(0) === 0x89504e47) {
    return { type: "image/png", width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) return null;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { type: "image/jpeg", width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      offset += 2 + length;
    }
  }
  return null;
};

const validateImage = (image) => {
  const info = readImageInfo(image);
  if (!info) throw new Error("Rich menu image must be PNG or JPEG");
  if (info.width !== WIDTH || info.height !== HEIGHT) {
    throw new Error(`Rich menu image must be ${WIDTH}x${HEIGHT}px (got ${info.width}x${info.height})`);
  }
  if (image.length > MAX_IMAGE_BYTES) {
    throw new Error(`Rich menu image must not exceed 1 MB (got ${(image.length / 1024).toFixed(0)} KB)`);
  }
  return info;
};

// ชื่อเมนูมี hash ของ (โครงเมนู + ภาพ) → เมนูเหมือนเดิมจะได้ชื่อเดิม ไม่สร้างซ้ำ
const richMenuName = (definition, image) =>
  `${NAME_PREFIX}${crypto.createHash("sha256").update(JSON.stringify(definition)).update(image).digest("hex").slice(0, 16)}`;

/**
 * @param {{ client, appBaseUrl: string, image: Buffer, prune?: boolean, logger?: Console }} options
 */
const deployRichMenu = async ({ client, appBaseUrl, image, prune = true, logger = console }) => {
  const { type } = validateImage(image);
  const definition = buildRichMenu(appBaseUrl);
  definition.name = richMenuName(definition, image);

  const existingMenus = await client.listRichMenus();
  const existing = existingMenus.find((menu) => menu.name === definition.name);

  let richMenuId;
  let created = false;
  let imageUploaded = false;

  if (existing) {
    richMenuId = existing.richMenuId;
    logger.info(`Rich menu ${definition.name} already exists (${richMenuId})`);
    // รอบก่อนอาจสร้างเมนูได้แต่อัปโหลดภาพไม่สำเร็จ
    if (!(await client.hasRichMenuImage(richMenuId))) {
      await client.uploadRichMenuImage(richMenuId, image, type);
      imageUploaded = true;
    }
  } else {
    await client.validateRichMenu(definition);
    richMenuId = await client.createRichMenu(definition);
    created = true;
    try {
      await client.uploadRichMenuImage(richMenuId, image, type);
      imageUploaded = true;
    } catch (error) {
      // เมนูที่ไม่มีภาพใช้งานไม่ได้ → ลบทิ้ง แล้วรันใหม่ได้
      await client.deleteRichMenu(richMenuId).catch(() => {});
      throw error;
    }
    logger.info(`Created rich menu ${definition.name} (${richMenuId})`);
  }

  const currentDefault = await client.getDefaultRichMenuId();
  const defaultChanged = currentDefault !== richMenuId;
  if (defaultChanged) await client.setDefaultRichMenu(richMenuId);

  // ลบเฉพาะเมนูของระบบนี้ (ชื่อขึ้นต้นด้วย prefix) เวอร์ชันเก่า — ไม่แตะเมนูอื่นที่สร้างจาก OA Manager
  const deleted = [];
  if (prune) {
    for (const menu of existingMenus) {
      if (menu.richMenuId !== richMenuId && String(menu.name || "").startsWith(NAME_PREFIX)) {
        await client.deleteRichMenu(menu.richMenuId);
        deleted.push(menu.richMenuId);
      }
    }
  }

  return { richMenuId, name: definition.name, created, imageUploaded, defaultChanged, deleted, definition };
};

module.exports = {
  WIDTH,
  HEIGHT,
  NAME_PREFIX,
  MENU_ITEMS,
  buildRichMenu,
  readImageInfo,
  validateImage,
  richMenuName,
  deployRichMenu,
};
