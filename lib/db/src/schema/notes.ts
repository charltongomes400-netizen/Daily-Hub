import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const notesTable = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  color: text("color").notNull().default("default"),
  isPinned: boolean("is_pinned").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Note = typeof notesTable.$inferSelect;
