import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const gymExercisesTable = pgTable("gym_exercises", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  dayOfWeek: integer("day_of_week").notNull(),
  name: text("name").notNull(),
  sets: integer("sets"),
  reps: integer("reps"),
  weight: text("weight"),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type GymExercise = typeof gymExercisesTable.$inferSelect;
