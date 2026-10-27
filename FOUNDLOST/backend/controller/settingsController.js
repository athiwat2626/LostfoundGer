// ค่าระบบ: แอดมินอ่าน/แก้ไข และค่าสาธารณะที่หน้าเว็บผู้ใช้ใช้ (หมวดหมู่, จุดรับฝาก, ประกาศ, ปิดปรับปรุง)
const db = require("../db");
const { recordAudit } = require("../services/auditLog");
const {
  DEFAULTS,
  VALIDATORS,
  SettingsError,
  getSettings,
  clearSettingsCache,
  isAnnouncementActive,
} = require("../services/settings");

const LABELS = {
  match_min_score: "เกณฑ์คะแนนการจับคู่",
  certificate_milestone: "เกียรติบัตรทุกกี่ครั้ง",
  certificate_signer_name: "ชื่อผู้ลงนามเกียรติบัตร",
  certificate_signer_title: "ตำแหน่งผู้ลงนามเกียรติบัตร",
  suspend_durations: "ตัวเลือกวันระงับบัญชี",
  categories: "หมวดหมู่สิ่งของ",
  deposit_points: "จุดรับฝากของ",
  announcement: "ประกาศ",
  maintenance: "โหมดปิดปรับปรุง",
};

// ─── GET /admin/settings ───────────────────────────────────────────────────
const getAdminSettings = async (_req, res) => {
  try {
    res.status(200).json({ success: true, settings: await getSettings(), defaults: DEFAULTS });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── PUT /admin/settings ───────────────────────────────────────────────────
// ส่งเฉพาะคีย์ที่ต้องการแก้ { settings: { key: value, ... } }
const updateSettings = async (req, res) => {
  const input = req.body?.settings;
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return res.status(400).json({ success: false, message: "ข้อมูลไม่ถูกต้อง" });
  }
  const unknown = Object.keys(input).filter((key) => !(key in VALIDATORS));
  if (unknown.length) return res.status(400).json({ success: false, message: `ไม่รู้จักค่า: ${unknown.join(", ")}` });

  let next;
  try {
    next = Object.fromEntries(Object.entries(input).map(([key, value]) => [key, VALIDATORS[key](value)]));
  } catch (error) {
    if (error instanceof SettingsError) return res.status(400).json({ success: false, message: error.message });
    throw error;
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const currentRows = await client.query("SELECT key, value FROM system_settings WHERE key = ANY($1) FOR UPDATE", [
      Object.keys(next),
    ]);
    const current = { ...DEFAULTS, ...Object.fromEntries(currentRows.rows.map((r) => [r.key, r.value])) };

    const changes = {};
    for (const [key, value] of Object.entries(next)) {
      if (JSON.stringify(current[key]) === JSON.stringify(value)) continue;
      changes[key] = { from: current[key], to: value };
      await client.query(
        `INSERT INTO system_settings (key, value, updated_by, updated_at) VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
        [key, JSON.stringify(value), req.admin.admin_id]
      );
    }

    if (Object.keys(changes).length > 0) {
      await recordAudit(client, req, {
        action: "settings.update",
        targetType: "settings",
        targetId: Object.keys(changes).join(",").slice(0, 64),
        summary: `แก้ไขค่าระบบ: ${Object.keys(changes).map((k) => LABELS[k]).join(", ")}`,
        details: { changes },
      });
    }
    await client.query("COMMIT");
    clearSettingsCache();

    res.status(200).json({ success: true, changed: Object.keys(changes), settings: await getSettings() });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Error updating settings:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
    client.release();
  }
};

// ─── GET /api/settings/public ──────────────────────────────────────────────
// เปิดได้โดยไม่ต้องล็อกอิน — ส่งเฉพาะค่าที่ผู้ใช้ต้องเห็น
const getPublicSettings = async (_req, res) => {
  try {
    const s = await getSettings();
    res.status(200).json({
      success: true,
      categories: s.categories,
      deposit_points: s.deposit_points,
      announcement: isAnnouncementActive(s.announcement)
        ? {
            message: s.announcement.message,
            tone: s.announcement.tone,
            starts_on: s.announcement.starts_on,
            ends_on: s.announcement.ends_on,
          }
        : null,
      maintenance: s.maintenance.enabled ? { enabled: true, message: s.maintenance.message } : { enabled: false },
      // Client ID ของ Google Sign-In (ค่าสาธารณะ ไม่ใช่ความลับ) — ไม่ตั้งค่า = ซ่อนปุ่ม Google
      google_client_id: String(process.env.GOOGLE_CLIENT_ID || "").trim() || null,
    });
  } catch (error) {
    console.error("Error fetching public settings:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = { getAdminSettings, updateSettings, getPublicSettings };
