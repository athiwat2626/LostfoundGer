// กล่องแจ้งเตือนของผู้ใช้ (กระดิ่งมุมขวาบน)
const db = require("../db");

const INBOX_LIMIT = 30;

// ─── GET /api/inbox ──────────────────────────────────────────────────────────
const listNotifications = async (req, res) => {
  try {
    const [items, unread] = await Promise.all([
      db.query(
        `SELECT notification_id, type, title, body, link, is_read, created_at
         FROM notifications WHERE student_id = $1
         ORDER BY created_at DESC LIMIT $2`,
        [req.user.student_id, INBOX_LIMIT]
      ),
      db.query("SELECT COUNT(*)::int AS count FROM notifications WHERE student_id = $1 AND is_read = false", [
        req.user.student_id,
      ]),
    ]);
    res.status(200).json({ success: true, notifications: items.rows, unread: unread.rows[0].count });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── POST /api/inbox/:id/read ────────────────────────────────────────────────
const markRead = async (req, res) => {
  if (!/^\d{1,18}$/.test(String(req.params.id))) {
    return res.status(400).json({ success: false, message: "ข้อมูลไม่ถูกต้อง" });
  }
  try {
    await db.query("UPDATE notifications SET is_read = true WHERE notification_id = $1 AND student_id = $2", [
      req.params.id,
      req.user.student_id,
    ]);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error marking notification read:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── POST /api/inbox/read-all ────────────────────────────────────────────────
const markAllRead = async (req, res) => {
  try {
    await db.query("UPDATE notifications SET is_read = true WHERE student_id = $1 AND is_read = false", [
      req.user.student_id,
    ]);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error marking notifications read:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = { listNotifications, markRead, markAllRead };
