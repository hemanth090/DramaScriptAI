import crypto from "crypto";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { activateSubscription, storePayment } from "@/lib/payments";
import { sendPaymentConfirmation } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Sign in required." }, { status: 401 });
    }

    const {
      razorpay_subscription_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await request.json();

    if (!razorpay_subscription_id || !razorpay_payment_id || !razorpay_signature) {
      return Response.json(
        { error: "Missing payment verification fields." },
        { status: 400 }
      );
    }

    const keySecret = env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return Response.json(
        { error: "Payment verification unavailable." },
        { status: 503 }
      );
    }

    // Razorpay Subscription signature: HMAC of payment_id + "|" + subscription_id
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return Response.json({ error: "Invalid payment signature." }, { status: 400 });
    }

    // Store payment record
    await storePayment({
      userId: session.user.id,
      razorpayOrderId: razorpay_subscription_id, // use subscription ID as order reference
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      amount: 49900,
      status: "verified",
      plan: "pro_monthly",
      source: "client",
    });

    // Activate recurring subscription
    const result = await activateSubscription({
      userId: session.user.id,
      razorpaySubscriptionId: razorpay_subscription_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpayPlanId: "", // will be set from webhook if needed
      billingCycle: "monthly",
    });

    // Send confirmation email
    if (session.user.email) {
      sendPaymentConfirmation(session.user.email, {
        amount: "\u20B9499",
        plan: "Pro Monthly (Recurring)",
        expiresAt: result.expiresAt,
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      message: "Pro plan activated with monthly auto-renewal!",
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error("Subscription verify error:", error instanceof Error ? error.message : "Unknown error");
    return Response.json(
      { error: "Payment verification failed." },
      { status: 500 }
    );
  }
}
