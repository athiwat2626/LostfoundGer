// ตรวจ Google ID token (จากปุ่ม "Sign in with Google" ฝั่งหน้าเว็บ) ด้วยกุญแจสาธารณะของ Google
// ไม่ต้องใช้ไลบรารีเพิ่ม: ดึง JWK จาก Google (cache ตาม Cache-Control) แล้วตรวจลายเซ็น RS256 ด้วย jsonwebtoken
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = ["accounts.google.com", "https://accounts.google.com"];

class GoogleAuthError extends Error {}

const getClientId = () => String(process.env.GOOGLE_CLIENT_ID || "").trim();

// โดเมนอีเมลที่อนุญาต (เช่น "ku.th,live.ku.th") — ไม่ตั้งค่า = รับทุกโดเมน
const allowedDomains = () =>
  String(process.env.GOOGLE_ALLOWED_DOMAINS || "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

let cache = { keys: new Map(), expiresAt: 0 };

const fetchKeys = async (fetchImpl = fetch) => {
  if (cache.keys.size > 0 && Date.now() < cache.expiresAt) return cache.keys;
  const response = await fetchImpl(CERTS_URL);
  if (!response.ok) throw new Error(`Google certs HTTP ${response.status}`);
  const { keys } = await response.json();
  const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get("cache-control") || "")?.[1] || 3600);
  cache = {
    keys: new Map(keys.map((jwk) => [jwk.kid, crypto.createPublicKey({ key: jwk, format: "jwk" })])),
    expiresAt: Date.now() + Math.min(maxAge, 86400) * 1000,
  };
  return cache.keys;
};

/**
 * ตรวจ ID token แล้วคืนข้อมูลผู้ใช้จาก Google
 * @returns {{ sub: string, email: string, firstName: string, lastName: string, picture: string|null }}
 */
const verifyGoogleIdToken = async (idToken, { clientId = getClientId(), fetchImpl } = {}) => {
  if (!clientId) throw new GoogleAuthError("ยังไม่ได้ตั้งค่า Google Sign-In");
  if (typeof idToken !== "string" || idToken.split(".").length !== 3) throw new GoogleAuthError("ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง");

  const kid = jwt.decode(idToken, { complete: true })?.header?.kid;
  let key = (await fetchKeys(fetchImpl)).get(kid);
  if (!key) {
    // Google หมุนกุญแจใหม่ → โหลดใหม่หนึ่งครั้ง
    cache.expiresAt = 0;
    key = (await fetchKeys(fetchImpl)).get(kid);
  }
  if (!key) throw new GoogleAuthError("ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง");

  let payload;
  try {
    payload = jwt.verify(idToken, key, { algorithms: ["RS256"], audience: clientId, issuer: ISSUERS });
  } catch {
    throw new GoogleAuthError("ข้อมูลการเข้าสู่ระบบไม่ถูกต้องหรือหมดอายุ");
  }

  const email = String(payload.email || "").trim().toLowerCase();
  if (!email || payload.email_verified !== true) throw new GoogleAuthError("อีเมล Google นี้ยังไม่ได้ยืนยัน");
  const domains = allowedDomains();
  if (domains.length && !domains.includes(email.split("@")[1])) {
    throw new GoogleAuthError(`ใช้ได้เฉพาะอีเมล ${domains.map((d) => `@${d}`).join(", ")}`);
  }

  const name = String(payload.name || "").trim();
  return {
    sub: String(payload.sub),
    email,
    firstName: String(payload.given_name || name.split(/\s+/)[0] || email.split("@")[0]).trim().slice(0, 100),
    lastName: String(payload.family_name || name.split(/\s+/).slice(1).join(" ") || "-").trim().slice(0, 100),
    picture: payload.picture || null,
  };
};

const resetGoogleKeyCache = () => {
  cache = { keys: new Map(), expiresAt: 0 };
};

module.exports = { verifyGoogleIdToken, GoogleAuthError, getClientId, resetGoogleKeyCache };
