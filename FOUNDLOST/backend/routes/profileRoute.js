const express = require("express");
const router = express.Router();
const { userAuth } = require("../middleware/userAuth");
const profileController = require("../controller/profileController");

// ทุกเส้นทางต้องใช้ token ของผู้ใช้ (ได้จากการยืนยัน OTP)
router.use(userAuth);

router.get("/", profileController.getMe);
router.patch("/", profileController.updateMe);
router.post("/avatar", profileController.upload.single("image"), profileController.uploadAvatar);

module.exports = router;
