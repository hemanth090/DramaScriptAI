import Razorpay from "razorpay";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { storePayment } from "@/lib/payments";

const VALID_PLANS = ["pro"] as const;
const PLAN_AMOUNTS: Record<string, number> = {
  pro: 49900, // ₹499 in paise
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Sign in to purchase." }, { status: 401 });
    }

    const keyId = env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return Response.json(
        { error: "Payment gateway not configured. Contact support." },
        { status: 503 }
      );
    }

    const { plan } = await request.json();

    if (!plan || !VALID_PLANS.includes(plan)) {
      return Response.json({ error: "Invalid plan selected." }, { status: 400 });
    }

    const amount = PLAN_AMOUNTS[plan];

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `ds_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      notes: {
        plan: "pro_monthly",
        product: "DramaScript.ai Pro",
        userId: session.user.id,
      },
    });

    // Create payment record in DB with status "created"
    await storePayment({
      userId: session.user.id,
      razorpayOrderId: order.id,
      amount,
      status: "created",
      plan: "pro_monthly",
      source: "client",
    });

    return Response.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Razorpay order error:", message);
    return Response.json(
      { error: "Failed to create payment order." },
      { status: 500 }
    );
  }
}
