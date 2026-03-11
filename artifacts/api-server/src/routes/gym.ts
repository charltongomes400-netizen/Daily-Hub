import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { gymExercisesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const CreateExerciseBody = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  name: z.string().min(1),
  sets: z.number().int().positive().optional(),
  reps: z.number().int().positive().optional(),
  weight: z.string().optional(),
  notes: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

const UpdateExerciseBody = z.object({
  name: z.string().min(1).optional(),
  sets: z.number().int().positive().nullable().optional(),
  reps: z.number().int().positive().nullable().optional(),
  weight: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

const IdParam = z.object({ id: z.coerce.number().int().positive() });

router.get("/", async (_req, res) => {
  const exercises = await db
    .select()
    .from(gymExercisesTable)
    .orderBy(gymExercisesTable.dayOfWeek, gymExercisesTable.sortOrder, gymExercisesTable.id);
  res.json(exercises);
});

router.post("/", async (req, res) => {
  const body = CreateExerciseBody.parse(req.body);
  const [exercise] = await db
    .insert(gymExercisesTable)
    .values({
      dayOfWeek: body.dayOfWeek,
      name: body.name,
      sets: body.sets ?? null,
      reps: body.reps ?? null,
      weight: body.weight ?? null,
      notes: body.notes ?? null,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();
  res.status(201).json(exercise);
});

router.patch("/:id", async (req, res) => {
  const { id } = IdParam.parse(req.params);
  const body = UpdateExerciseBody.parse(req.body);
  const updates: Partial<typeof gymExercisesTable.$inferInsert> = {};
  if (body.name !== undefined)      updates.name = body.name;
  if (body.sets !== undefined)      updates.sets = body.sets;
  if (body.reps !== undefined)      updates.reps = body.reps;
  if (body.weight !== undefined)    updates.weight = body.weight;
  if (body.notes !== undefined)     updates.notes = body.notes;
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;
  const [updated] = await db
    .update(gymExercisesTable)
    .set(updates)
    .where(eq(gymExercisesTable.id, id))
    .returning();
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const { id } = IdParam.parse(req.params);
  await db.delete(gymExercisesTable).where(eq(gymExercisesTable.id, id));
  res.status(204).send();
});

export default router;
