const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate, authorize } = require("../middleware/auth");
const uploadProductImage = require("../middleware/upload");
const ctrl = require("../controllers/productController");

const router = express.Router();

router.use(authenticate);

router.get("/", ctrl.list);
router.get("/categories", ctrl.categories);
router.get("/:id", ctrl.getOne);

const productValidation = [
  body("name").isString().trim().notEmpty().withMessage("Name is required"),
  body("sku").isString().trim().notEmpty().withMessage("SKU is required"),
  body("category").isString().trim().notEmpty().withMessage("Category is required"),
  body("sellingPrice").isFloat({ min: 0 }).withMessage("Selling price must be >= 0"),
  body("purchasePrice").isFloat({ min: 0 }).withMessage("Purchase price must be >= 0"),
  body("taxPercent").optional().isFloat({ min: 0, max: 100 }),
  body("defaultDiscount").optional().isFloat({ min: 0, max: 100 }).withMessage("Default discount must be 0-100%"),
  body("stockQty").optional().isInt({ min: 0 }),
  body("minStockLevel").optional().isInt({ min: 0 }),
];

router.post("/", authorize("admin"), uploadProductImage.single("image"), productValidation, validate, ctrl.create);
router.put("/:id", authorize("admin"), uploadProductImage.single("image"), ctrl.update);
router.delete("/:id", authorize("admin"), ctrl.remove);

module.exports = router;
