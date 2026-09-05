const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const { getAISettings, updateAISettings, testAISettings } = require("../controllers/settingController");

router.use(authenticate);
router.use(authorize("admin"));

router.get("/ai", getAISettings);
router.put("/ai", updateAISettings);
router.post("/ai/test", testAISettings);

module.exports = router;
