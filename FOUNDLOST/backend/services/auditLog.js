// บันทึกการกระทำของแอดมิน (ตาราง admin_audit_logs ใน sql/audit.sql)
// ส่ง client ของ transaction มาเป็น q เพื่อให้บันทึกพร้อมการกระทำ: บันทึกไม่ได้ → การกระทำถูกยกเลิกด้วย

// ฟิลด์ที่ห้ามเก็บลงประวัติเด็ดขาด
const SECRET_FIELDS = new Set(["password", "password_hash", "current_password", "new_password", "token", "otp"]);

const strip = (value) => {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).filter(([k]) => !SECRET_FIELDS.has(k)).map(([k, v]) => [k, strip(v)]));
  }
  return value;
};

// เปรียบเทียบสองแถว เก็บเฉพาะฟิลด์ที่เปลี่ยน { field: { from, to } }
const diff = (before = {}, after = {}, fields = Object.keys(after)) => {
  const changes = {};
  for (const field of fields) {
    if (SECRET_FIELDS.has(field)) continue;
    const from = before[field] ?? null;
    const to = after[field] ?? null;
    if (JSON.stringify(from) !== JSON.stringify(to)) changes[field] = { from, to };
  }
  return changes;
};

// ผู้กระทำ: แอดมินจาก adminAuth (req.admin) หรือ userOrAdminAuth (req.auth)
const actorOf = (req) => ({
  adminId: req.admin?.admin_id ?? (req.auth?.role === "admin" ? req.auth.admin_id : null),
  email: req.admin?.email ?? req.auth?.email ?? null,
});

/**
 * @param {{ query: Function }} q  db หรือ client ของ transaction
 * @param {import("express").Request} req
 * @param {{ action: string, targetType?: string, targetId?: string|number, summary: string, details?: object, adminId?: number, email?: string }} entry
 */
const recordAudit = async (q, req, { action, targetType = null, targetId = null, summary, details = {}, adminId, email }) => {
  const actor = actorOf(req);
  await q.query(
    `INSERT INTO admin_audit_logs (admin_id, admin_email, action, target_type, target_id, summary, details, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      adminId !== undefined ? adminId : actor.adminId,
      (email !== undefined ? email : actor.email)?.slice(0, 255) ?? null,
      action,
      targetType,
      targetId === null || targetId === undefined ? null : String(targetId).slice(0, 64),
      String(summary).slice(0, 300),
      JSON.stringify(strip(details)),
      String(req.ip || req.socket?.remoteAddress || "").slice(0, 64) || null,
    ]
  );
};

// สำหรับเหตุการณ์ที่ไม่ควรทำให้งานหลักล้ม (เช่น บันทึกการล็อกอิน) — ล้มเหลวแค่ log ไว้
const recordAuditSafely = (q, req, entry) =>
  recordAudit(q, req, entry).catch((error) => console.error(`[audit] failed to record ${entry.action}:`, error.message));

module.exports = { recordAudit, recordAuditSafely, diff, strip };
