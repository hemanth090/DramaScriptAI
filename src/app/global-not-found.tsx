import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Sparkles } from "lucide-react";

export default function GlobalNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-7xl font-black text-accent">404</div>
        <h1 className="text-2xl font-bold">Page Not Found</h1>
        <p className="text-muted-foreground">
          This page doesn&apos;t exist. Maybe it&apos;s still in the script — let us help you write one!
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild variant="default">
            <Link href="/">
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          </Button>
          <Button asChild variant="default">
            <Link href="/generate">
              <Sparkles className="h-4 w-4" />
              Generate a Script
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
