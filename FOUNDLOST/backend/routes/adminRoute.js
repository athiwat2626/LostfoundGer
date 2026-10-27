const express = require("express");
const router = express.Router();
const adminController = require("../controller/adminController");
const auditController = require("../controller/auditController");
const settingsController = require("../controller/settingsController");
const surveyController = require("../controller/surveyController");

router.get("/dashboard/stats", adminController.getDashboardStats);
router.get("/dashboard/trend", adminController.getTrend);
router.get("/activity", adminController.getActivity);

router.get("/reports", adminController.getReports);
router.get("/reports/:report_id", adminController.getReportById);
router.post("/reports/:report_id/moderate", adminController.moderateReport);

router.get("/users", adminController.getUsers);
router.get("/users/:student_id", adminController.getUserDetail);
router.post("/users/:student_id/action", adminController.moderateUser);

router.get("/items", adminController.getItems);
// หน้าจัดการรายการ (ต้องลงทะเบียนก่อน /items/:type/:item_id)
router.get("/items/summary", adminController.getItemSummary);
router.get("/items/search", adminController.searchItems);
router.get("/items/:type/:item_id", adminController.getItemDetail);
router.get("/matches", adminController.getMatches);
router.patch("/items/:type/:item_id", adminController.updateItem);
router.delete("/items/:type/:item_id", adminController.deleteItem);

// ประวัติการดำเนินการของแอดมิน (อ่านอย่างเดียว)
router.get("/audit-logs", auditController.getAuditLogs);

// ค่าระบบ (การจับคู่, เกียรติบัตร, หมวดหมู่, จุดรับฝาก, ประกาศ, ปิดปรับปรุง)
router.get("/settings", settingsController.getAdminSettings);
router.put("/settings", settingsController.updateSettings);

// แบบประเมินความพึงพอใจ: สรุปผล (ค่าเฉลี่ย/S.D./ระดับ) และส่งออก CSV
router.get("/survey/summary", surveyController.getSurveySummary);
router.get("/survey/export", surveyController.exportSurvey);

module.exports = router;
