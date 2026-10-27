// ค่าระบบที่แอดมินปรับได้ (ตาราง system_settings) — ค่าเริ่มต้นตรงกับค่าที่เคยเขียนตายตัวในโค้ด
// อ่านผ่าน cache ในหน่วยความจำ (หมดอายุ 15 วินาที และล้างทันทีเมื่อแอดมินบันทึก)
const db = require("../db");

const CACHE_MS = 15_000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const OTHER_CATEGORY = "อื่น ๆ"; // services/matching.js ให้คะแนนหมวดนี้ต่ำกว่า จึงต้องมีเสมอ

const DEFAULTS = {
  match_min_score: 60,
  certificate_milestone: 3,
  certificate_signer_name: "",
  certificate_signer_title: "",
  suspend_durations: [3, 7, 30],
  categories: ["กระเป๋า", "กุญแจ", "อุปกรณ์อิเล็กทรอนิกส์", "เครื่องประดับ", "เอกสาร", OTHER_CATEGORY],
  deposit_points: [],
  announcement: { enabled: false, message: "", tone: "info", starts_on: null, ends_on: null },
  maintenance: { enabled: false, message: "" },
};

class SettingsError extends Error {}
const fail = (message) => {
  throw new SettingsError(message);
};

const text = (value, field, max, { required = false } = {}) => {
  if (value === undefined || value === null) value = "";
  if (typeof value !== "string") fail(`${field} ต้องเป็นข้อความ`);
  const trimmed = value.trim();
  if (required && !trimmed) fail(`กรุณากรอก${field}`);
  if (trimmed.length > max) fail(`${field} ยาวได้ไม่เกิน ${max} ตัวอักษร`);
  return trimmed;
};

const int = (value, field, min, max) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) fail(`${field} ต้องเป็นจำนวนเต็ม ${min}–${max}`);
  return n;
};

const dateOrNull = (value, field) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) fail(`${field} ต้องเป็นวันที่ YYYY-MM-DD`);
  return value;
};

// ตรวจและทำความสะอาดค่าที่ส่งมา (throw SettingsError พร้อมข้อความภาษาไทย)
const VALIDATORS = {
  match_min_score: (v) => int(v, "เกณฑ์คะแนนการจับคู่", 30, 100),
  certificate_milestone: (v) => int(v, "จำนวนครั้งที่ได้เกียรติบัตร", 1, 50),
  certificate_signer_name: (v) => text(v, "ชื่อผู้ลงนาม", 100),
  certificate_signer_title: (v) => text(v, "ตำแหน่งผู้ลงนาม", 100),
  suspend_durations: (v) => {
    if (!Array.isArray(v) || v.length < 1 || v.length > 6) fail("ระยะเวลาระงับบัญชีต้องมี 1–6 ตัวเลือก");
    const days = [...new Set(v.map((d) => int(d, "จำนวนวันระงับ", 1, 365)))].sort((a, b) => a - b);
    return days;
  },
  categories: (v) => {
    if (!Array.isArray(v) || v.length < 2 || v.length > 20) fail("หมวดหมู่ต้องมี 2–20 รายการ");
    const names = v.map((c) => text(c, "ชื่อหมวดหมู่", 100, { required: true }));
    if (new Set(names).size !== names.length) fail("ชื่อหมวดหมู่ซ้ำกัน");
    if (!names.includes(OTHER_CATEGORY)) fail(`ต้องมีหมวด "${OTHER_CATEGORY}" เสมอ (ใช้กับการจับคู่อัตโนมัติ)`);
    return names;
  },
  deposit_points: (v) => {
    if (!Array.isArray(v) || v.length > 20) fail("จุดรับฝากของมีได้ไม่เกิน 20 จุด");
    const points = v.map((p) => ({
      name: text(p?.name, "ชื่อจุดรับฝาก", 255, { required: true }),
      hours: text(p?.hours, "เวลาทำการ", 100),
    }));
    if (new Set(points.map((p) => p.name)).size !== points.length) fail("ชื่อจุดรับฝากซ้ำกัน");
    return points;
  },
  announcement: (v) => {
    if (!v || typeof v !== "object") fail("ข้อมูลประกาศไม่ถูกต้อง");
    const enabled = Boolean(v.enabled);
    const message = text(v.message, "ข้อความประกาศ", 300, { required: enabled });
    // info = ทั่วไป, important = สำคัญ, maintenance = ปิดปรับปรุง, warning = เตือน, success = ข่าวดี
    const tone = ["info", "important", "maintenance", "warning", "success"].includes(v.tone) ? v.tone : "info";
    const starts_on = dateOrNull(v.starts_on, "วันเริ่มประกาศ");
    const ends_on = dateOrNull(v.ends_on, "วันสิ้นสุดประกาศ");
    if (starts_on && ends_on && starts_on > ends_on) fail("วันเริ่มประกาศต้องไม่อยู่หลังวันสิ้นสุด");
    return { enabled, message, tone, starts_on, ends_on };
  },
  maintenance: (v) => {
    if (!v || typeof v !== "object") fail("ข้อมูลโหมดปิดปรับปรุงไม่ถูกต้อง");
    return { enabled: Boolean(v.enabled), message: text(v.message, "ข้อความปิดปรับปรุง", 300) };
  },
};

let cache = null;
let cachedAt = 0;

const getSettings = async () => {
  if (cache && Date.now() - cachedAt < CACHE_MS) return cache;
  const result = await db.query("SELECT key, value FROM system_settings");
  const stored = Object.fromEntries(result.rows.filter((r) => r.key in DEFAULTS).map((r) => [r.key, r.value]));
  cache = { ...DEFAULTS, ...stored };
  cachedAt = Date.now();
  return cache;
};

const getSetting = async (key) => (await getSettings())[key];

// อ่านค่าโดยไม่ทำให้งานหลักล้ม (ฐานข้อมูลมีปัญหา → ใช้ค่าเริ่มต้น)
const getSettingSafe = async (key) => {
  try {
    return await getSetting(key);
  } catch (error) {
    console.error(`[settings] read ${key} failed, using default:`, error.message);
    return DEFAULTS[key];
  }
};

const clearSettingsCache = () => {
  cache = null;
};

// วันที่วันนี้ตามเวลาประเทศไทย (YYYY-MM-DD)
const todayInBangkok = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });

const isAnnouncementActive = (a) =>
  Boolean(a?.enabled && a.message && (!a.starts_on || a.starts_on <= todayInBangkok()) && (!a.ends_on || a.ends_on >= todayInBangkok()));

module.exports = {
  DEFAULTS,
  VALIDATORS,
  SettingsError,
  getSettings,
  getSetting,
  getSettingSafe,
  clearSettingsCache,
  isAnnouncementActive,
};
