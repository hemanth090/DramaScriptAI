import {
  pgTable,
  text,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Users (synced from Supabase Auth) ───

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Supabase auth.users UUID
  name: text("name"),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

// ─── Application tables ───

export const generations = pgTable(
  "generations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    script: text("script").notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("generations_user_created_idx").on(table.userId, table.createdAt),
  ]
);

export const subscriptions = pgTable("subscriptions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  plan: text("plan").notNull().default("pro_monthly"),
  status: text("status", {
    enum: ["active", "expired", "cancelled", "past_due", "halted"],
  })
    .notNull()
    .default("active"),
  startsAt: timestamp("starts_at", { mode: "date" }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  paymentId: text("payment_id"),
  razorpaySubscriptionId: text("razorpay_subscription_id"),
  razorpayPlanId: text("razorpay_plan_id"),
  billingCycle: text("billing_cycle", {
    enum: ["monthly", "annual"],
  }),
  autoRenew: text("auto_renew").notNull().default("true"),
  cancelledAt: timestamp("cancelled_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

export const payments = pgTable(
  "payments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    razorpayOrderId: text("razorpay_order_id").notNull().unique(),
    razorpayPaymentId: text("razorpay_payment_id").unique(),
    razorpaySignature: text("razorpay_signature"),
    amount: integer("amount").notNull(), // in paise (49900 = ₹499)
    currency: text("currency").notNull().default("INR"),
    status: text("status", {
      enum: ["created", "authorized", "captured", "verified", "failed", "refunded"],
    })
      .notNull()
      .default("created"),
    plan: text("plan").notNull().default("pro_monthly"),
    source: text("source").notNull().default("client"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  }
);

// ─── Relations ───

export const usersRelations = relations(users, ({ many, one }) => ({
  generations: many(generations),
  payments: many(payments),
  subscription: one(subscriptions),
}));

export const generationsRelations = relations(generations, ({ one }) => ({
  user: one(users, { fields: [generations.userId], references: [users.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
}));
