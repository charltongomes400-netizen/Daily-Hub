import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const DEFAULT_CATEGORIES = [
  { name: "Streaming", color: "purple", icon: "tv-2",      isDefault: true },
  { name: "Life / IRL", color: "emerald", icon: "home",    isDefault: true },
  { name: "Work",       color: "blue",    icon: "briefcase", isDefault: true },
  { name: "Tech / PC",  color: "amber",   icon: "monitor",   isDefault: true },
];

async function seedDefaults() {
  const existing = await db.select().from(categoriesTable);
  if (existing.length === 0) {
    await db.insert(categoriesTable).values(DEFAULT_CATEGORIES);
  }
}

seedDefaults().catch(console.error);

router.get("/", async (_req, res) => {
  const cats = await db.select().from(categoriesTable).orderBy(categoriesTable.createdAt);
  res.json(cats.map(c => ({ ...c, createdAt: c.createdAt.toISOString() })));
});

router.post("/", async (req, res) => {
  const { name, color, icon } = req.body as { name: string; color: string; icon: string };
  if (!name?.trim() || !color || !icon) {
    res.status(400).json({ error: "name, color, and icon are required" });
    return;
  }
  const [cat] = await db
    .insert(categoriesTable)
    .values({ name: name.trim(), color, icon, isDefault: false })
    .returning();
  res.status(201).json({ ...cat, createdAt: cat.createdAt.toISOString() });
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id));
  if (!cat) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.status(204).send();
});

export default router;
