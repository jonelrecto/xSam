import { describe, it, expect } from "vitest";
import { signupSchema, loginSchema, resetPasswordSchema } from "../src/lib/schemas/auth";
import { homeFor } from "../src/lib/auth-server";
import { SELF_SIGNUP_ROLES, isValidRole } from "../src/lib/permissions";
import { auth } from "../src/lib/auth";

describe("Phase 1: Role-Based Access Control & Routing Helpers", () => {
  it("should return the correct home route for each role", () => {
    expect(homeFor("admin")).toBe("/admin");
    expect(homeFor("teacher")).toBe("/teacher");
    expect(homeFor("student")).toBe("/student");
    expect(homeFor("unknown_role" as any)).toBe("/student");
  });

  it("should define allowed self-signup roles as student and teacher only", () => {
    expect(SELF_SIGNUP_ROLES).toEqual(["student", "teacher"]);
    expect(SELF_SIGNUP_ROLES.includes("admin" as any)).toBe(false);
  });

  it("should validate recognized roles correctly", () => {
    expect(isValidRole("student")).toBe(true);
    expect(isValidRole("teacher")).toBe(true);
    expect(isValidRole("admin")).toBe(true);
    expect(isValidRole("superadmin")).toBe(false);
  });
});

describe("Phase 1: Validation Schemas", () => {
  describe("signupSchema", () => {
    it("should accept valid student signup", () => {
      const result = signupSchema.safeParse({
        name: "Maria Santos",
        email: "maria@example.com",
        password: "Password123",
        confirm: "Password123",
        role: "student",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid teacher signup", () => {
      const result = signupSchema.safeParse({
        name: "Prof. Cruz",
        email: "cruz@institution.edu",
        password: "Password123",
        confirm: "Password123",
        role: "teacher",
      });
      expect(result.success).toBe(true);
    });

    it("should reject admin in signup role schema", () => {
      const result = signupSchema.safeParse({
        name: "Hacker",
        email: "hacker@example.com",
        password: "Password123",
        confirm: "Password123",
        role: "admin",
      });
      expect(result.success).toBe(false);
    });

    it("should reject mismatched passwords", () => {
      const result = signupSchema.safeParse({
        name: "Test User",
        email: "test@example.com",
        password: "Password123",
        confirm: "DifferentPassword123",
        role: "student",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("Passwords do not match");
      }
    });

    it("should reject password shorter than 8 characters", () => {
      const result = signupSchema.safeParse({
        name: "Test User",
        email: "test@example.com",
        password: "Pass1",
        confirm: "Pass1",
        role: "student",
      });
      expect(result.success).toBe(false);
    });

    it("should reject password without numbers", () => {
      const result = signupSchema.safeParse({
        name: "Test User",
        email: "test@example.com",
        password: "PasswordOnly",
        confirm: "PasswordOnly",
        role: "student",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    it("should validate correct login payload", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "SecretPassword123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email format", () => {
      const result = loginSchema.safeParse({
        email: "invalid-email",
        password: "SecretPassword123",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty password", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("resetPasswordSchema", () => {
    it("should accept valid password and matching confirmation", () => {
      const result = resetPasswordSchema.safeParse({
        password: "NewPassword123",
        confirm: "NewPassword123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject mismatched reset passwords", () => {
      const result = resetPasswordSchema.safeParse({
        password: "NewPassword123",
        confirm: "MismatchPassword123",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("Phase 1: Better Auth Privilege Escalation Database Hooks", () => {
  it("should have user.create.before hook that coerces unauthorized roles to student", async () => {
    const hooks = (auth.options as any).databaseHooks?.user;
    expect(hooks).toBeDefined();
    expect(hooks.create?.before).toBeDefined();

    // 1. Attempt signup with role 'admin'
    const adminAttempt = await hooks.create.before({
      id: "u1",
      email: "hacker@xsam.dev",
      name: "Hacker",
      role: "admin",
    });
    expect(adminAttempt.data.role).toBe("student");

    // 2. Attempt signup with role 'teacher'
    const teacherAttempt = await hooks.create.before({
      id: "u2",
      email: "prof@xsam.dev",
      name: "Prof",
      role: "teacher",
    });
    expect(teacherAttempt.data.role).toBe("teacher");

    // 3. Attempt signup with role 'student'
    const studentAttempt = await hooks.create.before({
      id: "u3",
      email: "student@xsam.dev",
      name: "Student",
      role: "student",
    });
    expect(studentAttempt.data.role).toBe("student");

    // 4. Attempt signup with undefined/arbitrary role
    const arbitraryAttempt = await hooks.create.before({
      id: "u4",
      email: "guest@xsam.dev",
      name: "Guest",
      role: "superuser",
    });
    expect(arbitraryAttempt.data.role).toBe("student");
  });

  it("should have user.update.before hook that strips role to prevent escalation", async () => {
    const hooks = (auth.options as any).databaseHooks?.user;
    expect(hooks).toBeDefined();
    expect(hooks.update?.before).toBeDefined();

    // User attempts to update their role to 'admin'
    const updateAttempt = await hooks.update.before({
      id: "u1",
      name: "Updated Name",
      role: "admin",
    });

    expect(updateAttempt.data.role).toBeUndefined();
    expect(updateAttempt.data.name).toBe("Updated Name");
  });
});
