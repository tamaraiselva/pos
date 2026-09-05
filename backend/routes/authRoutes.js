const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const { login, logout, me } = require("../controllers/authController");

const router = express.Router();

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("password").isString().isLength({ min: 1 }).withMessage("Password is required"),
  ],
  validate,
  login
);

router.post("/logout", authenticate, logout);
router.get("/me", authenticate, me);

module.exports = router;
