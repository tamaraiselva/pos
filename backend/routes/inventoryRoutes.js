const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate, authorize } = require("../middleware/auth");
const ctrl = require("../controllers/inventoryController");

const router = express.Router();

router.use(authenticate);

router.get("/low-stock", authorize("admin", "cashier"), ctrl.lowStock);
router.get("/history/:productId", authorize("admin", "cashier"), ctrl.history);

router.post(
  "/adjust",
  authorize("admin"),
  [
    body("productId").isMongoId().withMessage("Invalid product id"),
    body("changeQty").isInt().withMessage("changeQty must be an integer").not().equals("0"),
  ],
  validate,
  ctrl.adjust
);

router.post("/apply-old-stock-discounts", authorize("admin"), ctrl.applyOldStockDiscounts);

module.exports = router;
