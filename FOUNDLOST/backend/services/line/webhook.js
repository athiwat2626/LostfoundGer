// LINE webhook: ตรวจลายเซ็น → ตอบ 200 ทันที → ประมวลผล event เบื้องหลัง
// LINE รอคำตอบไม่นาน และส่งซ้ำ (redelivery) ได้ จึงบันทึก webhookEventId กันประมวลผลซ้ำ
const { verifySignature } = require("./signature");
const messages = require("./messages");

const maskId = (id) => (id ? `${String(id).slice(0, 6)}…` : "-");

const COMMANDS = [
  { name: "link", pattern: /^(เชื่อมบัญชี|เชื่อมต่อบัญชี|link)$/i },
  { name: "unlink", pattern: /^(ยกเลิกการเชื่อม|ยกเลิกการเชื่อมบัญชี|unlink)$/i },
  { name: "status", pattern: /^(สถานะ|status)$/i },
];

/**
 * @param {{ repo, client, linking, getConfig: () => object, richMenus?: { apply }, schedule?: (fn) => void, logger?: Console }} deps
 */
const createWebhookHandler = ({ repo, client, linking, getConfig, richMenus = null, schedule = setImmediate, logger = console }) => {
  // สลับ Rich Menu ตามสถานะการเชื่อม (apply ไม่ throw)
  const switchMenu = async (lineUserId, linked) => {
    if (richMenus) await richMenus.apply(lineUserId, linked);
  };

  const reply = async (replyToken, replyMessages) => {
    if (!replyToken || !getConfig().channelAccessToken) return;
    try {
      await client.replyMessage(replyToken, replyMessages);
    } catch (error) {
      // reply token หมดอายุ/ใช้แล้ว (เช่น event ที่ถูกส่งซ้ำ) — ไม่กระทบข้อมูลที่บันทึกไปแล้ว
      logger.warn(`[line] reply failed: ${error.code || ""} ${error.message}`);
    }
  };

  const linkPrompt = async (lineUserId) => {
    const { token } = await linking.issueLinkToken(lineUserId);
    return messages.linkButtonMessage(
      token,
      `กดปุ่มด้านล่าง แล้วเข้าสู่ระบบเว็บแอปเพื่อยืนยันการเชื่อมบัญชี (ลิงก์ใช้ได้ครั้งเดียวภายใน ${getConfig().linkTokenTtlMinutes} นาที)`
    );
  };

  const fetchDisplayName = async (lineUserId) => {
    if (!getConfig().channelAccessToken) return null;
    try {
      return (await client.getProfile(lineUserId))?.displayName || null;
    } catch (error) {
      logger.warn(`[line] get profile failed for ${maskId(lineUserId)}: ${error.message}`);
      return null;
    }
  };

  const handleFollow = async (event) => {
    const lineUserId = event.source.userId;
    const displayName = await fetchDisplayName(lineUserId);
    const account = await repo.upsertFollow({ lineUserId, displayName });
    const { linkTokenTtlMinutes } = getConfig();

    if (account.student_id) {
      await switchMenu(lineUserId, true);
      await reply(event.replyToken, messages.welcomeMessages({ linked: true, displayName: account.display_name }));
    } else {
      const { token } = await linking.issueLinkToken(lineUserId);
      await reply(
        event.replyToken,
        messages.welcomeMessages({ linked: false, token, displayName: account.display_name, ttlMinutes: linkTokenTtlMinutes })
      );
    }
    logger.info(`[line] follow ${maskId(lineUserId)} linked=${Boolean(account.student_id)}`);
  };

  const handleUnfollow = async (event) => {
    await repo.markUnfollowed(event.source.userId);
    logger.info(`[line] unfollow ${maskId(event.source.userId)}`);
  };

  const unlinkAndReply = async (event) => {
    const lineUserId = event.source.userId;
    const unlinked = await repo.unlinkByLineUser(lineUserId);
    logger.info(`[line] unlink via chat ${maskId(lineUserId)} changed=${Boolean(unlinked)}`);
    await switchMenu(lineUserId, false);
    return reply(event.replyToken, [
      messages.text(
        unlinked
          ? "ยกเลิกการเชื่อมบัญชีแล้ว ระบบจะไม่ส่งแจ้งเตือนของบัญชีเว็บแอปมาที่ LINE นี้อีก\nพิมพ์ \"เชื่อมบัญชี\" เมื่อต้องการเชื่อมใหม่"
          : "บัญชี LINE นี้ยังไม่ได้เชื่อมกับบัญชีเว็บแอป\nพิมพ์ \"เชื่อมบัญชี\" เพื่อเริ่มเชื่อม"
      ),
    ]);
  };

  const handleText = async (event) => {
    const lineUserId = event.source.userId;
    const input = String(event.message.text || "").trim();
    const command = COMMANDS.find((c) => c.pattern.test(input))?.name;

    // ผู้ใช้ที่เพิ่มเพื่อนก่อนเปิด webhook จะยังไม่มีในฐานข้อมูล — สร้างให้เมื่อพิมพ์คำสั่ง
    let account = await repo.findAccountByLineUser(lineUserId);
    if (!account && command) account = await repo.upsertFollow({ lineUserId, displayName: await fetchDisplayName(lineUserId) });

    if (command === "link") {
      if (account.student_id) {
        await switchMenu(lineUserId, true);
        return reply(event.replyToken, [
          messages.text("บัญชี LINE นี้เชื่อมกับบัญชีเว็บแอปแล้ว ✅\nหากต้องการเชื่อมกับบัญชีอื่น พิมพ์ \"ยกเลิกการเชื่อม\" ก่อน"),
        ]);
      }
      return reply(event.replyToken, [await linkPrompt(lineUserId)]);
    }

    if (command === "unlink") return unlinkAndReply(event);

    if (command === "status") {
      return reply(event.replyToken, [
        messages.text(
          account.student_id
            ? `สถานะ: เชื่อมบัญชีแล้ว ✅\nการแจ้งเตือนทาง LINE: ${account.notify_enabled ? "เปิด" : "ปิด"} (ตั้งค่าได้ที่เมนู \"บัญชีของฉัน\")`
            : "สถานะ: ยังไม่ได้เชื่อมบัญชี\nพิมพ์ \"เชื่อมบัญชี\" เพื่อเริ่มเชื่อม"
        ),
      ]);
    }

    return reply(event.replyToken, [messages.text(messages.HELP_TEXT)]);
  };

  // postback จากปุ่ม "ยกเลิกการเชื่อมบัญชี" ใน Rich Menu และปุ่มยืนยันที่บอทส่งกลับ
  const handlePostback = async (event) => {
    const lineUserId = event.source.userId;
    const action = new URLSearchParams(String(event.postback?.data || "")).get("action");

    if (action === "unlink_prompt") {
      const account = await repo.findAccountByLineUser(lineUserId);
      if (!account?.student_id) {
        await switchMenu(lineUserId, false);
        return reply(event.replyToken, [
          messages.text("บัญชี LINE นี้ยังไม่ได้เชื่อมกับบัญชีเว็บแอป\nพิมพ์ \"เชื่อมบัญชี\" เพื่อเริ่มเชื่อม"),
        ]);
      }
      return reply(event.replyToken, [messages.unlinkConfirmMessage()]);
    }
    if (action === "unlink") return unlinkAndReply(event);
    if (action === "unlink_cancel") {
      return reply(event.replyToken, [messages.text("ยังเชื่อมบัญชีอยู่ตามเดิม ✅")]);
    }
  };

  const dispatch = async (event) => {
    // รองรับเฉพาะแชต 1:1 (บอทไม่ได้ออกแบบให้ใช้ในกลุ่ม)
    if (event.source?.type !== "user" || !event.source.userId) return;
    if (event.type === "follow") return handleFollow(event);
    if (event.type === "unfollow") return handleUnfollow(event);
    if (event.type === "message" && event.message?.type === "text") return handleText(event);
    if (event.type === "postback") return handlePostback(event);
  };

  const processEvents = async (events) => {
    for (const event of events) {
      try {
        if (event.webhookEventId) {
          const isNew = await repo.recordWebhookEvent(event.webhookEventId, String(event.type).slice(0, 30));
          if (!isNew) {
            logger.info(`[line] skip duplicate event ${event.webhookEventId}`);
            continue;
          }
        }
        await dispatch(event);
      } catch (error) {
        logger.error(`[line] event ${event.webhookEventId || "-"} (${event.type}) failed: ${error.message}`);
      }
    }
  };

  // Express handler — req.body ต้องเป็น Buffer (ใช้ express.raw กับ route นี้)
  const handler = (req, res) => {
    const { channelSecret } = getConfig();
    if (!channelSecret) {
      logger.error("[line] webhook called but LINE_CHANNEL_SECRET is not configured");
      return res.status(503).json({ success: false, message: "LINE webhook is not configured" });
    }
    if (!verifySignature(req.body, req.get("x-line-signature"), channelSecret)) {
      logger.warn("[line] rejected webhook with invalid signature");
      return res.status(401).json({ success: false, message: "Invalid signature" });
    }

    let body;
    try {
      body = JSON.parse(req.body.toString("utf8"));
    } catch {
      return res.status(400).json({ success: false, message: "Invalid JSON" });
    }

    res.status(200).json({ success: true });
    const events = Array.isArray(body.events) ? body.events : [];
    // ปุ่ม Verify ใน LINE Developers ส่ง events ว่าง
    if (events.length > 0) schedule(() => processEvents(events));
  };

  return { handler, processEvents };
};

module.exports = { createWebhookHandler };
