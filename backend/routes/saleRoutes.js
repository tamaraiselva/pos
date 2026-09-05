const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate, authorize } = require("../middleware/auth");
const ctrl = require("../controllers/saleController");

const router = express.Router();

router.use(authenticate);

router.post(
  "/",
  authorize("admin", "cashier"),
  [
    body("items").isArray({ min: 1 }).withMessage("At least one item is required"),
    body("items.*.productId").isMongoId().withMessage("Invalid product id"),
    body("items.*.qty").isInt({ min: 1 }).withMessage("Qty must be >= 1"),
    body("items.*.discountPercent").optional().isFloat({ min: 0, max: 100 }).withMessage("Discount must be between 0 and 100"),
    body("paymentMethod").isIn(["cash", "upi", "card"]).withMessage("Invalid payment method"),
  ],
  validate,
  ctrl.create
);

router.get("/", authorize("admin", "cashier"), ctrl.list);
router.get("/invoice/:invoiceNumber", authorize("admin", "cashier"), ctrl.getByInvoiceNumber);
router.get("/:id", authorize("admin", "cashier"), ctrl.getOne);

module.exports = router;
