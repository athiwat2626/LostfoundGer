// Rich Menu ของ KULost&Found: 6 ช่อง (2 แถว × 3 คอลัมน์) — 5 ช่องเปิดหน้าเว็บแอปด้วย action ประเภท URI
// + 1 ช่อง (แถว 2 ช่องกลาง) ที่ต่างกันตามสถานะการเชื่อมบัญชี
//     ยังไม่เชื่อม → "เชื่อมบัญชี"     (เมนูเริ่มต้นของทุกคน)
//     เชื่อมแล้ว   → "ยกเลิกการเชื่อม" (ผูกเป็นเมนูรายคนด้วย createRichMenuSwitcher)
// deployRichMenu ทำงานซ้ำได้: เมนู+ภาพเหมือนเดิม → ใช้ของเดิม / เปลี่ยน → สร้างใหม่ ตั้งเป็นค่าเริ่มต้น แล้วลบเวอร์ชันเก่า
const crypto = require("crypto");

const WIDTH = 2500;
const HEIGHT = 1686;
const MAX_IMAGE_BYTES = 1024 * 1024;
const NAME_PREFIX = "kulostfound-main-";
const LINKED_NAME_PREFIX = "kulostfound-linked-";
const BULK_LINK_LIMIT = 500;

// path ต้องตรงกับ route ใน frontend/src/App.jsx
const MENU_ITEMS = [
  { key: "report-lost", icon: "📢", label: "แจ้งของหาย", hint: "Report lost item", path: "/lostItem" },
  { key: "search", icon: "🔎", label: "ค้นหาของ", hint: "Search items", path: "/home" },
  { key: "my-items", icon: "📦", label: "รายการของฉัน", hint: "My posts", path: "/my-posts" },
  { key: "report-found", icon: "📍", label: "แจ้งพบของ", hint: "Report found item", path: "/foundItem" },
  { key: "account", icon: "👤", label: "บัญชีของฉัน", hint: "My account & LINE", path: "/profile" },
];
// ตำแหน่งช่องเชื่อม/ยกเลิกการเชื่อม (นับจาก 0 ซ้าย→ขวา บน→ล่าง) — ต้องตรงกับ richmenu.html
const LINK_SLOT_INDEX = 4;

// ปุ่มเชื่อม/ยกเลิก — ข้อความ/postback ต้องตรงกับที่ webhook รองรับ (services/line/webhook.js)
const LINK_ACTION = { type: "message", label: "เชื่อมบัญชี", text: "เชื่อมบัญชี" };
// ยกเลิกใช้ postback ให้บอทถามยืนยันก่อน เพราะกดพลาดจากเมนูได้ง่าย
const UNLINK_PROMPT_DATA = "action=unlink_prompt";
const UNLINK_ACTION = {
  type: "postback",
  label: "ยกเลิกการเชื่อม",
  data: UNLINK_PROMPT_DATA,
  displayText: "ยกเลิกการเชื่อมบัญชี",
};

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

const buildRichMenu = (appBaseUrl, { linked = false } = {}) => {
  const base = normalizeBaseUrl(appBaseUrl);
  const actions = MENU_ITEMS.map((item) => ({ type: "uri", label: item.label, uri: `${base}${item.path}` }));
  actions.splice(LINK_SLOT_INDEX, 0, linked ? UNLINK_ACTION : LINK_ACTION);
  return {
    size: { width: WIDTH, height: HEIGHT },
    selected: true, // แสดงเมนูเปิดไว้ตั้งแต่เข้าห้องแชต
    name: linked ? LINKED_NAME_PREFIX : NAME_PREFIX, // เติม hash ตอน deploy
    chatBarText: "เมนูหลัก",
    areas: actions.map((action, index) => {
      const col = index % 3;
      const rowIndex = Math.floor(index / 3);
      return {
        bounds: {
          x: COLUMN_X[col],
          y: ROW_Y[rowIndex],
          width: COLUMN_X[col + 1] - COLUMN_X[col],
          height: ROW_Y[rowIndex + 1] - ROW_Y[rowIndex],
        },
        action,
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
  `${definition.name}${crypto.createHash("sha256").update(JSON.stringify(definition)).update(image).digest("hex").slice(0, 16)}`;

// สร้างเมนูตามชื่อ (hash) หรือใช้ของเดิมที่มีอยู่แล้ว
const ensureMenu = async ({ client, definition, image, existingMenus, logger }) => {
  const { type } = validateImage(image);
  definition.name = richMenuName(definition, image);
  const existing = existingMenus.find((menu) => menu.name === definition.name);

  if (existing) {
    logger.info(`Rich menu ${definition.name} already exists (${existing.richMenuId})`);
    // รอบก่อนอาจสร้างเมนูได้แต่อัปโหลดภาพไม่สำเร็จ
    if (!(await client.hasRichMenuImage(existing.richMenuId))) {
      await client.uploadRichMenuImage(existing.richMenuId, image, type);
      return { richMenuId: existing.richMenuId, created: false, imageUploaded: true };
    }
    return { richMenuId: existing.richMenuId, created: false, imageUploaded: false };
  }

  await client.validateRichMenu(definition);
  const richMenuId = await client.createRichMenu(definition);
  try {
    await client.uploadRichMenuImage(richMenuId, image, type);
  } catch (error) {
    // เมนูที่ไม่มีภาพใช้งานไม่ได้ → ลบทิ้ง แล้วรันใหม่ได้
    await client.deleteRichMenu(richMenuId).catch(() => {});
    throw error;
  }
  logger.info(`Created rich menu ${definition.name} (${richMenuId})`);
  return { richMenuId, created: true, imageUploaded: true };
};

/**
 * @param {{ client, appBaseUrl: string, image: Buffer, linkedImage?: Buffer, linkedUserIds?: string[], prune?: boolean, logger?: Console }} options
 *   linkedImage    ภาพเมนูของผู้ที่เชื่อมบัญชีแล้ว (ไม่ส่ง = deploy เฉพาะเมนูเริ่มต้น)
 *   linkedUserIds  LINE user id ที่เชื่อมบัญชีแล้ว — ผูกเมนู "เชื่อมแล้ว" ให้ทันที
 */
const deployRichMenu = async ({ client, appBaseUrl, image, linkedImage = null, linkedUserIds = [], prune = true, logger = console }) => {
  const definition = buildRichMenu(appBaseUrl);
  const linkedDefinition = linkedImage ? buildRichMenu(appBaseUrl, { linked: true }) : null;
  validateImage(image);
  if (linkedImage) validateImage(linkedImage);

  const existingMenus = await client.listRichMenus();
  const main = await ensureMenu({ client, definition, image, existingMenus, logger });

  const currentDefault = await client.getDefaultRichMenuId();
  const defaultChanged = currentDefault !== main.richMenuId;
  if (defaultChanged) await client.setDefaultRichMenu(main.richMenuId);

  let linked = null;
  if (linkedDefinition) {
    linked = await ensureMenu({ client, definition: linkedDefinition, image: linkedImage, existingMenus, logger });
    // ผูกก่อนลบเวอร์ชันเก่า — ผู้ใช้ที่เชื่อมแล้วจะไม่หลุดกลับไปเห็นปุ่ม "เชื่อมบัญชี"
    for (let i = 0; i < linkedUserIds.length; i += BULK_LINK_LIMIT) {
      await client.bulkLinkRichMenu(linked.richMenuId, linkedUserIds.slice(i, i + BULK_LINK_LIMIT));
    }
    linked = { ...linked, name: linkedDefinition.name, definition: linkedDefinition, usersLinked: linkedUserIds.length };
  }

  // ลบเฉพาะเมนูของระบบนี้ (ชื่อขึ้นต้นด้วย prefix) เวอร์ชันเก่า — ไม่แตะเมนูอื่นที่สร้างจาก OA Manager
  const deleted = [];
  if (prune) {
    const prefixes = linked ? [NAME_PREFIX, LINKED_NAME_PREFIX] : [NAME_PREFIX];
    const keep = new Set([main.richMenuId, linked?.richMenuId].filter(Boolean));
    for (const menu of existingMenus) {
      if (!keep.has(menu.richMenuId) && prefixes.some((prefix) => String(menu.name || "").startsWith(prefix))) {
        await client.deleteRichMenu(menu.richMenuId);
        deleted.push(menu.richMenuId);
      }
    }
  }

  return {
    richMenuId: main.richMenuId,
    name: definition.name,
    created: main.created,
    imageUploaded: main.imageUploaded,
    defaultChanged,
    deleted,
    definition,
    linked,
  };
};

const SWITCHER_CACHE_MS = 10 * 60 * 1000;

/**
 * สลับเมนูรายคนตามสถานะการเชื่อมบัญชี (ทำแบบ best effort — ล้มเหลวก็ไม่กระทบการเชื่อม/ยกเลิก)
 * @param {{ client, isConfigured: () => boolean, logger?: Console, now?: () => number }} deps
 */
const createRichMenuSwitcher = ({ client, isConfigured, logger = console, now = Date.now }) => {
  let cache = { at: 0, id: null };

  // หา id ของเมนู "เชื่อมแล้ว" จากชื่อ (cache ไว้ — deploy ใหม่แล้ว id เปลี่ยน จะค้นใหม่เมื่อผูกไม่สำเร็จ)
  const linkedMenuId = async ({ refresh = false } = {}) => {
    if (!refresh && cache.at && now() - cache.at < SWITCHER_CACHE_MS) return cache.id;
    const menus = await client.listRichMenus();
    const id = menus.find((menu) => String(menu.name || "").startsWith(LINKED_NAME_PREFIX))?.richMenuId || null;
    cache = { at: now(), id };
    return id;
  };

  const showLinked = async (lineUserId) => {
    const id = await linkedMenuId();
    if (!id) return; // ยังไม่ได้ deploy เมนู "เชื่อมแล้ว"
    try {
      await client.linkRichMenuToUser(lineUserId, id);
    } catch (error) {
      if (error.status !== 404 && error.status !== 400) throw error;
      const fresh = await linkedMenuId({ refresh: true });
      if (fresh && fresh !== id) await client.linkRichMenuToUser(lineUserId, fresh);
      else throw error;
    }
  };

  const apply = async (lineUserId, linked) => {
    if (!lineUserId || !isConfigured()) return;
    try {
      if (linked) await showLinked(lineUserId);
      else await client.unlinkRichMenuFromUser(lineUserId);
    } catch (error) {
      logger.warn(`[line] switch rich menu (linked=${linked}) failed: ${error.message}`);
    }
  };

  return { apply };
};

module.exports = {
  WIDTH,
  HEIGHT,
  NAME_PREFIX,
  LINKED_NAME_PREFIX,
  MENU_ITEMS,
  UNLINK_PROMPT_DATA,
  buildRichMenu,
  readImageInfo,
  validateImage,
  richMenuName,
  deployRichMenu,
  createRichMenuSwitcher,
};
