import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { notesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, getUserId } from "../middleware/auth";

const router: IRouter = Router();

router.use(requireAuth);

const CreateNoteBody = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

const UpdateNoteBody = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
});

const IdParam = z.object({ id: z.coerce.number().int().positive() });

router.get("/", async (req, res) => {
  const userId = getUserId(req);
  const notes = await db
    .select()
    .from(notesTable)
    .where(eq(notesTable.userId, userId))
    .orderBy(notesTable.createdAt);
  res.json(
    notes.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }))
  );
});

router.post("/", async (req, res) => {
  const userId = getUserId(req);
  const body = CreateNoteBody.parse(req.body);
  const [note] = await db
    .insert(notesTable)
    .values({ userId, ...body })
    .returning();
  res.status(201).json({
    ...note,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  });
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
  res.json({
    ...note,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  });
});

router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = IdParam.parse(req.params);
  await db.delete(notesTable).where(and(eq(notesTable.id, id), eq(notesTable.userId, userId)));
  res.status(204).send();
});

export default router;
