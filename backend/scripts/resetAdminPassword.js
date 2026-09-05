/**
 * Resets the password for a given admin email.
 * Usage: node scripts/resetAdminPassword.js --email admin@pos.com --password "NewPassword!"
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

function parseArgs() {
  const args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      args[key] = argv[i + 1];
      i++;
    }
  }
  return args;
}

async function run() {
  const { email, password } = parseArgs();

  if (!email || !password) {
    console.error("Usage: node scripts/resetAdminPassword.js --email you@example.com --password \"NewPassword\"");
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("Password must be at least 6 characters.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  user.passwordHash = await User.hashPassword(password);
  await user.save();

  console.log(`Password reset successfully for: ${user.email} (role: ${user.role})`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Failed to reset password:", err.message);
  process.exit(1);
});
