import { db } from "@/lib/drizzle";
import { generations } from "@/lib/drizzle/schema";
import { eq, and, gte, count } from "drizzle-orm";

const FREE_DAILY_LIMIT = 5;
const PRO_MONTHLY_LIMIT = 50;

// ─── Check rate limit (read-only, does NOT consume a credit) ───
// Credits are only "consumed" when a generation is successfully inserted into the DB.
// This means failed generations don't waste a user's quota.
export async function checkRateLimit(
  userId: string,
  isPro: boolean
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  if (isPro) {
    // Pro: 50 scripts per calendar month
    try {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [result] = await db
        .select({ value: count() })
        .from(generations)
        .where(
          and(
            eq(generations.userId, userId),
            gte(generations.createdAt, monthStart)
          )
        );

      const used = result?.value ?? 0;
      const remaining = Math.max(0, PRO_MONTHLY_LIMIT - used);
      return { allowed: remaining > 0, remaining, limit: PRO_MONTHLY_LIMIT };
    } catch (err) {
      console.error("Pro rate limit check error:", err);
      return { allowed: true, remaining: PRO_MONTHLY_LIMIT, limit: PRO_MONTHLY_LIMIT };
    }
  }

  // Free: 5 scripts per rolling 24 hours (counted from generations table)
  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [result] = await db
      .select({ value: count() })
      .from(generations)
      .where(
        and(
          eq(generations.userId, userId),
          gte(generations.createdAt, dayAgo)
        )
      );

    const used = result?.value ?? 0;
    const remaining = Math.max(0, FREE_DAILY_LIMIT - used);
    return { allowed: remaining > 0, remaining, limit: FREE_DAILY_LIMIT };
  } catch (err) {
    console.error("Free rate limit check error:", err);
    // Fail open but with 0 remaining shown
    return { allowed: true, remaining: 0, limit: FREE_DAILY_LIMIT };
  }
}
