ALTER TABLE "subscriptions" ADD COLUMN "razorpay_subscription_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "razorpay_plan_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "billing_cycle" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "auto_renew" text DEFAULT 'true' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "cancelled_at" timestamp;