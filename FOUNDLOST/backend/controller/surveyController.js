const db = require("../db");
const { QUESTIONS, ROLES, summarize, parseSubmission } = require("../services/survey");

// กันการยิงแบบประเมินจำนวนมาก: ไม่เกิน 60 ครั้งต่อ 10 นาทีต่อ IP (เก็บในหน่วยความจำ)
// เผื่อไว้มากเพราะนิสิตที่ใช้ Wi-Fi มหาวิทยาลัยพร้อมกันออกอินเทอร์เน็ตด้วย IP เดียวกัน
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 60;
// อยู่หลัง Caddy: IP จริงของผู้ใช้คือค่าแรกใน X-Forwarded-For
const clientIp = (req) => String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || "unknown";
const recent = new Map();
const tooMany = (ip) => {
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) {
    recent.set(ip, hits);
    return true;
  }
  hits.push(now);
  recent.set(ip, hits);
  return false;
};

const COLUMNS = ["respondent_role", ...QUESTIONS.map((q) => q.key), "suggestion"];

// ─── GET /api/survey/questions (สาธารณะ) ───────────────────────────────────
const getQuestions = (req, res) => {
  res.json({ success: true, questions: QUESTIONS, roles: ROLES });
};

// ─── POST /api/survey (สาธารณะ ไม่ต้องเข้าสู่ระบบ) ────────────────────────────
const submitSurvey = async (req, res) => {
  const parsed = parseSubmission(req.body);
  if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });
  if (tooMany(clientIp(req))) {
    return res.status(429).json({ success: false, message: "ส่งแบบประเมินบ่อยเกินไป กรุณาลองใหม่ภายหลัง" });
  }
  try {
    await db.query(
      `INSERT INTO satisfaction_surveys (${COLUMNS.join(", ")})
       VALUES (${COLUMNS.map((_, i) => `$${i + 1}`).join(", ")})`,
      COLUMNS.map((c) => parsed.row[c])
    );
    res.status(201).json({ success: true, message: "ขอบคุณที่ตอบแบบประเมิน" });
  } catch (error) {
    console.error("Error saving survey:", error.message);
    res.status(500).json({ success: false, message: "บันทึกแบบประเมินไม่สำเร็จ" });
  }
};

const loadRows = async () =>
  (await db.query(`SELECT survey_id, ${COLUMNS.join(", ")}, created_at FROM satisfaction_surveys ORDER BY created_at DESC`)).rows;

// ─── GET /admin/survey/summary ──────────────────────────────────────────────
const getSurveySummary = async (req, res) => {
  try {
    const rows = await loadRows();
    const suggestions = rows
      .filter((r) => r.suggestion)
      .slice(0, 50)
      .map((r) => ({ text: r.suggestion, role: r.respondent_role, created_at: r.created_at }));
    res.json({ success: true, summary: summarize(rows), suggestions, roles: ROLES });
  } catch (error) {
    console.error("Error loading survey summary:", error.message);
    res.status(500).json({ success: false, message: "โหลดผลแบบประเมินไม่สำเร็จ" });
  }
};

// ─── GET /admin/survey/export (CSV เปิดด้วย Excel ได้ภาษาไทย) ───────────────────
const csvCell = (value) => {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const exportSurvey = async (req, res) => {
  try {
    const rows = await loadRows();
    const header = ["ลำดับ", "วันเวลา", "สถานะผู้ตอบ", ...QUESTIONS.map((q, i) => `${i + 1}. ${q.text}`), "ข้อเสนอแนะ"];
    const lines = rows
      .slice()
      .reverse()
      .map((r, i) => [
        i + 1,
        new Date(r.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }),
        ROLES[r.respondent_role] || r.respondent_role,
        ...QUESTIONS.map((q) => (r[q.key] == null ? "ไม่ได้ใช้" : r[q.key])),
        r.suggestion,
      ]);
    const csv = [header, ...lines].map((line) => line.map(csvCell).join(",")).join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="foundlost-survey.csv"');
    res.send("﻿" + csv);
  } catch (error) {
    console.error("Error exporting survey:", error.message);
    res.status(500).json({ success: false, message: "ส่งออกไฟล์ไม่สำเร็จ" });
  }
};

module.exports = { getQuestions, submitSurvey, getSurveySummary, exportSurvey };
