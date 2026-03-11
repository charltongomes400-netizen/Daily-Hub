import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { owedTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, getUserId } from "../middleware/auth";

const router: IRouter = Router();

router.use(requireAuth);

const CreateOwedBody = z.object({
  fromName: z.string().min(1),
  amount: z.coerce.number().positive(),
  description: z.string().min(1),
  dueDate: z.string().optional(),
  notes: z.string().nullable().optional(),
});

const UpdateOwedBody = z.object({
  status: z.enum(["pending", "received"]).optional(),
  fromName: z.string().min(1).optional(),
  amount: z.coerce.number().positive().optional(),
  description: z.string().min(1).optional(),
  dueDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const IdParam = z.object({ id: z.coerce.number().int().positive() });

function serialize(row: typeof owedTable.$inferSelect) {
  return {
    ...row,
    amount: parseFloat(row.amount),
    dueDate: row.dueDate ? row.dueDate.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const userId = getUserId(req);
  const rows = await db
    .select()
    .from(owedTable)
    .where(eq(owedTable.userId, userId))
    .orderBy(owedTable.createdAt);
  res.json(rows.map(serialize));
});

router.post("/", async (req, res) => {
  const userId = getUserId(req);
  const body = CreateOwedBody.parse(req.body);
  const [row] = await db
    .insert(owedTable)
    .values({
      userId,
      fromName: body.fromName,
      amount: String(body.amount),
      description: body.description,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      notes: body.notes ?? null,
    })
    .returning();
  res.status(201).json(serialize(row));
});

router.patch("/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = IdParam.parse(req.params);
  const body = UpdateOwedBody.parse(req.body);
  const updates: Partial<typeof owedTable.$inferInsert> = {};
  if (body.status !== undefined)      updates.status = body.status;
  if (body.fromName !== undefined)    updates.fromName = body.fromName;
  if (body.amount !== undefined)      updates.amount = String(body.amount);
  if (body.description !== undefined) updates.description = body.description;
  if (body.notes !== undefined)       updates.notes = body.notes;
  if (body.dueDate !== undefined)     updates.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  const [row] = await db
    .update(owedTable)
    .set(updates)
    .where(and(eq(owedTable.id, id), eq(owedTable.userId, userId)))
    .returning();
  res.json(serialize(row));
});

router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = IdParam.parse(req.params);
  await db.delete(owedTable).where(and(eq(owedTable.id, id), eq(owedTable.userId, userId)));
  res.status(204).send();
});

export default router;
