// การเชื่อมบัญชี LINE ↔ บัญชีเว็บแอป
// ขั้นตอน: เพิ่มเพื่อน (webhook follow) → ระบบส่งลิงก์ที่มีรหัสใช้ครั้งเดียว → ผู้ใช้เปิดลิงก์ เข้าสู่ระบบเว็บแอป แล้วกดยืนยัน
// การเพิ่มเพื่อนอย่างเดียวระบุตัวตนบัญชีเว็บไม่ได้ ต้องยืนยันจากฝั่งเว็บที่เข้าสู่ระบบแล้วเสมอ
const crypto = require("crypto");

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/; // 32 ไบต์แบบ base64url

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// ผลของการยืนยันที่ไม่สำเร็จ (code ใช้ใน API และข้อความภาษาไทยแสดงผู้ใช้)
const LINK_ERRORS = {
  invalid: { status: 400, message: "ลิงก์เชื่อมบัญชีไม่ถูกต้อง กรุณาขอลิงก์ใหม่จากแชต LINE" },
  expired: { status: 410, message: "ลิงก์เชื่อมบัญชีหมดอายุแล้ว กรุณาพิมพ์ \"เชื่อมบัญชี\" ในแชต LINE เพื่อขอลิงก์ใหม่" },
  used: { status: 410, message: "ลิงก์นี้ถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่จากแชต LINE" },
  not_following: { status: 409, message: "บัญชี LINE นี้ยกเลิกการเป็นเพื่อนแล้ว กรุณาเพิ่มเพื่อนอีกครั้ง" },
  line_linked_other: {
    status: 409,
    message: "บัญชี LINE นี้เชื่อมกับบัญชีเว็บแอปอื่นอยู่แล้ว กรุณายกเลิกการเชื่อมเดิมก่อน (พิมพ์ \"ยกเลิกการเชื่อม\" ในแชต LINE)",
  },
  student_linked_other: {
    status: 409,
    message: "บัญชีของคุณเชื่อมกับ LINE อื่นอยู่แล้ว กรุณายกเลิกการเชื่อมเดิมในหน้าบัญชีของฉันก่อน",
  },
};

class LinkError extends Error {
  constructor(code) {
    super(LINK_ERRORS[code].message);
    this.code = code;
    this.status = LINK_ERRORS[code].status;
  }
}

/**
 * @param {{ repo, ttlMinutes: () => number, now?: () => Date }} deps
 */
const createAccountLinking = ({ repo, ttlMinutes, now = () => new Date() }) => {
  // ออกรหัสใหม่ (คืนรหัสจริงเพื่อใส่ในลิงก์ — ฐานข้อมูลเก็บเฉพาะ hash)
  const issueLinkToken = async (lineUserId) => {
    const token = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(now().getTime() + ttlMinutes() * 60_000);
    await repo.createLinkToken({ tokenHash: hashToken(token), lineUserId, expiresAt });
    return { token, expiresAt };
  };

  const checkToken = (record) => {
    if (!record) throw new LinkError("invalid");
    if (record.used_at) throw new LinkError("used");
    if (new Date(record.expires_at) <= now()) throw new LinkError("expired");
  };

  // แสดงข้อมูลก่อนยืนยัน (ยังไม่ใช้รหัส) — ให้ผู้ใช้เห็นชื่อ LINE ที่จะเชื่อม ป้องกันการถูกหลอกให้กดลิงก์ของคนอื่น
  const previewLink = async (token) => {
    if (!TOKEN_PATTERN.test(String(token || ""))) throw new LinkError("invalid");
    const record = await repo.findLinkToken(hashToken(token));
    checkToken(record);
    return { display_name: record.display_name || null, expires_at: record.expires_at };
  };

  // ใช้รหัสและเชื่อมบัญชี (ทำใน transaction เดียว ล็อกแถวรหัส กันการใช้รหัสซ้ำพร้อมกัน)
  const confirmLink = async (token, studentId) => {
    if (!TOKEN_PATTERN.test(String(token || ""))) throw new LinkError("invalid");
    const tokenHash = hashToken(token);

    try {
      return await repo.withTransaction(async (tx) => {
        const record = await tx.lockLinkToken(tokenHash);
        checkToken(record);

        const account = await tx.findAccountByLineUser(record.line_user_id);
        if (!account || !account.is_following) throw new LinkError("not_following");

        // LINE นี้เชื่อมกับบัญชีอื่นอยู่ → ต้องยกเลิกการเชื่อมเดิมก่อน (ไม่ย้ายให้อัตโนมัติ)
        if (account.student_id && account.student_id !== studentId) throw new LinkError("line_linked_other");

        // บัญชีนี้เชื่อมกับ LINE อื่นอยู่ → ต้องยกเลิกจากหน้าเว็บก่อน
        const current = await tx.findAccountByStudent(studentId);
        if (current && current.line_user_id !== record.line_user_id) throw new LinkError("student_linked_other");

        const linked = await tx.linkAccount(record.line_user_id, studentId);
        await tx.markTokenUsed(tokenHash, studentId);
        return { account: linked, alreadyLinked: account.student_id === studentId };
      });
    } catch (error) {
      // UNIQUE(student_id) ชนจากการยืนยันสองลิงก์พร้อมกัน
      if (error.code === "23505") throw new LinkError("student_linked_other");
      throw error;
    }
  };

  return { issueLinkToken, previewLink, confirmLink };
};

module.exports = { createAccountLinking, hashToken, LinkError, LINK_ERRORS, TOKEN_PATTERN };
