// ตรวจ X-Line-Signature: HMAC-SHA256 ของ raw request body ด้วย Channel Secret แล้วเข้ารหัส base64
// ต้องใช้ body ดิบ (Buffer) ก่อนแปลง JSON — ถ้า parse แล้ว stringify ใหม่ ลายเซ็นจะไม่ตรง
const crypto = require("crypto");

const computeSignature = (rawBody, channelSecret) =>
  crypto.createHmac("sha256", channelSecret).update(rawBody).digest("base64");

const verifySignature = (rawBody, signature, channelSecret) => {
  if (!channelSecret || typeof signature !== "string" || !signature || !Buffer.isBuffer(rawBody)) {
    return false;
  }
  const expected = Buffer.from(computeSignature(rawBody, channelSecret));
  const received = Buffer.from(signature);
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
};

module.exports = { computeSignature, verifySignature };
