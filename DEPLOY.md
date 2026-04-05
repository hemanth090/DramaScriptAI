# DramaScript.ai — Deployment Guide

## Local Development

```bash
cd dramascript-ai
npm install
cp .env.example .env.local   # then fill in your keys
npm run db:generate           # generate Drizzle migration files
npm run db:migrate            # apply migrations to Neon Postgres
npm run dev
```

Open http://localhost:3000

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `AUTH_SECRET` | **Yes** | 64+ char hex string for NextAuth session signing. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DATABASE_URL` | **Yes** | Neon Postgres connection string. Get from [Neon Console](https://console.neon.tech). |
| `SITE_URL` | No | Your production URL (default: `http://localhost:3000`). Used for SEO metadata. |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID. Get from [Google Cloud Console](https://console.cloud.google.com). |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret. |
| `XAI_API_KEY` | No | Grok API key (preferred AI provider). Get from [x.ai](https://console.x.ai). |
| `XAI_MODEL` | No | Grok model (default: `grok-3-mini`). |
| `OPENAI_API_KEY` | No | OpenAI API key (fallback). Without any AI key, the app serves demo scripts. |
| `OPENAI_MODEL` | No | OpenAI model (default: `gpt-4o-mini`). |
| `UPSTASH_REDIS_REST_URL` | **Recommended** | Upstash Redis REST URL. Enables rate limiting and AI response caching. |
| `UPSTASH_REDIS_REST_TOKEN` | **Recommended** | Upstash Redis REST token. |
| `RAZORPAY_KEY_ID` | For payments | Get from [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys). Use `rzp_test_*` keys for testing. |
| `RAZORPAY_KEY_SECRET` | For payments | Razorpay key secret (keep this private). |
| `RAZORPAY_WEBHOOK_SECRET` | For payments | Optional separate webhook secret. |
| `RESEND_API_KEY` | No | Resend API key for transactional emails. Get from [Resend](https://resend.com). |
| `EMAIL_FROM` | No | Sender email (default: `DramaScript.ai <noreply@dramascript.ai>`). |

## Neon Postgres Setup

1. Go to https://console.neon.tech and create a free project
2. Copy the connection string from Connection Details
3. Add it as `DATABASE_URL` in `.env.local`
4. Run `npm run db:generate && npm run db:migrate`

## Upstash Redis Setup (Rate Limiting + Caching)

1. Go to https://console.upstash.com and create a free database
2. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from REST API section
3. Add both to `.env.local`

Free tier: 10,000 requests/day — more than enough for an MVP.

## Google OAuth Setup (Optional)

1. Go to https://console.cloud.google.com → APIs & Services → Credentials
2. Create an OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (dev) and `https://your-domain.com/api/auth/callback/google` (prod)
4. Copy Client ID and Client Secret to env vars

## Razorpay Setup

1. Create account at https://razorpay.com
2. Go to Settings > API Keys > Generate Test Keys
3. Copy `Key ID` (starts with `rzp_test_`) and `Key Secret`
4. For production: generate Live keys instead

### Webhook Setup (Critical for Production)

1. Go to Razorpay Dashboard > Webhooks > Add New Webhook
2. Set Webhook URL: `https://your-domain.com/api/razorpay/webhook`
3. Select events: `payment.authorized`, `payment.captured`, `payment.failed`
4. Set a webhook secret and add it as `RAZORPAY_WEBHOOK_SECRET` in your env

### Test Card for Razorpay
- Card: `4111 1111 1111 1111`
- Expiry: Any future date
- CVV: Any 3 digits
- OTP: `1234` (for test mode)

## Deploy to Vercel

### Option 1: CLI
```bash
npm install -g vercel
vercel
# Follow prompts, then add env vars in Vercel dashboard
vercel --prod
```

### Option 2: GitHub
1. Push repo to GitHub
2. Go to https://vercel.com/new
3. Import the repository
4. Set root directory to `dramascript-ai` (if in a subdirectory)
5. Add all environment variables in the Vercel dashboard
6. Deploy

## Architecture

- **Auth**: NextAuth v5 with Credentials (email/password) + Google OAuth, JWT strategy
- **Database**: Drizzle ORM + Neon Postgres (users, subscriptions, payments, script history)
- **Payments**: Razorpay (₹499/month, 30-day access, no auto-renewal)
- **AI**: Grok API (primary, cheapest) → OpenAI (fallback) → Demo scripts (no API key)
- **Rate Limiting**: Upstash Redis sliding window (3/day free, unlimited pro) with in-memory fallback
- **Caching**: AI responses cached in Redis (24h TTL)
- **Emails**: Resend for payment confirmations and welcome emails
- **Security**: CSP headers, HMAC webhook verification, bcrypt password hashing, JWT sessions

## Pages

| Route | Description | Auth Required |
|---|---|---|
| `/` | Home page with hero, prompt box, examples | No |
| `/login` | Sign in with email/password or Google | No |
| `/register` | Create a new account | No |
| `/generate` | Script generation with formatted output | Yes |
| `/dashboard` | User's past generations and subscription status | Yes |
| `/pricing` | Free vs Pro plans, Razorpay checkout | No |
| `/terms` | Terms of Service | No |
| `/privacy` | Privacy Policy | No |

## Go Live Checklist

- [ ] Set up Neon Postgres and run migrations
- [ ] Configure `AUTH_SECRET` (random 64+ hex chars)
- [ ] Set `DATABASE_URL` to production Neon connection string
- [ ] Add at least one AI provider key (`XAI_API_KEY` or `OPENAI_API_KEY`)
- [ ] Set up Upstash Redis for rate limiting
- [ ] Configure Razorpay with **Live** keys (not test)
- [ ] Set up Razorpay webhook pointing to `/api/razorpay/webhook`
- [ ] Configure Google OAuth redirect URIs for production domain
- [ ] Set `SITE_URL` to your production URL
- [ ] Set `NODE_ENV=production` (automatic on Vercel)
- [ ] Optional: Configure Resend for transactional emails
- [ ] Deploy to Vercel and verify all flows end-to-end
