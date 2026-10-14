// สร้างข้อความ LINE (ข้อความธรรมดา, ปุ่ม, Flex) — ไม่มี I/O ทดสอบได้ตรง ๆ
const { appUrl } = require("./config");

const BRAND = "#006664";
const MAX_BUBBLES = 5; // carousel แสดงได้สูงสุด 12 แต่ 5 ก็พอและไม่ยาวเกินไป

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

// วันที่ (คอลัมน์ DATE) → "14 ต.ค. 2569"
// pg แปลง DATE เป็น Date เวลาเที่ยงคืนตามเขตเวลาเครื่อง ส่วนข้อมูลจากฟอร์มเป็นสตริง YYYY-MM-DD
const formatThaiDate = (value) => {
  let y, m, d;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    [y, m, d] = [value.getFullYear(), value.getMonth(), value.getDate()];
  } else {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
    if (!match) return "-";
    [y, m, d] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  }
  return `${d} ${THAI_MONTHS[m]} ${y + 543}`;
};

const clip = (value, max) => {
  const text = String(value || "").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

const text = (value) => ({ type: "text", text: clip(value, 4900) });

// ─── เชื่อมบัญชี ─────────────────────────────────────────────────────────────
const linkUrl = (token) => appUrl(`/line/link?token=${encodeURIComponent(token)}`);

const linkButtonMessage = (token, intro) => {
  const uri = linkUrl(token);
  if (!uri) {
    return text(`${intro}\n\n(ระบบยังไม่ได้ตั้งค่าที่อยู่เว็บแอป กรุณาติดต่อผู้ดูแลระบบ)`);
  }
  return {
    type: "template",
    altText: `${intro} เปิดลิงก์เพื่อเชื่อมบัญชี: ${uri}`.slice(0, 400),
    template: {
      type: "buttons",
      text: clip(intro, 160),
      actions: [{ type: "uri", label: "🔗 เชื่อมบัญชี", uri }],
    },
  };
};

const welcomeMessages = ({ linked, token, displayName, ttlMinutes }) => {
  const greeting = `สวัสดี${displayName ? ` คุณ${displayName}` : ""} 👋\nยินดีต้อนรับสู่ KULost&Found ระบบแจ้งของหาย-ของพบ มหาวิทยาลัยเกษตรศาสตร์`;
  if (linked) {
    return [text(`${greeting}\n\nบัญชี LINE นี้เชื่อมกับบัญชีเว็บแอปแล้ว ระบบจะแจ้งเตือนเมื่อพบรายการที่อาจตรงกับของที่คุณแจ้งหาย`)];
  }
  return [
    text(
      `${greeting}\n\nเชื่อมบัญชีเว็บแอปกับ LINE เพื่อรับแจ้งเตือนเมื่อมีคนแจ้งพบของที่อาจเป็นของคุณ\n` +
        `ลิงก์ด้านล่างใช้ได้ครั้งเดียวภายใน ${ttlMinutes} นาที — ระบบจะไม่ขอรหัสผ่านผ่าน LINE`
    ),
    linkButtonMessage(token, "กดปุ่มด้านล่าง แล้วเข้าสู่ระบบเว็บแอปเพื่อยืนยันการเชื่อมบัญชี"),
  ];
};

const HELP_TEXT =
  "คำสั่งที่ใช้ได้\n• เชื่อมบัญชี — ขอลิงก์เชื่อมบัญชีเว็บแอป\n• สถานะ — ดูสถานะการเชื่อมบัญชี\n• ยกเลิกการเชื่อม — เลิกเชื่อม LINE กับบัญชีเว็บแอป\n\nหรือใช้เมนูด้านล่างเพื่อเปิดหน้าต่าง ๆ ของเว็บแอป";

// ─── แจ้งเตือนคู่ที่อาจตรงกัน ──────────────────────────────────────────────────
const MATCH_HEADLINE = "🔔 KULost&Found พบรายการที่อาจตรงกับของที่คุณแจ้งหาย";
const DISCLAIMER = "กรุณาตรวจสอบรายละเอียดและยืนยันด้วยตนเองก่อนติดต่อรับคืน";

// ระดับความใกล้เคียงแบบภาษาคน (ไม่บอกว่า "ตรงกันแน่นอน" เพราะเป็นเพียงความเป็นไปได้)
const confidenceLabel = (score) => (score >= 80 ? "ใกล้เคียงมาก" : "ใกล้เคียง");

// เปิดหน้าโพสต์ของฉันที่ของหายชิ้นนั้น พร้อมแผงรายการที่อาจตรงกัน (API ตรวจสิทธิ์เจ้าของทุกครั้ง)
const matchDetailUrl = (lostItemId) => appUrl(`/my-posts?type=lost&item=${encodeURIComponent(lostItemId)}&panel=matches`);

const detailText = (found) => [found.category, found.item_color && `สี${found.item_color.replace(/^สี/, "")}`].filter(Boolean).join(" · ") || "-";

const row = (label, value) => ({
  type: "box",
  layout: "baseline",
  spacing: "sm",
  contents: [
    { type: "text", text: label, size: "sm", color: "#64748b", flex: 3 },
    { type: "text", text: clip(value, 120) || "-", size: "sm", color: "#0f172a", flex: 6, wrap: true },
  ],
});

/**
 * @param {{ lost: { item_id, item_name }, found: { item_name, category, item_color, location, date }, score, reasons? }} match
 * ไม่ใส่ชื่อ/ช่องทางติดต่อ/คำอธิบายอิสระของผู้แจ้งพบ (อาจมีข้อมูลส่วนบุคคล) — ดูต่อในเว็บแอปซึ่งตรวจสิทธิ์แล้ว
 */
const matchBubble = (match) => {
  const uri = matchDetailUrl(match.lost.item_id);
  const bubble = {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: BRAND,
      paddingAll: "12px",
      contents: [
        { type: "text", text: "🔔 รายการที่อาจตรงกัน", color: "#ffffff", weight: "bold", size: "sm" },
        { type: "text", text: clip(`ของที่คุณแจ้งหาย: ${match.lost.item_name}`, 60), color: "#d9f99d", size: "xs", wrap: true },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        row("📦 สิ่งของ", match.found.item_name),
        row("🎨 รายละเอียด", detailText(match.found)),
        row("📍 สถานที่พบ", match.found.location),
        row("📅 วันที่พบ", formatThaiDate(match.found.date)),
        row("🔎 ความใกล้เคียง", `${confidenceLabel(match.score)}${match.reasons?.length ? ` (${match.reasons.join(", ")})` : ""}`),
        { type: "text", text: DISCLAIMER, size: "xxs", color: "#94a3b8", wrap: true, margin: "md" },
      ],
    },
  };
  if (uri) {
    bubble.footer = {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "button", style: "primary", color: BRAND, height: "sm", action: { type: "uri", label: "🔎 ดูรายละเอียดรายการ", uri } },
      ],
    };
  }
  return bubble;
};

// ข้อความสำรอง (altText) แสดงในการแจ้งเตือนบนมือถือและใน LINE เวอร์ชันที่ไม่รองรับ Flex
const matchAltText = (matches) => {
  const first = matches[0];
  const more = matches.length > 1 ? ` และอีก ${matches.length - 1} รายการ` : "";
  return clip(`${MATCH_HEADLINE}: ${first.found.item_name} (${first.found.location || "-"})${more}`, 400);
};

const matchMessages = (matches) => {
  const shown = matches.slice(0, MAX_BUBBLES);
  const bubbles = shown.map(matchBubble);
  return [
    text(`${MATCH_HEADLINE}\n\n${DISCLAIMER}`),
    {
      type: "flex",
      altText: matchAltText(shown),
      contents: bubbles.length === 1 ? bubbles[0] : { type: "carousel", contents: bubbles },
    },
  ];
};

module.exports = {
  formatThaiDate,
  linkUrl,
  linkButtonMessage,
  welcomeMessages,
  HELP_TEXT,
  MATCH_HEADLINE,
  DISCLAIMER,
  matchDetailUrl,
  matchMessages,
  text,
};
