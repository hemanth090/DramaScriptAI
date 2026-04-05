import { auth } from "@/lib/auth";
import { generateScript } from "@/lib/ai";
import { checkRateLimit } from "@/lib/ratelimit";
import { getProStatus } from "@/lib/payments";
import { db } from "@/lib/drizzle";
import { generations } from "@/lib/drizzle/schema";

function sanitizeInput(input: string): string {
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Sign in to generate scripts." }, { status: 401 });
    }

    const { prompt, episodes = 8, duration = "30-60" } = await request.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
      return Response.json(
        { error: "Please provide a valid drama concept (at least 3 characters)." },
        { status: 400 }
      );
    }

    if (prompt.length > 500) {
      return Response.json(
        { error: "Prompt too long. Keep it under 500 characters." },
        { status: 400 }
      );
    }

    const sanitizedPrompt = sanitizeInput(prompt);

    // Check pro status from DB/Redis cache
    const isPro = await getProStatus(session.user.id);

    // Rate limit check (also consumes one unit)
    const { allowed, remaining, limit } = await checkRateLimit(session.user.id, isPro);

    if (!allowed) {
      return Response.json(
        {
          error: isPro
            ? "Monthly limit of 100 scripts reached. Your limit resets on the 1st of next month."
            : "Daily free limit reached! Upgrade to Pro for 100 scripts per month.",
          remaining: 0,
          limit,
          isPro,
        },
        { status: 429 }
      );
    }

    // Validate episodes and duration
    const epCount = [4, 6, 8, 10, 12].includes(Number(episodes)) ? Number(episodes) : 8;
    const dur = ["15-30", "30-60", "60-90", "90-120"].includes(duration) ? duration : "30-60";

    // Generate script using unified AI wrapper
    const result = await generateScript(sanitizedPrompt, epCount, dur);

    // Store generated script in DB
    const [generation] = await db
      .insert(generations)
      .values({
        userId: session.user.id,
        prompt: sanitizedPrompt,
        script: result.script,
        model: result.model,
      })
      .returning({ id: generations.id });

    return Response.json({
      script: result.script,
      model: result.model,
      cached: result.cached,
      generationId: generation?.id,
      remaining: Math.max(0, remaining - 1), // -1 because we just inserted a generation
      limit,
      isPro,
    });
  } catch (error) {
    console.error("Generate error:", error instanceof Error ? error.message : "Unknown error");
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
