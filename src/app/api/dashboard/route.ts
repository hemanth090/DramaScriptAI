import { auth } from "@/lib/auth";
import { db } from "@/lib/drizzle";
import { generations, subscriptions } from "@/lib/drizzle/schema";
import { eq, desc, and, gt, count } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Sign in required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "0", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);
    const offset = page * limit;

    // Fetch generations and total count in parallel
    const [gens, [totalResult], [sub]] = await Promise.all([
      db
        .select({
          id: generations.id,
          prompt: generations.prompt,
          script: generations.script,
          model: generations.model,
          createdAt: generations.createdAt,
        })
        .from(generations)
        .where(eq(generations.userId, session.user.id))
        .orderBy(desc(generations.createdAt))
        .limit(limit)
        .offset(offset),

      db
        .select({ count: count() })
        .from(generations)
        .where(eq(generations.userId, session.user.id)),

      db
        .select({
          plan: subscriptions.plan,
          status: subscriptions.status,
          expiresAt: subscriptions.expiresAt,
        })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, session.user.id),
            eq(subscriptions.status, "active"),
            gt(subscriptions.expiresAt, new Date())
          )
        )
        .limit(1),
    ]);

    return Response.json({
      generations: gens.map((g) => ({
        ...g,
        createdAt: g.createdAt.toISOString(),
      })),
      total: totalResult?.count ?? 0,
      isPro: !!sub,
      plan: sub?.plan ?? null,
      expiresAt: sub?.expiresAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return Response.json(
      { error: "Failed to load dashboard data." },
      { status: 500 }
    );
  }
}
