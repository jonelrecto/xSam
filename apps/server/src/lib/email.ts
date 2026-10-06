import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";

const resend = apiKey ? new Resend(apiKey) : null;

export async function sendEmail(to: string, subject: string, textOrHtml: string) {
  if (!resend) {
    console.log(`\n================= EMAIL LOG (Console Fallback) =================`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${textOrHtml}`);
    console.log(`=================================================================\n`);
    return;
  }

  try {
    const isHtml = textOrHtml.includes("<") && textOrHtml.includes(">");
    await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      ...(isHtml ? { html: textOrHtml } : { text: textOrHtml }),
    });
  } catch (error) {
    console.error("Failed to send email via Resend:", error);
    // Fallback log in dev
    console.log(`Fallback Log - To: ${to}, Subject: ${subject}, Body: ${textOrHtml}`);
  }
}
