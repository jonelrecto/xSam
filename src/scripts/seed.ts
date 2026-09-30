import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { db } from "../lib/db";
import { user } from "../lib/db/schema";
import { auth } from "../lib/auth";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🌱 Starting XSAM Phase 1 Database Seed...");

  const defaultPassword = "Password123!";

  // 1. Provision Student
  try {
    console.log("Creating student account: student@xsam.dev");
    await auth.api.signUpEmail({
      body: {
        name: "Test Student",
        email: "student@xsam.dev",
        password: defaultPassword,
        role: "student",
      },
    });
    console.log("✅ Student account ready: student@xsam.dev / Password123!");
  } catch (err: any) {
    console.log("ℹ️  Student account may already exist:", err.message || err);
  }

  // 2. Provision Teacher
  try {
    console.log("Creating teacher account: teacher@xsam.dev");
    await auth.api.signUpEmail({
      body: {
        name: "Prof. Maria Santos",
        email: "teacher@xsam.dev",
        password: defaultPassword,
        role: "teacher",
      },
    });
    console.log("✅ Teacher account ready: teacher@xsam.dev / Password123!");
  } catch (err: any) {
    console.log("ℹ️  Teacher account may already exist:", err.message || err);
  }

  // 3. Provision Admin
  // Note: auth.api.signUpEmail will coerce role to 'student' due to user.create.before security hook.
  // We then directly elevate the role in the database to 'admin'.
  try {
    console.log("Creating admin account: admin@xsam.dev");
    await auth.api.signUpEmail({
      body: {
        name: "System Administrator",
        email: "admin@xsam.dev",
        password: defaultPassword,
        role: "student", // Start as student
      },
    });
  } catch (err: any) {
    console.log("ℹ️  Admin account may already exist in auth:", err.message || err);
  }

  // Direct database role elevation for Admin
  await db
    .update(user)
    .set({ role: "admin" })
    .where(eq(user.email, "admin@xsam.dev"));

  console.log("✅ Admin account elevated to 'admin': admin@xsam.dev / Password123!");
  console.log("\n🚀 Seeding completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
