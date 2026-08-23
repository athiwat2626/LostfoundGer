const express = require("express");
const router = express.Router();

const userController = require("../controller/userController");

router.get("/", userController.getUserData);

module.exports = router;
