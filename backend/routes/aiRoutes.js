const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate, authorize } = require("../middleware/auth");
const ctrl = require("../controllers/aiController");

const router = express.Router();

router.use(authenticate, authorize("admin"));

router.get("/insights", ctrl.insights);
router.get("/inventory-recommendations", ctrl.inventoryRecommendations);
router.get("/forecast", ctrl.forecast);

router.post(
  "/ask",
  [
    body("question")
      .isString()
      .trim()
      .isLength({ min: 3, max: 500 })
      .withMessage("Question must be 3-500 characters"),
  ],
  validate,
  ctrl.ask
);

module.exports = router;
