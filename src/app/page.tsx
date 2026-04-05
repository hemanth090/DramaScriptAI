"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Zap,
  Film,
  ArrowRight,
  Star,
  TrendingUp,
  Users,
  Theater,
  MessageSquareText,
  Flame,
  Video,
  ClipboardCopy,
  Crown,
} from "lucide-react";

const examples = [
  "Two strangers keep meeting at the same coffee shop",
  "A family torn apart by an inheritance secret",
  "Childhood best friends reunite after 10 years with unfinished feelings",
  "A struggling actor gets one last audition chance",
  "Small-town girl exposes a powerful politician's lie",
  "Roommates discover one of them has been lying about everything",
  "A doctor discovers their patient is the one who ruined their life",
  "Two rival food stall owners fall in love during a festival",
];

const features = [
  {
    icon: Theater,
    title: "8-Episode Arcs",
    desc: "Complete story with rising action, twists, and a satisfying climax across 8 episodes of 30-60 seconds each.",
  },
  {
    icon: MessageSquareText,
    title: "Universal Dialogue",
    desc: "Raw, punchy lines that translate to any language. Written to feel like a 3am text message, impossible to misread.",
  },
  {
    icon: Flame,
    title: "Cliffhanger Endings",
    desc: "Every episode ends with a hook that makes viewers swipe to the next part. Engagement optimized.",
  },
  {
    icon: Video,
    title: "Scene Descriptions",
    desc: "Detailed visual directions including camera angles, lighting, and sound. Ready for your phone camera.",
  },
  {
    icon: ClipboardCopy,
    title: "Copy & Export",
    desc: "One-click copy or PDF export. Go straight from script to shooting without reformatting.",
  },
  {
    icon: Zap,
    title: "Instant Generation",
    desc: "Full multi-episode script in under 30 seconds. 5 free scripts per day to get you started.",
  },
];

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K+`;
  return `${n}+`;
}

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [liveStats, setLiveStats] = useState({ scripts: 0, creators: 0 });
  const router = useRouter();

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setLiveStats(d))
      .catch(() => {});
  }, []);

  const stats = [
    { icon: Users, value: liveStats.creators > 0 ? formatCount(liveStats.creators) : "...", label: "Creators" },
    { icon: Film, value: liveStats.scripts > 0 ? formatCount(liveStats.scripts) : "...", label: "Scripts Generated" },
    { icon: TrendingUp, value: "8", label: "Episodes per Script" },
    { icon: Star, value: "4.9", label: "Creator Rating" },
  ];

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    router.push(`/generate?prompt=${encodeURIComponent(prompt.trim())}`);
  };

  const handleExample = (example: string) => {
    setPrompt(example);
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Subtle gradient backdrop */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent/5 rounded-full blur-[120px]" />
        </div>

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left — Copy */}
            <div className="space-y-6 text-center lg:text-left">
              <Badge variant="outline" className="text-xs px-3 py-1">
                <Sparkles className="h-3 w-3 mr-1.5" />
                AI-Powered Micro-Drama Scripts
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08]">
                Write Viral{" "}
                <span className="text-accent">Drama Scripts</span>{" "}
                in Seconds
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
                Generate complete <strong className="text-foreground font-medium">multi-episode</strong> short drama
                scripts with emotional hooks, cliffhangers, and zero-budget filming guides
                for <strong className="text-foreground font-medium">Reels, TikTok & YouTube Shorts</strong>.
              </p>

              {/* Stats inline */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-6 pt-2">
                {stats.map(({ icon: Icon, value, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-accent" />
                    <span className="text-lg font-bold text-foreground">{value}</span>
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Prompt Box */}
            <div className="w-full max-w-xl mx-auto lg:max-w-none">
              <div className="rounded-2xl border border-border bg-card p-2 shadow-xl shadow-black/20">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                  placeholder={`Describe your drama...\n\ne.g. "Two best friends, one secret, a friendship that might not survive"`}
                  className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 resize-none rounded-xl px-5 py-5 text-sm sm:text-base focus:outline-none min-h-[140px]"
                  rows={4}
                  maxLength={500}
                  aria-label="Drama concept input"
                />
                <div className="flex items-center justify-between px-3 pb-3">
                  <span className="text-xs text-muted-foreground/40">
                    {prompt.length}/500
                  </span>
                  <Button
                    onClick={handleGenerate}
                    disabled={!prompt.trim()}
                    size="lg"
                    className="gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    Generate Script
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Example Prompts */}
      <section className="border-y border-border/50 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-xs text-muted-foreground/60 mb-4 uppercase tracking-wider font-medium text-center">
            Popular prompts · click to generate
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {examples.map((example) => (
              <button
                key={example}
                onClick={() => handleExample(example)}
                className="px-4 py-2 text-sm rounded-lg border border-border bg-card/50 text-muted-foreground hover:text-foreground hover:bg-card hover:border-border/80 transition-all cursor-pointer"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Built for <span className="text-accent">Creators Everywhere</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Every script is optimized for the vertical short-drama format. Emotional arcs,
            universal storytelling, and binge-worthy cliffhangers.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group rounded-2xl border border-border bg-card/50 p-6 hover:bg-card hover:border-border/80 hover:shadow-lg hover:shadow-black/10 transition-all"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10 mb-4 group-hover:bg-accent/15 transition-colors">
                <Icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="text-base font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="border-y border-border/50 bg-muted/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Three Steps to Your <span className="text-accent">Viral Series</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Describe Your Concept",
                desc: "Type any drama idea. A betrayal, a secret, a reunion. One sentence is enough.",
              },
              {
                step: "02",
                title: "AI Writes the Script",
                desc: "In under 30 seconds, get a complete multi-episode script with dialogue, directions, and cliffhangers.",
              },
              {
                step: "03",
                title: "Film & Post",
                desc: "Copy, export as PDF, and start shooting. Zero-budget filming guide included with every script.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border-2 border-accent/30 text-accent font-bold text-sm mb-4">
                  {step}
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 via-transparent to-accent/5 p-10 sm:p-14 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to Create Your <span className="text-accent">Next Viral Series</span>?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Start with 5 free scripts per day. Upgrade to Pro for 50 scripts per month.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="xl"
                onClick={() => document.querySelector("textarea")?.focus()}
              >
                <Zap className="h-4 w-4" />
                Start Generating for Free
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push("/pricing")}
              >
                <Crown className="h-4 w-4" />
                View Pro Plan
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
