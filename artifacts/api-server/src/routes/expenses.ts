import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { expensesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { CreateExpenseBody, DeleteExpenseParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const expenses = await db.select().from(expensesTable).orderBy(expensesTable.date);
  res.json(
    expenses.map((e) => ({
      ...e,
      amount: parseFloat(e.amount),
      date: e.date.toISOString(),
      createdAt: e.createdAt.toISOString(),
    }))
  );
});

router.post("/", async (req, res) => {
  const body = CreateExpenseBody.parse(req.body);
  const [expense] = await db
    .insert(expensesTable)
    .values({
      title: body.title,
      amount: String(body.amount),
      category: body.category,
      date: new Date(body.date),
      notes: body.notes ?? null,
    })
    .returning();
  res.status(201).json({
    ...expense,
    amount: parseFloat(expense.amount),
    date: expense.date.toISOString(),
    createdAt: expense.createdAt.toISOString(),
  });
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteExpenseParams.parse(req.params);
  await db.delete(expensesTable).where(eq(expensesTable.id, id));
  res.status(204).send();
});

export default router;
