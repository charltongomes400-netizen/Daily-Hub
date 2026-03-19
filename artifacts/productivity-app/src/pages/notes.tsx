import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Edit2, X, Pin, PinOff, Archive, ArchiveRestore, Search, Palette } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

/* ─── Types ──────────────────────────────────────────────────────── */
interface Note {
  id: number;
  title: string;
  content: string;
  color: string;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

type NoteColor = "default"|"red"|"pink"|"orange"|"yellow"|"teal"|"blue"|"sage"|"grape"|"graphite";

/* ─── Color palette ──────────────────────────────────────────────── */
const COLORS: { id: NoteColor; label: string; bg: string; border: string; dot: string }[] = [
  { id: "default",  label: "Default",  bg: "bg-card",              border: "border-border/50",        dot: "#3f3f46" },
  { id: "red",      label: "Red",      bg: "bg-red-950/50",        border: "border-red-800/40",       dot: "#ef4444" },
  { id: "pink",     label: "Pink",     bg: "bg-pink-950/50",       border: "border-pink-800/40",      dot: "#ec4899" },
  { id: "orange",   label: "Orange",   bg: "bg-orange-950/50",     border: "border-orange-800/40",    dot: "#f97316" },
  { id: "yellow",   label: "Yellow",   bg: "bg-yellow-950/50",     border: "border-yellow-800/40",    dot: "#eab308" },
  { id: "teal",     label: "Teal",     bg: "bg-teal-950/50",       border: "border-teal-800/40",      dot: "#14b8a6" },
  { id: "blue",     label: "Blue",     bg: "bg-blue-950/50",       border: "border-blue-800/40",      dot: "#3b82f6" },
  { id: "sage",     label: "Sage",     bg: "bg-green-950/50",      border: "border-green-800/40",     dot: "#22c55e" },
  { id: "grape",    label: "Grape",    bg: "bg-violet-950/50",     border: "border-violet-800/40",    dot: "#8b5cf6" },
  { id: "graphite", label: "Graphite", bg: "bg-zinc-800/70",       border: "border-zinc-600/50",      dot: "#71717a" },
];

function getColorClasses(color: string) {
  return COLORS.find(c => c.id === color) ?? COLORS[0];
}

/* ─── API helpers ────────────────────────────────────────────────── */
async function fetchNotes(): Promise<Note[]> {
  const r = await fetch("/api/notes"); if (!r.ok) throw new Error(); return r.json();
}
async function fetchArchived(): Promise<Note[]> {
  const r = await fetch("/api/notes/archived"); if (!r.ok) throw new Error(); return r.json();
}
async function createNote(data: Partial<Note>): Promise<Note> {
  const r = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!r.ok) throw new Error(); return r.json();
}
async function patchNote(id: number, data: Partial<Note>): Promise<Note> {
  const r = await fetch(`/api/notes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!r.ok) throw new Error(); return r.json();
}
async function deleteNote(id: number): Promise<void> {
  await fetch(`/api/notes/${id}`, { method: "DELETE" });
}

/* ─── Color picker popover ───────────────────────────────────────── */
function ColorPicker({ current, onChange }: { current: string; onChange: (c: NoteColor) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
        title="Change color"
      >
        <Palette className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 bg-popover border border-border/50 rounded-xl shadow-2xl p-2 flex gap-1.5 flex-wrap w-52">
          {COLORS.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(c.id); setOpen(false); }}
              className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${current === c.id ? "border-white scale-110" : "border-transparent"}`}
              style={{ backgroundColor: c.dot }}
              title={c.label}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Inline create card ──────────────────────────────────────────── */
function InlineCreate({ onSave }: { onSave: (data: Partial<Note>) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle]     = useState("");
  const [content, setContent] = useState("");
  const [color, setColor]     = useState<NoteColor>("default");
  const ref = useRef<HTMLDivElement>(null);

  const col = getColorClasses(color);

  function save() {
    if (!content.trim()) { setExpanded(false); setTitle(""); setContent(""); setColor("default"); return; }
    onSave({ title: title.trim(), content: content.trim(), color, isPinned: false });
    setExpanded(false); setTitle(""); setContent(""); setColor("default");
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) save();
    }
    if (expanded) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expanded, title, content, color]);

  return (
    <div
      ref={ref}
      className={`rounded-2xl border shadow-lg transition-all duration-200 max-w-xl mx-auto mb-8 overflow-hidden ${col.bg} ${col.border}`}
    >
      {expanded ? (
        <div>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full bg-transparent px-4 pt-4 pb-1 text-sm font-semibold text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          />
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save(); }}
            placeholder="Take a note…"
            rows={4}
            className="w-full bg-transparent px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none resize-none"
          />
          <div className="flex items-center justify-between px-3 pb-3">
            <ColorPicker current={color} onChange={setColor} />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground/50">⌘↵ to save</span>
              <button
                type="button"
                onClick={save}
                className="text-xs font-semibold text-foreground hover:text-amber-400 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full px-4 py-3.5 text-left text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          Take a note…
        </button>
      )}
    </div>
  );
}

/* ─── Note card ──────────────────────────────────────────────────── */
function NoteCard({ note, onUpdate, onDelete }: {
  note: Note;
  onUpdate: (id: number, data: Partial<Note>) => void;
  onDelete: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const col = getColorClasses(note.color);
  const form = useForm<{ title: string; content: string }>({
    defaultValues: { title: note.title, content: note.content },
  });

  function openEdit(e: React.MouseEvent) {
    e.stopPropagation();
    form.reset({ title: note.title, content: note.content });
    setEditing(true);
  }

  return (
    <>
      <div
        onClick={openEdit}
        className={`group relative rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer hover:-translate-y-0.5 break-inside-avoid mb-4 ${col.bg} ${col.border}`}
      >
        {/* Pin indicator */}
        {note.isPinned && (
          <div className="absolute top-2.5 right-2.5">
            <Pin className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          </div>
        )}

        <div className="p-4">
          {note.title && (
            <h3 className="font-semibold text-sm text-foreground mb-2 leading-snug pr-5">{note.title}</h3>
          )}
          <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-[12]">{note.content}</p>
        </div>

        {/* Hover action bar */}
        <div className="flex items-center justify-between px-3 pb-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-0.5">
            <ColorPicker current={note.color} onChange={(c) => { onUpdate(note.id, { color: c }); }} />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onUpdate(note.id, { isPinned: !note.isPinned }); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-400 hover:bg-white/10 transition-colors"
              title={note.isPinned ? "Unpin" : "Pin note"}
            >
              {note.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onUpdate(note.id, { isArchived: !note.isArchived }); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-400 hover:bg-white/10 transition-colors"
              title={note.isArchived ? "Unarchive" : "Archive"}
            >
              {note.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={openEdit}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-white/10 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-4 pb-2 text-xs text-muted-foreground/40">
          {format(new Date(note.updatedAt), "MMM d, yyyy")}
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editing} onOpenChange={(o) => { if (!o) setEditing(false); }}>
        <DialogContent
          className={`border shadow-2xl max-w-xl ${col.bg} ${col.border}`}
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-semibold">Edit Note</DialogTitle>
              <div className="flex items-center gap-1">
                <ColorPicker
                  current={note.color}
                  onChange={(c) => onUpdate(note.id, { color: c })}
                />
                <button
                  type="button"
                  onClick={() => { onUpdate(note.id, { isPinned: !note.isPinned }); }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-400 hover:bg-white/10 transition-colors"
                  title={note.isPinned ? "Unpin" : "Pin"}
                >
                  {note.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(data => {
                onUpdate(note.id, data);
                setEditing(false);
              })}
              className="space-y-3 mt-1"
            >
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <input
                      placeholder="Title"
                      className="w-full bg-transparent text-base font-semibold text-foreground placeholder:text-muted-foreground/40 focus:outline-none border-none p-0"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="content" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <textarea
                      rows={8}
                      placeholder="Note content…"
                      className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none resize-none border-none p-0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex items-center justify-between pt-2 border-t border-border/20">
                <button
                  type="button"
                  onClick={() => { onUpdate(note.id, { isArchived: !note.isArchived }); setEditing(false); }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {note.isArchived ? <><ArchiveRestore className="w-3.5 h-3.5" />Unarchive</> : <><Archive className="w-3.5 h-3.5" />Archive</>}
                </button>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">Save</Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Section label ──────────────────────────────────────────────── */
function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest mb-3 px-1">{label}</p>
  );
}

/* ─── Main page ──────────────────────────────────────────────────── */
export default function Notes() {
  const queryClient = useQueryClient();
  const [query, setQuery]         = useState("");
  const [showArchive, setShowArchive] = useState(false);

  const { data: notes = [],    isLoading: loadNotes    } = useQuery({ queryKey: ["/api/notes"],          queryFn: fetchNotes    });
  const { data: archived = [], isLoading: loadArchived } = useQuery({ queryKey: ["/api/notes/archived"], queryFn: fetchArchived });

  const createMutation = useMutation({
    mutationFn: createNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notes"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Note> }) => patchNote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes/archived"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes/archived"] });
    },
  });

  const active = showArchive ? archived : notes;
  const filtered = query.trim()
    ? active.filter(n =>
        n.title.toLowerCase().includes(query.toLowerCase()) ||
        n.content.toLowerCase().includes(query.toLowerCase())
      )
    : active;

  const pinned  = filtered.filter(n => n.isPinned);
  const others  = filtered.filter(n => !n.isPinned);

  const isLoading = showArchive ? loadArchived : loadNotes;

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto flex flex-col h-full pb-20">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Notes</h1>
            <p className="text-muted-foreground mt-1">{showArchive ? "Archived notes" : "Keep your thoughts and ideas organized."}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search notes…"
                className="pl-8 pr-3 py-2 text-sm bg-card border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 w-48"
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {/* Archive toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowArchive(s => !s); setQuery(""); }}
              className={`gap-2 ${showArchive ? "border-amber-500/50 text-amber-400" : ""}`}
            >
              {showArchive ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
              {showArchive ? "Exit Archive" : "Archive"}
            </Button>
          </div>
        </div>

        {/* Inline create — only in main view */}
        {!showArchive && (
          <InlineCreate onSave={(data) => createMutation.mutate(data)} />
        )}

        {isLoading ? (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-36 rounded-2xl bg-card border border-border/50 animate-pulse mb-4 break-inside-avoid" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary/50 mb-4">
              {showArchive
                ? <Archive className="w-6 h-6 text-muted-foreground/40" />
                : <Search className="w-6 h-6 text-muted-foreground/40" />
              }
            </div>
            <p className="text-muted-foreground font-medium">
              {query ? "No notes match your search" : showArchive ? "No archived notes" : "No notes yet"}
            </p>
            {!query && !showArchive && (
              <p className="text-xs text-muted-foreground/50 mt-1">Click "Take a note…" above to get started.</p>
            )}
          </div>
        ) : (
          <>
            {/* Pinned */}
            {pinned.length > 0 && (
              <div className="mb-6">
                <SectionLabel label="Pinned" />
                <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
                  {pinned.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onUpdate={(id, data) => updateMutation.mutate({ id, data })}
                      onDelete={(id) => deleteMutation.mutate(id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other / all */}
            {others.length > 0 && (
              <div>
                {pinned.length > 0 && <SectionLabel label="Other" />}
                <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
                  {others.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onUpdate={(id, data) => updateMutation.mutate({ id, data })}
                      onDelete={(id) => deleteMutation.mutate(id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
