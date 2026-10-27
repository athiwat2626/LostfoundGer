// การติดต่อเรื่องสิ่งของ (claims), จัดการโพสต์ของตัวเอง และยืนยันการรับคืนของ
const db = require("../db");
const { validateItem } = require("../validation");
const { findMatches, scorePair, FIELDS } = require("../services/matching");
const { notify } = require("../services/notify");
const { issueCertificate } = require("../certificateService");
const { getSettingSafe } = require("../services/settings");

const TYPES = ["found", "lost"];
const ID_PATTERN = /^\d{1,18}$/;

const badRequest = (res, message) => res.status(400).json({ success: false, message });
const notFound = (res, message = "ไม่พบรายการ") => res.status(404).json({ success: false, message });
const serverError = (res, label, error) => {
  console.error(label, error);
  return res.status(500).json({ success: false, message: "Internal server error" });
};

const parseItemParams = (type, id) => (TYPES.includes(type) && ID_PATTERN.test(String(id)) ? { type, id } : null);

// ช่องทางติดต่อที่เปิดเผยให้อีกฝ่ายเห็น
const contactOf = (row, prefix = "") =>
  row[`${prefix}student_id`]
    ? {
        student_id: row[`${prefix}student_id`],
        name: `${row[`${prefix}first_name`] || ""} ${row[`${prefix}last_name`] || ""}`.trim(),
        email: row[`${prefix}contact_email`] || row[`${prefix}email`],
        phone: row[`${prefix}phone`] || null,
        preferred_contact: row[`${prefix}preferred_contact`] || "email",
        profile_image: row[`${prefix}profile_image`] || null,
      }
    : null;

const USER_CONTACT_COLUMNS = "student_id, first_name, last_name, email, contact_email, phone, preferred_contact, profile_image";

// เพิ่มยอดคืนของสำเร็จให้ผู้คืน (อยู่ใน transaction เดียวกับการปิดโพสต์)
const creditReturner = async (client, studentId) => {
  if (!studentId) return null;
  const result = await client.query(
    `UPDATE users SET successful_returns = successful_returns + 1
     WHERE student_id = $1
     RETURNING student_id, first_name, last_name, email, successful_returns`,
    [studentId]
  );
  return result.rows[0] || null;
};

// หลัง commit: ออกเกียรติบัตรเมื่อคืนของครบทุก ๆ N ครั้ง (ตั้งค่าได้ในหน้าแอดมิน ค่าเริ่มต้น 3)
const maybeIssueCertificate = async (returner) => {
  const milestone = await getSettingSafe("certificate_milestone");
  if (!returner || returner.successful_returns % milestone !== 0) return false;
  issueCertificate({
    name: `${returner.first_name} ${returner.last_name}`,
    email: returner.email,
    returnCount: returner.successful_returns,
  }).catch((error) => console.error("Certificate failed:", error.message));
  return true;
};

// โพสต์ฝั่งตรงข้ามของผู้ติดต่อที่เป็นของชิ้นเดียวกันจะถูกปิดด้วย
// เช่น เจ้าของโพสต์ "ของหาย: ipad" กด "นี่ของฉัน" ที่โพสต์ "ของพบ: ipad" → เมื่อคืนสำเร็จ โพสต์ของหายก็ปิดด้วย
const LINKED_MIN_SCORE = 40;
const OPPOSITE = { found: "lost", lost: "found" };

const closeLinkedPost = async (client, itemType, itemId, claimantId, returnerId) => {
  if (!claimantId) return null;
  const source = FIELDS[itemType];
  const sourceResult = await client.query(
    `SELECT item_name, category, ${source.date} AS date, ${source.location} AS location
     FROM ${source.table} WHERE item_id = $1`,
    [itemId]
  );
  const sourceItem = sourceResult.rows[0];
  if (!sourceItem) return null;

  const oppositeType = OPPOSITE[itemType];
  const opposite = FIELDS[oppositeType];
  const candidates = await client.query(
    `SELECT item_id, item_name, category, ${opposite.date} AS date, ${opposite.location} AS location
     FROM ${opposite.table}
     WHERE student_id = $1 AND status = 'open'
     FOR UPDATE`,
    [claimantId]
  );
  const best = candidates.rows
    .map((candidate) => ({ ...candidate, score: scorePair(sourceItem, candidate).score }))
    .filter((candidate) => candidate.score >= LINKED_MIN_SCORE)
    .sort((a, b) => b.score - a.score)[0];
  if (!best) return null;

  await client.query(
    `UPDATE ${opposite.table} SET status = 'returned', returned_at = NOW(), returned_by = $1 WHERE item_id = $2`,
    [returnerId, best.item_id]
  );
  await client.query("UPDATE claims SET status = 'closed' WHERE item_type = $1 AND item_id = $2 AND status = 'pending'", [
    oppositeType,
    best.item_id,
  ]);
  return { type: oppositeType, item_id: best.item_id, item_name: best.item_name };
};

// ─── POST /api/claims ─────────────────────────────────────────────────────────
// "ฉันเจอของชิ้นนี้" (โพสต์ของหาย) / "นี่ของฉัน" (โพสต์ของพบ) → แจ้งเจ้าของโพสต์ และแสดงช่องทางติดต่อ
const createClaim = async (req, res) => {
  const params = parseItemParams(req.body.item_type, req.body.item_id);
  if (!params) return badRequest(res, "ข้อมูลรายการไม่ถูกต้อง");
  const message = typeof req.body.message === "string" ? req.body.message.trim().slice(0, 1000) : "";
  const { table } = FIELDS[params.type];

  try {
    const itemResult = await db.query(
      `SELECT i.item_name, i.status, i.deposit_location, u.${USER_CONTACT_COLUMNS.split(", ").join(", u.")}
       FROM ${table} i LEFT JOIN users u ON u.student_id = i.student_id
       WHERE i.item_id = $1`,
      [params.id]
    );
    const item = itemResult.rows[0];
    if (!item) return notFound(res);
    if (item.status !== "open") return badRequest(res, "รายการนี้ได้รับคืนเจ้าของแล้ว");
    if (item.student_id === req.user.student_id) return badRequest(res, "นี่คือโพสต์ของคุณเอง");

    const claimResult = await db.query(
      `INSERT INTO claims (item_type, item_id, claimant_student_id, message)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (item_type, item_id, claimant_student_id)
       DO UPDATE SET message = COALESCE(NULLIF(EXCLUDED.message, ''), claims.message)
       RETURNING claim_id, (xmax = 0) AS inserted`,
      [params.type, params.id, req.user.student_id, message || null]
    );
    const { claim_id, inserted } = claimResult.rows[0];

    if (inserted && item.student_id) {
      notify(
        item.student_id,
        {
          type: "claim",
          title:
            params.type === "lost"
              ? `มีคนแจ้งว่าเจอ "${item.item_name}" ของคุณ`
              : `มีคนแจ้งว่า "${item.item_name}" ที่คุณพบเป็นของเขา`,
          body: message || "เปิดดูช่องทางติดต่อได้ที่หน้าโพสต์ของฉัน",
          link: "/my-posts",
        },
        { email: true }
      );
    }

    res.status(inserted ? 201 : 200).json({
      success: true,
      claim_id,
      owner: contactOf(item),
      deposit_location: item.deposit_location,
    });
  } catch (error) {
    return serverError(res, "Error creating claim:", error);
  }
};

// ─── GET /api/claims/mine ─────────────────────────────────────────────────────
// รายการที่ฉันติดต่อไป พร้อมช่องทางติดต่อเจ้าของโพสต์
const myClaims = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.claim_id, c.item_type, c.item_id, c.message, c.status, c.created_at,
              i.item_name, i.image_url, i.location, i.date, i.status AS item_status, i.deposit_location,
              u.student_id AS owner_student_id, u.first_name AS owner_first_name, u.last_name AS owner_last_name,
              u.email AS owner_email, u.contact_email AS owner_contact_email, u.phone AS owner_phone,
              u.preferred_contact AS owner_preferred_contact, u.profile_image AS owner_profile_image
       FROM claims c
       JOIN LATERAL (
         SELECT item_name, image_url, found_location AS location, found_date AS date, status, deposit_location, student_id
         FROM found_items WHERE c.item_type = 'found' AND item_id = c.item_id
         UNION ALL
         SELECT item_name, image_url, lost_location AS location, lost_date AS date, status, deposit_location, student_id
         FROM lost_items WHERE c.item_type = 'lost' AND item_id = c.item_id
       ) i ON true
       LEFT JOIN users u ON u.student_id = i.student_id
       WHERE c.claimant_student_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.student_id]
    );

    res.status(200).json({
      success: true,
      claims: result.rows.map((row) => ({
        claim_id: row.claim_id,
        item_type: row.item_type,
        item_id: row.item_id,
        message: row.message,
        status: row.status,
        created_at: row.created_at,
        item: {
          item_name: row.item_name,
          image_url: row.image_url,
          location: row.location,
          date: row.date,
          status: row.item_status,
          deposit_location: row.deposit_location,
        },
        owner: contactOf(row, "owner_"),
      })),
    });
  } catch (error) {
    return serverError(res, "Error fetching my claims:", error);
  }
};

// ─── POST /api/claims/:claimId/confirm ───────────────────────────────────────
// โพสต์ของพบ: ผู้ที่ได้รับของคืน (ผู้ติดต่อ) ยืนยัน → ปิดโพสต์ และให้เครดิตผู้พบ (เจ้าของโพสต์)
const confirmReceived = async (req, res) => {
  if (!ID_PATTERN.test(String(req.params.claimId))) return badRequest(res, "ข้อมูลไม่ถูกต้อง");

  const client = await db.connect();
  let returner = null;
  let item = null;
  let linked = null;
  try {
    await client.query("BEGIN");
    const claimResult = await client.query(
      "SELECT claim_id, item_type, item_id FROM claims WHERE claim_id = $1 AND claimant_student_id = $2 FOR UPDATE",
      [req.params.claimId, req.user.student_id]
    );
    const claim = claimResult.rows[0];
    if (!claim) {
      await client.query("ROLLBACK");
      return notFound(res, "ไม่พบการติดต่อนี้");
    }
    if (claim.item_type !== "found") {
      await client.query("ROLLBACK");
      return badRequest(res, "โพสต์ของหาย เจ้าของโพสต์เป็นผู้ยืนยันการรับคืน");
    }

    const itemResult = await client.query(
      "SELECT item_id, item_name, status, student_id FROM found_items WHERE item_id = $1 FOR UPDATE",
      [claim.item_id]
    );
    item = itemResult.rows[0];
    if (!item) {
      await client.query("ROLLBACK");
      return notFound(res);
    }
    if (item.status !== "open") {
      await client.query("ROLLBACK");
      return badRequest(res, "รายการนี้ได้รับคืนแล้ว");
    }

    await client.query(
      "UPDATE found_items SET status = 'returned', returned_at = NOW(), returned_by = $1 WHERE item_id = $2",
      [item.student_id, item.item_id]
    );
    await client.query(
      `UPDATE claims SET status = CASE WHEN claim_id = $1 THEN 'accepted' ELSE 'closed' END
       WHERE item_type = 'found' AND item_id = $2`,
      [claim.claim_id, item.item_id]
    );
    returner = await creditReturner(client, item.student_id);
    linked = await closeLinkedPost(client, "found", item.item_id, req.user.student_id, item.student_id);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    return serverError(res, "Error confirming received item:", error);
  } finally {
    client.release();
  }

  const certificateIssued = await maybeIssueCertificate(returner);
  notify(
    item.student_id,
    {
      type: "returned",
      title: `ขอบคุณ! เจ้าของยืนยันว่าได้รับ "${item.item_name}" คืนแล้ว`,
      body: certificateIssued ? "คุณได้รับเกียรติบัตร ตรวจสอบได้ในอีเมลของคุณ" : "ยอดการคืนของสำเร็จของคุณเพิ่มขึ้นแล้ว",
      link: "/ranking",
    },
    { email: true }
  );
  res.status(200).json({ success: true });
};

// ─── GET /api/my-items ───────────────────────────────────────────────────────
const myItems = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*,
              (SELECT COUNT(*)::int FROM claims c
                WHERE c.item_type = p.type AND c.item_id = p.item_id AND c.status = 'pending') AS pending_claims,
              -- จำนวนคู่ที่ระบบจับคู่อัตโนมัติพบและแจ้งเตือนแล้ว (sql/line.sql)
              (SELECT COUNT(*)::int FROM match_notifications m
                WHERE (p.type = 'lost' AND m.lost_item_id = p.item_id)
                   OR (p.type = 'found' AND m.found_item_id = p.item_id)) AS match_count
       FROM (
         SELECT 'found' AS type, item_id, item_name, category, found_date AS date, found_location AS location,
                deposit_location, description, image_url, status, returned_at, returned_by, created_at, student_id
         FROM found_items WHERE student_id = $1
         UNION ALL
         SELECT 'lost' AS type, item_id, item_name, category, lost_date AS date, lost_location AS location,
                deposit_location, description, image_url, status, returned_at, returned_by, created_at, student_id
         FROM lost_items WHERE student_id = $1
       ) p
       ORDER BY p.created_at DESC`,
      [req.user.student_id]
    );
    res.status(200).json({ success: true, items: result.rows });
  } catch (error) {
    return serverError(res, "Error fetching my items:", error);
  }
};

// ตรวจว่ารายการเป็นของผู้ใช้คนนี้ (lock = SELECT ... FOR UPDATE ภายใน transaction)
const loadOwnItem = async (client, params, studentId, lock = false) => {
  const { table } = FIELDS[params.type];
  const result = await client.query(
    `SELECT item_id, item_name, status, student_id FROM ${table}
     WHERE item_id = $1 AND student_id = $2${lock ? " FOR UPDATE" : ""}`,
    [params.id, studentId]
  );
  return result.rows[0] || null;
};

// ─── GET /api/my-items/:type/:id/claims ──────────────────────────────────────
const itemClaims = async (req, res) => {
  const params = parseItemParams(req.params.type, req.params.id);
  if (!params) return badRequest(res, "ข้อมูลรายการไม่ถูกต้อง");

  try {
    if (!(await loadOwnItem(db, params, req.user.student_id))) return notFound(res);
    const result = await db.query(
      `SELECT c.claim_id, c.message, c.status, c.created_at,
              u.${USER_CONTACT_COLUMNS.split(", ").join(", u.")}
       FROM claims c JOIN users u ON u.student_id = c.claimant_student_id
       WHERE c.item_type = $1 AND c.item_id = $2
       ORDER BY c.created_at DESC`,
      [params.type, params.id]
    );
    res.status(200).json({
      success: true,
      claims: result.rows.map((row) => ({
        claim_id: row.claim_id,
        message: row.message,
        status: row.status,
        created_at: row.created_at,
        claimant: contactOf(row),
      })),
    });
  } catch (error) {
    return serverError(res, "Error fetching item claims:", error);
  }
};

// ─── POST /api/my-items/:type/:id/return ─────────────────────────────────────
// เจ้าของโพสต์เลือกผู้ติดต่อที่การคืนของสำเร็จ → ปิดโพสต์ และให้เครดิตผู้คืน
//   ของหาย: เจ้าของได้รับของคืนจากผู้ติดต่อ → เครดิตผู้ติดต่อ (คนที่เจอ)
//   ของพบ:  ผู้พบส่งคืนให้ผู้ติดต่อ (เจ้าของของ) → เครดิตผู้พบ และแจ้งผู้ติดต่อให้รับทราบ
const confirmReturn = async (req, res) => {
  const params = parseItemParams(req.params.type, req.params.id);
  if (!params) return badRequest(res, "ข้อมูลรายการไม่ถูกต้อง");
  if (!ID_PATTERN.test(String(req.body.claim_id))) return badRequest(res, "กรุณาเลือกผู้ติดต่อ");
  const { table } = FIELDS[params.type];

  const client = await db.connect();
  let returner = null;
  let item = null;
  let claim = null;
  let linked = null;
  try {
    await client.query("BEGIN");
    item = await loadOwnItem(client, params, req.user.student_id, true);
    if (!item) {
      await client.query("ROLLBACK");
      return notFound(res);
    }
    if (item.status !== "open") {
      await client.query("ROLLBACK");
      return badRequest(res, "รายการนี้ปิดไปแล้ว");
    }

    const claimResult = await client.query(
      "SELECT claim_id, claimant_student_id FROM claims WHERE claim_id = $1 AND item_type = $2 AND item_id = $3",
      [req.body.claim_id, params.type, params.id]
    );
    claim = claimResult.rows[0];
    if (!claim) {
      await client.query("ROLLBACK");
      return notFound(res, "ไม่พบผู้ติดต่อนี้ในรายการของคุณ");
    }

    const returnerId = params.type === "lost" ? claim.claimant_student_id : item.student_id;
    await client.query(
      `UPDATE ${table} SET status = 'returned', returned_at = NOW(), returned_by = $1 WHERE item_id = $2`,
      [returnerId, params.id]
    );
    await client.query(
      `UPDATE claims SET status = CASE WHEN claim_id = $1 THEN 'accepted' ELSE 'closed' END
       WHERE item_type = $2 AND item_id = $3`,
      [claim.claim_id, params.type, params.id]
    );
    returner = await creditReturner(client, returnerId);
    linked = await closeLinkedPost(client, params.type, params.id, claim.claimant_student_id, returnerId);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    return serverError(res, "Error confirming return:", error);
  } finally {
    client.release();
  }

  const certificateIssued = await maybeIssueCertificate(returner);
  if (params.type === "lost") {
    notify(
      returner?.student_id,
      {
        type: "returned",
        title: `ขอบคุณ! เจ้าของยืนยันว่าได้รับ "${item.item_name}" คืนแล้ว`,
        body: certificateIssued ? "คุณได้รับเกียรติบัตร ตรวจสอบได้ในอีเมลของคุณ" : "ยอดการคืนของสำเร็จของคุณเพิ่มขึ้นแล้ว",
        link: "/ranking",
      },
      { email: true }
    );
  } else {
    // ผู้พบกดเอง: แจ้งเจ้าของของให้รับทราบ (ถ้ายังไม่ได้รับของ จะได้แจ้งแอดมินได้)
    notify(
      claim.claimant_student_id,
      {
        type: "returned",
        title: `ผู้พบแจ้งว่าส่งคืน "${item.item_name}" ให้คุณเรียบร้อยแล้ว`,
        body: "หากคุณยังไม่ได้รับของ กด “ยังไม่ได้รับของ? แจ้งแอดมิน” ที่หน้าโพสต์ของฉัน",
        link: "/my-posts",
      },
      { email: true }
    );
  }
  res.status(200).json({ success: true, certificate_issued: certificateIssued, linked });
};

// ─── POST /api/my-items/:type/:id/close ──────────────────────────────────────
// เจ้าของปิดโพสต์เอง (ได้ของคืน/ส่งคืนนอกระบบ) — ไม่ให้เครดิตผู้ใด
const closeMyItem = async (req, res) => {
  const params = parseItemParams(req.params.type, req.params.id);
  if (!params) return badRequest(res, "ข้อมูลรายการไม่ถูกต้อง");
  const { table } = FIELDS[params.type];

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const item = await loadOwnItem(client, params, req.user.student_id, true);
    if (!item) {
      await client.query("ROLLBACK");
      return notFound(res);
    }
    if (item.status !== "open") {
      await client.query("ROLLBACK");
      return badRequest(res, "รายการนี้ปิดไปแล้ว");
    }
    await client.query(
      `UPDATE ${table} SET status = 'returned', returned_at = NOW(), returned_by = NULL WHERE item_id = $1`,
      [params.id]
    );
    await client.query("UPDATE claims SET status = 'closed' WHERE item_type = $1 AND item_id = $2 AND status = 'pending'", [
      params.type,
      params.id,
    ]);
    await client.query("COMMIT");
    res.status(200).json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    return serverError(res, "Error closing my item:", error);
  } finally {
    client.release();
  }
};

// ─── PATCH /api/my-items/:type/:id ───────────────────────────────────────────
const updateMyItem = async (req, res) => {
  const params = parseItemParams(req.params.type, req.params.id);
  if (!params) return badRequest(res, "ข้อมูลรายการไม่ถูกต้อง");
  const { table, date, location } = FIELDS[params.type];

  const validation = validateItem(req.body, date, location);
  if (validation.error) return badRequest(res, validation.error);
  const v = validation.value;

  try {
    const item = await loadOwnItem(db, params, req.user.student_id);
    if (!item) return notFound(res);
    if (item.status !== "open") return badRequest(res, "แก้ไขรายการที่ได้รับคืนแล้วไม่ได้");

    const result = await db.query(
      `UPDATE ${table}
       SET item_name = $1, category = $2, ${location} = $3, description = $4, deposit_location = $5, ${date} = $6
       WHERE item_id = $7 AND student_id = $8
       RETURNING *`,
      [v.item_name, v.category, v[location], v.description, v.deposit_location, v[date], params.id, req.user.student_id]
    );
    res.status(200).json({ success: true, item: result.rows[0] });
  } catch (error) {
    return serverError(res, "Error updating my item:", error);
  }
};

// ─── DELETE /api/my-items/:type/:id ──────────────────────────────────────────
const deleteMyItem = async (req, res) => {
  const params = parseItemParams(req.params.type, req.params.id);
  if (!params) return badRequest(res, "ข้อมูลรายการไม่ถูกต้อง");
  const { table } = FIELDS[params.type];

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const item = await loadOwnItem(client, params, req.user.student_id, true);
    if (!item) {
      await client.query("ROLLBACK");
      return notFound(res);
    }
    // โพสต์ที่คืนของสำเร็จแล้วถูกปิดถาวร (เก็บไว้เป็นหลักฐานการคืนของ)
    if (item.status !== "open") {
      await client.query("ROLLBACK");
      return badRequest(res, "โพสต์นี้คืนของสำเร็จแล้ว ไม่สามารถลบได้");
    }
    await client.query(`DELETE FROM ${table} WHERE item_id = $1 AND student_id = $2`, [params.id, req.user.student_id]);
    await client.query("DELETE FROM claims WHERE item_type = $1 AND item_id = $2", [params.type, params.id]);
    await client.query("COMMIT");
    res.status(200).json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    return serverError(res, "Error deleting my item:", error);
  } finally {
    client.release();
  }
};

// ─── GET /api/my-items/:type/:id/matches ─────────────────────────────────────
const itemMatches = async (req, res) => {
  const params = parseItemParams(req.params.type, req.params.id);
  if (!params) return badRequest(res, "ข้อมูลรายการไม่ถูกต้อง");
  const { table, date, location } = FIELDS[params.type];

  try {
    const result = await db.query(
      `SELECT item_id, item_name, category, ${date} AS date, ${location} AS location, student_id, status
       FROM ${table} WHERE item_id = $1 AND student_id = $2`,
      [params.id, req.user.student_id]
    );
    const item = result.rows[0];
    if (!item) return notFound(res);
    if (item.status !== "open") return res.status(200).json({ success: true, matches: [] });

    const matches = await findMatches(params.type, item);
    res.status(200).json({ success: true, matches });
  } catch (error) {
    return serverError(res, "Error fetching matches:", error);
  }
};

module.exports = {
  createClaim,
  myClaims,
  confirmReceived,
  myItems,
  itemClaims,
  confirmReturn,
  closeMyItem,
  updateMyItem,
  deleteMyItem,
  itemMatches,
};
