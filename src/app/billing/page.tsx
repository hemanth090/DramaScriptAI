"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Crown,
  CreditCard,
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  razorpayPaymentId: string | null;
}

interface BillingData {
  user: { name: string; email: string };
  subscription: {
    plan: string;
    status: string;
    isActive: boolean;
    billingCycle: string;
    autoRenew: boolean;
    startsAt: string;
    expiresAt: string;
    cancelledAt: string | null;
    razorpaySubscriptionId: string | null;
  } | null;
  payments: PaymentRecord[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatAmount(paise: number, currency: string) {
  const amount = paise / 100;
  if (currency === "INR") return `\u20B9${amount.toLocaleString("en-IN")}`;
  return `${currency} ${amount}`;
}

function planLabel(plan: string) {
  const labels: Record<string, string> = {
    pro_monthly: "Pro Monthly",
    pro_annual: "Pro Annual",
  };
  return labels[plan] || plan;
}

function statusBadge(status: string) {
  const map: Record<string, { variant: "accent" | "outline" | "secondary"; label: string }> = {
    active: { variant: "accent", label: "Active" },
    cancelled: { variant: "outline", label: "Cancelled" },
    expired: { variant: "outline", label: "Expired" },
    past_due: { variant: "secondary", label: "Past Due" },
    halted: { variant: "secondary", label: "Halted" },
  };
  const s = map[status] || { variant: "outline" as const, label: status };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export default function BillingPage() {
  const { status: sessionStatus } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const fetchBilling = useCallback(async () => {
    try {
      const res = await fetch("/api/billing");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
    } catch {
      toast("Failed to load billing data.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/billing");
      return;
    }
    if (sessionStatus === "authenticated") {
      fetchBilling();
    }
  }, [sessionStatus, fetchBilling, router]);

  const handleCancel = async () => {
    if (!confirm("Cancel auto-renewal? You'll keep Pro access until your current period ends.")) {
      return;
    }

    setCancelling(true);
    try {
      const res = await fetch("/api/subscription/cancel", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success) {
        toast("Auto-renewal cancelled successfully.", "success");
        fetchBilling();
      } else {
        toast(json.error || "Failed to cancel.", "error");
      }
    } catch {
      toast("Network error.", "error");
    } finally {
      setCancelling(false);
    }
  };

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const sub = data.subscription;
  const isActive = sub?.isActive ?? false;
  const isCancelled = sub?.cancelledAt != null;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">
            <span className="text-accent">Billing</span> & Subscription
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your subscription, view invoices, and update billing preferences.
          </p>
        </div>

        {/* Subscription Card */}
        <div className="rounded-xl border border-border bg-card p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Crown className="h-5 w-5 text-accent" />
                Subscription
              </h2>
            </div>
            {sub && statusBadge(sub.status)}
          </div>

          {!sub || !isActive ? (
            // No active subscription
            <div className="space-y-4">
              <p className="text-muted-foreground">
                You&apos;re on the <strong className="text-foreground">Free plan</strong> — 3
                scripts per day.
              </p>
              <Link href="/pricing">
                <Button variant="default">
                  <Crown className="h-4 w-4" />
                  Upgrade to Pro
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            // Active subscription
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Plan
                  </p>
                  <p className="text-sm font-medium">{planLabel(sub.plan)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Billing Cycle
                  </p>
                  <p className="text-sm font-medium capitalize">{sub.billingCycle}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Auto-Renewal
                  </p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    {sub.autoRenew ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        Off
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {isCancelled ? "Access ends" : "Next billing date"}:
                  </span>
                  <span className="font-medium">{formatDate(sub.expiresAt)}</span>
                </div>
                {isCancelled && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Cancelled on {formatDate(sub.cancelledAt!)}. You keep Pro access until the end
                    of your billing period.
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {sub.autoRenew && !isCancelled && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={cancelling}
                  >
                    {cancelling ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    Cancel Auto-Renewal
                  </Button>
                )}
                {isCancelled && (
                  <Link href="/pricing">
                    <Button variant="default" size="sm">
                      <RefreshCw className="h-3.5 w-3.5" />
                      Resubscribe
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Payment History */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-accent" />
            Payment History
          </h2>

          {data.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-4 text-xs text-muted-foreground uppercase tracking-wider pb-2 border-b border-border/50">
                <span>Date</span>
                <span>Amount</span>
                <span>Status</span>
                <span>Payment ID</span>
              </div>
              {data.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="grid grid-cols-4 gap-4 text-sm py-2 border-b border-border/20 last:border-0"
                >
                  <span className="text-muted-foreground">
                    {new Date(payment.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="font-medium">
                    {formatAmount(payment.amount, payment.currency)}
                  </span>
                  <span>
                    <Badge
                      variant={
                        payment.status === "verified" || payment.status === "captured"
                          ? "accent"
                          : payment.status === "failed"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-[10px]"
                    >
                      {payment.status}
                    </Badge>
                  </span>
                  <span className="text-muted-foreground text-xs truncate">
                    {payment.razorpayPaymentId || "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
