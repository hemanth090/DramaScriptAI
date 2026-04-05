"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle, XCircle, Clock, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");

  if (status === "success") {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle className="h-8 w-8 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold">Email Verified!</h1>
        <p className="text-muted-foreground">
          Your account is now active. Sign in to start generating scripts.
        </p>
        <Link href="/login">
          <Button variant="default" size="lg">
            Sign In
          </Button>
        </Link>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10">
          <Clock className="h-8 w-8 text-yellow-500" />
        </div>
        <h1 className="text-2xl font-bold">Link Expired</h1>
        <p className="text-muted-foreground">
          This verification link has expired. Register again to get a new one.
        </p>
        <Link href="/register">
          <Button variant="outline" size="lg">
            Register Again
          </Button>
        </Link>
      </div>
    );
  }

  if (status === "invalid" || status === "error") {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <XCircle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Invalid Link</h1>
        <p className="text-muted-foreground">
          This verification link is invalid or has already been used.
        </p>
        <Link href="/register">
          <Button variant="outline" size="lg">
            Register Again
          </Button>
        </Link>
      </div>
    );
  }

  // Default: waiting for verification (shown after registration)
  return (
    <div className="text-center space-y-4">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Mail className="h-8 w-8 text-accent" />
      </div>
      <h1 className="text-2xl font-bold">Check Your Email</h1>
      <p className="text-muted-foreground max-w-sm mx-auto">
        We sent a verification link to your email. Click the link to activate your account.
      </p>
      <p className="text-xs text-muted-foreground">
        Didn&apos;t receive it? Check your spam folder, or{" "}
        <Link href="/register" className="text-accent hover:underline">
          register again
        </Link>{" "}
        to resend.
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Suspense
        fallback={
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-accent animate-spin mx-auto" />
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
