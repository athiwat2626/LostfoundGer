// เข้าสู่ระบบ / สมัครสมาชิกด้วย Google (POST /api/auth/google) — แบบ 2 ขั้น
// ขั้นที่ 1: รับ credential (Google ID token) → ตรวจกับ Google → หาผู้ใช้จากอีเมล (ไม่มีสร้างบัญชีใหม่)
// ขั้นที่ 2: ส่ง OTP ไปที่อีเมล Google แล้วให้ผู้ใช้ยืนยันที่ /api/verify-otp (จึงจะได้ token)
const db = require("../db");
const { verifyGoogleIdToken, GoogleAuthError } = require("../services/googleAuth");

const ACCOUNT_COLUMNS = "student_id, email, is_banned, suspended_until";

// รหัสผู้ใช้สำหรับคนที่ไม่ได้กรอกรหัสนิสิต (รูปแบบเดียวกับ /api/register)
const generateStudentId = () => `USER${Date.now().toString(36).slice(-8)}${Math.random().toString(36).slice(2, 10)}`.slice(0, 20);

const findByEmail = async (email) =>
  (await db.query(`SELECT ${ACCOUNT_COLUMNS} FROM users WHERE email = $1`, [email])).rows[0];

/**
 * @param {{ issueOtp: (email: string) => Promise<{ sent?: true, wait?: number }>, mailConfigured: () => boolean }} deps
 */
const createGoogleLogin = ({ issueOtp, mailConfigured }) => async (req, res) => {
  if (!mailConfigured()) {
    return res.status(503).json({ success: false, message: "Email service is not configured" });
  }

  let profile;
  try {
    profile = await verifyGoogleIdToken(req.body?.credential);
  } catch (error) {
    if (error instanceof GoogleAuthError) {
      return res.status(error.message.startsWith("ยังไม่ได้ตั้งค่า") ? 503 : 401).json({ success: false, message: error.message });
    }
    console.error("Google token verification failed:", error.message);
    return res.status(502).json({ success: false, message: "ตรวจสอบบัญชี Google ไม่สำเร็จ กรุณาลองใหม่" });
  }

  try {
    let account = await findByEmail(profile.email);
    let created = false;

    if (!account) {
      try {
        const result = await db.query(
          `INSERT INTO users (student_id, first_name, last_name, email)
           VALUES ($1, $2, $3, $4)
           RETURNING ${ACCOUNT_COLUMNS}`,
          [generateStudentId(), profile.firstName, profile.lastName, profile.email]
        );
        account = result.rows[0];
        created = true;
      } catch (error) {
        // สมัครพร้อมกันสองคำขอ → อีกคำขอสร้างไปแล้ว ใช้บัญชีนั้น
        if (error.code !== "23505") throw error;
        account = await findByEmail(profile.email);
      }
    }

    if (account.is_banned) {
      return res.status(403).json({ success: false, message: "บัญชีนี้ถูกระงับถาวร กรุณาติดต่อผู้ดูแลระบบ" });
    }
    if (account.suspended_until && new Date(account.suspended_until) > new Date()) {
      return res.status(403).json({
        success: false,
        message: `บัญชีถูกระงับชั่วคราวถึง ${new Date(account.suspended_until).toLocaleString("th-TH")}`,
        suspended_until: account.suspended_until,
      });
    }

    const issued = await issueOtp(account.email);
    return res.status(created ? 201 : 200).json({
      success: true,
      created,
      otp_required: true,
      email: account.email,
      // ขอรหัสไปไม่ถึง 60 วินาที → ใช้รหัสเดิมที่ส่งไปแล้ว
      ...(issued.wait ? { retry_after: issued.wait } : {}),
    });
  } catch (error) {
    console.error("Error in Google login:", error);
    return res.status(500).json({ success: false, message: "เข้าสู่ระบบด้วย Google ไม่สำเร็จ" });
  }
};

module.exports = { createGoogleLogin };
