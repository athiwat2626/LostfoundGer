// แจ้งเตือนเมื่อมีโพสต์ใหม่ที่อาจตรงกับโพสต์ฝั่งตรงข้าม (ทำงานเบื้องหลัง ไม่บล็อกการตอบกลับ)
// ช่องทาง: กล่องแจ้งเตือนในเว็บ (กระดิ่ง) + อีเมล + LINE (เมื่อผู้ใช้เชื่อมบัญชีและเปิดรับแจ้งเตือน)
// คู่ของหาย ↔ ของพบ เดิมจะถูกแจ้งเพียงครั้งเดียว (บันทึกใน match_notifications)

// แจ้งเจ้าของโพสต์ของหายเฉพาะคู่ที่คะแนนสูงพอ เพื่อไม่ให้แจ้งเตือนถี่เกินไป
const NOTIFY_MIN_SCORE = 60;

const myPostLink = (lostItemId) => `/my-posts?type=lost&item=${lostItemId}&panel=matches`;

/**
 * @param {{ findMatches, notify, repo, lineDelivery, logger?: Console }} deps
 */
const createMatchNotifier = ({ findMatches, notify, repo, lineDelivery, logger = console }) => {
  // แปลงผลการจับคู่เป็นคู่ (ของหาย, ของพบ, ผู้รับแจ้งเตือน = เจ้าของของหาย)
  const toPairs = (type, item, matches) => {
    if (type === "lost") {
      if (!item.student_id) return [];
      return matches.map((m) => ({
        lostItemId: String(item.item_id),
        foundItemId: String(m.item_id),
        recipientStudentId: item.student_id,
        score: m.score,
        lost: { item_id: item.item_id, item_name: item.item_name },
        found: m,
        reasons: m.reasons,
      }));
    }
    return matches
      .filter((m) => m.student_id)
      .map((m) => ({
        lostItemId: String(m.item_id),
        foundItemId: String(item.item_id),
        recipientStudentId: m.student_id,
        score: m.score,
        lost: { item_id: m.item_id, item_name: m.item_name },
        found: item,
        reasons: m.reasons,
      }));
  };

  /**
   * @param {"found"|"lost"} type ประเภทของโพสต์ที่เพิ่งสร้าง
   * @param {{ item_id, item_name, category, item_color, date, location, student_id }} item
   */
  const notifyNewItemMatches = async (type, item) => {
    try {
      const matches = await findMatches(type, item, { limit: 10, minScore: NOTIFY_MIN_SCORE });
      if (matches.length === 0) return { notified: 0 };

      const pairs = toPairs(type, item, matches);
      // บันทึกคู่ใหม่ คู่ที่เคยแจ้งแล้วจะไม่ถูกส่งกลับมา
      const fresh = await repo.recordMatchPairs(pairs);
      const freshKeys = new Map(fresh.map((f) => [`${f.lostItemId}:${f.foundItemId}`, f.matchNotificationId]));
      const newPairs = pairs
        .filter((p) => freshKeys.has(`${p.lostItemId}:${p.foundItemId}`))
        .map((p) => ({ ...p, matchNotificationId: freshKeys.get(`${p.lostItemId}:${p.foundItemId}`) }));
      if (newPairs.length === 0) return { notified: 0 };

      // รวมเป็นหนึ่งการแจ้งเตือนต่อผู้รับ
      const byRecipient = new Map();
      for (const pair of newPairs) {
        if (!byRecipient.has(pair.recipientStudentId)) byRecipient.set(pair.recipientStudentId, []);
        byRecipient.get(pair.recipientStudentId).push(pair);
      }

      for (const [recipient, recipientPairs] of byRecipient) {
        const first = recipientPairs[0];
        // ข้อความในกล่องแจ้งเตือน/อีเมล (รูปแบบเดิม)
        await notify(
          recipient,
          type === "lost"
            ? {
                type: "match",
                title: `พบของที่อาจเป็น "${item.item_name}" ของคุณ ${recipientPairs.length} รายการ`,
                body: recipientPairs.map((p) => p.found.item_name).slice(0, 3).join(", "),
                link: myPostLink(first.lostItemId),
              }
            : {
                type: "match",
                title: `มีคนแจ้งพบ "${item.item_name}" ที่อาจเป็น "${first.lost.item_name}" ของคุณ`,
                body: item.location ? `พบที่ ${item.location}` : null,
                link: myPostLink(first.lostItemId),
              },
          { email: true }
        );

        // LINE: ส่งเฉพาะผู้ที่เชื่อมบัญชีและเปิดรับแจ้งเตือน (ล้มเหลวไม่กระทบช่องทางอื่น)
        try {
          await lineDelivery.notifyMatches({ recipientStudentId: recipient, matches: recipientPairs });
        } catch (error) {
          logger.error(`LINE match notification failed: ${error.message}`);
        }
      }
      return { notified: byRecipient.size };
    } catch (error) {
      logger.error(`Match notification failed: ${error.message}`);
      return { notified: 0, error };
    }
  };

  return { notifyNewItemMatches };
};

// อินสแตนซ์ที่ใช้งานจริง (สร้างเมื่อเรียกครั้งแรก เพื่อไม่ให้การ import ไฟล์นี้ต้องต่อฐานข้อมูล)
let defaultNotifier = null;
const notifyNewItemMatches = (type, item) => {
  if (!defaultNotifier) {
    const { findMatches } = require("./matching");
    const { notify } = require("./notify");
    const line = require("./line");
    defaultNotifier = createMatchNotifier({ findMatches, notify, repo: line.repo, lineDelivery: line.matchDelivery });
  }
  return defaultNotifier.notifyNewItemMatches(type, item);
};

module.exports = { createMatchNotifier, notifyNewItemMatches, NOTIFY_MIN_SCORE };
