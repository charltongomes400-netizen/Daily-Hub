import { pgTable, serial, text, date, timestamp } from "drizzle-orm/pg-core";

export const gratitudeEntriesTable = pgTable("gratitude_entries", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  date: date("date").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type GratitudeEntry = typeof gratitudeEntriesTable.$inferSelect;
