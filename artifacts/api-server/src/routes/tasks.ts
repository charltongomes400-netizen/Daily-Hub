import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { tasksTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import {
  CreateTaskBody,
  UpdateTaskBody,
  UpdateTaskParams,
  DeleteTaskParams,
} from "@workspace/api-zod";
import { requireAuth, getUserId } from "../middleware/auth";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const userId = getUserId(req);
  const tasks = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.userId, userId))
    .orderBy(tasksTable.createdAt);
  res.json(
    tasks.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      deadline: t.deadline ? t.deadline.toISOString() : null,
    }))
  );
});

router.post("/", async (req, res) => {
  const userId = getUserId(req);
  const body = CreateTaskBody.parse(req.body);
  const [task] = await db
    .insert(tasksTable)
    .values({
      userId,
      title: body.title,
      description: body.description ?? null,
      priority: body.priority,
      category: body.category,
      deadline: body.deadline ? new Date(body.deadline) : null,
      completed: false,
    })
    .returning();
  res.status(201).json({
    ...task,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    deadline: task.deadline ? task.deadline.toISOString() : null,
  });
});

router.patch("/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = UpdateTaskParams.parse(req.params);
  const body = UpdateTaskBody.parse(req.body);

  const updateData: Partial<typeof tasksTable.$inferInsert> & { updatedAt?: Date } = {
    updatedAt: new Date(),
  };
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description ?? null;
  if (body.completed !== undefined) updateData.completed = body.completed;
  if (body.priority !== undefined) updateData.priority = body.priority;
  if (body.category !== undefined) updateData.category = body.category;
  if (body.deadline !== undefined) updateData.deadline = body.deadline ? new Date(body.deadline) : null;

  const [task] = await db
    .update(tasksTable)
    .set(updateData)
    .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json({
    ...task,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    deadline: task.deadline ? task.deadline.toISOString() : null,
  });
});

router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = DeleteTaskParams.parse(req.params);
  await db.delete(tasksTable).where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)));
  res.status(204).send();
});

export default router;
