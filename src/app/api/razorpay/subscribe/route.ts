import Razorpay from "razorpay";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";

// Razorpay Plan IDs — created once in Razorpay dashboard or via API
// For now, we create them on-the-fly and cache in module scope
let cachedPlanId: string | null = null;

async function getOrCreatePlan(razorpay: InstanceType<typeof Razorpay>): Promise<string> {
  // Use env var if set
  const envPlanId = process.env.RAZORPAY_PLAN_PRO_MONTHLY;
  if (envPlanId) return envPlanId;

  // Return cached plan ID
  if (cachedPlanId) return cachedPlanId;

  // Create a new plan
  try {
    const plan = await razorpay.plans.create({
      period: "monthly",
      interval: 1,
      item: {
        name: "DramaScript.ai Pro",
        amount: 49900, // ₹499
        currency: "INR",
        description: "50 drama scripts per month",
      },
    });
    cachedPlanId = plan.id;
    console.log("Razorpay plan created:", plan.id);
    return plan.id;
  } catch (err) {
    console.error("Failed to create Razorpay plan:", JSON.stringify(err, null, 2));
    throw err;
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Sign in to subscribe." }, { status: 401 });
    }

    const keyId = env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return Response.json(
        { error: "Payment gateway not configured. Contact support." },
        { status: 503 }
      );
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const planId = await getOrCreatePlan(razorpay);

    const { billing_cycle = "monthly" } = await request.json().catch(() => ({}));

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: billing_cycle === "annual" ? 12 : 12, // 12 months max
      customer_notify: 1,
      notes: {
        userId: session.user.id,
        plan: "pro_monthly",
        product: "DramaScript.ai Pro",
      },
    });

    return Response.json({
      subscriptionId: subscription.id,
      planId,
      keyId,
    });
  } catch (error: unknown) {
    const err = error as { error?: { description?: string }; message?: string };
    const detail = err?.error?.description || err?.message || "Unknown error";
    console.error("Razorpay subscribe error:", detail);
    return Response.json(
      { error: "Failed to create subscription." },
      { status: 500 }
    );
  }
}
