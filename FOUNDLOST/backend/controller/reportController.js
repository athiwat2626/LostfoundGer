const db = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ─── Multer setup for evidence uploads ───────────────────────────────────────
const uploadDir = path.join(__dirname, "../assets/reportUploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`),
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
  const { reporter_student_id, reported_item_id, item_type, reason, detail } = req.body;

  if (!reported_item_id || !item_type || !reason) {
    return res.status(400).json({ error: "reported_item_id, item_type และ reason จำเป็นต้องระบุ" });
  }

  if (!["found", "lost"].includes(item_type)) {
    return res.status(400).json({ error: "item_type ต้องเป็น found หรือ lost เท่านั้น" });
  }

  const evidence_url = req.file
    ? `/assets/reportUploads/${req.file.filename}`
    : null;

  const report_id = generateReportId();

  try {
    if (reporter_student_id) {
      const table = item_type === "found" ? "found_items" : "lost_items";
      const itemResult = await db.query(`SELECT student_id FROM ${table} WHERE item_id = $1`, [
        reported_item_id,
      ]);

      if (itemResult.rows[0]?.student_id === reporter_student_id) {
        return res.status(400).json({ error: "ไม่สามารถรายงานโพสต์ของตัวเองได้" });
      }
    }

    await db.query(
      `INSERT INTO reports
         (report_id, reporter_student_id, reported_item_id, item_type, reason, detail, evidence_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [report_id, reporter_student_id || null, reported_item_id, item_type, reason, detail || null, evidence_url]
    );

    res.status(201).json({
      success: true,
      report_id,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error creating report:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { createReport, upload };
