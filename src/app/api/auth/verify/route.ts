import { db } from "@/lib/drizzle";
import { users, verificationTokens } from "@/lib/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { sendWelcomeEmail } from "@/lib/email";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!token || !email) {
      return redirectWithStatus("invalid");
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Look up the token
    const [record] = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, normalizedEmail),
          eq(verificationTokens.token, token)
        )
      )
      .limit(1);

    if (!record) {
      return redirectWithStatus("invalid");
    }

    // Check expiry
    if (record.expires < new Date()) {
      // Clean up expired token
      await db
        .delete(verificationTokens)
        .where(
          and(
            eq(verificationTokens.identifier, normalizedEmail),
            eq(verificationTokens.token, token)
          )
        );
      return redirectWithStatus("expired");
    }

    // Mark user as verified
    const [verifiedUser] = await db
      .update(users)
      .set({ emailVerified: new Date() })
      .where(eq(users.email, normalizedEmail))
      .returning({ name: users.name, email: users.email });

    // Delete used token
    await db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, normalizedEmail),
          eq(verificationTokens.token, token)
        )
      );

    // Send welcome email (fire-and-forget)
    if (verifiedUser?.email) {
      sendWelcomeEmail(verifiedUser.email, verifiedUser.name || "Creator").catch(() => {});
    }

    return redirectWithStatus("success");
  } catch (error) {
    console.error("Verification error:", error);
    return redirectWithStatus("error");
  }
}

function redirectWithStatus(status: string) {
  const siteUrl = process.env.SITE_URL || "http://localhost:3000";
  return Response.redirect(`${siteUrl}/verify-email?status=${status}`);
}
