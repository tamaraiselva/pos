const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate, authorize } = require("../middleware/auth");
const ctrl = require("../controllers/returnController");

const router = express.Router();

router.use(authenticate, authorize("admin", "cashier"));

router.get("/lookup/:invoiceNumber", ctrl.findSaleByInvoice);

router.post(
  "/",
  [
    body("saleId").isMongoId().withMessage("Invalid sale id"),
    body("items").isArray({ min: 1 }).withMessage("At least one item is required"),
    body("items.*.productId").isMongoId().withMessage("Invalid product id"),
    body("items.*.qty").isInt({ min: 1 }).withMessage("Qty must be >= 1"),
  ],
  validate,
  ctrl.create
);

router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);

module.exports = router;
