const express = require("express");
const router = express.Router();
const { createReport, upload } = require("../controller/reportController");

router.post("/", upload.single("evidence"), createReport);

module.exports = router;
