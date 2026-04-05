import { neon } from "@neondatabase/serverless";

export async function GET() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    return Response.json({ error: "DATABASE_URL not set" });
  }

  // Show redacted URL for debugging
  const redacted = url.replace(/\/\/[^:]+:[^@]+@/, "//***:***@");

  try {
    const sql = neon(url);
    const result = await sql`SELECT 1 as ok`;
    return Response.json({
      status: "connected",
      url: redacted,
      result,
    });
  } catch (error) {
    return Response.json({
      status: "failed",
      url: redacted,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.split("\n").slice(0, 5) : undefined,
    });
  }
}
