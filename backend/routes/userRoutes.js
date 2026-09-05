const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate, authorize } = require("../middleware/auth");
const ctrl = require("../controllers/userController");

const router = express.Router();

router.use(authenticate, authorize("admin"));

router.get("/", ctrl.list);

router.post(
  "/",
  [
    body("name").isString().trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("password").isString().isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("role").isIn(["admin", "cashier"]).withMessage("Role must be admin or cashier"),
  ],
  validate,
  ctrl.create
);

router.put(
  "/:id",
  [
    body("name").optional().isString().trim().notEmpty(),
    body("role").optional().isIn(["admin", "cashier"]),
    body("isActive").optional().isBoolean(),
  ],
  validate,
  ctrl.update
);

module.exports = router;
