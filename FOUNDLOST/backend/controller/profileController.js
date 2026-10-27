const fs = require("fs");
const path = require("path");
const multer = require("multer");
const db = require("../db");
const { validateEmail } = require("../validation");

const PROFILE_FIELDS =
  "student_id, first_name, last_name, email, profile_image, phone, contact_email, preferred_contact, successful_returns, created_at";
const CONTACT_METHODS = ["email", "phone"];
const PHONE_PATTERN = /^[0-9+\-\s]{9,20}$/;

// ─── อัปโหลดรูปโปรไฟล์ ────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, "../assets/profileUploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${req.user.student_id}-${Date.now()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) return cb(null, true);
    cb(new Error("Only image files are allowed"));
  },
});

// ─── GET /api/me ─────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const result = await db.query(`SELECT ${PROFILE_FIELDS} FROM users WHERE student_id = $1`, [req.user.student_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "ไม่พบผู้ใช้" });
    }
    res.status(200).json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── PATCH /api/me ───────────────────────────────────────────────────────────
// แก้ได้เฉพาะชื่อและช่องทางติดต่อ (อีเมลเข้าสู่ระบบและรหัสนิสิตแก้ไม่ได้)
const updateMe = async (req, res) => {
  const text = (value) => (typeof value === "string" ? value.trim() : "");
  const firstName = text(req.body.first_name);
  const lastName = text(req.body.last_name);
  const phone = text(req.body.phone);
  const contactEmail = text(req.body.contact_email).toLowerCase();
  const preferred = text(req.body.preferred_contact) || "email";

  if (!firstName || firstName.length > 100 || !lastName || lastName.length > 100) {
    return res.status(400).json({ success: false, message: "กรุณากรอกชื่อและนามสกุล (ไม่เกิน 100 ตัวอักษร)" });
  }
  if (phone && !PHONE_PATTERN.test(phone)) {
    return res.status(400).json({ success: false, message: "เบอร์โทรศัพท์ไม่ถูกต้อง" });
  }
  if (contactEmail && !validateEmail(contactEmail)) {
    return res.status(400).json({ success: false, message: "อีเมลสำรองไม่ถูกต้อง" });
  }
  if (!CONTACT_METHODS.includes(preferred)) {
    return res.status(400).json({ success: false, message: "ช่องทางติดต่อไม่ถูกต้อง" });
  }
  if (preferred === "phone" && !phone) {
    return res.status(400).json({ success: false, message: "กรุณากรอกเบอร์โทรศัพท์ก่อนเลือกให้ติดต่อทางโทรศัพท์" });
  }

  try {
    const result = await db.query(
      `UPDATE users
       SET first_name = $1, last_name = $2, phone = $3, contact_email = $4, preferred_contact = $5
       WHERE student_id = $6
       RETURNING ${PROFILE_FIELDS}`,
      [firstName, lastName, phone || null, contactEmail || null, preferred, req.user.student_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "ไม่พบผู้ใช้" });
    }
    res.status(200).json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── POST /api/me/avatar ─────────────────────────────────────────────────────
const uploadAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "กรุณาเลือกรูปภาพ" });
  }

  const imageUrl = `/assets/profileUploads/${req.file.filename}`;
  try {
    const previous = await db.query("SELECT profile_image FROM users WHERE student_id = $1", [req.user.student_id]);
    const result = await db.query(
      `UPDATE users SET profile_image = $1 WHERE student_id = $2 RETURNING ${PROFILE_FIELDS}`,
      [imageUrl, req.user.student_id]
    );
    if (result.rows.length === 0) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ success: false, message: "ไม่พบผู้ใช้" });
    }

    // ลบรูปเก่า (เฉพาะรูปที่อยู่ในโฟลเดอร์รูปโปรไฟล์)
    const oldImage = previous.rows[0]?.profile_image;
    if (oldImage?.startsWith("/assets/profileUploads/")) {
      fs.unlink(path.join(uploadDir, path.basename(oldImage)), () => {});
    }

    res.status(200).json({ success: true, user: result.rows[0] });
  } catch (error) {
    fs.unlink(req.file.path, () => {});
    console.error("Error uploading avatar:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = { getMe, updateMe, uploadAvatar, upload };
