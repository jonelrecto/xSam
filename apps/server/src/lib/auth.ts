import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, user, session, account, verification } from "@xsam/db";
import { SELF_SIGNUP_ROLES } from "@xsam/shared";
import { sendEmail } from "./email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),

  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:4000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:4000",
  ],

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === "true",
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(user.email, "Reset your password", url);
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail(user.email, "Verify your email", url);
    },
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "student",
        input: true,
      },
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const requestedRole = user.role as string | undefined;
          const role =
            requestedRole && SELF_SIGNUP_ROLES.includes(requestedRole as any)
              ? requestedRole
              : "student";
          return { data: { ...user, role } };
        },
      },
      update: {
        before: async (user) => {
          const { role, ...rest } = user as Record<string, unknown>;
          return { data: rest };
        },
      },
    },
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
  },
});
