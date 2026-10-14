// SQL ทั้งหมดของระบบ LINE (ตารางอยู่ใน sql/line.sql)
// ตรรกะการเชื่อมบัญชี/การส่งข้อความอยู่ในไฟล์อื่นและรับ repository นี้เป็นพารามิเตอร์ ทำให้ทดสอบด้วย repository ในหน่วยความจำได้

const ACCOUNT_COLUMNS =
  "line_user_id, student_id, display_name, is_following, notify_enabled, linked_at, followed_at, unfollowed_at";
const DELIVERY_COLUMNS =
  "delivery_id, student_id, line_user_id, notification_type, item_type, item_id, title, payload, retry_key, status, attempts, next_attempt_at, last_error_code, last_error_message, line_request_id, created_at, updated_at, sent_at";

// คำสั่งที่ใช้ได้ทั้งนอกและใน transaction (q = pool หรือ client)
const accountQueries = (q) => ({
  findAccountByLineUser: async (lineUserId) =>
    (await q.query(`SELECT ${ACCOUNT_COLUMNS} FROM line_accounts WHERE line_user_id = $1`, [lineUserId])).rows[0] || null,

  findAccountByStudent: async (studentId) =>
    (await q.query(`SELECT ${ACCOUNT_COLUMNS} FROM line_accounts WHERE student_id = $1`, [studentId])).rows[0] || null,
});

const createLineRepository = (db) => {
  const base = accountQueries(db);

  return {
    ...base,

    // ─── เพิ่มเพื่อน / ยกเลิกเพื่อน ─────────────────────────────────────────
    upsertFollow: async ({ lineUserId, displayName }) =>
      (
        await db.query(
          `INSERT INTO line_accounts (line_user_id, display_name, is_following, followed_at)
           VALUES ($1, $2, TRUE, NOW())
           ON CONFLICT (line_user_id) DO UPDATE
             SET is_following = TRUE, followed_at = NOW(), unfollowed_at = NULL,
                 display_name = COALESCE(EXCLUDED.display_name, line_accounts.display_name),
                 updated_at = NOW()
           RETURNING ${ACCOUNT_COLUMNS}`,
          [lineUserId, displayName || null]
        )
      ).rows[0],

    // คงการเชื่อมบัญชีไว้ (เพิ่มเพื่อนกลับมาก็ใช้ต่อได้) แต่หยุดส่งข้อความ และยกเลิกรหัสเชื่อมที่ยังไม่ได้ใช้
    markUnfollowed: async (lineUserId) => {
      await db.query("DELETE FROM line_link_tokens WHERE line_user_id = $1 AND used_at IS NULL", [lineUserId]);
      return (
        (
          await db.query(
            `UPDATE line_accounts SET is_following = FALSE, unfollowed_at = NOW(), updated_at = NOW()
             WHERE line_user_id = $1 RETURNING ${ACCOUNT_COLUMNS}`,
            [lineUserId]
          )
        ).rows[0] || null
      );
    },

    setNotifyEnabled: async (studentId, enabled) =>
      (
        await db.query(
          `UPDATE line_accounts SET notify_enabled = $2, updated_at = NOW()
           WHERE student_id = $1 RETURNING ${ACCOUNT_COLUMNS}`,
          [studentId, enabled]
        )
      ).rows[0] || null,

    unlinkByStudent: async (studentId) =>
      (
        await db.query(
          `UPDATE line_accounts SET student_id = NULL, linked_at = NULL, updated_at = NOW()
           WHERE student_id = $1 RETURNING ${ACCOUNT_COLUMNS}`,
          [studentId]
        )
      ).rows[0] || null,

    unlinkByLineUser: async (lineUserId) =>
      (
        await db.query(
          `UPDATE line_accounts SET student_id = NULL, linked_at = NULL, updated_at = NOW()
           WHERE line_user_id = $1 AND student_id IS NOT NULL RETURNING ${ACCOUNT_COLUMNS}`,
          [lineUserId]
        )
      ).rows[0] || null,

    // ─── รหัสเชื่อมบัญชี ─────────────────────────────────────────────────────
    // ออกรหัสใหม่แล้วยกเลิกรหัสเก่าที่ยังไม่ใช้ (มีรหัสที่ใช้ได้ทีละ 1 รหัสต่อบัญชี LINE)
    createLinkToken: async ({ tokenHash, lineUserId, expiresAt }) => {
      await db.query("DELETE FROM line_link_tokens WHERE line_user_id = $1 AND used_at IS NULL", [lineUserId]);
      await db.query("INSERT INTO line_link_tokens (token_hash, line_user_id, expires_at) VALUES ($1, $2, $3)", [
        tokenHash,
        lineUserId,
        expiresAt,
      ]);
    },

    findLinkToken: async (tokenHash) =>
      (
        await db.query(
          `SELECT t.token_hash, t.line_user_id, t.expires_at, t.used_at, a.display_name, a.student_id AS linked_student_id
           FROM line_link_tokens t JOIN line_accounts a ON a.line_user_id = t.line_user_id
           WHERE t.token_hash = $1`,
          [tokenHash]
        )
      ).rows[0] || null,

    pruneLinkTokens: () =>
      db.query("DELETE FROM line_link_tokens WHERE expires_at < NOW() - INTERVAL '1 day'"),

    // งานหลายขั้นที่ต้องสำเร็จพร้อมกัน (ล็อกแถวไว้ กันกดยืนยันซ้อนกัน)
    withTransaction: async (fn) => {
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const tx = {
          ...accountQueries(client),
          lockLinkToken: async (tokenHash) =>
            (
              await client.query(
                `SELECT t.token_hash, t.line_user_id, t.expires_at, t.used_at, a.display_name, a.student_id AS linked_student_id
                 FROM line_link_tokens t JOIN line_accounts a ON a.line_user_id = t.line_user_id
                 WHERE t.token_hash = $1
                 FOR UPDATE OF t, a`,
                [tokenHash]
              )
            ).rows[0] || null,
          linkAccount: async (lineUserId, studentId) =>
            (
              await client.query(
                `UPDATE line_accounts SET student_id = $2, linked_at = NOW(), notify_enabled = TRUE, updated_at = NOW()
                 WHERE line_user_id = $1 RETURNING ${ACCOUNT_COLUMNS}`,
                [lineUserId, studentId]
              )
            ).rows[0],
          markTokenUsed: (tokenHash, studentId) =>
            client.query("UPDATE line_link_tokens SET used_at = NOW(), used_by_student_id = $2 WHERE token_hash = $1", [
              tokenHash,
              studentId,
            ]),
        };
        const result = await fn(tx);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },

    // ─── Webhook ───────────────────────────────────────────────────────────
    // true = event ใหม่ / false = เคยประมวลผลแล้ว (LINE ส่งซ้ำ)
    recordWebhookEvent: async (webhookEventId, eventType) =>
      (
        await db.query(
          `INSERT INTO line_webhook_events (webhook_event_id, event_type) VALUES ($1, $2)
           ON CONFLICT (webhook_event_id) DO NOTHING RETURNING webhook_event_id`,
          [webhookEventId, eventType]
        )
      ).rowCount === 1,

    pruneWebhookEvents: () => db.query("DELETE FROM line_webhook_events WHERE received_at < NOW() - INTERVAL '7 days'"),

    // ─── คู่ที่จับได้ ─────────────────────────────────────────────────────────
    // บันทึกคู่ใหม่และคืนเฉพาะคู่ที่ยังไม่เคยแจ้ง (คู่เดิมถูกข้ามด้วย UNIQUE (lost_item_id, found_item_id))
    recordMatchPairs: async (pairs) => {
      if (pairs.length === 0) return [];
      const result = await db.query(
        `INSERT INTO match_notifications (lost_item_id, found_item_id, recipient_student_id, score)
         SELECT * FROM UNNEST($1::bigint[], $2::bigint[], $3::varchar[], $4::int[])
         ON CONFLICT (lost_item_id, found_item_id) DO NOTHING
         RETURNING match_notification_id, lost_item_id, found_item_id, recipient_student_id, score`,
        [
          pairs.map((p) => p.lostItemId),
          pairs.map((p) => p.foundItemId),
          pairs.map((p) => p.recipientStudentId),
          pairs.map((p) => p.score),
        ]
      );
      return result.rows.map((row) => ({
        matchNotificationId: row.match_notification_id,
        lostItemId: String(row.lost_item_id),
        foundItemId: String(row.found_item_id),
        recipientStudentId: row.recipient_student_id,
        score: row.score,
      }));
    },

    attachDeliveryToMatches: (deliveryId, matchNotificationIds) =>
      db.query("UPDATE match_notifications SET line_delivery_id = $1 WHERE match_notification_id = ANY($2::bigint[])", [
        deliveryId,
        matchNotificationIds,
      ]),

    // ─── การส่งข้อความ ────────────────────────────────────────────────────────
    // สร้างในสถานะ sending (ผู้สร้างเป็นผู้ส่งครั้งแรกเอง) attempts = 1
    createDelivery: async ({ studentId, lineUserId, notificationType, itemType, itemId, title, payload, retryKey }) =>
      (
        await db.query(
          `INSERT INTO line_deliveries
             (student_id, line_user_id, notification_type, item_type, item_id, title, payload, retry_key, status, attempts)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'sending', 1)
           RETURNING ${DELIVERY_COLUMNS}`,
          [studentId, lineUserId, notificationType, itemType, itemId, title.slice(0, 200), JSON.stringify(payload), retryKey]
        )
      ).rows[0],

    markDeliverySent: (deliveryId, requestId) =>
      db.query(
        `UPDATE line_deliveries SET status = 'sent', sent_at = NOW(), updated_at = NOW(), next_attempt_at = NULL,
           line_request_id = $2, last_error_code = NULL, last_error_message = NULL
         WHERE delivery_id = $1`,
        [deliveryId, requestId || null]
      ),

    markDeliveryRetry: (deliveryId, { nextAttemptAt, code, message }) =>
      db.query(
        `UPDATE line_deliveries SET status = 'retry', next_attempt_at = $2, last_error_code = $3, last_error_message = $4, updated_at = NOW()
         WHERE delivery_id = $1`,
        [deliveryId, nextAttemptAt, code, String(message || "").slice(0, 500)]
      ),

    markDeliveryFailed: (deliveryId, { code, message }) =>
      db.query(
        `UPDATE line_deliveries SET status = 'failed', next_attempt_at = NULL, last_error_code = $2, last_error_message = $3, updated_at = NOW()
         WHERE delivery_id = $1`,
        [deliveryId, code, String(message || "").slice(0, 500)]
      ),

    // จองงานที่ถึงเวลาลองใหม่ (SKIP LOCKED: หลายโปรเซสทำงานพร้อมกันก็ไม่หยิบงานเดียวกัน)
    // รวมงานที่ค้างสถานะ sending นานเกินไป (เช่น โปรเซสตายระหว่างส่ง) — ส่งซ้ำได้ปลอดภัยเพราะใช้ retry_key เดิม
    claimDueDeliveries: async ({ limit = 20, staleSeconds = 300 } = {}) =>
      (
        await db.query(
          `UPDATE line_deliveries SET status = 'sending', attempts = attempts + 1, updated_at = NOW()
           WHERE delivery_id IN (
             SELECT delivery_id FROM line_deliveries
             WHERE (status = 'retry' AND next_attempt_at <= NOW())
                OR (status = 'sending' AND updated_at < NOW() - make_interval(secs => $2))
             ORDER BY next_attempt_at NULLS FIRST
             LIMIT $1
             FOR UPDATE SKIP LOCKED
           )
           RETURNING ${DELIVERY_COLUMNS}`,
          [limit, staleSeconds]
        )
      ).rows,

    listDeliveriesForStudent: async (studentId, limit = 30) =>
      (
        await db.query(
          `SELECT delivery_id, notification_type, item_type, item_id, title, status, attempts, created_at, sent_at
           FROM line_deliveries WHERE student_id = $1 ORDER BY created_at DESC LIMIT $2`,
          [studentId, limit]
        )
      ).rows,

    listDeliveries: async ({ status = null, limit = 100 } = {}) =>
      (
        await db.query(
          `SELECT delivery_id, student_id, notification_type, item_type, item_id, title, status, attempts,
                  next_attempt_at, last_error_code, last_error_message, line_request_id, created_at, sent_at
           FROM line_deliveries WHERE ($1::varchar IS NULL OR status = $1)
           ORDER BY created_at DESC LIMIT $2`,
          [status, limit]
        )
      ).rows,
  };
};

module.exports = { createLineRepository };
