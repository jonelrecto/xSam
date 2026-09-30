import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendEmail(to: string, subject: string, url: string) {
  if (!resend) {
    console.log(`\n======================================================`);
    console.log(`[EMAIL:DEV] Outgoing Notification`);
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Action Link:\n${url}`);
    console.log(`======================================================\n`);
    return;
  }

  try {
    await resend.emails.send({
      from: "XSAM Security <no-reply@xsam.dev>",
      to,
      subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background-color: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #1e293b;">
          <h2 style="color: #6366f1; margin-top: 0;">XSAM / SEPE Security</h2>
          <p style="color: #94a3b8; font-size: 15px; line-height: 1.5;">You requested an action for your account. Click the button below to proceed securely:</p>
          <div style="margin: 28px 0; text-align: center;">
            <a href="${url}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">${subject}</a>
          </div>
          <p style="color: #64748b; font-size: 12px;">If you did not request this email, please ignore this message. This link will expire shortly.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("[EMAIL:ERROR] Failed to send email via Resend:", error);
  }
}
