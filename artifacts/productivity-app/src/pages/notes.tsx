import { useState } from "react";
import { Layout } from "@/components/layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit2, X } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "@/components/ui/textarea";

interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const noteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
});

async function fetchNotes(): Promise<Note[]> {
  const r = await fetch("/api/notes");
  if (!r.ok) throw new Error("Failed to fetch notes");
  return r.json();
}

async function createNote(data: z.infer<typeof noteSchema>): Promise<Note> {
  const r = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!r.ok) throw new Error("Failed to create note");
  return r.json();
}

async function updateNote(id: number, data: z.infer<typeof noteSchema>): Promise<Note> {
  const r = await fetch(`/api/notes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!r.ok) throw new Error("Failed to update note");
  return r.json();
}

async function deleteNote(id: number): Promise<void> {
  await fetch(`/api/notes/${id}`, { method: "DELETE" });
}

export default function Notes() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["/api/notes"],
    queryFn: fetchNotes,
  });

  const createMutation = useMutation({
    mutationFn: createNote,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/notes"] }); setIsOpen(false); form.reset(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: z.infer<typeof noteSchema> }) => updateNote(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/notes"] }); setEditingId(null); form.reset(); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notes"] }),
  });

  const form = useForm<z.infer<typeof noteSchema>>({
    resolver: zodResolver(noteSchema),
    defaultValues: { title: "", content: "" },
  });

  const handleEditNote = (note: Note) => {
    setEditingId(note.id);
    form.reset({ title: note.title, content: note.content });
  };

  const handleSave = (data: z.infer<typeof noteSchema>) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col h-full pb-20">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Notes</h1>
            <p className="text-muted-foreground mt-1">Keep your thoughts and ideas organized.</p>
          </div>
          <Dialog open={editingId === null && isOpen} onOpenChange={(open) => { if (!open) form.reset(); setIsOpen(open); }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
                <Plus className="w-4 h-4 mr-2" />New Note
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border/50 shadow-2xl max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Note</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl><Input className="bg-background text-base" placeholder="Note title…" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="content" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl><Textarea className="bg-background text-base min-h-[200px]" placeholder="Write your note here…" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => { form.reset(); setIsOpen(false); }}>Cancel</Button>
                    <Button type="submit" className="bg-primary" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Saving…" : "Save Note"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        {editingId !== null && (
          <Dialog open={editingId !== null} onOpenChange={(open) => { if (!open) { setEditingId(null); form.reset(); } }}>
            <DialogContent className="bg-card border-border/50 shadow-2xl max-w-2xl">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>Edit Note</DialogTitle>
                  <button onClick={() => { setEditingId(null); form.reset(); }} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl><Input className="bg-background text-base" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="content" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl><Textarea className="bg-background text-base min-h-[200px]" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => { setEditingId(null); form.reset(); }}>Cancel</Button>
                    <Button type="submit" className="bg-primary" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? "Saving…" : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}

        {/* Notes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            [1, 2, 3].map(i => <Card key={i} className="h-48 bg-card border-border/50 animate-pulse" />)
          ) : notes.length === 0 ? (
            <div className="col-span-full py-16 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-secondary/50 mb-3">
                <Plus className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground font-medium">No notes yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Create your first note to get started.</p>
            </div>
          ) : (
            [...notes].reverse().map(note => (
              <Card key={note.id} className="bg-card border-border/50 shadow-md hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer group">
                <CardContent className="p-5 h-full flex flex-col">
                  <h3 className="font-semibold text-base text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">{note.title}</h3>
                  <p className="text-sm text-muted-foreground flex-1 line-clamp-4 mb-4">{note.content}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground/70 pt-3 border-t border-border/30">
                    <span>{format(new Date(note.updatedAt), 'MMM dd, yyyy')}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-all" onClick={() => handleEditNote(note)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all" onClick={() => deleteMutation.mutate(note.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
