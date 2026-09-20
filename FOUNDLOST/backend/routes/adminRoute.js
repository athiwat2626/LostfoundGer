const express = require("express");
const router = express.Router();
const adminController = require("../controller/adminController");

router.get("/dashboard/stats", adminController.getDashboardStats);
router.get("/activity", adminController.getActivity);

router.get("/reports", adminController.getReports);
router.get("/reports/:report_id", adminController.getReportById);
router.post("/reports/:report_id/moderate", adminController.moderateReport);

router.get("/users", adminController.getUsers);
router.post("/users/:student_id/action", adminController.moderateUser);

router.get("/items", adminController.getItems);
router.patch("/items/:type/:item_id", adminController.updateItem);
router.delete("/items/:type/:item_id", adminController.deleteItem);

module.exports = router;
