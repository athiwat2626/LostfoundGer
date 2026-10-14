// จับคู่อัตโนมัติ: หาโพสต์ฝั่งตรงข้าม (ของหาย ↔ ของพบ) ที่น่าจะเป็นของชิ้นเดียวกัน
const db = require("../db");

const FIELDS = {
  found: { table: "found_items", date: "found_date", location: "found_location" },
  lost: { table: "lost_items", date: "lost_date", location: "lost_location" },
};
const OTHER = { found: "lost", lost: "found" };

// ของมักถูกพบหลังจากหาย: ของหายวันที่ d → หาของพบช่วง d-2 ถึง d+30 วัน (และกลับกัน)
const WINDOW = {
  lost: { before: 2, after: 30 },
  found: { before: 30, after: 2 },
};

const DEFAULT_MIN_SCORE = 50;
const OTHER_CATEGORY = "อื่น ๆ";

const normalize = (value) => String(value || "").toLowerCase().replace(/\s+/g, "");

// ความคล้ายของข้อความด้วย bigram (ใช้ได้กับภาษาไทยที่ไม่มีเว้นวรรค) คืนค่า 0–1
const similarity = (a, b) => {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.length < 2 || y.length < 2) return x.includes(y) || y.includes(x) ? 0.8 : 0;
  const grams = (s) => {
    const map = new Map();
    for (let i = 0; i < s.length - 1; i += 1) {
      const g = s.slice(i, i + 2);
      map.set(g, (map.get(g) || 0) + 1);
    }
    return map;
  };
  const gx = grams(x);
  const gy = grams(y);
  let overlap = 0;
  for (const [g, n] of gx) overlap += Math.min(n, gy.get(g) || 0);
  const dice = (2 * overlap) / (x.length - 1 + (y.length - 1));
  // ชื่อหนึ่งอยู่ในอีกชื่อ เช่น "กระเป๋าสตางค์" กับ "กระเป๋าสตางค์สีดำ" ให้คะแนนอย่างน้อย 0.75
  return x.includes(y) || y.includes(x) ? Math.max(dice, 0.75) : dice;
};

const daysBetween = (a, b) => Math.abs(new Date(a) - new Date(b)) / 86_400_000;

// คะแนน 0–100 พร้อมเหตุผลสั้น ๆ ที่แสดงให้ผู้ใช้ดู
const scorePair = (item, candidate) => {
  let score = 0;
  const reasons = [];

  if (item.category && candidate.category && item.category === candidate.category) {
    const points = item.category === OTHER_CATEGORY ? 10 : 25;
    score += points;
    reasons.push("หมวดเดียวกัน");
  }

  const nameScore = similarity(item.item_name, candidate.item_name);
  if (nameScore >= 0.45) {
    score += Math.round(nameScore * 45);
    reasons.push("ชื่อคล้ายกัน");
  }

  const placeScore = similarity(item.location, candidate.location);
  // สถานที่ต้องใกล้เคียงมาก (เช่น "SC-2" กับ "SC-9" เป็นคนละอาคาร)
  if (placeScore >= 0.8) {
    score += Math.round(placeScore * 20);
    reasons.push("สถานที่ใกล้เคียง");
  }

  if (item.date && candidate.date) {
    const days = daysBetween(item.date, candidate.date);
    score += Math.max(0, Math.round(10 - days / 3));
    if (days <= 3) reasons.push("ช่วงเวลาใกล้กัน");
  }

  return { score: Math.min(100, score), reasons };
};

/**
 * หาโพสต์ฝั่งตรงข้ามที่อาจตรงกับรายการนี้
 * @param {"found"|"lost"} type ประเภทของรายการต้นทาง
 * @param {{ item_id, item_name, category, date, location, student_id }} item
 */
const findMatches = async (type, item, { limit = 5, minScore = DEFAULT_MIN_SCORE } = {}) => {
  const other = FIELDS[OTHER[type]];
  const window = WINDOW[type];
  if (!item.date) return [];

  const result = await db.query(
    `SELECT item_id, item_name, category, ${other.date} AS date, ${other.location} AS location,
            image_url, student_id, created_at, deposit_location, description, item_color
     FROM ${other.table}
     WHERE status = 'open'
       AND ${other.date} BETWEEN $1::date - $2::int AND $1::date + $3::int
       AND ($4::varchar IS NULL OR student_id IS DISTINCT FROM $4)
     ORDER BY created_at DESC
     LIMIT 300`,
    [item.date, window.before, window.after, item.student_id || null]
  );

  return result.rows
    .map((candidate) => ({ ...candidate, type: OTHER[type], ...scorePair(item, candidate) }))
    .filter((candidate) => candidate.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

module.exports = { findMatches, similarity, scorePair, FIELDS };
