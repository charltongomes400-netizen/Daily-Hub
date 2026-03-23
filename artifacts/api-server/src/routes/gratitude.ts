import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { gratitudeEntriesTable } from "@workspace/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, getUserId } from "../middleware/auth";

const router: IRouter = Router();
router.use(requireAuth);

const CreateBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((val) => {
    const d = new Date(val + "T00:00:00");
    return !isNaN(d.getTime()) && val === d.toISOString().slice(0, 10);
  }, "Invalid calendar date"),
  content: z.string().min(1).max(140),
});

const UpdateBody = z.object({
  content: z.string().min(1).max(140),
});

const IdParam = z.object({ id: z.coerce.number().int().positive() });

function serialize(e: typeof gratitudeEntriesTable.$inferSelect) {
  return {
    ...e,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const userId = getUserId(req);
  const month = parseInt(req.query.month as string);
  const year = parseInt(req.query.year as string);

  if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
    res.status(400).json({ error: "month (1-12) and year query params required" });
    return;
  }

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const entries = await db
    .select()
    .from(gratitudeEntriesTable)
    .where(
      and(
        eq(gratitudeEntriesTable.userId, userId),
        gte(gratitudeEntriesTable.date, startDate),
        lte(gratitudeEntriesTable.date, endDate)
      )
    )
    .orderBy(desc(gratitudeEntriesTable.date));

  res.json(entries.map(serialize));
});

router.post("/", async (req, res) => {
  const userId = getUserId(req);
  const body = CreateBody.parse(req.body);

  const entryDate = new Date(body.date + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (entryDate > today) {
    res.status(400).json({ error: "Cannot add entries for future dates" });
    return;
  }

  const existing = await db
    .select()
    .from(gratitudeEntriesTable)
    .where(
      and(
        eq(gratitudeEntriesTable.userId, userId),
        eq(gratitudeEntriesTable.date, body.date)
      )
    );

  if (existing.length > 0) {
    res.status(409).json({ error: "Entry already exists for this date" });
    return;
  }

  const [entry] = await db
    .insert(gratitudeEntriesTable)
    .values({ userId, date: body.date, content: body.content })
    .returning();

  res.status(201).json(serialize(entry));
});

router.patch("/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = IdParam.parse(req.params);
  const body = UpdateBody.parse(req.body);

  const [entry] = await db
    .update(gratitudeEntriesTable)
    .set({ content: body.content, updatedAt: new Date() })
    .where(and(eq(gratitudeEntriesTable.id, id), eq(gratitudeEntriesTable.userId, userId)))
    .returning();

  if (!entry) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serialize(entry));
});

router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = IdParam.parse(req.params);
  await db
    .delete(gratitudeEntriesTable)
    .where(and(eq(gratitudeEntriesTable.id, id), eq(gratitudeEntriesTable.userId, userId)));
  res.status(204).send();
});

export default router;
