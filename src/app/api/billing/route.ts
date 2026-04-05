import { auth } from "@/lib/auth";
import { getSubscriptionDetails } from "@/lib/payments";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Sign in required." }, { status: 401 });
    }

    const subscription = await getSubscriptionDetails(session.user.id);

    return Response.json({
      user: {
        name: session.user.name,
        email: session.user.email,
      },
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            isActive: subscription.isActive,
            billingCycle: subscription.billingCycle || "monthly",
            autoRenew: subscription.autoRenew === "true",
            startsAt: subscription.startsAt?.toISOString(),
            expiresAt: subscription.expiresAt?.toISOString(),
            cancelledAt: subscription.cancelledAt?.toISOString() || null,
            razorpaySubscriptionId: subscription.razorpaySubscriptionId,
          }
        : null,
      payments: subscription?.payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        createdAt: p.createdAt?.toISOString(),
        razorpayPaymentId: p.razorpayPaymentId,
      })) || [],
    });
  } catch (error) {
    console.error("Billing error:", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ error: "Failed to load billing data." }, { status: 500 });
  }
}
