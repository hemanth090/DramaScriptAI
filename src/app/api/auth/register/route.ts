import { db } from "@/lib/drizzle";
import { users, verificationTokens } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { sendVerificationEmail, isEmailConfigured } from "@/lib/email";
import { checkAuthRateLimit } from "@/lib/auth-ratelimit";

export async function POST(request: Request) {
  try {
    const rateLimited = await checkAuthRateLimit(request);
    if (rateLimited) return rateLimited;

    const { name, email, password } = await request.json();

    if (!email || !password || !name) {
      return Response.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (
      typeof password !== "string" ||
      password.length < 8 ||
      !/[a-zA-Z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      return Response.json(
        { error: "Password must be at least 8 characters with at least one letter and one number." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    // Email verification disabled until a custom domain is verified on Resend
    // Set ENABLE_EMAIL_VERIFICATION=true to re-enable
    const emailEnabled = process.env.ENABLE_EMAIL_VERIFICATION === "true" && isEmailConfigured();

    // Check if user already exists
    const [existing] = await db
      .select({ id: users.id, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing) {
      if (!existing.emailVerified && emailEnabled) {
        // Resend verification for unverified users
        await generateAndSendToken(normalizedEmail, name.trim());
        return Response.json({
          success: true,
          needsVerification: true,
          message: "Verification email resent. Check your inbox.",
        });
      }
      return Response.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Auto-verify if no email provider configured (dev mode)
    await db.insert(users).values({
      name: name.trim(),
      email: normalizedEmail,
      hashedPassword,
      emailVerified: emailEnabled ? null : new Date(),
    });

    if (emailEnabled) {
      await generateAndSendToken(normalizedEmail, name.trim());

      return Response.json({
        success: true,
        needsVerification: true,
        message: "Account created! Check your email to verify.",
      });
    }

    // No email provider — auto-verified, ready to sign in
    return Response.json({
      success: true,
      needsVerification: false,
      message: "Account created!",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Registration error:", message, error);
    return Response.json(
      { error: `Registration failed: ${message}` },
      { status: 500 }
    );
  }
}

async function generateAndSendToken(email: string, name: string) {
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db
    .delete(verificationTokens)
    .where(eq(verificationTokens.identifier, email));

  await db.insert(verificationTokens).values({
    identifier: email,
    token,
    expires,
  });

  await sendVerificationEmail(email, name, token);
}
