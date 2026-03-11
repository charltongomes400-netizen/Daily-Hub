import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { categoriesTable, tasksTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, getUserId } from "../middleware/auth";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const userId = getUserId(req);
  const cats = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.userId, userId))
    .orderBy(categoriesTable.createdAt);
  res.json(cats.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })));
});

router.post("/", async (req, res) => {
  const userId = getUserId(req);
  const { name, color, icon } = req.body as { name: string; color: string; icon: string };
  if (!name?.trim() || !color || !icon) {
    res.status(400).json({ error: "name, color, and icon are required" });
    return;
  }
  const [cat] = await db
    .insert(categoriesTable)
    .values({ userId, name: name.trim(), color, icon, isDefault: false })
    .returning();
  res.status(201).json({ ...cat, createdAt: cat.createdAt.toISOString() });
});

router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);
  const id = Number(req.params.id);
  const [cat] = await db
    .select()
    .from(categoriesTable)
    .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)));
  if (!cat) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  await db
    .delete(tasksTable)
    .where(and(eq(tasksTable.category, cat.name), eq(tasksTable.userId, userId)));
  await db
    .delete(categoriesTable)
    .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)));
  res.status(204).send();
});

export default router;
