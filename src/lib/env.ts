function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Check your .env.local file.`
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const env = {
  // ─── Database ───
  get DATABASE_URL(): string {
    return required("DATABASE_URL");
  },

  // ─── AI Providers ───
  get GROQ_API_KEY(): string | undefined {
    return process.env.GROQ_API_KEY || undefined;
  },
  get GROQ_MODEL(): string {
    return optional("GROQ_MODEL", "llama-3.3-70b-versatile");
  },
  get XAI_API_KEY(): string | undefined {
    return process.env.XAI_API_KEY || undefined;
  },
  get XAI_MODEL(): string {
    return optional("XAI_MODEL", "grok-3-mini");
  },
  get OPENAI_API_KEY(): string | undefined {
    return process.env.OPENAI_API_KEY || undefined;
  },
  get OPENAI_MODEL(): string {
    return optional("OPENAI_MODEL", "gpt-4o-mini");
  },

  // ─── Razorpay ───
  get RAZORPAY_KEY_ID(): string | undefined {
    return process.env.RAZORPAY_KEY_ID || undefined;
  },
  get RAZORPAY_KEY_SECRET(): string | undefined {
    return process.env.RAZORPAY_KEY_SECRET || undefined;
  },

  // ─── Redis ───
  get UPSTASH_REDIS_REST_URL(): string | undefined {
    return process.env.UPSTASH_REDIS_REST_URL || undefined;
  },
  get UPSTASH_REDIS_REST_TOKEN(): string | undefined {
    return process.env.UPSTASH_REDIS_REST_TOKEN || undefined;
  },

  // ─── Email ───
  get RESEND_API_KEY(): string | undefined {
    return process.env.RESEND_API_KEY || undefined;
  },
  get EMAIL_FROM(): string {
    return optional("EMAIL_FROM", "DramaScript.ai <noreply@dramascript.ai>");
  },

  // ─── General ───
  get NODE_ENV(): string {
    return optional("NODE_ENV", "development");
  },
  get SITE_URL(): string {
    return optional("SITE_URL", "http://localhost:3000");
  },
};
