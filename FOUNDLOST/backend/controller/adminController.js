const db = require("../db");
const { validateItem } = require("../validation");

const ITEM_TABLES = { found: "found_items", lost: "lost_items" };
const ITEM_DATE_FIELD = { found: "found_date", lost: "lost_date" };
const ITEM_LOCATION_FIELD = { found: "found_location", lost: "lost_location" };
const VALID_DURATIONS = [3, 7, 30];

// Resolves the reported item + reported user (via found_items/lost_items) for each report row.
const REPORT_SELECT = `
  SELECT
    r.report_id, r.reporter_student_id, r.reported_item_id, r.item_type, r.reason, r.detail,
    r.evidence_url, r.status, r.admin_note, r.action_taken, r.resolved_at, r.created_at,
    reporter.first_name AS reporter_first_name, reporter.last_name AS reporter_last_name,
    reporter.email AS reporter_email,
    item.student_id AS reported_student_id, item.item_name AS item_name,
    item.image_url AS item_image_url, item.location AS item_location,
    reported.first_name AS reported_first_name, reported.last_name AS reported_last_name,
    reported.email AS reported_email, reported.is_banned AS reported_is_banned,
    reported.suspended_until AS reported_suspended_until,
    reported.warning_count AS reported_warning_count,
    resolver.email AS resolved_by_email, resolver.display_name AS resolved_by_name
  FROM reports r
  LEFT JOIN users reporter ON reporter.student_id = r.reporter_student_id
  LEFT JOIN LATERAL (
    SELECT student_id, item_name, image_url, found_location AS location
    FROM found_items WHERE r.item_type = 'found' AND item_id = r.reported_item_id
    UNION ALL
    SELECT student_id, item_name, image_url, lost_location AS location
    FROM lost_items WHERE r.item_type = 'lost' AND item_id = r.reported_item_id
  ) item ON true
  LEFT JOIN users reported ON reported.student_id = item.student_id
  LEFT JOIN admins resolver ON resolver.admin_id = r.resolved_by
`;

// ─── GET /admin/dashboard/stats ────────────────────────────────────────────
const getDashboardStats = async (_req, res) => {
  try {
    const [users, foundItems, lostItems, pending, underReview, resolved, suspended, banned] =
      await Promise.all([
        db.query("SELECT COUNT(*)::int AS count FROM users"),
        db.query("SELECT COUNT(*)::int AS count FROM found_items"),
        db.query("SELECT COUNT(*)::int AS count FROM lost_items"),
        db.query("SELECT COUNT(*)::int AS count FROM reports WHERE status = 'pending'"),
        db.query("SELECT COUNT(*)::int AS count FROM reports WHERE status = 'under_review'"),
        db.query("SELECT COUNT(*)::int AS count FROM reports WHERE status = 'resolved'"),
        db.query("SELECT COUNT(*)::int AS count FROM users WHERE suspended_until > NOW()"),
        db.query("SELECT COUNT(*)::int AS count FROM users WHERE is_banned = true"),
      ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers: users.rows[0].count,
        totalFoundItems: foundItems.rows[0].count,
        totalLostItems: lostItems.rows[0].count,
        pendingReports: pending.rows[0].count,
        underReviewReports: underReview.rows[0].count,
        resolvedReports: resolved.rows[0].count,
        suspendedUsers: suspended.rows[0].count,
        bannedUsers: banned.rows[0].count,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── GET /admin/activity ────────────────────────────────────────────────────
const getActivity = async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  try {
    const result = await db.query(
      `SELECT * FROM (${REPORT_SELECT}) reports_view
       WHERE resolved_at IS NOT NULL
       ORDER BY resolved_at DESC
       LIMIT $1`,
      [limit]
    );

    res.status(200).json({ success: true, activity: result.rows });
  } catch (error) {
    console.error("Error fetching admin activity:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── GET /admin/reports ────────────────────────────────────────────────────
const getReports = async (req, res) => {
  const { status, q } = req.query;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;

  const conditions = [];
  const params = [];

  if (status && status !== "all") {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (q) {
    params.push(`%${q.trim()}%`);
    const idx = params.length;
    conditions.push(
      `(item_name ILIKE $${idx} OR reporter_first_name ILIKE $${idx} OR reported_first_name ILIKE $${idx} OR report_id ILIKE $${idx})`
    );
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const listParams = [...params, limit, offset];
    const result = await db.query(
      `SELECT * FROM (${REPORT_SELECT}) reports_view
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    );

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS count FROM (${REPORT_SELECT}) reports_view ${whereClause}`,
      params
    );

    const [pending, underReview, resolved, suspended] = await Promise.all([
      db.query("SELECT COUNT(*)::int AS count FROM reports WHERE status = 'pending'"),
      db.query("SELECT COUNT(*)::int AS count FROM reports WHERE status = 'under_review'"),
      db.query("SELECT COUNT(*)::int AS count FROM reports WHERE status = 'resolved'"),
      db.query("SELECT COUNT(*)::int AS count FROM users WHERE suspended_until > NOW()"),
    ]);

    res.status(200).json({
      success: true,
      reports: result.rows,
      total: countResult.rows[0].count,
      stats: {
        pending: pending.rows[0].count,
        underReview: underReview.rows[0].count,
        resolved: resolved.rows[0].count,
        suspended: suspended.rows[0].count,
      },
    });
  } catch (error) {
    console.error("Error fetching admin reports:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── GET /admin/reports/:report_id ─────────────────────────────────────────
const getReportById = async (req, res) => {
  const { report_id } = req.params;

  try {
    const result = await db.query(`${REPORT_SELECT} WHERE r.report_id = $1`, [report_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    let report = result.rows[0];

    if (report.status === "pending") {
      await db.query("UPDATE reports SET status = 'under_review' WHERE report_id = $1", [report_id]);
      report = { ...report, status: "under_review" };
    }

    const timeline = [{ label: "Report submitted", at: report.created_at }];
    if (report.status === "under_review" && !report.resolved_at) {
      timeline.push({ label: "Assigned to review", at: report.created_at });
    }
    if (report.resolved_at) {
      const actor = report.resolved_by_email ? ` by ${report.resolved_by_email}` : "";
      timeline.push({ label: `Action taken: ${report.action_taken || report.status}${actor}`, at: report.resolved_at });
    }

    res.status(200).json({ success: true, report: { ...report, timeline } });
  } catch (error) {
    console.error("Error fetching report detail:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── POST /admin/reports/:report_id/moderate ───────────────────────────────
const moderateReport = async (req, res) => {
  const { report_id } = req.params;
  const { action, duration_days, note } = req.body;

  const VALID_ACTIONS = ["dismiss", "warn", "suspend", "ban"];
  if (!VALID_ACTIONS.includes(action)) {
    return res.status(400).json({ success: false, message: "Invalid action" });
  }
  if (action === "suspend" && !VALID_DURATIONS.includes(Number(duration_days))) {
    return res.status(400).json({ success: false, message: "duration_days must be 3, 7, or 30" });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const reportResult = await client.query(
      "SELECT reported_item_id, item_type FROM reports WHERE report_id = $1 FOR UPDATE",
      [report_id]
    );
    if (reportResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    const { reported_item_id, item_type } = reportResult.rows[0];
    const table = ITEM_TABLES[item_type];
    const itemResult = await client.query(`SELECT student_id FROM ${table} WHERE item_id = $1`, [
      reported_item_id,
    ]);
    const studentId = itemResult.rows[0]?.student_id;

    if (action !== "dismiss" && !studentId) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Reported item/user could not be resolved" });
    }

    if (action === "warn") {
      await client.query("UPDATE users SET warning_count = warning_count + 1 WHERE student_id = $1", [
        studentId,
      ]);
    } else if (action === "suspend") {
      await client.query(
        "UPDATE users SET suspended_until = NOW() + ($1 || ' days')::interval WHERE student_id = $2",
        [String(duration_days), studentId]
      );
    } else if (action === "ban") {
      await client.query("UPDATE users SET is_banned = true WHERE student_id = $1", [studentId]);
    }

    const actionTaken = action === "dismiss" ? "dismissed" : action === "warn" ? "warning" : action;
    const newStatus = action === "dismiss" ? "dismissed" : "resolved";

    const updateResult = await client.query(
      `UPDATE reports
       SET status = $1, action_taken = $2, admin_note = COALESCE($3, admin_note),
           resolved_by = $4, resolved_at = NOW()
       WHERE report_id = $5
       RETURNING *`,
      [newStatus, actionTaken, note || null, req.admin.admin_id, report_id]
    );

    await client.query("COMMIT");
    res.status(200).json({ success: true, report: updateResult.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error moderating report:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
    client.release();
  }
};

// ─── GET /admin/users ───────────────────────────────────────────────────────
const getUsers = async (req, res) => {
  const { q, status } = req.query;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;

  const conditions = [];
  const params = [];

  if (q) {
    params.push(`%${q.trim()}%`);
    const idx = params.length;
    conditions.push(
      `(first_name ILIKE $${idx} OR last_name ILIKE $${idx} OR email ILIKE $${idx} OR student_id ILIKE $${idx})`
    );
  }
  if (status === "suspended") conditions.push("suspended_until > NOW()");
  else if (status === "banned") conditions.push("is_banned = true");
  else if (status === "active") conditions.push("is_banned = false AND (suspended_until IS NULL OR suspended_until <= NOW())");

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const listParams = [...params, limit, offset];
    const result = await db.query(
      `SELECT student_id, first_name, last_name, email, created_at, successful_returns,
              suspended_until, is_banned, warning_count
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    );
    const countResult = await db.query(`SELECT COUNT(*)::int AS count FROM users ${whereClause}`, params);

    res.status(200).json({ success: true, users: result.rows, total: countResult.rows[0].count });
  } catch (error) {
    console.error("Error fetching admin users:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── POST /admin/users/:student_id/action ──────────────────────────────────
const moderateUser = async (req, res) => {
  const { student_id } = req.params;
  const { action, duration_days } = req.body;

  const VALID_ACTIONS = ["warn", "suspend", "ban", "unsuspend", "unban"];
  if (!VALID_ACTIONS.includes(action)) {
    return res.status(400).json({ success: false, message: "Invalid action" });
  }
  if (action === "suspend" && !VALID_DURATIONS.includes(Number(duration_days))) {
    return res.status(400).json({ success: false, message: "duration_days must be 3, 7, or 30" });
  }

  try {
    let result;
    if (action === "warn") {
      result = await db.query(
        "UPDATE users SET warning_count = warning_count + 1 WHERE student_id = $1 RETURNING *",
        [student_id]
      );
    } else if (action === "suspend") {
      result = await db.query(
        "UPDATE users SET suspended_until = NOW() + ($1 || ' days')::interval WHERE student_id = $2 RETURNING *",
        [String(duration_days), student_id]
      );
    } else if (action === "ban") {
      result = await db.query("UPDATE users SET is_banned = true WHERE student_id = $1 RETURNING *", [
        student_id,
      ]);
    } else if (action === "unsuspend") {
      result = await db.query(
        "UPDATE users SET suspended_until = NULL WHERE student_id = $1 RETURNING *",
        [student_id]
      );
    } else if (action === "unban") {
      result = await db.query("UPDATE users SET is_banned = false WHERE student_id = $1 RETURNING *", [
        student_id,
      ]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error("Error moderating user:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── GET /admin/items ───────────────────────────────────────────────────────
const getItems = async (req, res) => {
  const { type, q } = req.query;
  const table = ITEM_TABLES[type];
  if (!table) {
    return res.status(400).json({ success: false, message: "type must be 'found' or 'lost'" });
  }

  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;

  const conditions = [];
  const params = [];
  if (q) {
    params.push(`%${q.trim()}%`);
    conditions.push(`item_name ILIKE $${params.length}`);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const listParams = [...params, limit, offset];
    const result = await db.query(
      `SELECT * FROM ${table} ${whereClause} ORDER BY item_id DESC LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    );
    const countResult = await db.query(`SELECT COUNT(*)::int AS count FROM ${table} ${whereClause}`, params);

    res.status(200).json({ success: true, items: result.rows, total: countResult.rows[0].count });
  } catch (error) {
    console.error("Error fetching admin items:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── PATCH /admin/items/:type/:item_id ─────────────────────────────────────
const updateItem = async (req, res) => {
  const { type, item_id } = req.params;
  const table = ITEM_TABLES[type];
  if (!table) {
    return res.status(400).json({ success: false, message: "type must be 'found' or 'lost'" });
  }

  const dateField = ITEM_DATE_FIELD[type];
  const locationField = ITEM_LOCATION_FIELD[type];
  const validation = validateItem(req.body, dateField, locationField);
  if (validation.error) {
    return res.status(400).json({ success: false, message: validation.error });
  }

  const { item_name, category, item_color, description, deposit_location } = validation.value;
  const dateValue = validation.value[dateField];
  const locationValue = validation.value[locationField];

  try {
    const result = await db.query(
      `UPDATE ${table}
       SET item_name = $1, category = $2, item_color = $3, ${locationField} = $4,
           description = $5, deposit_location = $6, ${dateField} = $7
       WHERE item_id = $8
       RETURNING *`,
      [item_name, category, item_color, locationValue, description, deposit_location, dateValue, item_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    res.status(200).json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error("Error updating admin item:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── DELETE /admin/items/:type/:item_id ────────────────────────────────────
const deleteItem = async (req, res) => {
  const { type, item_id } = req.params;
  const table = ITEM_TABLES[type];
  if (!table) {
    return res.status(400).json({ success: false, message: "type must be 'found' or 'lost'" });
  }

  try {
    const result = await db.query(`DELETE FROM ${table} WHERE item_id = $1 RETURNING item_id`, [item_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting admin item:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  getDashboardStats,
  getActivity,
  getReports,
  getReportById,
  moderateReport,
  getUsers,
  moderateUser,
  getItems,
  updateItem,
  deleteItem,
};
