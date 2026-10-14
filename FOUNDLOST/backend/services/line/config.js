// ค่าตั้งของ LINE อ่านจาก environment ทุกครั้งที่เรียก (ไม่ cache — ทดสอบและเปลี่ยนค่าได้โดยไม่ต้องรีสตาร์ตโมดูล)
// ห้าม log ค่าที่ได้จากฟังก์ชันนี้ เพราะมี access token และ channel secret

const trimSlash = (value) => String(value || "").trim().replace(/\/+$/, "");

const getLineConfig = () => {
  const rawBasicId = String(process.env.LINE_BOT_BASIC_ID || "").trim();
  const basicId = rawBasicId ? `@${rawBasicId.replace(/^@/, "")}` : null;
  return {
    channelAccessToken: String(process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim(),
    channelSecret: String(process.env.LINE_CHANNEL_SECRET || "").trim(),
    // APP_URL คือชื่อเดิมที่ services/notify.js ใช้ — รองรับไว้เพื่อไม่ให้ค่าตั้งเดิมเสีย
    appBaseUrl: trimSlash(process.env.APP_BASE_URL || process.env.APP_URL),
    // Basic ID ของ OA เช่น @123abcde (ไม่ใช่ความลับ) ใช้สร้างลิงก์เพิ่มเพื่อนในหน้าเว็บ
    basicId,
    addFriendUrl: basicId ? `https://line.me/R/ti/p/${encodeURIComponent(basicId)}` : null,
    // QR code เพิ่มเพื่อนทางการของ LINE (สร้างจาก Basic ID)
    addFriendQrUrl: basicId ? `https://qr-official.line.me/sid/L/${encodeURIComponent(basicId.slice(1))}.png` : null,
    linkTokenTtlMinutes: Math.min(60, Math.max(1, Number(process.env.LINE_LINK_TOKEN_TTL_MINUTES) || 15)),
  };
};

const isMessagingConfigured = () => Boolean(getLineConfig().channelAccessToken);
const isWebhookConfigured = () => Boolean(getLineConfig().channelSecret);

// URL หน้าเว็บแอป (คืน null เมื่อยังไม่ได้ตั้ง APP_BASE_URL — ห้ามเดา URL)
const appUrl = (path) => {
  const { appBaseUrl } = getLineConfig();
  return appBaseUrl ? `${appBaseUrl}${path}` : null;
};

module.exports = { getLineConfig, isMessagingConfigured, isWebhookConfigured, appUrl };
