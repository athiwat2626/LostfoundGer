// API ฝั่งเว็บแอปของระบบ LINE: สถานะ, ยืนยันการเชื่อมบัญชี, ยกเลิก, ตั้งค่า และประวัติการแจ้งเตือน
// ทุก endpoint ผ่าน userAuth — ใช้ student_id จาก token เท่านั้น ไม่รับรหัสผู้ใช้จาก URL/body
const { LinkError } = require("../services/line/accountLinking");

const DELIVERY_STATUSES = ["sending", "sent", "retry", "failed"];

/**
 * @param {{ repo, linking, getConfig: () => object, richMenus?: { apply }, logger?: Console }} deps
 */
const BOT_INFO_TTL_MS = 10 * 60 * 1000;

const createLineController = ({ repo, linking, getConfig, getBotInfo = null, richMenus = null, logger = console }) => {
  // สลับ Rich Menu (ปุ่มเชื่อม/ยกเลิก) หลังตอบผู้ใช้แล้ว — apply ไม่ throw และไม่ต้องรอ
  const switchMenu = (lineUserId, linked) => {
    if (richMenus) richMenus.apply(lineUserId, linked);
  };

  let botInfoCache = { at: 0, value: null };

  // ชื่อ/รูป OA จาก LINE (cache 10 นาที — ไม่เรียก LINE ทุกครั้งที่มีคนเปิดหน้า)
  const cachedBotInfo = async () => {
    if (!getBotInfo || !getConfig().channelAccessToken) return null;
    if (Date.now() - botInfoCache.at < BOT_INFO_TTL_MS) return botInfoCache.value;
    try {
      botInfoCache = { at: Date.now(), value: await getBotInfo() };
    } catch (error) {
      logger.warn(`[line] bot info unavailable: ${error.message}`);
      botInfoCache = { at: Date.now(), value: null };
    }
    return botInfoCache.value;
  };

  const serverError = (res, label, error) => {
    logger.error(label, error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  };

  const publicAccount = (account) =>
    account
      ? {
          display_name: account.display_name,
          is_following: account.is_following,
          notify_enabled: account.notify_enabled,
          linked_at: account.linked_at,
        }
      : null;

  // ─── GET /api/line/info (สาธารณะ) ───────────────────────────────────────────
  // ข้อมูลสำหรับหน้าเพิ่มเพื่อน: ไม่มีข้อมูลลับหรือข้อมูลผู้ใช้
  const getPublicInfo = async (req, res) => {
    const config = getConfig();
    const bot = await cachedBotInfo();
    res.status(200).json({
      success: true,
      available: Boolean(config.addFriendUrl),
      basic_id: config.basicId,
      add_friend_url: config.addFriendUrl,
      qr_url: config.addFriendQrUrl,
      display_name: bot?.displayName || null,
      picture_url: bot?.pictureUrl || null,
    });
  };

  // ─── GET /api/line/status ──────────────────────────────────────────────────
  const getStatus = async (req, res) => {
    try {
      const account = await repo.findAccountByStudent(req.user.student_id);
      const config = getConfig();
      res.status(200).json({
        success: true,
        configured: Boolean(config.channelAccessToken && config.channelSecret),
        add_friend_url: config.addFriendUrl,
        linked: Boolean(account),
        line: publicAccount(account),
      });
    } catch (error) {
      return serverError(res, "Error fetching LINE status:", error);
    }
  };

  const sendLinkError = (res, error) => res.status(error.status).json({ success: false, code: error.code, message: error.message });

  // ─── POST /api/line/link/preview ───────────────────────────────────────────
  // แสดงชื่อ LINE ที่กำลังจะเชื่อม ก่อนผู้ใช้กดยืนยัน (ยังไม่ใช้รหัส)
  const previewLink = async (req, res) => {
    try {
      const preview = await linking.previewLink(req.body?.token);
      res.status(200).json({ success: true, ...preview });
    } catch (error) {
      if (error instanceof LinkError) return sendLinkError(res, error);
      return serverError(res, "Error previewing LINE link:", error);
    }
  };

  // ─── POST /api/line/link ───────────────────────────────────────────────────
  const confirmLink = async (req, res) => {
    try {
      const { account, alreadyLinked } = await linking.confirmLink(req.body?.token, req.user.student_id);
      logger.info(`[line] account linked for ${req.user.student_id} (already=${alreadyLinked})`);
      res.status(200).json({ success: true, already_linked: alreadyLinked, line: publicAccount(account) });
      switchMenu(account.line_user_id, true);
    } catch (error) {
      if (error instanceof LinkError) return sendLinkError(res, error);
      return serverError(res, "Error linking LINE account:", error);
    }
  };

  // ─── DELETE /api/line/link ─────────────────────────────────────────────────
  const unlink = async (req, res) => {
    try {
      const account = await repo.unlinkByStudent(req.user.student_id);
      if (!account) return res.status(404).json({ success: false, message: "บัญชีนี้ยังไม่ได้เชื่อม LINE" });
      logger.info(`[line] account unlinked by ${req.user.student_id}`);
      res.status(200).json({ success: true });
      switchMenu(account.line_user_id, false);
    } catch (error) {
      return serverError(res, "Error unlinking LINE account:", error);
    }
  };

  // ─── PATCH /api/line/preferences ───────────────────────────────────────────
  const updatePreferences = async (req, res) => {
    if (typeof req.body?.notify_enabled !== "boolean") {
      return res.status(400).json({ success: false, message: "notify_enabled ต้องเป็น true หรือ false" });
    }
    try {
      const account = await repo.setNotifyEnabled(req.user.student_id, req.body.notify_enabled);
      if (!account) return res.status(404).json({ success: false, message: "บัญชีนี้ยังไม่ได้เชื่อม LINE" });
      res.status(200).json({ success: true, line: publicAccount(account) });
    } catch (error) {
      return serverError(res, "Error updating LINE preferences:", error);
    }
  };

  // ─── GET /api/line/notifications ───────────────────────────────────────────
  const listMyDeliveries = async (req, res) => {
    try {
      const deliveries = await repo.listDeliveriesForStudent(req.user.student_id, 30);
      res.status(200).json({ success: true, deliveries });
    } catch (error) {
      return serverError(res, "Error fetching LINE deliveries:", error);
    }
  };

  // ─── GET /admin/line/deliveries (แอดมิน) ───────────────────────────────────
  const listDeliveries = async (req, res) => {
    const status = req.query.status ? String(req.query.status) : null;
    if (status && !DELIVERY_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "status ไม่ถูกต้อง" });
    }
    try {
      res.status(200).json({ success: true, deliveries: await repo.listDeliveries({ status, limit: 100 }) });
    } catch (error) {
      return serverError(res, "Error fetching LINE deliveries:", error);
    }
  };

  return { getPublicInfo, getStatus, previewLink, confirmLink, unlink, updatePreferences, listMyDeliveries, listDeliveries };
};

module.exports = { createLineController };
