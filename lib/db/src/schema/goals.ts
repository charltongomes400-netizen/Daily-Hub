import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const goalsTable = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: timestamp("target_date"),
  status: text("status").notNull().default("active"),
  progress: integer("progress").notNull().default(0),
  category: text("category"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Goal = typeof goalsTable.$inferSelect;
