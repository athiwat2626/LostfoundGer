const express = require("express");
const multer = require("multer");
const path = require("path");
const foundItemController = require("../controller/foundItemController");

const uploadsDir = path.join(__dirname, "..", "assets", "foundUploads");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + path.extname(file.originalname);
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

router.post("/", upload.single("image"), foundItemController.createFoundItems);
router.get("/", foundItemController.getFoundItems)

module.exports = router;
