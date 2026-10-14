const express = require("express");
const router = express.Router();
const { userAuth } = require("../middleware/userAuth");
const claimController = require("../controller/claimController");

// จัดการโพสต์ของตัวเอง — ต้องล็อกอิน และทำได้เฉพาะโพสต์ของตัวเอง
router.use(userAuth);

router.get("/", claimController.myItems);
router.get("/:type/:id/claims", claimController.itemClaims);
router.get("/:type/:id/matches", claimController.itemMatches);
router.post("/:type/:id/return", claimController.confirmReturn);
router.post("/:type/:id/close", claimController.closeMyItem);
router.patch("/:type/:id", claimController.updateMyItem);
router.delete("/:type/:id", claimController.deleteMyItem);

module.exports = router;
