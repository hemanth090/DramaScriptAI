import { db } from "@/lib/drizzle";
import { users, verificationTokens } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkAuthRateLimit } from "@/lib/auth-ratelimit";

export async function POST(request: Request) {
  try {
    const rateLimited = await checkAuthRateLimit(request);
    if (rateLimited) return rateLimited;

    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return Response.json({ error: "Email is required." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Always return success to prevent email enumeration
    const [user] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (user) {
      const token = crypto.randomUUID();
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Delete existing reset tokens for this email
      await db
        .delete(verificationTokens)
        .where(eq(verificationTokens.identifier, `reset:${normalizedEmail}`));

      // Store reset token (prefixed with "reset:" to distinguish from email verification tokens)
      await db.insert(verificationTokens).values({
        identifier: `reset:${normalizedEmail}`,
        token,
        expires,
      });

      await sendPasswordResetEmail(normalizedEmail, user.name || "there", token);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
