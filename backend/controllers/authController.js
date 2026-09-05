const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const parseDurationMs = require("../utils/parseDuration");

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });
}

function cookieOptions() {
  // Cross-domain deploys (frontend and backend on different Render domains) need
  // SameSite=None to send the cookie at all, which browsers only allow over HTTPS
  // (Secure=true) — Render provides HTTPS by default. Local dev keeps Strict/insecure
  // since frontend and backend share an origin there via the Vite proxy.
  const crossSite = process.env.COOKIE_SECURE === "true";
  return {
    httpOnly: true,
    sameSite: crossSite ? "none" : "strict",
    secure: crossSite,
    maxAge: parseDurationMs(process.env.JWT_EXPIRES_IN),
  };
}

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+passwordHash");
  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid email or password");
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = signToken(user);
  res.cookie("token", token, cookieOptions());

  res.json({
    success: true,
    data: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

const logout = asyncHandler(async (req, res) => {
  const crossSite = process.env.COOKIE_SECURE === "true";
  res.clearCookie("token", { httpOnly: true, sameSite: crossSite ? "none" : "strict", secure: crossSite });
  res.json({ success: true, message: "Logged out" });
});

const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, "User not found");
  res.json({
    success: true,
    data: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

module.exports = { login, logout, me };
