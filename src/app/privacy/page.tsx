import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — DramaScript.ai",
  description: "Privacy Policy for DramaScript.ai — how we handle your data.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
      <h1 className="text-3xl font-bold mb-8">
        Privacy <span className="text-accent">Policy</span>
      </h1>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground">
        <p className="text-foreground text-base">
          Last updated: April 2026. Your privacy matters to us. Here is how DramaScript.ai handles
          your information.
        </p>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">1. Information We Collect</h2>
          <p>
            <strong className="text-foreground">Account Information:</strong> When you register, we
            collect your name, email address, and a hashed version of your password. We never store
            your password in plain text.
          </p>
          <p>
            <strong className="text-foreground">Prompts &amp; Generated Scripts:</strong> The drama
            concepts you enter and the scripts generated are stored in our database, linked to your
            account. This powers your dashboard, script history, and enables features like PDF
            export and script sharing.
          </p>
          <p>
            <strong className="text-foreground">Payment Information:</strong> Payment processing is
            handled entirely by Razorpay, a PCI-DSS compliant gateway. We do not store your card
            numbers, UPI IDs, or bank details. We store Razorpay order IDs, payment IDs, and
            transaction status for subscription management and receipt purposes.
          </p>
          <p>
            <strong className="text-foreground">Usage Data:</strong> We track your daily script
            generation count for free-tier rate limiting and your subscription status for access
            control.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">2. How We Store Your Data</h2>
          <p>
            Your data is stored in a PostgreSQL database hosted on Neon (cloud database provider).
            Session data and rate-limiting counters are cached in Upstash Redis. Both services use
            encryption in transit and at rest.
          </p>
          <p>
            <strong className="text-foreground">Sessions:</strong> We use JSON Web Tokens (JWT)
            managed by NextAuth.js. Session tokens are stored as httpOnly cookies and expire after
            24 hours.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">3. Third-Party Services</h2>
          <p>
            <strong className="text-foreground">AI Providers:</strong> Your prompts are sent to
            third-party AI services (which may include Groq, xAI, and OpenAI) for script
            generation. Only the creative prompt is sent — no personal information. Each
            provider&apos;s data usage policies apply to their processing.
          </p>
          <p>
            <strong className="text-foreground">Razorpay:</strong> Payment processing is handled by
            Razorpay. Razorpay&apos;s privacy policy governs the handling of your payment data.
          </p>
          <p>
            <strong className="text-foreground">Resend:</strong> Transactional emails (verification,
            password reset, payment confirmations) are sent via Resend. Your email address is shared
            with Resend for delivery purposes only.
          </p>
          <p>
            <strong className="text-foreground">Vercel:</strong> This application is hosted on Vercel.
            Standard server logs (IP addresses, request timestamps) may be collected by the hosting
            platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">4. Data Retention</h2>
          <p>
            Your account data, script history, and payment records are retained as long as your
            account is active. Email verification tokens expire after 24 hours and password reset
            tokens expire after 1 hour; both are deleted after use.
          </p>
          <p>
            AI-generated scripts may be cached for up to 24 hours to improve response times for
            similar prompts.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">5. Your Rights</h2>
          <p>You can:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Access your script history and account data through the dashboard</li>
            <li>Reset your password at any time via the forgot-password flow</li>
            <li>Request deletion of your account and all associated data by contacting us</li>
            <li>Clear browser cookies through your browser settings</li>
          </ul>
          <p>
            To request a full data export or account deletion, email us at the address below. We
            will process your request within 30 days.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">6. Data Security</h2>
          <p>
            Passwords are hashed using bcrypt before storage. All data in transit is encrypted via
            TLS. Payment signatures are verified using HMAC-SHA256. We follow industry-standard
            practices to protect your data, but no system is 100% secure.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">7. Changes to This Policy</h2>
          <p>
            We may update this privacy policy as our service evolves. Changes will be reflected on
            this page with an updated date.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">8. Contact</h2>
          <p>
            For privacy-related questions, email us at{" "}
            <span className="text-accent">support@dramascript.ai</span>
          </p>
        </section>
      </div>
    </div>
  );
}
