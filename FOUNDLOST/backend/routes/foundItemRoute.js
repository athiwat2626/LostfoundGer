const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const { userOrAdminAuth } = require("../middleware/userAuth");
const foundItemController = require("../controller/foundItemController");

const uploadsDir = path.join(__dirname, "..", "assets", "foundUploads");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // เวลา + ค่าสุ่ม ป้องกันไฟล์ทับกันเมื่ออัปโหลดพร้อมกัน
        const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${path.extname(file.originalname)}`;
    cb(null, uniqueSuffix);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});
const router = express.Router();

router.post("/", userOrAdminAuth, upload.single("image"), foundItemController.createFoundItems);
router.get("/", foundItemController.getFoundItems)

module.exports = router;
