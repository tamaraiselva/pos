/**
 * Creates a cashier (or admin) account directly from the command line.
 * Useful for seeding the first cashier when no admin UI session is available.
 *
 * Usage:
 *   node scripts/createCashier.js --name "Jane Doe" --email cashier@pos.local --password "Cashier@123"
 *   node scripts/createCashier.js --name "Admin" --email admin@pos.com --password "Admin123!" --role admin
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
  const { name, email, password, role = "cashier" } = parseArgs();

  if (!name || !email || !password) {
    console.error(
      'Usage: node scripts/createCashier.js --name "Full Name" --email user@example.com --password "Password123" [--role cashier|admin]'
    );
    process.exit(1);
  }
  if (!["cashier", "admin"].includes(role)) {
    console.error("--role must be 'cashier' or 'admin'");
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
    console.error(
      `A user with email ${normalizedEmail} already exists (role: ${existing.role}).`
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash: await User.hashPassword(password),
    role,
  });

  console.log(`✅ ${role.charAt(0).toUpperCase() + role.slice(1)} account created:`);
  console.log(`   Name:  ${user.name}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Role:  ${user.role}`);
  console.log(`\nYou can now log in at http://localhost:5173/login`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Failed to create user:", err.message);
  process.exit(1);
});
