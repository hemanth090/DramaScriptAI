import { db } from "@/lib/drizzle";
import { generations, users } from "@/lib/drizzle/schema";
import { count } from "drizzle-orm";

export const revalidate = 3600; // cache for 1 hour

export async function GET() {
  try {
    const [genCount] = await db.select({ value: count() }).from(generations);
    const [userCount] = await db.select({ value: count() }).from(users);

    return Response.json({
      scripts: genCount?.value ?? 0,
      creators: userCount?.value ?? 0,
    });
  } catch {
    return Response.json({ scripts: 0, creators: 0 });
  }
}
