import { auth } from "@/lib/auth";
import { getProStatus } from "@/lib/payments";
import { db } from "@/lib/drizzle";
import { subscriptions } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Sign in required." }, { status: 401 });
    }

    const isPro = await getProStatus(session.user.id);

    if (!isPro) {
      return Response.json(
        { error: "No active Pro subscription found." },
        { status: 404 }
      );
    }

    const [sub] = await db
      .select({ expiresAt: subscriptions.expiresAt, plan: subscriptions.plan })
      .from(subscriptions)
      .where(eq(subscriptions.userId, session.user.id))
      .limit(1);

    return Response.json({
      success: true,
      isPro: true,
      plan: sub?.plan || "pro_monthly",
      expiresAt: sub?.expiresAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Restore pro error:", error instanceof Error ? error.message : "Unknown error");
    return Response.json(
      { error: "Failed to check subscription status." },
      { status: 500 }
    );
  }
}
