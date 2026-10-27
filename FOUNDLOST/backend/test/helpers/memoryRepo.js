// repository ในหน่วยความจำ — มีเมธอดเดียวกับ services/line/lineRepository.js และจำลองข้อจำกัด UNIQUE ของฐานข้อมูล
const createMemoryRepo = ({ now = () => new Date() } = {}) => {
  const accounts = new Map(); // line_user_id → account
  const tokens = new Map(); // token_hash → token
  const webhookEvents = new Set();
  const matchPairs = new Map(); // "lost:found" → row
  const deliveries = new Map();
  let nextMatchId = 1;
  let nextDeliveryId = 1;

  const copy = (row) => (row ? { ...row } : null);
  const byStudent = (studentId) => [...accounts.values()].find((a) => a.student_id === studentId) || null;

  const accountReads = {
    findAccountByLineUser: async (lineUserId) => copy(accounts.get(lineUserId)),
    findAccountByStudent: async (studentId) => copy(byStudent(studentId)),
  };

  const tokenView = (token) =>
    token
      ? {
          ...token,
          display_name: accounts.get(token.line_user_id)?.display_name || null,
          linked_student_id: accounts.get(token.line_user_id)?.student_id || null,
        }
      : null;

  const repo = {
    ...accountReads,
    _state: { accounts, tokens, webhookEvents, matchPairs, deliveries },

    upsertFollow: async ({ lineUserId, displayName }) => {
      const existing = accounts.get(lineUserId);
      const account = existing
        ? { ...existing, is_following: true, followed_at: now(), unfollowed_at: null, display_name: displayName || existing.display_name }
        : {
            line_user_id: lineUserId,
            student_id: null,
            display_name: displayName || null,
            is_following: true,
            notify_enabled: true,
            linked_at: null,
            followed_at: now(),
            unfollowed_at: null,
          };
      accounts.set(lineUserId, account);
      return copy(account);
    },

    markUnfollowed: async (lineUserId) => {
      for (const [hash, token] of tokens) if (token.line_user_id === lineUserId && !token.used_at) tokens.delete(hash);
      const account = accounts.get(lineUserId);
      if (!account) return null;
      Object.assign(account, { is_following: false, unfollowed_at: now() });
      return copy(account);
    },

    setNotifyEnabled: async (studentId, enabled) => {
      const account = byStudent(studentId);
      if (!account) return null;
      account.notify_enabled = enabled;
      return copy(account);
    },

    unlinkByStudent: async (studentId) => {
      const account = byStudent(studentId);
      if (!account) return null;
      Object.assign(account, { student_id: null, linked_at: null });
      return copy(account);
    },

    unlinkByLineUser: async (lineUserId) => {
      const account = accounts.get(lineUserId);
      if (!account || !account.student_id) return null;
      Object.assign(account, { student_id: null, linked_at: null });
      return copy(account);
    },

    createLinkToken: async ({ tokenHash, lineUserId, expiresAt }) => {
      for (const [hash, token] of tokens) if (token.line_user_id === lineUserId && !token.used_at) tokens.delete(hash);
      tokens.set(tokenHash, { token_hash: tokenHash, line_user_id: lineUserId, expires_at: expiresAt, used_at: null });
    },

    findLinkToken: async (tokenHash) => tokenView(tokens.get(tokenHash)),
    pruneLinkTokens: async () => {},

    withTransaction: async (fn) =>
      fn({
        ...accountReads,
        lockLinkToken: async (tokenHash) => tokenView(tokens.get(tokenHash)),
        linkAccount: async (lineUserId, studentId) => {
          const other = byStudent(studentId);
          if (other && other.line_user_id !== lineUserId) {
            throw Object.assign(new Error("duplicate key value violates unique constraint"), { code: "23505" });
          }
          const account = accounts.get(lineUserId);
          Object.assign(account, { student_id: studentId, linked_at: now(), notify_enabled: true });
          return copy(account);
        },
        markTokenUsed: async (tokenHash, studentId) => {
          Object.assign(tokens.get(tokenHash), { used_at: now(), used_by_student_id: studentId });
        },
      }),

    recordWebhookEvent: async (id) => {
      if (webhookEvents.has(id)) return false;
      webhookEvents.add(id);
      return true;
    },
    pruneWebhookEvents: async () => {},

    recordMatchPairs: async (pairs) => {
      const inserted = [];
      for (const p of pairs) {
        const key = `${p.lostItemId}:${p.foundItemId}`;
        if (matchPairs.has(key)) continue;
        const row = {
          matchNotificationId: nextMatchId++,
          lostItemId: String(p.lostItemId),
          foundItemId: String(p.foundItemId),
          recipientStudentId: p.recipientStudentId,
          score: p.score,
          lineDeliveryId: null,
        };
        matchPairs.set(key, row);
        inserted.push({ ...row });
      }
      return inserted;
    },

    attachDeliveryToMatches: async (deliveryId, ids) => {
      for (const row of matchPairs.values()) if (ids.includes(row.matchNotificationId)) row.lineDeliveryId = deliveryId;
    },

    createDelivery: async ({ studentId, lineUserId, notificationType, itemType, itemId, title, payload, retryKey }) => {
      const row = {
        delivery_id: nextDeliveryId++,
        student_id: studentId,
        line_user_id: lineUserId,
        notification_type: notificationType,
        item_type: itemType,
        item_id: itemId,
        title,
        payload: JSON.parse(JSON.stringify(payload)),
        retry_key: retryKey,
        status: "sending",
        attempts: 1,
        next_attempt_at: null,
        last_error_code: null,
        last_error_message: null,
        line_request_id: null,
        created_at: now(),
        updated_at: now(),
        sent_at: null,
      };
      deliveries.set(row.delivery_id, row);
      return copy(row);
    },

    markDeliverySent: async (id, requestId) => {
      Object.assign(deliveries.get(id), {
        status: "sent",
        sent_at: now(),
        next_attempt_at: null,
        line_request_id: requestId || null,
        last_error_code: null,
        last_error_message: null,
      });
    },
    markDeliveryRetry: async (id, { nextAttemptAt, code, message }) => {
      Object.assign(deliveries.get(id), { status: "retry", next_attempt_at: nextAttemptAt, last_error_code: code, last_error_message: message });
    },
    markDeliveryFailed: async (id, { code, message }) => {
      Object.assign(deliveries.get(id), { status: "failed", next_attempt_at: null, last_error_code: code, last_error_message: message });
    },

    claimDueDeliveries: async () => {
      const due = [...deliveries.values()].filter((d) => d.status === "retry" && d.next_attempt_at <= now());
      return due.map((d) => {
        Object.assign(d, { status: "sending", attempts: d.attempts + 1, updated_at: now() });
        return copy(d);
      });
    },

    listDeliveriesForStudent: async (studentId) => [...deliveries.values()].filter((d) => d.student_id === studentId).map(copy),
    listDeliveries: async ({ status } = {}) => [...deliveries.values()].filter((d) => !status || d.status === status).map(copy),
  };
  return repo;
};

module.exports = { createMemoryRepo };
