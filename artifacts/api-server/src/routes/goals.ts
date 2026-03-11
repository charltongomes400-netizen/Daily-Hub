import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { goalsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, getUserId } from "../middleware/auth";

const router: IRouter = Router();

router.use(requireAuth);

const CreateGoalBody = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  targetDate: z.string().optional(),
  category: z.string().optional(),
});

const UpdateGoalBody = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  status: z.enum(["active", "completed"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  category: z.string().nullable().optional(),
});

const IdParam = z.object({ id: z.coerce.number().int().positive() });

router.get("/", async (req, res) => {
  const userId = getUserId(req);
  const goals = await db
    .select()
    .from(goalsTable)
    .where(eq(goalsTable.userId, userId))
    .orderBy(goalsTable.targetDate);
  res.json(
    goals.map((g) => ({
      ...g,
      targetDate: g.targetDate ? g.targetDate.toISOString() : null,
      createdAt: g.createdAt.toISOString(),
    }))
  );
});

router.post("/", async (req, res) => {
  const userId = getUserId(req);
  const body = CreateGoalBody.parse(req.body);
  const [goal] = await db
    .insert(goalsTable)
    .values({
      userId,
      title: body.title,
      description: body.description ?? null,
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
      category: body.category ?? null,
    })
    .returning();
  res.status(201).json({
    ...goal,
    targetDate: goal.targetDate ? goal.targetDate.toISOString() : null,
    createdAt: goal.createdAt.toISOString(),
  });
});

router.patch("/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = IdParam.parse(req.params);
  const body = UpdateGoalBody.parse(req.body);
  const updates: Partial<typeof goalsTable.$inferInsert> = {};
  if (body.title !== undefined)       updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description ?? null;
  if (body.targetDate !== undefined)  updates.targetDate = body.targetDate ? new Date(body.targetDate) : null;
  if (body.status !== undefined)      updates.status = body.status;
  if (body.progress !== undefined)    updates.progress = body.progress;
  if (body.category !== undefined)    updates.category = body.category ?? null;

  const [goal] = await db
    .update(goalsTable)
    .set(updates)
    .where(and(eq(goalsTable.id, id), eq(goalsTable.userId, userId)))
    .returning();
  res.json({
    ...goal,
    targetDate: goal.targetDate ? goal.targetDate.toISOString() : null,
    createdAt: goal.createdAt.toISOString(),
  });
});

router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = IdParam.parse(req.params);
  await db.delete(goalsTable).where(and(eq(goalsTable.id, id), eq(goalsTable.userId, userId)));
  res.status(204).send();
});

export default router;
