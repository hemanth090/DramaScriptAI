import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let authRatelimit: Ratelimit | null = null;

function getAuthRatelimit(): Ratelimit | null {
  if (authRatelimit) return authRatelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });
  authRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 attempts per 15 minutes
    prefix: "ds_auth_rl",
    analytics: false,
  });

  return authRatelimit;
}

/**
 * Rate limit auth endpoints by IP address.
 * Returns null if allowed, or a Response if rate limited.
 */
export async function checkAuthRateLimit(request: Request): Promise<Response | null> {
  const rl = getAuthRatelimit();
  if (!rl) return null; // No Redis configured, skip rate limiting

  const ip =
    request.headers.get("x-client-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  try {
    const result = await rl.limit(ip);
    if (!result.success) {
      return Response.json(
        { error: "Too many attempts. Please try again in a few minutes." },
        { status: 429 }
      );
    }
  } catch {
    // Fail open if Redis is down
  }

  return null;
}
