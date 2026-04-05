import { db } from "@/lib/drizzle";
import { users, verificationTokens } from "@/lib/drizzle/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { checkAuthRateLimit } from "@/lib/auth-ratelimit";

export async function POST(request: Request) {
  try {
    const rateLimited = await checkAuthRateLimit(request);
    if (rateLimited) return rateLimited;

    const { token, email, password } = await request.json();

    if (!token || !email || !password) {
      return Response.json(
        { error: "Missing required fields." },
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
    const identifier = `reset:${normalizedEmail}`;

    // Look up the reset token
    const [record] = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, identifier),
          eq(verificationTokens.token, token)
        )
      )
      .limit(1);

    if (!record) {
      return Response.json(
        { error: "Invalid or expired reset link. Request a new one." },
        { status: 400 }
      );
    }

    if (record.expires < new Date()) {
      // Clean up expired token
      await db
        .delete(verificationTokens)
        .where(
          and(
            eq(verificationTokens.identifier, identifier),
            eq(verificationTokens.token, token)
          )
        );
      return Response.json(
        { error: "Reset link has expired. Request a new one." },
        { status: 400 }
      );
    }

    // Update password
    const hashedPassword = await bcrypt.hash(password, 12);

    await db
      .update(users)
      .set({
        hashedPassword,
        emailVerified: new Date(), // also verify email if not already
      })
      .where(eq(users.email, normalizedEmail));

    // Delete used token
    await db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, identifier),
          eq(verificationTokens.token, token)
        )
      );

    return Response.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return Response.json(
      { error: "Password reset failed. Please try again." },
      { status: 500 }
    );
  }
}
