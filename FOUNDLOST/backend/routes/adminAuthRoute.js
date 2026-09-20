const express = require("express");
const router = express.Router();
const adminAuthController = require("../controller/adminAuthController");
const adminAuth = require("../middleware/adminAuth");

router.post("/login", adminAuthController.login);
router.get("/me", adminAuth, adminAuthController.me);
router.patch("/profile", adminAuth, adminAuthController.updateProfile);
router.post("/change-password", adminAuth, adminAuthController.changePassword);

module.exports = router;
