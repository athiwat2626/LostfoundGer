const express = require("express");
const router = express.Router();
const surveyController = require("../controller/surveyController");

// แบบประเมินความพึงพอใจ: ตอบได้โดยไม่ต้องเข้าสู่ระบบ (ผลรวมดูได้เฉพาะแอดมินที่ /admin/survey/*)
router.get("/questions", surveyController.getQuestions);
router.post("/", surveyController.submitSurvey);

module.exports = router;
