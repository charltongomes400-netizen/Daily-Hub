import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { expensesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, getUserId } from "../middleware/auth";

const router: IRouter = Router();

router.use(requireAuth);

const CreateExpenseBody = z.object({
  title: z.string().min(1),
  amount: z.coerce.number().positive(),
  type: z.enum(["expense", "income"]).default("expense"),
  category: z.string().min(1),
  date: z.string().min(1),
  notes: z.string().nullable().optional(),
});

const IdParam = z.object({ id: z.coerce.number().int().positive() });

function serializeExpense(e: typeof expensesTable.$inferSelect) {
  return {
    ...e,
    amount: parseFloat(e.amount),
    date: e.date.toISOString(),
    createdAt: e.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const userId = getUserId(req);
  const expenses = await db
    .select()
    .from(expensesTable)
    .where(eq(expensesTable.userId, userId))
    .orderBy(expensesTable.date);
  res.json(expenses.map(serializeExpense));
});

router.post("/", async (req, res) => {
  const userId = getUserId(req);
  const body = CreateExpenseBody.parse(req.body);
  const [expense] = await db
    .insert(expensesTable)
    .values({
      userId,
      title: body.title,
      amount: String(body.amount),
      type: body.type,
      category: body.category,
      date: new Date(body.date),
      notes: body.notes ?? null,
    })
    .returning();
  res.status(201).json(serializeExpense(expense));
});

router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = IdParam.parse(req.params);
  await db.delete(expensesTable).where(and(eq(expensesTable.id, id), eq(expensesTable.userId, userId)));
  res.status(204).send();
});

export default router;
