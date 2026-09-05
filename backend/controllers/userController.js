const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const list = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: 1 });
  res.json({ success: true, data: users });
});

const create = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw new ApiError(409, "A user with this email already exists");
  }

  const user = await User.create({
    name,
    email: email.toLowerCase().trim(),
    passwordHash: await User.hashPassword(password),
    role,
  });

  res.status(201).json({
    success: true,
    data: { id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive },
  });
});

const update = asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) throw new ApiError(404, "User not found");

  const { name, role, isActive } = req.body;

  if (isActive === false && target._id.equals(req.user.id)) {
    throw new ApiError(400, "You cannot deactivate your own account");
  }

  if ((role && role !== "admin" && target.role === "admin") || isActive === false) {
    // About to demote/deactivate an admin — make sure at least one other active admin remains.
    if (target.role === "admin") {
      const otherActiveAdmins = await User.countDocuments({
        role: "admin",
        isActive: true,
        _id: { $ne: target._id },
      });
      if (otherActiveAdmins === 0) {
        throw new ApiError(400, "Cannot remove the last active admin account");
      }
    }
  }

  if (name !== undefined) target.name = name;
  if (role !== undefined) target.role = role;
  if (isActive !== undefined) target.isActive = isActive;

  await target.save();

  res.json({
    success: true,
    data: { id: target._id, name: target.name, email: target.email, role: target.role, isActive: target.isActive },
  });
});

module.exports = { list, create, update };
