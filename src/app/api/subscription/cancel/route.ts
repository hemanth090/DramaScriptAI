import Razorpay from "razorpay";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { cancelSubscription } from "@/lib/payments";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Sign in required." }, { status: 401 });
    }

    const result = await cancelSubscription(session.user.id);

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    // Cancel on Razorpay side (at cycle end so user keeps access until expiry)
    if (result.razorpaySubscriptionId) {
      const keyId = env.RAZORPAY_KEY_ID;
      const keySecret = env.RAZORPAY_KEY_SECRET;

      if (keyId && keySecret) {
        try {
          const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
          // cancel_at_cycle_end = true: user retains access until period ends
          await razorpay.subscriptions.cancel(
            result.razorpaySubscriptionId,
            true as unknown as boolean
          );
        } catch (err) {
          console.error("Razorpay cancel error:", err instanceof Error ? err.message : err);
          // Don't fail the request — we already cancelled in our DB
        }
      }
    }

    return Response.json({
      success: true,
      message: "Auto-renewal cancelled. You'll retain Pro access until your current period ends.",
    });
  } catch (error) {
    console.error("Cancel subscription error:", error instanceof Error ? error.message : "Unknown error");
    return Response.json(
      { error: "Failed to cancel subscription." },
      { status: 500 }
    );
  }
}
