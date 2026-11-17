import { describe, expect, it } from "vitest";
import { TestDriver } from "testdriverai/vitest/hooks";

describe("XSAM Application End-to-End Tests", () => {
  it("should display the landing page, navigate to sign in, fill credentials, and navigate to signup", async (context) => {
    const testdriver = TestDriver(context);
    const appUrl = process.env.APP_URL || "https://adoption-computing-referring-straight.trycloudflare.com";

    // 1. Provision browser and navigate to landing page
    await testdriver.provision.chrome({ url: appUrl });

    const landingAssert = await testdriver.assert(
      "The XSAM landing page is visible with Academic Integrity heading and Sign In buttons"
    );
    expect(landingAssert).toBeTruthy();

    // 2. Navigate to Login portal
    const signInBtn = await testdriver.find("\"Sign In to Portal\" button in the hero section");
    await signInBtn.click();

    const loginAssert = await testdriver.assert(
      "The Sign in to XSAM page is displayed with Email Address and Password inputs"
    );
    expect(loginAssert).toBeTruthy();

    // 3. Fill in test credentials
    const emailInput = await testdriver.find("Email Address input field with placeholder name@school.edu");
    await emailInput.click();
    await testdriver.type("student@xsam.dev");

    const passwordInput = await testdriver.find("Password input field with placeholder ••••••••");
    await passwordInput.click();
    await testdriver.type("Password123!");

    // 4. Navigate to registration page
    const createAccountLink = await testdriver.find("\"Create an account\" link at the bottom of the card");
    await createAccountLink.click();

    const signupAssert = await testdriver.assert(
      "The Create an XSAM Account registration page is displayed with account type selector and input fields"
    );
    expect(signupAssert).toBeTruthy();
  });
});
