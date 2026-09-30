import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { db } from "../lib/db";
import { user } from "../lib/db/schema";
import { auth } from "../lib/auth";
import { eq } from "drizzle-orm";

async function main() {
  const email = "admin@test.com";
  const password = "password123";
  const name = "Admin";

  console.log(`Creating / updating admin account for: ${email}...`);

  // Check if user already exists
  const existingUser = await db.query.user.findFirst({
    where: eq(user.email, email),
  });

  if (!existingUser) {
    try {
      await auth.api.signUpEmail({
        body: {
          name,
          email,
          password,
          role: "student",
        },
      });
      console.log("Account created via Better Auth.");
    } catch (err: any) {
      console.error("Error signing up via Better Auth:", err.message || err);
      throw err;
    }
  } else {
    console.log(`User ${email} already exists (ID: ${existingUser.id}). Setting password and role...`);
    // If user exists, we can use better-auth or update password if needed, or if already created.
  }

  // Elevate role to admin and set emailVerified to true
  const result = await db
    .update(user)
    .set({
      role: "admin",
      emailVerified: true,
      updatedAt: new Date(),
    })
    .where(eq(user.email, email))
    .returning();

  console.log("Updated user in database:", result);
  console.log(`\n🎉 Admin account successfully ready!`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Role: admin`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Failed to create admin account:", err);
  process.exit(1);
});
