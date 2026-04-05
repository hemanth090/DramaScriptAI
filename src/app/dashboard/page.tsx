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
  Sparkles,
  Copy,
  Check,
  FileDown,
  ChevronDown,
  ChevronUp,
  Zap,
  Calendar,
  Loader2,
  ScrollText,
} from "lucide-react";

interface Generation {
  id: string;
  prompt: string;
  script: string;
  model: string;
  createdAt: string;
}

interface DashboardData {
  generations: Generation[];
  total: number;
  isPro: boolean;
  plan: string | null;
  expiresAt: string | null;
}

const PAGE_SIZE = 10;

export default function DashboardPage() {
  const { status } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = useCallback(async (pageNum: number) => {
    try {
      const res = await fetch(
        `/api/dashboard?page=${pageNum}&limit=${PAGE_SIZE}`
      );
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
    } catch {
      toast("Failed to load dashboard data.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/dashboard");
      return;
    }
    if (status === "authenticated") {
      fetchData(page);
    }
  }, [status, page, fetchData, router]);

  const handleCopy = async (script: string, id: string) => {
    try {
      await navigator.clipboard.writeText(script);
      setCopiedId(id);
      toast("Script copied!", "success");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast("Failed to copy.", "error");
    }
  };

  const handlePDF = async (script: string, prompt: string) => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("DramaScript.ai — Generated Script", 20, 20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Prompt: ${prompt}`, 20, 28);
      doc.setTextColor(0);
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(script, 170);
      let y = 38;
      const pageHeight = doc.internal.pageSize.height;
      for (const line of lines) {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 20, y);
        y += 5;
      }
      // Add watermark/footer to every page
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(160);
        if (!data?.isPro) {
          doc.text("Generated with DramaScript.ai — Free Tier | Upgrade to Pro for clean exports", 20, pageHeight - 10);
        } else {
          doc.text("Generated with DramaScript.ai", 20, pageHeight - 10);
        }
      }

      doc.save(`dramascript-${Date.now()}.pdf`);
      toast("PDF downloaded!", "success");
    } catch {
      toast("Failed to generate PDF.", "error");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const totalPages = Math.ceil(data.total / PAGE_SIZE);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">
            <span className="text-accent">Dashboard</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Your script history and subscription status.
          </p>
        </div>

        {/* Subscription Status Card */}
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold">Subscription</h2>
                <Badge variant={data.isPro ? "accent" : "outline"}>
                  {data.isPro ? (
                    <>
                      <Crown className="h-3 w-3 mr-1" />
                      Pro
                    </>
                  ) : (
                    "Free"
                  )}
                </Badge>
              </div>
              {data.isPro && data.expiresAt && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Expires{" "}
                  {new Date(data.expiresAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
              {!data.isPro && (
                <p className="text-sm text-muted-foreground">
                  3 free scripts per day. Upgrade for unlimited access.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Link href="/generate">
                <Button variant="default" size="sm">
                  <Zap className="h-3.5 w-3.5" />
                  Generate
                </Button>
              </Link>
              {!data.isPro && (
                <Link href="/pricing">
                  <Button variant="outline" size="sm">
                    <Crown className="h-3.5 w-3.5" />
                    Upgrade
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl border border-border bg-card/50 p-4 text-center">
            <p className="text-2xl font-bold text-accent">{data.total}</p>
            <p className="text-xs text-muted-foreground">Total Scripts</p>
          </div>
          <div className="rounded-xl border border-border bg-card/50 p-4 text-center">
            <p className="text-2xl font-bold text-accent">
              {data.isPro ? "100/month" : "3/day"}
            </p>
            <p className="text-xs text-muted-foreground">Generation Limit</p>
          </div>
        </div>

        {/* Script History */}
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-accent" />
          Script History
        </h2>

        {data.generations.length === 0 ? (
          <div className="rounded-xl border border-border/50 border-dashed bg-card/30 p-8 text-center">
            <Sparkles className="h-8 w-8 text-accent mx-auto mb-3" />
            <h3 className="font-bold mb-1">No scripts yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Generate your first drama script to see it here.
            </p>
            <Link href="/generate">
              <Button variant="default" size="sm">
                <Zap className="h-3.5 w-3.5" />
                Generate Now
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {data.generations.map((gen) => (
              <div
                key={gen.id}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                {/* Header */}
                <button
                  onClick={() =>
                    setExpandedId(expandedId === gen.id ? null : gen.id)
                  }
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {gen.prompt}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {new Date(gen.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {gen.model}
                      </Badge>
                    </div>
                  </div>
                  {expandedId === gen.id ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                  )}
                </button>

                {/* Expanded Content */}
                {expandedId === gen.id && (
                  <div className="border-t border-border">
                    <div className="flex gap-2 p-3 bg-muted/20">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(gen.script, gen.id)}
                      >
                        {copiedId === gen.id ? (
                          <>
                            <Check className="h-3 w-3" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePDF(gen.script, gen.prompt)}
                      >
                        <FileDown className="h-3 w-3" />
                        PDF
                      </Button>
                    </div>
                    <div className="p-4 max-h-[50vh] overflow-y-auto">
                      <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                        {gen.script}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => {
                    setPage(page - 1);
                    setLoading(true);
                  }}
                >
                  Previous
                </Button>
                <span className="flex items-center text-sm text-muted-foreground px-3">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => {
                    setPage(page + 1);
                    setLoading(true);
                  }}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
