import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { savingsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, getUserId } from "../middleware/auth";

const router: IRouter = Router();
router.use(requireAuth);

const CreateBody = z.object({
  name: z.string().min(1),
  targetAmount: z.coerce.number().positive(),
  currentAmount: z.coerce.number().min(0).default(0),
  notes: z.string().nullable().optional(),
});

const PatchBody = z.object({
  name: z.string().min(1).optional(),
  targetAmount: z.coerce.number().positive().optional(),
  currentAmount: z.coerce.number().min(0).optional(),
  notes: z.string().nullable().optional(),
});

const IdParam = z.object({ id: z.coerce.number().int().positive() });

function serialize(s: typeof savingsTable.$inferSelect) {
  return {
    ...s,
    targetAmount: parseFloat(s.targetAmount),
    currentAmount: parseFloat(s.currentAmount),
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const userId = getUserId(req);
  const rows = await db.select().from(savingsTable).where(eq(savingsTable.userId, userId));
  res.json(rows.map(serialize));
});

router.post("/", async (req, res) => {
  const userId = getUserId(req);
  const body = CreateBody.parse(req.body);
  const [row] = await db.insert(savingsTable).values({
    userId,
    name: body.name,
    targetAmount: String(body.targetAmount),
    currentAmount: String(body.currentAmount),
    notes: body.notes ?? null,
  }).returning();
  res.status(201).json(serialize(row));
});

router.patch("/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = IdParam.parse(req.params);
  const body = PatchBody.parse(req.body);
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.targetAmount !== undefined) updates.targetAmount = String(body.targetAmount);
  if (body.currentAmount !== undefined) updates.currentAmount = String(body.currentAmount);
  if (body.notes !== undefined) updates.notes = body.notes;
  const [row] = await db.update(savingsTable).set(updates).where(and(eq(savingsTable.id, id), eq(savingsTable.userId, userId))).returning();
  res.json(serialize(row));
});

router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = IdParam.parse(req.params);
  await db.delete(savingsTable).where(and(eq(savingsTable.id, id), eq(savingsTable.userId, userId)));
  res.status(204).send();
});

export default router;
