const express = require("express");
const router = express.Router();
const { userAuth } = require("../middleware/userAuth");
const inboxController = require("../controller/inboxController");

// การแจ้งเตือนของผู้ใช้ — ต้องล็อกอิน
router.use(userAuth);

router.get("/", inboxController.listNotifications);
router.post("/read-all", inboxController.markAllRead);
router.post("/:id/read", inboxController.markRead);

module.exports = router;
