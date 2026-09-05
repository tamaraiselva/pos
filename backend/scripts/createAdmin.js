/**
 * Creates an admin account from credentials YOU provide — this is the only way to
 * get a first login on a fresh database, since there is no public registration
 * endpoint (by design: only an existing admin can create new users via
 * POST /api/users once one exists).
 *
 * Usage:
 *   node scripts/createAdmin.js --name "Jane Doe" --email admin@example.com --password "Secret123!"
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
  const { name, email, password } = parseArgs();

  if (!name || !email || !password) {
    console.error("Usage: node scripts/createAdmin.js --name \"Your Name\" --email you@example.com --password \"YourPassword\"");
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("Password must be at least 6 characters.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    console.error(`A user with email ${normalizedEmail} already exists (role: ${existing.role}).`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash: await User.hashPassword(password),
    role: "admin",
  });

  console.log(`Admin account created: ${user.email}`);
  console.log("You can now log in and use the Users page to create additional admin/cashier accounts.");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Failed to create admin:", err.message);
  process.exit(1);
});
