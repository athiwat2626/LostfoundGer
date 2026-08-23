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
const { validateEmail } = require("./validation");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/assets/uploads/", express.static(path.join(__dirname, "assets")));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/user", userRoute);
app.use("/foundItem", foundItemRoute);
app.use("/lostItem", lostItemRoute);
app.use("/datalost", lostItemRoute);
app.use("/datafound", foundItemRoute);
app.use("/assets", express.static("assets"));

app.use((error, req, res, next) => {
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "Image must not exceed 5 MB" });
  }
  if (error.message === "Only image files are allowed") {
    return res.status(400).json({ error: error.message });
  }
  next(error);
});

// mailer 
// app.post("/email", (req, res) => {
const mailUser = process.env.MAIL_USER;
const mailPassword = process.env.MAIL_APP_PASSWORD;
const transporter = mailUser && mailPassword
  ? nodemailer.createTransport({
      service: "gmail",
      auth: { user: mailUser, pass: mailPassword },
    })
  : null;

const otpStore = {};

//Send OTP route
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

    // เช็ค Email ใน database
    const result = await db.query(
      `SELECT student_id, first_name, last_name, email, profile_image
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
    );

    // ไม่มี Email ใน database
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Email not found"
      });
    }

    // สร้าง OTP 6 หลัก
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // หมดอายุ 5 นาที
    const expiresAt = Date.now() + 5 * 60 * 1000;

    // เก็บ OTP
    otpStore[normalizedEmail] = {
      otp: otp,
      expiresAt: expiresAt
    };

    // ส่ง Email
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


//Verify OTP
app.post("/api/verify-otp", (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!validateEmail(email) || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "A valid email and 6-digit OTP are required"
      });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const storedOTP = otpStore[normalizedEmail];
  
    // ไม่มี OTP
    if (!storedOTP) {
      return res.status(400).json({
        success: false,
        message: "OTP not found or expired"
      });
    }
    // เช็คเวลาหมดอายุ
    if (Date.now() > storedOTP.expiresAt) {
      delete otpStore[normalizedEmail];

      return res.status(400).json({
        success: false,
        message: "OTP has expired"
      });
    }
    // เช็ค OTP
    if (storedOTP.otp === otp.toString()) {
      delete otpStore[normalizedEmail];

      return res.status(200).json({
        success: true,
        message: "OTP Verified Successfully"
      });
    }
    return res.status(400).json({
      success: false,
      message: "Invalid OTP"
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
});

// เรียก email จาก database
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

const startServer = async () => {
  try {
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
