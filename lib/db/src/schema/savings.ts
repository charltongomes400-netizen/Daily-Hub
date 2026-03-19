import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const savingsTable = pgTable("savings", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  name: text("name").notNull(),
  targetAmount: numeric("target_amount", { precision: 10, scale: 2 }).notNull(),
  currentAmount: numeric("current_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Savings = typeof savingsTable.$inferSelect;
