import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const owedTable = pgTable("owed", {
  id: serial("id").primaryKey(),
  fromName: text("from_name").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  dueDate: timestamp("due_date"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Owed = typeof owedTable.$inferSelect;
