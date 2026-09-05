const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const ctrl = require("../controllers/dashboardController");

const router = express.Router();

router.get("/summary", authenticate, authorize("admin"), ctrl.summary);

module.exports = router;
