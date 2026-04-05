import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.SITE_URL || "https://dramascript.ai";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DramaScript.ai - AI Short Drama Script Generator",
    template: "%s | DramaScript.ai",
  },
  description:
    "Generate viral short drama scripts for Reels, TikTok & YouTube Shorts. 8-episode arcs with cliffhangers, emotional hooks, and zero-budget filming guides.",
  keywords: [
    "drama script generator",
    "AI script writer",
    "short drama series",
    "YouTube Shorts drama",
    "TikTok drama script",
    "micro drama",
    "short drama episodes",
    "vertical video script",
  ],
  openGraph: {
    title: "DramaScript.ai - AI Short Drama Script Generator",
    description:
      "Generate complete 8-episode drama scripts with cliffhangers, emotional arcs & zero-budget filming guides.",
    url: siteUrl,
    siteName: "DramaScript.ai",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DramaScript.ai - AI Short Drama Script Generator",
    description:
      "Generate viral drama scripts for Reels, TikTok & YouTube Shorts in seconds.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}
