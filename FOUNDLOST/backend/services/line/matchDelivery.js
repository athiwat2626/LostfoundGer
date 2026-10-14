// ส่งแจ้งเตือนคู่ที่อาจตรงกันทาง LINE พร้อมบันทึกประวัติและลองใหม่อย่างปลอดภัย
//
// การกันส่งซ้ำ:
//  - คู่รายการเดิมแจ้งได้ครั้งเดียว (match_notifications UNIQUE) — ตรวจก่อนถึงไฟล์นี้ใน matchNotifier
//  - ทุกการส่งมี retry_key คงที่ ส่งเป็น X-Line-Retry-Key: ถ้าครั้งก่อน LINE รับไปแล้วแต่เราไม่ได้คำตอบ (timeout/เครือข่ายหลุด)
//    การลองใหม่ด้วย key เดิมจะได้ 409 แทนการส่งข้อความซ้ำ → บันทึกเป็นส่งสำเร็จ
//  - LINE จำ retry key ได้ 24 ชม. จึงหยุดลองใหม่ก่อนครบ (RETRY_WINDOW_MS) เพื่อไม่ให้มีโอกาสส่งซ้ำ
const crypto = require("crypto");
const messages = require("./messages");

const MAX_ATTEMPTS = 6;
const RETRY_WINDOW_MS = 23 * 60 * 60 * 1000;
const BACKOFF_MINUTES = [1, 5, 15, 60, 180];

const maskId = (id) => (id ? `${String(id).slice(0, 6)}…` : "-");

/**
 * @param {{ repo, client, isConfigured: () => boolean, now?: () => Date, logger?: Console, randomUUID?: () => string }} deps
 */
const createMatchDelivery = ({
  repo,
  client,
  isConfigured,
  now = () => new Date(),
  logger = console,
  randomUUID = crypto.randomUUID,
}) => {
  const isActive = (account, studentId) =>
    Boolean(account && account.student_id === studentId && account.is_following && account.notify_enabled);

  const handleFailure = async (delivery, error) => {
    // ครั้งก่อน LINE รับคำขอนี้ไปแล้ว (retry key เดิม) — ผู้ใช้ได้รับข้อความแล้ว
    if (error.status === 409 && error.acceptedRequestId) {
      await repo.markDeliverySent(delivery.delivery_id, error.acceptedRequestId);
      logger.info(`[line] delivery ${delivery.delivery_id} already accepted by LINE (retry key)`);
      return "sent";
    }

    const code = error.code || "unexpected_error";
    const age = now().getTime() - new Date(delivery.created_at).getTime();
    const canRetry = error.retryable !== false && delivery.attempts < MAX_ATTEMPTS && age < RETRY_WINDOW_MS;

    if (canRetry) {
      const minutes = BACKOFF_MINUTES[Math.min(delivery.attempts - 1, BACKOFF_MINUTES.length - 1)];
      const nextAttemptAt = new Date(now().getTime() + minutes * 60_000);
      await repo.markDeliveryRetry(delivery.delivery_id, { nextAttemptAt, code, message: error.message });
      logger.warn(`[line] delivery ${delivery.delivery_id} failed (${code}), retry #${delivery.attempts + 1} in ${minutes} min`);
      return "retry";
    }

    await repo.markDeliveryFailed(delivery.delivery_id, { code, message: error.message });
    logger.error(`[line] delivery ${delivery.delivery_id} failed permanently (${code}): ${error.message}`);
    return "failed";
  };

  // ส่งงานที่จองไว้แล้ว (สถานะ sending) — คืนสถานะสุดท้ายของรอบนี้
  const sendDelivery = async (delivery) => {
    let result;
    try {
      result = await client.pushMessage(delivery.line_user_id, delivery.payload, { retryKey: delivery.retry_key });
    } catch (error) {
      return handleFailure(delivery, error);
    }
    await repo.markDeliverySent(delivery.delivery_id, result?.requestId);
    logger.info(`[line] delivery ${delivery.delivery_id} sent to ${maskId(delivery.line_user_id)}`);
    return "sent";
  };

  /**
   * แจ้งเจ้าของของหายหนึ่งคนถึงคู่ใหม่ (รวมเป็นข้อความเดียว)
   * @param {{ recipientStudentId: string, matches: Array<{ matchNotificationId, lost, found, score, reasons }> }} input
   */
  const notifyMatches = async ({ recipientStudentId, matches }) => {
    if (!recipientStudentId || matches.length === 0) return { status: "skipped", reason: "no_matches" };
    if (!isConfigured()) {
      logger.warn("[line] match notification skipped: LINE_CHANNEL_ACCESS_TOKEN is not configured");
      return { status: "skipped", reason: "not_configured" };
    }

    const account = await repo.findAccountByStudent(recipientStudentId);
    if (!isActive(account, recipientStudentId)) return { status: "skipped", reason: "not_linked_or_disabled" };

    const lost = matches[0].lost;
    const delivery = await repo.createDelivery({
      studentId: recipientStudentId,
      lineUserId: account.line_user_id,
      notificationType: "match",
      itemType: "lost",
      itemId: lost.item_id,
      title: `พบ ${matches.length} รายการที่อาจตรงกับ "${lost.item_name}"`,
      payload: messages.matchMessages(matches),
      retryKey: randomUUID(),
    });
    await repo.attachDeliveryToMatches(
      delivery.delivery_id,
      matches.map((m) => m.matchNotificationId)
    );

    return { status: await sendDelivery(delivery), deliveryId: delivery.delivery_id };
  };

  // ลองส่งงานที่ถึงเวลาอีกครั้ง (เรียกจาก worker)
  const processDueDeliveries = async () => {
    if (!isConfigured()) return [];
    const due = await repo.claimDueDeliveries();
    const results = [];
    for (const delivery of due) {
      try {
        const age = now().getTime() - new Date(delivery.created_at).getTime();
        if (age >= RETRY_WINDOW_MS) {
          // retry key ใกล้หมดอายุที่ LINE แล้ว ส่งต่อมีโอกาสซ้ำ → หยุด
          await repo.markDeliveryFailed(delivery.delivery_id, {
            code: "retry_window_expired",
            message: "หยุดลองใหม่เพื่อป้องกันข้อความซ้ำ",
          });
          results.push("failed");
          continue;
        }
        // ผู้รับยกเลิกการเชื่อม/บล็อก/ปิดแจ้งเตือนระหว่างรอ → ไม่ส่ง
        const account = await repo.findAccountByLineUser(delivery.line_user_id);
        if (!isActive(account, delivery.student_id)) {
          await repo.markDeliveryFailed(delivery.delivery_id, {
            code: "recipient_inactive",
            message: "ผู้รับยกเลิกการเชื่อมหรือปิดการแจ้งเตือนแล้ว",
          });
          results.push("failed");
          continue;
        }
        results.push(await sendDelivery(delivery));
      } catch (error) {
        logger.error(`[line] retry of delivery ${delivery.delivery_id} crashed: ${error.message}`);
      }
    }
    return results;
  };

  const startRetryWorker = ({ intervalMs = 60_000 } = {}) => {
    let running = false;
    const timer = setInterval(async () => {
      if (running) return;
      running = true;
      try {
        await processDueDeliveries();
      } catch (error) {
        logger.error(`[line] retry worker error: ${error.message}`);
      } finally {
        running = false;
      }
    }, intervalMs);
    timer.unref();
    return timer;
  };

  return { notifyMatches, sendDelivery, processDueDeliveries, startRetryWorker };
};

module.exports = { createMatchDelivery, MAX_ATTEMPTS, RETRY_WINDOW_MS };
