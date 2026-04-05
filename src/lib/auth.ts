import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/drizzle";
import { users } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";

// Server-side auth helper — use in API routes and server components
export async function auth(): Promise<{
  user: { id: string; email: string; name?: string } | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) return { user: null };

  // Ensure user exists in our app database (auto-create on first API call)
  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!existing) {
      await db.insert(users).values({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email.split("@")[0],
      });
    }
  } catch {
    // User might already exist (race condition) — safe to ignore
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email.split("@")[0],
    },
  };
}
