// โหลดไลบรารีและโมดูลต่าง ๆ ที่ API ใช้งาน
const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const app = express();
const port = Number(process.env.PORT || 3000);
const db = require("./db");
const nodemailer = require("nodemailer")
const userRoute = require("./routes/userRoute");
const foundItemRoute = require("./routes/foundItemRoute");
const lostItemRoute = require("./routes/lostItemRoute");
const swaggerUi = require("swagger-ui-express")
const swaggerSpec = require("./swagger");
const { validateEmail } = require("./validation");
const certificateRoute = require("./routes/certificateRoute");
const reportRoute = require("./routes/reportRoute");
const adminAuthRoute = require("./routes/adminAuthRoute");
const adminRoute = require("./routes/adminRoute");
const adminAuth = require("./middleware/adminAuth");
const { userAuth, signUserToken } = require("./middleware/userAuth");
const profileRoute = require("./routes/profileRoute");
const claimRoute = require("./routes/claimRoute");
const myItemRoute = require("./routes/myItemRoute");
const inboxRoute = require("./routes/inboxRoute");
const bcrypt = require("bcryptjs");
const { sendLineNotification } = require("./services/lineNotification");
const line = require("./services/line");
const lineRoute = require("./routes/lineRoute");
const maintenanceGuard = require("./middleware/maintenance");
const { getPublicSettings } = require("./controller/settingsController");
const surveyRoute = require("./routes/surveyRoute");
const { createGoogleLogin } = require("./controller/googleAuthController");


// ตั้งค่าการอ่าน request, การเรียกใช้ข้ามโดเมน และการเข้าถึงไฟล์อัปโหลด
app.use(cors());
// LINE webhook ต้องได้ body ดิบเพื่อตรวจ X-Line-Signature จึงต้องลงทะเบียนก่อน express.json()
app.post("/api/line/webhook", express.raw({ type: "*/*", limit: "1mb" }), line.webhook.handler);
app.use(express.json()); // Middleware สำหรับอ่านข้อมูล JSON
app.use(express.urlencoded({ extended: true }));
// ตรวจสุขภาพระบบสำหรับ Docker/CI: ต้องต่อฐานข้อมูลและเห็นตารางหลักได้ (อยู่ก่อนโหมดปิดปรับปรุงเพื่อไม่ให้ถูกบล็อก)
app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1 FROM users LIMIT 1");
    await db.query("SELECT 1 FROM found_items LIMIT 1");
    await db.query("SELECT 1 FROM lost_items LIMIT 1");
    res.json({ status: "ok" });
  } catch (error) {
    console.error("Health check failed:", error.message);
    res.status(503).json({ status: "error", message: "Database unavailable" });
  }
});
// โหมดปิดปรับปรุง (ตั้งในหน้าแอดมิน): ผู้ใช้ทั่วไปได้ 503 ส่วนแอดมินใช้งานได้ตามปกติ
app.use(maintenanceGuard);
// ค่าที่หน้าเว็บผู้ใช้ต้องรู้: หมวดหมู่, จุดรับฝาก, ประกาศ, สถานะปิดปรับปรุง
app.get("/api/settings/public", getPublicSettings);
app.use("/assets/uploads/", express.static(path.join(__dirname, "assets")));

// Endpoint พื้นฐานสำหรับตรวจสอบว่าเซิร์ฟเวอร์ทำงานอยู่
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/api/notifications/line", async (req, res) => {
  // ใช้ได้เฉพาะเมื่อตั้ง NOTIFY_API_KEY และส่ง header x-api-key ตรงกัน (ไม่ตั้งค่า = ปิดใช้งาน)
  const apiKey = process.env.NOTIFY_API_KEY;
  if (!apiKey || req.headers["x-api-key"] !== apiKey) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { message, userId } = req.body;
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ success: false, message: "กรุณาระบุ message" });
  }

  try {
    const result = await sendLineNotification(message.trim(), userId);
    res.json(result);
  } catch (error) {
    console.error("ส่ง LINE ไม่สำเร็จ:", error.message);
    res.status(502).json({ success: false, message: "ส่งข้อความ LINE ไม่สำเร็จ" });
  }
});

// ลงทะเบียนผู้ใช้ใหม่สำหรับระบบเข้าสู่ระบบด้วย OTP
app.post("/api/register", async (req, res) => {
  const { student_id, first_name, last_name, email } = req.body;
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const studentId = typeof student_id === "string" && student_id.trim()
    ? student_id.trim()
    : `USER${Date.now().toString(36).slice(-8)}${Math.random().toString(36).slice(2, 10)}`.slice(0, 20);
  const firstName = typeof first_name === "string" ? first_name.trim() : "";
  const lastName = typeof last_name === "string" ? last_name.trim() : "";

  if (studentId.length > 20 || !firstName || firstName.length > 100 ||
      !lastName || lastName.length > 100 || !validateEmail(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง"
    });
  }

  try {
    const result = await db.query(
      `INSERT INTO users (student_id, first_name, last_name, email)
       VALUES ($1, $2, $3, $4)
       RETURNING student_id, first_name, last_name, email`,
      [studentId, firstName, lastName, normalizedEmail]
    );

    return res.status(201).json({ success: true, user: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "รหัสนิสิตหรืออีเมลนี้มีอยู่ในระบบแล้ว"
      });
    }

    console.error("Error registering user:", error);
    return res.status(500).json({ success: false, message: "ไม่สามารถสมัครสมาชิกได้" });
  }
});

// ลงทะเบียน route หลัก โดยคง path data* ไว้เป็น alias ให้ frontend เดิม
// รายชื่อผู้ใช้ทั้งหมด: เฉพาะแอดมิน
app.use("/user", adminAuth, userRoute);
app.use("/foundItem", foundItemRoute);
app.use("/lostItem", lostItemRoute);
app.use("/datalost", lostItemRoute);
app.use("/datafound", foundItemRoute);
app.use("/assets", express.static("assets"));
// ยืนยันการคืนของ (เพิ่มยอดคืนของ + ส่งเกียรติบัตร): เฉพาะแอดมิน จนกว่าจะมีขั้นตอนรับคืนของฝั่งผู้ใช้
app.use("/api/returns", adminAuth, certificateRoute);
app.use("/report", reportRoute);
app.use("/admin/auth", adminAuthRoute);
app.use("/admin/line", adminAuth, lineRoute.adminRouter);
app.use("/admin", adminAuth, adminRoute);
app.use("/api/line", lineRoute.router);
app.use("/api/me", profileRoute);
app.use("/api/claims", claimRoute);
app.use("/api/my-items", myItemRoute);
app.use("/api/inbox", inboxRoute);
app.use("/api/survey", surveyRoute);

// แปลงข้อผิดพลาดจากการอัปโหลดให้เป็นข้อความที่ client เข้าใจได้
app.use((error, req, res, next) => {
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "Image must not exceed 5 MB" });
  }
  if (error.message === "Only image files are allowed") {
    return res.status(400).json({ error: error.message });
  }
  next(error);
});

// ตั้งค่า Gmail เมื่อมีข้อมูลผู้ใช้และรหัสผ่านสำหรับส่งเมลครบเท่านั้น
// app.post("/email", (req, res) => {
const mailUser = process.env.MAIL_USER;
const mailPassword = process.env.MAIL_APP_PASSWORD;
const transporter = mailUser && mailPassword
  ? nodemailer.createTransport({
    service: "gmail",
    auth: { user: mailUser, pass: mailPassword },
  })
  : null;

const MAX_OTP_ATTEMPTS = 5; // กรอก OTP ผิดได้ไม่เกินกี่ครั้งต่อรหัส
const OTP_RESEND_SECONDS = 60; // ต้องรอกี่วินาทีก่อนขอรหัสใหม่

// สร้าง OTP ใหม่ เก็บลง PostgreSQL และส่งไปทางอีเมล (ใช้ทั้ง /api/send-otp และขั้นที่ 2 ของการเข้าด้วย Google)
// ขอถี่เกินไป → คืน { wait: วินาทีที่ต้องรอ } โดยไม่ส่งรหัสใหม่
async function issueOtp(normalizedEmail) {
  // ป้องกันการขอ OTP ถี่เกินไป
  const recent = await db.query(
    `SELECT CEIL(EXTRACT(EPOCH FROM (created_at + $2::interval - NOW())))::int AS wait
     FROM otp_codes WHERE email = $1 AND created_at > NOW() - $2::interval
     ORDER BY created_at DESC LIMIT 1`,
    [normalizedEmail, `${OTP_RESEND_SECONDS} seconds`]
  );
  if (recent.rows.length > 0) {
    return { wait: Math.max(1, recent.rows[0].wait) };
  }

  // สร้าง OTP 6 หลัก และแทนที่ OTP เดิมของอีเมลนี้
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await db.query("DELETE FROM otp_codes WHERE email = $1", [normalizedEmail]);
  await db.query(
    `INSERT INTO otp_codes (email, otp, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '5 minutes')`,
    [normalizedEmail, otp]
  );

  // ส่ง OTP หลังจากบันทึกลงฐานข้อมูลพร้อมกำหนดอายุ 5 นาที
  // อีเมลมีชื่อผู้ส่ง หัวเรื่องภาษาไทย และเนื้อหาแบบข้อความธรรมดาคู่กับ HTML
  // (อีเมลที่มีแต่ตัวเลขใน HTML และหัวเรื่องสั้น ๆ มักถูก Gmail กรองเป็นสแปม)
  await transporter.sendMail({
    from: { name: "FOUND&LOST มหาวิทยาลัยเกษตรศาสตร์", address: mailUser },
    to: normalizedEmail,
    subject: `รหัสเข้าสู่ระบบ FOUND&LOST ของคุณคือ ${otp}`,
    text: [
      "สวัสดีครับ/ค่ะ",
      "",
      `รหัสสำหรับเข้าสู่ระบบ FOUND&LOST ของคุณคือ ${otp}`,
      "รหัสนี้ใช้ได้ภายใน 5 นาที และใช้ได้ครั้งเดียว",
      "",
      "หากคุณไม่ได้ขอรหัสนี้ ไม่ต้องทำอะไร บัญชีของคุณยังปลอดภัย",
      "",
      "FOUND&LOST ระบบแจ้งของหาย-ของพบ มหาวิทยาลัยเกษตรศาสตร์",
    ].join("\n"),
    html: `
      <div style="font-family:Tahoma,Arial,sans-serif;max-width:480px;margin:0 auto;color:#1e293b">
        <h2 style="color:#006664;margin-bottom:4px">FOUND&amp;LOST</h2>
        <p style="margin-top:0;color:#64748b">ระบบแจ้งของหาย-ของพบ มหาวิทยาลัยเกษตรศาสตร์</p>
        <p>สวัสดีครับ/ค่ะ</p>
        <p>รหัสสำหรับเข้าสู่ระบบของคุณคือ</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#006664;margin:16px 0">${otp}</p>
        <p>รหัสนี้ใช้ได้ภายใน 5 นาที และใช้ได้ครั้งเดียว</p>
        <p style="color:#64748b;font-size:13px">หากคุณไม่ได้ขอรหัสนี้ ไม่ต้องทำอะไร บัญชีของคุณยังปลอดภัย</p>
      </div>
    `
  });

  return { sent: true };
}

// ส่ง OTP ให้ผู้ใช้ที่ลงทะเบียนไว้
app.post("/api/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "A valid email is required"
      });
    }

    if (!transporter) {
      return res.status(503).json({
        success: false,
        message: "Email service is not configured"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ตรวจสอบว่าอีเมลนี้เป็นของผู้ใช้ที่ลงทะเบียนไว้
    const result = await db.query(
      `SELECT student_id, first_name, last_name, email, profile_image, is_banned, suspended_until
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
    );

    // ไม่ส่ง OTP หากไม่พบอีเมลในระบบ
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Email not found"
      });
    }

    const account = result.rows[0];
    if (account.is_banned) {
      return res.status(403).json({
        success: false,
        message: "บัญชีนี้ถูกระงับถาวร กรุณาติดต่อผู้ดูแลระบบ"
      });
    }
    if (account.suspended_until && new Date(account.suspended_until) > new Date()) {
      return res.status(403).json({
        success: false,
        message: `บัญชีถูกระงับชั่วคราวถึง ${new Date(account.suspended_until).toLocaleString("th-TH")}`,
        suspended_until: account.suspended_until
      });
    }

    const issued = await issueOtp(normalizedEmail);
    if (issued.wait) {
      return res.status(429).json({
        success: false,
        message: `กรุณารอ ${issued.wait} วินาทีก่อนขอรหัส OTP ใหม่`,
        retry_after: issued.wait
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP Sent Successfully"
    });

  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Failed to send OTP"
    });
  }
});


// เข้าสู่ระบบ/สมัครสมาชิกด้วย Google (ต้องตั้ง GOOGLE_CLIENT_ID ใน .env)
// ขั้นที่ 1 ยืนยันตัวตนกับ Google → ขั้นที่ 2 ส่ง OTP ไปที่อีเมล Google แล้วยืนยันที่ /api/verify-otp
app.post("/api/auth/google", createGoogleLogin({ issueOtp, mailConfigured: () => Boolean(transporter) }));

// ตรวจสอบ OTP และลบทันทีเมื่อยืนยันสำเร็จ
app.post("/api/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!validateEmail(email) || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "A valid email and 6-digit OTP are required"
      });
    }
    const normalizedEmail = email.trim().toLowerCase();

    // OTP ล่าสุดที่ยังไม่หมดอายุของอีเมลนี้
    const current = await db.query(
      `SELECT otp_id, otp FROM otp_codes
       WHERE email = $1 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [normalizedEmail]
    );
    const record = current.rows[0];
    const matches = Boolean(record) && record.otp.length === otp.length &&
      crypto.timingSafeEqual(Buffer.from(record.otp), Buffer.from(otp));

    if (record && !matches) {
      const attempt = await db.query(
        "UPDATE otp_codes SET attempts = attempts + 1 WHERE otp_id = $1 RETURNING attempts",
        [record.otp_id]
      );
      if ((attempt.rows[0]?.attempts || 0) >= MAX_OTP_ATTEMPTS) {
        await db.query("DELETE FROM otp_codes WHERE otp_id = $1", [record.otp_id]);
        return res.status(429).json({
          success: false,
          message: `กรอก OTP ผิดเกิน ${MAX_OTP_ATTEMPTS} ครั้ง กรุณาขอรหัสใหม่`
        });
      }
    }

    // ลบ OTP ที่ใช้แล้ว (ถ้ามีคำขอพร้อมกัน จะมีเพียงคำขอเดียวที่ลบสำเร็จ)
    const result = matches
      ? await db.query("DELETE FROM otp_codes WHERE otp_id = $1 RETURNING otp_id", [record.otp_id])
      : { rowCount: 0 };

    // PostgreSQL ตรวจสอบ expires_at ทำให้ OTP ที่หมดอายุไม่สามารถใช้งานได้
    if (result.rowCount === 1) {
      // ดึงข้อมูล student_id จากอีเมลเพื่อส่งกลับ
      const userResult = await db.query(
        `SELECT student_id, email, is_banned, suspended_until FROM users WHERE email = $1`,
        [normalizedEmail]
      );

      const account = userResult.rows[0];

      if (account?.is_banned) {
        return res.status(403).json({
          success: false,
          message: "บัญชีนี้ถูกระงับถาวร กรุณาติดต่อผู้ดูแลระบบ"
        });
      }
      if (account?.suspended_until && new Date(account.suspended_until) > new Date()) {
        return res.status(403).json({
          success: false,
          message: `บัญชีถูกระงับชั่วคราวถึง ${new Date(account.suspended_until).toLocaleString("th-TH")}`,
          suspended_until: account.suspended_until
        });
      }

      const student_id = account ? account.student_id : "unknown";

      return res.status(200).json({
        success: true,
        message: "OTP Verified Successfully",
        // token สำหรับเรียก API ที่ต้องยืนยันตัวตน เช่น แก้ไขโปรไฟล์ (/api/me)
        token: account ? signUserToken(account) : null,
        student_id: student_id
      });
    }
    await db.query(
      "DELETE FROM otp_codes WHERE email = $1 AND expires_at <= NOW()",
      [normalizedEmail]
    );

    return res.status(400).json({
      success: false,
      message: "Invalid or expired OTP"
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
});

// ส่งข้อมูลโปรไฟล์ที่เปิดเผยได้ของผู้ใช้จากอีเมล
app.get("/api/users/:email", userAuth, async (req, res) => {
  try {
    const { email } = req.params;
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: "A valid email is required" });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== String(req.user.email || "").toLowerCase()) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const result = await db.query(
      `SELECT student_id, first_name, last_name, email, profile_image
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
});

app.get("/api/rankings/returners", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT student_id, first_name, last_name, profile_image, successful_returns
       FROM users
       WHERE successful_returns > 0
       ORDER BY successful_returns DESC, first_name ASC
       LIMIT 10`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching returner rankings:", error);
    res.status(500).json({ message: "ไม่สามารถโหลดอันดับผู้คืนของได้" });
  }
});

app.get("/api/rankings/lost-locations", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT lost_location AS location, COUNT(*)::int AS lost_count
       FROM lost_items
       WHERE lost_location IS NOT NULL AND TRIM(lost_location) <> ''
       GROUP BY lost_location
       ORDER BY lost_count DESC, lost_location ASC
       LIMIT 10`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching lost location rankings:", error);
    res.status(500).json({ message: "ไม่สามารถโหลดอันดับจุดของหายได้" });
  }
});

// ลบ OTP ที่หมดอายุเป็นระยะ เพื่อไม่ให้ตารางเก็บรหัสเก่าไว้
const cleanupExpiredOtps = () => {
  db.query("DELETE FROM otp_codes WHERE expires_at <= NOW()")
    .catch((error) => console.error("Error cleaning up OTPs:", error));
};

const otpCleanupTimer = setInterval(cleanupExpiredOtps, 60 * 1000);
// ไม่ให้ timer นี้เป็นเหตุให้โปรเซส Node.js ทำงานค้างเพียงอย่างเดียว
otpCleanupTimer.unref();
//   const option = {
//     from: "ssank2716@gmail.com",
//     to: "", //ถึงใคร
//     subject: "", //หัวข้อ
//     html: `<p>พ</p>`//เนื้อหา
//   };

//   transporter.sendMail(option, (err, info) => {
//     if (err) {
//       console.log("error", err);

//       return res.status(400).json({
//         RespCode: 400,
//         RespMessage: "Bad",
//         RespError: err
//       });
//     } else {
//       console.log("Send: " + info.response);

//       return res.status(200).json({
//         RespCode: 200,
//         RespMessage: "good"
//       });
//     }
//   });
// });
// เปิดให้ใช้งานเอกสาร OpenAPI แบบโต้ตอบได้
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

const startServer = async () => {
  try {
    // ตารางหลัก (รันซ้ำได้ทุกครั้ง เพราะใช้ IF NOT EXISTS ทั้งไฟล์) — ฐานข้อมูลใหม่บน server จึงไม่ต้องรัน database.sql เอง
    await db.query(require("fs").readFileSync(path.join(__dirname, "database.sql"), "utf8"));
    // ตรวจสอบและสร้างตาราง OTP หากยังไม่มีตอนเริ่ม backend
    await db.query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        otp_id BIGSERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query("ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0");
    await db.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT"
    );
    await db.query(
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS successful_returns INTEGER NOT NULL DEFAULT 0"
    );
    // ช่องทางติดต่อของผู้ใช้ (หน้าตั้งค่า)
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)");
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255)");
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_contact VARCHAR(10) NOT NULL DEFAULT 'email'");
    await db.query(
      "ALTER TABLE lost_items ADD COLUMN IF NOT EXISTS lost_location VARCHAR(255)"
    );
    await db.query(
      "CREATE INDEX IF NOT EXISTS idx_lost_items_location ON lost_items(lost_location)"
    );

    // อนุญาตให้ found_items/lost_items ไม่มีเจ้าของได้ (เช่น แอดมินเพิ่มรายการที่รับฝากโดยไม่ทราบเจ้าของ)
    await db.query("ALTER TABLE found_items ALTER COLUMN student_id DROP NOT NULL");
    await db.query("ALTER TABLE lost_items ALTER COLUMN student_id DROP NOT NULL");

    // ตารางแอดมิน และสถานะการดำเนินการ (ระงับ/แบน) ของผู้ใช้
    await db.query(`
      CREATE TABLE IF NOT EXISTS admins (
        admin_id BIGSERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ");
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE");
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS warning_count INTEGER NOT NULL DEFAULT 0");

    // ตาราง reports (เผื่อฐานข้อมูลใหม่ที่ยังไม่ได้รัน database.sql)
    await db.query(`
      CREATE TABLE IF NOT EXISTS reports (
        report_id VARCHAR(20) PRIMARY KEY,
        reporter_student_id VARCHAR(20),
        reported_item_id BIGINT NOT NULL,
        item_type VARCHAR(10) NOT NULL CHECK (item_type IN ('found', 'lost')),
        reason VARCHAR(100) NOT NULL,
        detail TEXT,
        evidence_url TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query("ALTER TABLE reports ADD COLUMN IF NOT EXISTS admin_note TEXT");
    await db.query("ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_by BIGINT REFERENCES admins(admin_id)");
    await db.query("ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ");
    await db.query("ALTER TABLE reports ADD COLUMN IF NOT EXISTS action_taken VARCHAR(30)");
    await db.query("CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)");

    // การรับคืนของ, การติดต่อเจ้าของโพสต์ และการแจ้งเตือน
    await db.query(require("fs").readFileSync(path.join(__dirname, "sql", "features.sql"), "utf8"));
    // ระบบ LINE Bot: เชื่อมบัญชี, ประวัติการแจ้งเตือน, กันแจ้งเตือนซ้ำ
    await db.query(require("fs").readFileSync(path.join(__dirname, "sql", "line.sql"), "utf8"));
    // ประวัติการดำเนินการของแอดมิน (เพิ่มได้อย่างเดียว)
    await db.query(require("fs").readFileSync(path.join(__dirname, "sql", "audit.sql"), "utf8"));
    // ค่าระบบที่แอดมินปรับได้
    await db.query(require("fs").readFileSync(path.join(__dirname, "sql", "settings.sql"), "utf8"));
    // แบบประเมินความพึงพอใจ
    await db.query(require("fs").readFileSync(path.join(__dirname, "sql", "survey.sql"), "utf8"));

    // สร้างบัญชีแอดมินเริ่มต้นครั้งแรกที่ยังไม่มี (ไม่เขียนทับรหัสผ่านที่เปลี่ยนภายหลัง)
    if (process.env.ADMIN_SEED_EMAIL && process.env.ADMIN_SEED_PASSWORD) {
      const seedEmail = process.env.ADMIN_SEED_EMAIL.trim().toLowerCase();
      const existingAdmin = await db.query("SELECT 1 FROM admins WHERE email = $1", [seedEmail]);
      if (existingAdmin.rows.length === 0) {
        const passwordHash = await bcrypt.hash(process.env.ADMIN_SEED_PASSWORD, 10);
        await db.query(
          "INSERT INTO admins (email, password_hash, display_name) VALUES ($1, $2, $3)",
          [seedEmail, passwordHash, "Admin"]
        );
        console.log(`Seeded admin account: ${seedEmail}`);
      }
    } else {
      console.warn("ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set — no admin account seeded.");
    }

    await db.query("SELECT 1");
    console.log("Database connected successfully");

    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
    line.startLineBackgroundJobs();
  } catch (error) {
    console.error("Database connection error:", error.message);
    process.exit(1);
  }
};

startServer();


