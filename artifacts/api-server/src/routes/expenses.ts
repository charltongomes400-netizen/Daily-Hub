import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { expensesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const CreateExpenseBodyFixed = z.object({
  title: z.string().min(1),
  amount: z.coerce.number().positive(),
  type: z.enum(["expense", "income"]).default("expense"),
  category: z.string().min(1),
  date: z.string().min(1),
  notes: z.string().optional(),
});

const DeleteExpenseParamsFixed = z.object({
  id: z.coerce.number().int().positive(),
});

function serializeExpense(e: typeof expensesTable.$inferSelect) {
  return {
    ...e,
    amount: parseFloat(e.amount),
    date: e.date.toISOString(),
    createdAt: e.createdAt.toISOString(),
  };
}

router.get("/", async (_req, res) => {
  const expenses = await db.select().from(expensesTable).orderBy(expensesTable.date);
  res.json(expenses.map(serializeExpense));
});

router.post("/", async (req, res) => {
  const body = CreateExpenseBodyFixed.parse(req.body);
  const [expense] = await db
    .insert(expensesTable)
    .values({
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
  const { id } = DeleteExpenseParamsFixed.parse(req.params);
  await db.delete(expensesTable).where(eq(expensesTable.id, id));
  res.status(204).send();
});

export default router;
