const db = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// ─── Multer setup for evidence uploads ───────────────────────────────────────
const uploadDir = path.join(__dirname, "../assets/reportUploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) return cb(null, true);
    cb(new Error("Only image files are allowed"));
  },
});

// ─── Generate report ID  e.g. RPT-2026-001245 ────────────────────────────────
function generateReportId() {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 999999)).padStart(6, "0");
  return `RPT-${year}-${rand}`;
}

// ─── POST /report ─────────────────────────────────────────────────────────────
const createReport = async (req, res) => {
  const { reported_item_id, item_type, reason, detail } = req.body;
  // ผู้รายงานคือผู้ใช้ที่ล็อกอิน (จาก token) ไม่รับค่าจาก client
  const reporter_student_id = req.user.student_id;

  if (!reported_item_id || !item_type || !reason) {
    return res.status(400).json({ error: "reported_item_id, item_type และ reason จำเป็นต้องระบุ" });
  }

  if (!/^\d{1,18}$/.test(String(reported_item_id))) {
    return res.status(400).json({ error: "reported_item_id ต้องเป็นตัวเลข" });
  }

  if (!["found", "lost"].includes(item_type)) {
    return res.status(400).json({ error: "item_type ต้องเป็น found หรือ lost เท่านั้น" });
  }

  const evidence_url = req.file
    ? `/assets/reportUploads/${req.file.filename}`
    : null;

  // ลบไฟล์หลักฐานที่อัปโหลดมาแล้ว เมื่อไม่ได้บันทึกรายงาน
  const discardEvidence = () => {
    if (req.file) fs.unlink(req.file.path, () => {});
  };

  try {
    const table = item_type === "found" ? "found_items" : "lost_items";
    const itemResult = await db.query(`SELECT student_id FROM ${table} WHERE item_id = $1`, [reported_item_id]);

    if (itemResult.rows.length === 0) {
      discardEvidence();
      return res.status(404).json({ error: "ไม่พบรายการที่ต้องการรายงาน" });
    }
    if (itemResult.rows[0].student_id === reporter_student_id) {
      discardEvidence();
      return res.status(400).json({ error: "ไม่สามารถรายงานโพสต์ของตัวเองได้" });
    }

    // เลขรายงานสุ่ม 6 หลัก: ถ้าบังเอิญซ้ำ (unique violation) ให้สุ่มใหม่
    let report_id;
    for (let attempt = 0; attempt < 5 && !report_id; attempt += 1) {
      const candidate = generateReportId();
      try {
        await db.query(
          `INSERT INTO reports
             (report_id, reporter_student_id, reported_item_id, item_type, reason, detail, evidence_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [candidate, reporter_student_id, reported_item_id, item_type, reason, detail || null, evidence_url]
        );
        report_id = candidate;
      } catch (insertError) {
        if (insertError.code !== "23505") throw insertError;
      }
    }
    if (!report_id) throw new Error("Could not allocate a unique report_id");

    res.status(201).json({
      success: true,
      report_id,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    discardEvidence();
    console.error("Error creating report:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { createReport, upload };
