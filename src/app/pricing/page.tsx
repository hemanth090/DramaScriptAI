"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Check,
  Crown,
  Zap,
  Loader2,
  Sparkles,
  Star,
  RefreshCw,
} from "lucide-react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: any) => any;
  }
}

const freePlan = {
  name: "Free",
  price: "\u20B90",
  period: "forever",
  description: "Perfect for trying out DramaScript.ai",
  features: [
    "3 scripts per day",
    "8-episode story arcs",
    "Universal dialogue",
    "Copy & PDF export",
    "All drama genres",
  ],
  limitations: ["Limited daily usage", "No priority generation"],
};

const proPlan = {
  name: "Pro",
  price: "\u20B9499",
  period: "/month",
  description: "100 scripts/month for serious creators",
  features: [
    "100 scripts per month",
    "8-episode story arcs",
    "Universal dialogue",
    "Copy & PDF export",
    "All drama genres",
    "Priority generation speed",
    "Script history & dashboard",
    "Monthly auto-renewal",
    "Cancel anytime",
    "Email support",
  ],
  limitations: [],
};

export default function PricingPage() {
  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [subStatus, setSubStatus] = useState<{
    isActive: boolean;
    autoRenew: boolean;
    cancelledAt: string | null;
    expiresAt: string | null;
  } | null>(null);
  const router = useRouter();

  const isPro = session?.user?.isPro ?? false;
  const isCancelled = subStatus?.cancelledAt != null;

  // Fetch subscription details to know if cancelled
  const fetchSubStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/billing");
      if (!res.ok) return;
      const data = await res.json();
      if (data.subscription) {
        setSubStatus({
          isActive: data.subscription.isActive,
          autoRenew: data.subscription.autoRenew,
          cancelledAt: data.subscription.cancelledAt,
          expiresAt: data.subscription.expiresAt,
        });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "authenticated" && isPro) {
      const load = async () => { await fetchSubStatus(); };
      load();
    }
  }, [sessionStatus, isPro, fetchSubStatus]);

  const handleSubscribe = async () => {
    if (!session) {
      router.push("/login?callbackUrl=/pricing");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (!razorpayReady || !window.Razorpay) {
        setError("Payment gateway is still loading. Please try again in a moment.");
        setLoading(false);
        return;
      }

      // Create a Razorpay order
      const res = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create order.");
        setLoading(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "DramaScript.ai",
        description: "Pro Plan, 100 Scripts/Month",
        order_id: data.orderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              await updateSession();
              setSuccess(true);
              setTimeout(() => router.push("/generate"), 3000);
            } else {
              setError(verifyData.error || "Payment verification failed. Contact support.");
            }
          } catch {
            setError("Payment verification failed. Your payment is safe. Contact support.");
          }
          setLoading(false);
        },
        prefill: {
          name: session.user.name || "",
          email: session.user.email || "",
        },
        notes: {
          userId: session.user.id,
        },
        theme: { color: "#a855f7" },
        modal: {
          ondismiss: () => { setLoading(false); setError(""); },
        },
      });

      rzp.on("payment.failed", (response: { error: { description: string } }) => {
        setError(response.error.description || "Payment failed.");
        setLoading(false);
      });
      rzp.open();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10">
            <Check className="h-10 w-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold">Welcome to Pro!</h1>
          <p className="text-muted-foreground text-lg">
            Your Pro access is now active with 100 scripts/month.
          </p>
          <Badge variant="default" className="text-sm px-4 py-1.5">
            <Crown className="h-4 w-4 mr-1.5" />
            Pro Member
          </Badge>
          <p className="text-sm text-muted-foreground">Redirecting to generator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={() => setRazorpayReady(true)}
      />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="default" className="mb-4 text-sm px-4 py-1.5">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Simple Pricing
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-bold mb-4">
            Choose Your <span className="text-accent">Creator Plan</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Start free with 3 scripts/day. Go Pro for 100 scripts/month at just {"\u20B9"}499/month.
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free Plan */}
          <Card className="bg-card/50 border-border hover:border-border/80 transition-all">
            <CardHeader>
              <CardDescription>{freePlan.description}</CardDescription>
              <CardTitle className="flex items-baseline gap-1">
                <span className="text-4xl font-black">{freePlan.price}</span>
                <span className="text-muted-foreground text-sm">/{freePlan.period}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {freePlan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
                {freePlan.limitations.map((l) => (
                  <li key={l} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="h-4 w-4 shrink-0 text-center">{"\u2014"}</span>
                    {l}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/generate")}
              >
                <Zap className="h-4 w-4" />
                Start Free
              </Button>
            </CardFooter>
          </Card>

          {/* Pro Plan */}
          <Card className="bg-card border-accent/30 relative overflow-hidden hover:border-accent/40 transition-all">
            <div className="absolute top-0 right-0">
              <div className="bg-accent text-background text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                <Star className="h-3 w-3" />
                {isPro && isCancelled ? "EXPIRING" : isPro ? "CURRENT PLAN" : "POPULAR"}
              </div>
            </div>
            <CardHeader>
              <CardDescription>{proPlan.description}</CardDescription>
              <CardTitle className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-accent">{proPlan.price}</span>
                <span className="text-muted-foreground text-sm">{proPlan.period}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {proPlan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-accent shrink-0" />
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              {isPro && !isCancelled ? (
                // Active Pro with auto-renewal on
                <div className="w-full space-y-2">
                  <Button variant="outline" className="w-full" disabled>
                    <Crown className="h-4 w-4" />
                    Active Pro Member
                  </Button>
                  <Link href="/billing" className="block">
                    <Button variant="secondary" className="w-full" size="sm">
                      <RefreshCw className="h-3.5 w-3.5" />
                      Manage Subscription
                    </Button>
                  </Link>
                </div>
              ) : isPro && isCancelled ? (
                // Pro access but cancelled — show resubscribe
                <div className="w-full space-y-2">
                  <Button
                    variant="default"
                    className="w-full"
                    size="lg"
                    onClick={handleSubscribe}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Crown className="h-4 w-4" />
                        Resubscribe {"\u2014"} {"\u20B9"}499/month
                      </>
                    )}
                  </Button>
                  {subStatus?.expiresAt && (
                    <p className="text-xs text-muted-foreground text-center">
                      Current access ends {new Date(subStatus.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  )}
                  <Link href="/billing" className="block">
                    <Button variant="secondary" className="w-full" size="sm">
                      View Billing
                    </Button>
                  </Link>
                </div>
              ) : (
                <Button
                  variant="default"
                  className="w-full"
                  size="lg"
                  onClick={handleSubscribe}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Crown className="h-4 w-4" />
                      {session ? "Subscribe \u2014 \u20B9499/month" : "Sign in & Subscribe \u2014 \u20B9499/month"}
                    </>
                  )}
                </Button>
              )}
              {error && (
                <p className="text-xs text-destructive text-center">{error}</p>
              )}
              {!isPro && (
                <p className="text-xs text-muted-foreground text-center">
                  Secure payment via Razorpay. Auto-renews monthly. Cancel anytime from billing.
                </p>
              )}
            </CardFooter>
          </Card>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Frequently Asked <span className="text-accent">Questions</span>
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "What do I get with the free plan?",
                a: "3 complete 8-episode drama scripts per day. Each script includes dialogue, scene descriptions, cliffhangers, filming guides, and creator notes. Copy and PDF export included.",
              },
              {
                q: "How does the Pro plan work?",
                a: "Pay \u20B9499/month via Razorpay (UPI, cards, net banking). Instantly unlocks 100 scripts per month. Auto-renews monthly. Cancel anytime from your billing page.",
              },
              {
                q: "How do I cancel?",
                a: "Go to your Billing page and click \u201CCancel Auto-Renewal\u201D. You\u2019ll keep Pro access until the end of your current billing period. No questions asked.",
              },
              {
                q: "Do I need to create an account?",
                a: "Yes! Sign up with your email \u2014 it takes 10 seconds. Your subscription, script history, and usage are all tied to your account, so you\u2019ll never lose access.",
              },
              {
                q: "What genres are supported?",
                a: "Romance, thriller, family drama, crime, comedy, horror, revenge saga, college drama, office politics, and more. Just describe your concept!",
              },
              {
                q: "Can I use these scripts commercially?",
                a: "Yes! All generated scripts are yours to use, edit, and publish on any platform \u2014 Instagram, YouTube, MX TakaTak, Josh, etc.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-xl border border-border bg-card/50 p-5">
                <h3 className="font-bold text-sm mb-2">{q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
