// โหลดไลบรารีและโมดูลต่าง ๆ ที่ API ใช้งาน
const express = require("express");
const cors = require("cors");
const path = require("path");
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


// ตั้งค่าการอ่าน request, การเรียกใช้ข้ามโดเมน และการเข้าถึงไฟล์อัปโหลด
app.use(cors());
app.use(express.json()); // Middleware สำหรับอ่านข้อมูล JSON
app.use(express.urlencoded({ extended: true }));
app.use("/assets/uploads/", express.static(path.join(__dirname, "assets")));

// Endpoint พื้นฐานสำหรับตรวจสอบว่าเซิร์ฟเวอร์ทำงานอยู่
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// ลงทะเบียน route หลัก โดยคง path data* ไว้เป็น alias ให้ frontend เดิม
app.use("/user", userRoute);
app.use("/foundItem", foundItemRoute);
app.use("/lostItem", lostItemRoute);
app.use("/datalost", lostItemRoute);
app.use("/datafound", foundItemRoute);
app.use("/assets", express.static("assets"));

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

// สร้าง OTP ใหม่ เก็บลง PostgreSQL และส่งไปทางอีเมล
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
      `SELECT student_id, first_name, last_name, email, profile_image
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

    // สร้าง OTP 6 หลัก และแทนที่ OTP เดิมของอีเมลนี้
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await db.query("DELETE FROM otp_codes WHERE email = $1", [normalizedEmail]);
    await db.query(
      `INSERT INTO otp_codes (email, otp, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '5 minutes')`,
      [normalizedEmail, otp]
    );

    // ส่ง OTP หลังจากบันทึกลงฐานข้อมูลพร้อมกำหนดอายุ 5 นาที
    await transporter.sendMail({
      from: mailUser,
      to: normalizedEmail,
      subject: "OTP Verification",
      html: `
        <h2>FOUND&LOST</h2>
        <p>Your OTP Code</p>
        <h1>${otp}</h1>
        <p>Valid for 5 minutes</p>
      `
    });

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
    const result = await db.query(
      `DELETE FROM otp_codes
       WHERE email = $1 AND otp = $2 AND expires_at > NOW()
       RETURNING otp_id`,
      [normalizedEmail, otp]
    );

    // PostgreSQL ตรวจสอบ expires_at ทำให้ OTP ที่หมดอายุไม่สามารถใช้งานได้
    if (result.rowCount === 1) {

      return res.status(200).json({
        success: true,
        message: "OTP Verified Successfully"
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
app.get("/api/users/:email", async (req, res) => {
  try {
    const { email } = req.params;
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: "A valid email is required" });
    }
    const normalizedEmail = email.trim().toLowerCase();

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
    await db.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT"
    );
    await db.query("SELECT 1");
    console.log("Database connected successfully");

    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Database connection error:", error.message);
    process.exit(1);
  }
};

startServer();
