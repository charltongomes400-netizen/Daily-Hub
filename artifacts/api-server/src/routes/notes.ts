import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { notesTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, getUserId } from "../middleware/auth";

const router: IRouter = Router();
router.use(requireAuth);

const NOTE_COLORS = ["default","red","pink","orange","yellow","teal","blue","sage","grape","graphite"] as const;

const CreateNoteBody = z.object({
  title: z.string().default(""),
  content: z.string().min(1),
  color: z.enum(NOTE_COLORS).default("default"),
  isPinned: z.boolean().default(false),
});

const UpdateNoteBody = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  color: z.enum(NOTE_COLORS).optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

const IdParam = z.object({ id: z.coerce.number().int().positive() });

function serializeNote(n: typeof notesTable.$inferSelect) {
  return {
    ...n,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const userId = getUserId(req);
  const notes = await db
    .select()
    .from(notesTable)
    .where(and(eq(notesTable.userId, userId), eq(notesTable.isArchived, false)))
    .orderBy(desc(notesTable.updatedAt));
  res.json(notes.map(serializeNote));
});

router.get("/archived", async (req, res) => {
  const userId = getUserId(req);
  const notes = await db
    .select()
    .from(notesTable)
    .where(and(eq(notesTable.userId, userId), eq(notesTable.isArchived, true)))
    .orderBy(desc(notesTable.updatedAt));
  res.json(notes.map(serializeNote));
});

router.post("/", async (req, res) => {
  const userId = getUserId(req);
  const body = CreateNoteBody.parse(req.body);
  const [note] = await db
    .insert(notesTable)
    .values({ userId, ...body })
    .returning();
  res.status(201).json(serializeNote(note));
});

router.patch("/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = IdParam.parse(req.params);
  const body = UpdateNoteBody.parse(req.body);
  const updates: Partial<typeof notesTable.$inferInsert> = {
    ...body,
    updatedAt: new Date(),
  };
  const [note] = await db
    .update(notesTable)
    .set(updates)
    .where(and(eq(notesTable.id, id), eq(notesTable.userId, userId)))
    .returning();
  if (!note) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializeNote(note));
});

router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = IdParam.parse(req.params);
  await db.delete(notesTable).where(and(eq(notesTable.id, id), eq(notesTable.userId, userId)));
  res.status(204).send();
});

export default router;
