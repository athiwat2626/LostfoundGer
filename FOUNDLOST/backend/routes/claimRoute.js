const express = require("express");
const router = express.Router();
const { userAuth } = require("../middleware/userAuth");
const claimController = require("../controller/claimController");

// ติดต่อเจ้าของโพสต์ ("ฉันเจอของชิ้นนี้" / "นี่ของฉัน") — ต้องล็อกอิน
router.use(userAuth);

router.post("/", claimController.createClaim);
router.get("/mine", claimController.myClaims);
router.post("/:claimId/confirm", claimController.confirmReceived);

module.exports = router;
