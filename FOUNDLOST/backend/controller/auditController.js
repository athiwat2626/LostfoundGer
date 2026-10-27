// ประวัติการดำเนินการของแอดมิน (อ่านอย่างเดียว — ไม่มี endpoint แก้ไข/ลบ)
const db = require("../db");

const ACTION_GROUPS = ["report", "user", "item", "admin", "settings"];
const TARGET_TYPES = ["report", "user", "found_item", "lost_item", "admin", "settings"];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// ─── GET /admin/audit-logs ─────────────────────────────────────────────────
// query: group (report|user|item|admin), action, admin_id, target_type, target_id, q, from, to (YYYY-MM-DD), limit, offset
const getAuditLogs = async (req, res) => {
  const { group, action, admin_id, target_type, target_id, q, from, to } = req.query;
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const conditions = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    conditions.push(sql.replace("?", `$${params.length}`));
  };

  if (group) {
    if (!ACTION_GROUPS.includes(group)) return res.status(400).json({ success: false, message: "group ไม่ถูกต้อง" });
    add("l.action LIKE ?", `${group}.%`);
  }
  if (action) add("l.action = ?", String(action).slice(0, 40));
  if (admin_id) {
    if (!/^\d{1,18}$/.test(String(admin_id))) return res.status(400).json({ success: false, message: "admin_id ไม่ถูกต้อง" });
    add("l.admin_id = ?", admin_id);
  }
  if (target_type) {
    if (!TARGET_TYPES.includes(target_type)) return res.status(400).json({ success: false, message: "target_type ไม่ถูกต้อง" });
    add("l.target_type = ?", target_type);
  }
  if (target_id) add("l.target_id = ?", String(target_id).slice(0, 64));
  if (q) {
    params.push(`%${String(q).trim().slice(0, 100)}%`);
    const p = `$${params.length}`;
    conditions.push(`(l.summary ILIKE ${p} OR l.target_id ILIKE ${p} OR l.admin_email ILIKE ${p})`);
  }
  // ช่วงวันที่ตามเวลาประเทศไทย
  if (from) {
    if (!DATE_PATTERN.test(from)) return res.status(400).json({ success: false, message: "from ต้องเป็น YYYY-MM-DD" });
    add("l.created_at >= (?::date)::timestamp AT TIME ZONE 'Asia/Bangkok'", from);
  }
  if (to) {
    if (!DATE_PATTERN.test(to)) return res.status(400).json({ success: false, message: "to ต้องเป็น YYYY-MM-DD" });
    add("l.created_at < ((?::date + 1)::timestamp AT TIME ZONE 'Asia/Bangkok')", to);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const [logs, count, admins] = await Promise.all([
      db.query(
        `SELECT l.log_id, l.admin_id, COALESCE(a.email, l.admin_email) AS admin_email, a.display_name AS admin_name,
                l.action, l.target_type, l.target_id, l.summary, l.details, l.ip_address, l.created_at
         FROM admin_audit_logs l LEFT JOIN admins a ON a.admin_id = l.admin_id
         ${where}
         ORDER BY l.created_at DESC, l.log_id DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      db.query(`SELECT COUNT(*)::int AS total FROM admin_audit_logs l ${where}`, params),
      db.query("SELECT admin_id, email, display_name FROM admins ORDER BY email"),
    ]);
    res.status(200).json({ success: true, logs: logs.rows, total: count.rows[0].total, admins: admins.rows });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = { getAuditLogs };
