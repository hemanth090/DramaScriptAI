import { NextRequest } from "next/server";
import crypto from "crypto";
import { env } from "@/lib/env";
import { webhookActivate, extendSubscription } from "@/lib/payments";
import { db } from "@/lib/drizzle";
import { subscriptions } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
        email: string;
        contact: string;
        subscription_id?: string;
        notes: Record<string, string>;
      };
    };
    subscription?: {
      entity: {
        id: string;
        plan_id: string;
        status: string;
        current_start: number;
        current_end: number;
        customer_id: string;
        notes: Record<string, string>;
      };
    };
  };
}

function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  if (signature.length !== expectedSignature.length) return false;
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);
  let mismatch = 0;
  for (let i = 0; i < sigBuf.length; i++) {
    mismatch |= sigBuf[i] ^ expBuf[i];
  }
  return mismatch === 0;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return Response.json({ error: "Missing webhook signature." }, { status: 400 });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || env.RAZORPAY_KEY_SECRET;
    if (!webhookSecret) {
      return Response.json({ error: "Webhook verification unavailable." }, { status: 503 });
    }

    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error("Webhook signature verification failed");
      return Response.json({ error: "Invalid webhook signature." }, { status: 400 });
    }

    const data: RazorpayWebhookPayload = JSON.parse(rawBody);
    const event = data.event;

    // ─── Subscription lifecycle events ───

    if (event === "subscription.activated") {
      const sub = data.payload.subscription?.entity;
      if (sub) {
        console.log(`Webhook: Subscription ${sub.id} activated`);
      }
      return Response.json({ status: "processed" });
    }

    if (event === "subscription.charged") {
      // Recurring payment succeeded — extend the subscription
      const payment = data.payload.payment?.entity;
      const sub = data.payload.subscription?.entity;
      if (payment?.subscription_id) {
        const extended = await extendSubscription({
          razorpaySubscriptionId: payment.subscription_id,
          razorpayPaymentId: payment.id,
        });
        console.log(
          `Webhook: Subscription ${payment.subscription_id} charged — ${extended ? "extended" : "not found"}`
        );
      } else if (sub) {
        await extendSubscription({
          razorpaySubscriptionId: sub.id,
          razorpayPaymentId: payment?.id || "",
        });
      }
      return Response.json({ status: "processed" });
    }

    if (event === "subscription.halted") {
      // Payment failed after retries — mark subscription as halted
      const sub = data.payload.subscription?.entity;
      if (sub) {
        await db
          .update(subscriptions)
          .set({ status: "halted", updatedAt: new Date() })
          .where(eq(subscriptions.razorpaySubscriptionId, sub.id));
        console.log(`Webhook: Subscription ${sub.id} halted (payment failures)`);
      }
      return Response.json({ status: "processed" });
    }

    if (event === "subscription.cancelled") {
      const sub = data.payload.subscription?.entity;
      if (sub) {
        await db
          .update(subscriptions)
          .set({
            autoRenew: "false",
            cancelledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.razorpaySubscriptionId, sub.id));
        console.log(`Webhook: Subscription ${sub.id} cancelled`);
      }
      return Response.json({ status: "processed" });
    }

    if (event === "subscription.completed") {
      const sub = data.payload.subscription?.entity;
      if (sub) {
        await db
          .update(subscriptions)
          .set({ autoRenew: "false", updatedAt: new Date() })
          .where(eq(subscriptions.razorpaySubscriptionId, sub.id));
        console.log(`Webhook: Subscription ${sub.id} completed`);
      }
      return Response.json({ status: "processed" });
    }

    if (event === "subscription.pending") {
      const sub = data.payload.subscription?.entity;
      if (sub) {
        await db
          .update(subscriptions)
          .set({ status: "past_due", updatedAt: new Date() })
          .where(eq(subscriptions.razorpaySubscriptionId, sub.id));
        console.log(`Webhook: Subscription ${sub.id} pending payment`);
      }
      return Response.json({ status: "processed" });
    }

    // ─── Legacy one-time payment events ───

    if (event === "payment.authorized" || event === "payment.captured") {
      const payment = data.payload.payment?.entity;
      if (!payment) return Response.json({ status: "ignored" });

      // Skip if this payment belongs to a subscription (handled above)
      if (payment.subscription_id) {
        return Response.json({ status: "handled_by_subscription" });
      }

      const activated = await webhookActivate({
        razorpayPaymentId: payment.id,
        razorpayOrderId: payment.order_id,
        email: payment.email || payment.notes?.email || "unknown",
        amount: payment.amount,
      });

      if (activated) {
        console.log(`Webhook: Payment ${payment.id} activated for order ${payment.order_id}`);
      }

      return Response.json({ status: "processed" });
    }

    if (event === "payment.failed") {
      const payment = data.payload.payment?.entity;
      console.log(`Webhook: Payment failed — ${payment?.id}, order: ${payment?.order_id}`);
      return Response.json({ status: "noted" });
    }

    return Response.json({ status: "ignored", event });
  } catch (error) {
    console.error("Webhook error:", error instanceof Error ? error.message : "Unknown error");
    // Always return 200 to prevent Razorpay from retrying
    return Response.json({ status: "error" }, { status: 200 });
  }
}
