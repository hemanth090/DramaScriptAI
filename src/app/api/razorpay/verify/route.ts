import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { verifyAndActivate } from "@/lib/payments";
import { sendPaymentConfirmation } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Sign in required." }, { status: 401 });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
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

    const result = await verifyAndActivate({
      userId: session.user.id,
      email: session.user.email || "",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      keySecret,
    });

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    // Send payment confirmation email (fire-and-forget)
    if (result.expiresAt && session.user.email) {
      sendPaymentConfirmation(session.user.email, {
        amount: "₹499",
        plan: "Pro Monthly",
        expiresAt: result.expiresAt,
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      message: "Pro plan activated for 30 days!",
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error("Payment verify error:", error instanceof Error ? error.message : "Unknown error");
    return Response.json(
      { error: "Payment verification failed." },
      { status: 500 }
    );
  }
}
