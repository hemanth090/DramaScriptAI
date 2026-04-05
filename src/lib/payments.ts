import { Redis } from "@upstash/redis";
import { db } from "@/lib/drizzle";
import { payments, subscriptions } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// ─── Redis client (lazy init, null if not configured) ───
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

const proKey = (userId: string) => `ds:pro:${userId}`;

// ─── Store a payment record in DB ───
export async function storePayment(data: {
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amount: number;
  status: "created" | "authorized" | "captured" | "verified" | "failed";
  plan: string;
  source: string;
}): Promise<string> {
  const [row] = await db
    .insert(payments)
    .values(data)
    .onConflictDoNothing()
    .returning({ id: payments.id });
  return row?.id ?? "";
}

// ─── Verify Razorpay signature and activate subscription ───
export async function verifyAndActivate(opts: {
  userId: string;
  email: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  keySecret: string;
}): Promise<{ success: boolean; expiresAt?: string; error?: string }> {
  // Verify HMAC signature
  const signatureBody = `${opts.razorpayOrderId}|${opts.razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", opts.keySecret)
    .update(signatureBody)
    .digest("hex");

  if (expectedSignature !== opts.razorpaySignature) {
    console.error("Payment signature verification failed:", {
      orderId: opts.razorpayOrderId,
      paymentId: opts.razorpayPaymentId,
      timestamp: new Date().toISOString(),
    });
    return { success: false, error: "Invalid payment signature." };
  }

  // Check replay — look for existing verified payment in DB
  const [existing] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(eq(payments.razorpayPaymentId, opts.razorpayPaymentId))
    .limit(1);

  if (existing) {
    return { success: true, expiresAt: undefined }; // already processed
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Store payment in DB
  await db.insert(payments).values({
    userId: opts.userId,
    razorpayOrderId: opts.razorpayOrderId,
    razorpayPaymentId: opts.razorpayPaymentId,
    razorpaySignature: opts.razorpaySignature,
    amount: 49900,
    status: "verified",
    plan: "pro_monthly",
    source: "client",
  });

  // Create or update subscription (critical — if this fails, user paid but isn't activated)
  try {
    await db
      .insert(subscriptions)
      .values({
        userId: opts.userId,
        plan: "pro_monthly",
        status: "active",
        startsAt: new Date(),
        expiresAt,
        paymentId: opts.razorpayPaymentId,
      })
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: {
          plan: "pro_monthly",
          status: "active",
          startsAt: new Date(),
          expiresAt,
          paymentId: opts.razorpayPaymentId,
          updatedAt: new Date(),
        },
      });
  } catch (subError) {
    console.error("CRITICAL: Payment recorded but subscription activation failed:", {
      userId: opts.userId,
      paymentId: opts.razorpayPaymentId,
      error: subError instanceof Error ? subError.message : subError,
    });
    // Payment was already recorded — don't return error to user, webhook will retry
    // But still return success so the user sees confirmation
  }

  // Cache pro status in Redis
  const r = getRedis();
  if (r) {
    try {
      await r.set(proKey(opts.userId), expiresAt.toISOString(), {
        ex: 30 * 24 * 60 * 60,
      });
    } catch (err) {
      console.error("Redis cache error:", err);
    }
  }

  return { success: true, expiresAt: expiresAt.toISOString() };
}

// ─── Webhook: activate subscription by order ID ───
export async function webhookActivate(opts: {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  email: string;
  amount: number;
}): Promise<boolean> {
  // Find the payment record created during order to get userId and verify amount
  const [payment] = await db
    .select({ userId: payments.userId, amount: payments.amount })
    .from(payments)
    .where(eq(payments.razorpayOrderId, opts.razorpayOrderId))
    .limit(1);

  if (!payment) {
    console.error(`Webhook: No order found for ${opts.razorpayOrderId}`);
    return false;
  }

  // Verify the webhook amount matches the stored order amount
  if (opts.amount !== payment.amount) {
    console.error(`Webhook: Amount mismatch for ${opts.razorpayOrderId}. Expected ${payment.amount}, got ${opts.amount}`);
    return false;
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Update payment with Razorpay payment ID and mark as authorized
  await db
    .update(payments)
    .set({
      razorpayPaymentId: opts.razorpayPaymentId,
      status: "authorized",
      source: "webhook",
      updatedAt: new Date(),
    })
    .where(eq(payments.razorpayOrderId, opts.razorpayOrderId));

  // Create or update subscription
  await db
    .insert(subscriptions)
    .values({
      userId: payment.userId,
      plan: "pro_monthly",
      status: "active",
      startsAt: new Date(),
      expiresAt,
      paymentId: opts.razorpayPaymentId,
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        plan: "pro_monthly",
        status: "active",
        startsAt: new Date(),
        expiresAt,
        paymentId: opts.razorpayPaymentId,
        updatedAt: new Date(),
      },
    });

  // Cache pro status in Redis
  const r = getRedis();
  if (r) {
    try {
      await r.set(proKey(payment.userId), expiresAt.toISOString(), {
        ex: 30 * 24 * 60 * 60,
      });
    } catch (err) {
      console.error("Redis cache error:", err);
    }
  }

  return true;
}

// ─── Check pro status (Redis cache first, DB fallback) ───
export async function getProStatus(userId: string): Promise<boolean> {
  const r = getRedis();
  if (r) {
    try {
      const cached = await r.get<string>(proKey(userId));
      if (cached) {
        return new Date(cached) > new Date();
      }
    } catch {
      // fall through to DB
    }
  }

  // DB fallback
  const [sub] = await db
    .select({ expiresAt: subscriptions.expiresAt })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (sub && sub.expiresAt > new Date()) {
    // Re-cache in Redis
    if (r) {
      try {
        const ttl = Math.floor(
          (sub.expiresAt.getTime() - Date.now()) / 1000
        );
        if (ttl > 0) await r.set(proKey(userId), sub.expiresAt.toISOString(), { ex: ttl });
      } catch {
        // ignore
      }
    }
    return true;
  }

  return false;
}

// ─── Activate subscription from Razorpay Subscriptions API ───
export async function activateSubscription(opts: {
  userId: string;
  razorpaySubscriptionId: string;
  razorpayPaymentId: string;
  razorpayPlanId: string;
  billingCycle: "monthly" | "annual";
}): Promise<{ success: boolean; expiresAt: string }> {
  const expiresAt = new Date();
  if (opts.billingCycle === "annual") {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  } else {
    expiresAt.setDate(expiresAt.getDate() + 30);
  }

  await db
    .insert(subscriptions)
    .values({
      userId: opts.userId,
      plan: opts.billingCycle === "annual" ? "pro_annual" : "pro_monthly",
      status: "active",
      startsAt: new Date(),
      expiresAt,
      paymentId: opts.razorpayPaymentId,
      razorpaySubscriptionId: opts.razorpaySubscriptionId,
      razorpayPlanId: opts.razorpayPlanId,
      billingCycle: opts.billingCycle,
      autoRenew: "true",
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        plan: opts.billingCycle === "annual" ? "pro_annual" : "pro_monthly",
        status: "active",
        startsAt: new Date(),
        expiresAt,
        paymentId: opts.razorpayPaymentId,
        razorpaySubscriptionId: opts.razorpaySubscriptionId,
        razorpayPlanId: opts.razorpayPlanId,
        billingCycle: opts.billingCycle,
        autoRenew: "true",
        cancelledAt: null,
        updatedAt: new Date(),
      },
    });

  // Cache pro status in Redis
  const r = getRedis();
  if (r) {
    try {
      await r.set(proKey(opts.userId), expiresAt.toISOString(), {
        ex: 30 * 24 * 60 * 60,
      });
    } catch (err) {
      console.error("Redis cache error:", err);
    }
  }

  return { success: true, expiresAt: expiresAt.toISOString() };
}

// ─── Extend subscription on recurring charge ───
export async function extendSubscription(opts: {
  razorpaySubscriptionId: string;
  razorpayPaymentId: string;
}): Promise<boolean> {
  // Find the subscription by Razorpay subscription ID
  const [sub] = await db
    .select({ userId: subscriptions.userId, billingCycle: subscriptions.billingCycle })
    .from(subscriptions)
    .where(eq(subscriptions.razorpaySubscriptionId, opts.razorpaySubscriptionId))
    .limit(1);

  if (!sub) return false;

  const expiresAt = new Date();
  if (sub.billingCycle === "annual") {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  } else {
    expiresAt.setDate(expiresAt.getDate() + 30);
  }

  await db
    .update(subscriptions)
    .set({
      status: "active",
      expiresAt,
      paymentId: opts.razorpayPaymentId,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.razorpaySubscriptionId, opts.razorpaySubscriptionId));

  // Cache pro status
  const r = getRedis();
  if (r) {
    try {
      await r.set(proKey(sub.userId), expiresAt.toISOString(), {
        ex: 30 * 24 * 60 * 60,
      });
    } catch {
      // ignore
    }
  }

  return true;
}

// ─── Cancel subscription (at cycle end) ───
export async function cancelSubscription(userId: string): Promise<{
  success: boolean;
  razorpaySubscriptionId?: string;
  error?: string;
}> {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!sub || sub.status !== "active") {
    return { success: false, error: "No active subscription found." };
  }

  await db
    .update(subscriptions)
    .set({
      autoRenew: "false",
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));

  return {
    success: true,
    razorpaySubscriptionId: sub.razorpaySubscriptionId ?? undefined,
  };
}

// ─── Get full subscription details ───
export async function getSubscriptionDetails(userId: string) {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!sub) return null;

  // Get payment history
  const paymentHistory = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      currency: payments.currency,
      status: payments.status,
      createdAt: payments.createdAt,
      razorpayPaymentId: payments.razorpayPaymentId,
    })
    .from(payments)
    .where(eq(payments.userId, userId))
    .orderBy(payments.createdAt)
    .limit(20);

  return {
    ...sub,
    isActive: sub.status === "active" && sub.expiresAt > new Date(),
    payments: paymentHistory,
  };
}

export function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}
