import { pgTable, serial, text, varchar, date, timestamp, unique } from "drizzle-orm/pg-core";

export const gratitudeEntriesTable = pgTable("gratitude_entries", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: date("date").notNull(),
  content: varchar("content", { length: 140 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  unique("gratitude_user_date_unique").on(table.userId, table.date),
]);

export type GratitudeEntry = typeof gratitudeEntriesTable.$inferSelect;
