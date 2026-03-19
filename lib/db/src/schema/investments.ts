import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const investmentsTable = pgTable("investments", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  name: text("name").notNull(),
  type: text("type").notNull().default("stock"),
  ticker: text("ticker"),
  quantity: numeric("quantity", { precision: 14, scale: 6 }).notNull().default("0"),
  purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }).notNull(),
  currentPrice: numeric("current_price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Investment = typeof investmentsTable.$inferSelect;
