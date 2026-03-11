import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { subscriptionsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import {
  CreateSubscriptionBody,
  UpdateSubscriptionBody,
  UpdateSubscriptionParams,
  DeleteSubscriptionParams,
} from "@workspace/api-zod";
import { requireAuth, getUserId } from "../middleware/auth";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const userId = getUserId(req);
  const subs = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .orderBy(subscriptionsTable.createdAt);
  res.json(
    subs.map((s) => ({
      ...s,
      amount: parseFloat(s.amount),
      nextBillingDate: s.nextBillingDate.toISOString(),
      createdAt: s.createdAt.toISOString(),
    }))
  );
});

router.post("/", async (req, res) => {
  const userId = getUserId(req);
  const body = CreateSubscriptionBody.parse(req.body);
  const [sub] = await db
    .insert(subscriptionsTable)
    .values({
      userId,
      name: body.name,
      amount: String(body.amount),
      billingCycle: body.billingCycle,
      category: body.category,
      nextBillingDate: new Date(body.nextBillingDate),
      isActive: true,
      notes: body.notes ?? null,
    })
    .returning();
  res.status(201).json({
    ...sub,
    amount: parseFloat(sub.amount),
    nextBillingDate: sub.nextBillingDate.toISOString(),
    createdAt: sub.createdAt.toISOString(),
  });
});

router.patch("/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = UpdateSubscriptionParams.parse(req.params);
  const body = UpdateSubscriptionBody.parse(req.body);

  const updateData: Partial<typeof subscriptionsTable.$inferInsert> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.amount !== undefined) updateData.amount = String(body.amount);
  if (body.billingCycle !== undefined) updateData.billingCycle = body.billingCycle;
  if (body.category !== undefined) updateData.category = body.category;
  if (body.nextBillingDate !== undefined) updateData.nextBillingDate = new Date(body.nextBillingDate);
  if (body.isActive !== undefined) updateData.isActive = body.isActive;
  if (body.notes !== undefined) updateData.notes = body.notes ?? null;

  const [sub] = await db
    .update(subscriptionsTable)
    .set(updateData)
    .where(and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.userId, userId)))
    .returning();

  if (!sub) {
    res.status(404).json({ error: "Subscription not found" });
    return;
  }

  res.json({
    ...sub,
    amount: parseFloat(sub.amount),
    nextBillingDate: sub.nextBillingDate.toISOString(),
    createdAt: sub.createdAt.toISOString(),
  });
});

router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = DeleteSubscriptionParams.parse(req.params);
  await db
    .delete(subscriptionsTable)
    .where(and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.userId, userId)));
  res.status(204).send();
});

export default router;
