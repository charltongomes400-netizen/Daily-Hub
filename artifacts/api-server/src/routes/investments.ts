import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { investmentsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, getUserId } from "../middleware/auth";

const router: IRouter = Router();
router.use(requireAuth);

const CreateBody = z.object({
  name: z.string().min(1),
  type: z.enum(["stock", "crypto", "etf", "real_estate", "fund", "other"]).default("stock"),
  ticker: z.string().nullable().optional(),
  quantity: z.coerce.number().min(0).default(0),
  purchasePrice: z.coerce.number().min(0),
  currentPrice: z.coerce.number().min(0),
  notes: z.string().nullable().optional(),
});

const PatchBody = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["stock", "crypto", "etf", "real_estate", "fund", "other"]).optional(),
  ticker: z.string().nullable().optional(),
  quantity: z.coerce.number().min(0).optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  currentPrice: z.coerce.number().min(0).optional(),
  notes: z.string().nullable().optional(),
});

const IdParam = z.object({ id: z.coerce.number().int().positive() });

function serialize(i: typeof investmentsTable.$inferSelect) {
  return {
    ...i,
    quantity: parseFloat(i.quantity),
    purchasePrice: parseFloat(i.purchasePrice),
    currentPrice: parseFloat(i.currentPrice),
    createdAt: i.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const userId = getUserId(req);
  const rows = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, userId));
  res.json(rows.map(serialize));
});

router.post("/", async (req, res) => {
  const userId = getUserId(req);
  const body = CreateBody.parse(req.body);
  const [row] = await db.insert(investmentsTable).values({
    userId,
    name: body.name,
    type: body.type,
    ticker: body.ticker ?? null,
    quantity: String(body.quantity),
    purchasePrice: String(body.purchasePrice),
    currentPrice: String(body.currentPrice),
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
  if (body.type !== undefined) updates.type = body.type;
  if (body.ticker !== undefined) updates.ticker = body.ticker;
  if (body.quantity !== undefined) updates.quantity = String(body.quantity);
  if (body.purchasePrice !== undefined) updates.purchasePrice = String(body.purchasePrice);
  if (body.currentPrice !== undefined) updates.currentPrice = String(body.currentPrice);
  if (body.notes !== undefined) updates.notes = body.notes;
  const [row] = await db.update(investmentsTable).set(updates).where(and(eq(investmentsTable.id, id), eq(investmentsTable.userId, userId))).returning();
  res.json(serialize(row));
});

router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = IdParam.parse(req.params);
  await db.delete(investmentsTable).where(and(eq(investmentsTable.id, id), eq(investmentsTable.userId, userId)));
  res.status(204).send();
});

export default router;
