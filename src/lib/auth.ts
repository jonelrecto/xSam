import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { SELF_SIGNUP_ROLES } from "@/lib/permissions";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

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
        // Self-signup is restricted to 'student' and 'teacher'. Any other role (e.g. 'admin') is coerced to 'student'.
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
        // Role cannot be modified via client-facing user update APIs.
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

  plugins: [nextCookies()],
});
