const express = require("express");
const { userAuth } = require("../middleware/userAuth");
const { createLineController } = require("../controller/lineController");
const { getLineConfig } = require("../services/line/config");
const { getBotInfo } = require("../services/line/lineClient");
const line = require("../services/line");

const controller = createLineController({ repo: line.repo, linking: line.linking, getConfig: getLineConfig, getBotInfo });

// การเชื่อมบัญชี LINE และการแจ้งเตือนของผู้ใช้ — ต้องล็อกอิน
// (webhook POST /api/line/webhook ลงทะเบียนแยกใน server.js เพราะต้องใช้ raw body)
const router = express.Router();
// หน้าเพิ่มเพื่อนเปิดได้โดยไม่ต้องเข้าสู่ระบบ (ลงทะเบียนก่อน userAuth)
router.get("/info", controller.getPublicInfo);
router.use(userAuth);

router.get("/status", controller.getStatus);
router.post("/link/preview", controller.previewLink);
router.post("/link", controller.confirmLink);
router.delete("/link", controller.unlink);
router.patch("/preferences", controller.updatePreferences);
router.get("/notifications", controller.listMyDeliveries);

// สำหรับแอดมิน: ตรวจสอบการส่งข้อความ/ข้อผิดพลาด (mount ใต้ /admin ที่ผ่าน adminAuth แล้ว)
const adminRouter = express.Router();
adminRouter.get("/deliveries", controller.listDeliveries);

module.exports = { router, adminRouter };
