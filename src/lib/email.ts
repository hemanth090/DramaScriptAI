import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (resend) return resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  resend = new Resend(key);
  return resend;
}

const from = process.env.EMAIL_FROM || "DramaScript.ai <onboarding@resend.dev>";

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
const siteUrl = process.env.SITE_URL || "http://localhost:3000";

export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string
): Promise<void> {
  const r = getResend();
  const verifyUrl = `${siteUrl}/api/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(to)}`;

  if (!r) {
    // In dev without Resend, log the verification URL
    console.log(`\n[DEV] Verification link for ${to}:\n${verifyUrl}\n`);
    return;
  }

  try {
    await r.emails.send({
      from,
      to,
      subject: "Verify your email — DramaScript.ai",
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          <h1 style="color: #a855f7; font-size: 24px;">Verify your email</h1>
          <p>Hi ${name},</p>
          <p>Click the button below to verify your email and activate your DramaScript.ai account.</p>
          <a href="${verifyUrl}" style="display: inline-block; background: #a855f7; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin: 16px 0; font-weight: bold;">Verify Email</a>
          <p style="color: #71717a; font-size: 13px;">This link expires in 24 hours.</p>
          <p style="color: #71717a; font-size: 12px; margin-top: 24px;">If you didn't create this account, you can ignore this email.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Verification email error:", err);
  }
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string
): Promise<void> {
  const r = getResend();
  const resetUrl = `${siteUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(to)}`;

  if (!r) {
    console.log(`\n[DEV] Password reset link for ${to}:\n${resetUrl}\n`);
    return;
  }

  try {
    await r.emails.send({
      from,
      to,
      subject: "Reset your password — DramaScript.ai",
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          <h1 style="color: #a855f7; font-size: 24px;">Reset your password</h1>
          <p>Hi ${name},</p>
          <p>We received a request to reset your password. Click the button below to set a new one.</p>
          <a href="${resetUrl}" style="display: inline-block; background: #a855f7; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin: 16px 0; font-weight: bold;">Reset Password</a>
          <p style="color: #71717a; font-size: 13px;">This link expires in 1 hour.</p>
          <p style="color: #71717a; font-size: 12px; margin-top: 24px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Password reset email error:", err);
  }
}

export async function sendPaymentConfirmation(
  to: string,
  data: { amount: string; plan: string; expiresAt: string }
): Promise<void> {
  const r = getResend();
  if (!r) return;

  try {
    await r.emails.send({
      from,
      to,
      subject: "Payment Confirmed — DramaScript.ai Pro",
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          <h1 style="color: #a855f7; font-size: 24px;">Payment Confirmed!</h1>
          <p>Thank you for upgrading to <strong>DramaScript.ai Pro</strong>.</p>
          <div style="background: #f4f4f5; border-radius: 12px; padding: 16px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Plan:</strong> ${data.plan}</p>
            <p style="margin: 4px 0;"><strong>Amount:</strong> ${data.amount}</p>
            <p style="margin: 4px 0;"><strong>Valid Until:</strong> ${new Date(data.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <p>Enjoy unlimited script generation for the next 30 days!</p>
          <a href="https://dramascript.ai/generate" style="display: inline-block; background: #a855f7; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 12px;">Start Generating</a>
          <p style="color: #71717a; font-size: 12px; margin-top: 24px;">DramaScript.ai — AI-powered micro-drama scripts</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Email send error:", err);
  }
}

export async function sendWelcomeEmail(
  to: string,
  name: string
): Promise<void> {
  const r = getResend();
  if (!r) return;

  try {
    await r.emails.send({
      from,
      to,
      subject: "Welcome to DramaScript.ai!",
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          <h1 style="color: #a855f7; font-size: 24px;">Welcome, ${name}!</h1>
          <p>You're all set to create viral drama scripts for Reels, TikTok & YouTube Shorts.</p>
          <div style="background: #f4f4f5; border-radius: 12px; padding: 16px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Free Plan:</strong> 5 scripts per day</p>
            <p style="margin: 4px 0;"><strong>Includes:</strong> 8-episode arcs, cliffhangers, filming guides</p>
          </div>
          <a href="https://dramascript.ai/generate" style="display: inline-block; background: #a855f7; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 12px;">Generate Your First Script</a>
          <p style="color: #71717a; font-size: 12px; margin-top: 24px;">DramaScript.ai — AI-powered micro-drama scripts</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Email send error:", err);
  }
}
