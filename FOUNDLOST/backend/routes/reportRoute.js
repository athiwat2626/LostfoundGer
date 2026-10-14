const express = require("express");
const router = express.Router();
const { createReport, upload } = require("../controller/reportController");
const { userAuth } = require("../middleware/userAuth");

router.post("/", userAuth, upload.single("evidence"), createReport);

module.exports = router;
