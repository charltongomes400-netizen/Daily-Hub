import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Layout } from "@/components/layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Trash2, Edit2, X, Pin, PinOff, Archive, ArchiveRestore, Search, Palette, Pencil,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote,
  Code, FileCode, Minus, Undo2, Redo2,
} from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";

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

interface EditorHandle {
  getHTML: () => string;
  isEmpty: () => boolean;
}

/* ─── Color palette ──────────────────────────────────────────────── */
const COLORS: { id: NoteColor; label: string; bg: string; border: string; dot: string }[] = [
  { id: "default",  label: "Default",  bg: "bg-card",          border: "border-border/50",     dot: "#3f3f46" },
  { id: "red",      label: "Red",      bg: "bg-red-950/50",    border: "border-red-800/40",    dot: "#ef4444" },
  { id: "pink",     label: "Pink",     bg: "bg-pink-950/50",   border: "border-pink-800/40",   dot: "#ec4899" },
  { id: "orange",   label: "Orange",   bg: "bg-orange-950/50", border: "border-orange-800/40", dot: "#f97316" },
  { id: "yellow",   label: "Yellow",   bg: "bg-yellow-950/50", border: "border-yellow-800/40", dot: "#eab308" },
  { id: "teal",     label: "Teal",     bg: "bg-teal-950/50",   border: "border-teal-800/40",   dot: "#14b8a6" },
  { id: "blue",     label: "Blue",     bg: "bg-blue-950/50",   border: "border-blue-800/40",   dot: "#3b82f6" },
  { id: "sage",     label: "Sage",     bg: "bg-green-950/50",  border: "border-green-800/40",  dot: "#22c55e" },
  { id: "grape",    label: "Grape",    bg: "bg-violet-950/50", border: "border-violet-800/40", dot: "#8b5cf6" },
  { id: "graphite", label: "Graphite", bg: "bg-zinc-800/70",   border: "border-zinc-600/50",   dot: "#71717a" },
];
function getColor(color: string) { return COLORS.find(c => c.id === color) ?? COLORS[0]; }

/* ─── Legacy plain-text → HTML ───────────────────────────────────── */
function toHtml(content: string): string {
  if (!content) return "<p></p>";
  if (content.trim().startsWith("<")) return content;
  return content.split("\n").map(l => `<p>${l || "<br>"}</p>`).join("");
}

/* ─── API ────────────────────────────────────────────────────────── */
async function fetchNotes(): Promise<Note[]> {
  const r = await fetch("/api/notes"); if (!r.ok) throw new Error(); return r.json();
}
async function fetchArchived(): Promise<Note[]> {
  const r = await fetch("/api/notes/archived"); if (!r.ok) throw new Error(); return r.json();
}
async function apiCreate(data: Partial<Note>): Promise<Note> {
  const r = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!r.ok) throw new Error(); return r.json();
}
async function apiPatch(id: number, data: Partial<Note>): Promise<Note> {
  const r = await fetch(`/api/notes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!r.ok) throw new Error(); return r.json();
}
async function apiDelete(id: number): Promise<void> { await fetch(`/api/notes/${id}`, { method: "DELETE" }); }

/* ─── Toolbar button ─────────────────────────────────────────────── */
function TB({ active, title, onMouseDown, children }: {
  active?: boolean; title: string;
  onMouseDown: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onMouseDown={onMouseDown} title={title}
      className={`p-1.5 rounded-md transition-colors text-sm
        ${active ? "bg-amber-500/20 text-amber-400" : "text-muted-foreground hover:text-foreground hover:bg-white/10"}`}>
      {children}
    </button>
  );
}
function Divider() { return <div className="w-px h-5 bg-border/40 mx-0.5 self-center" />; }

/* ─── Toolbar ────────────────────────────────────────────────────── */
function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;
  const cmd = (fn: () => void) => (e: React.MouseEvent) => { e.preventDefault(); fn(); };
  return (
    <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b border-border/30 bg-black/10 rounded-t-xl">
      <TB title="Undo" onMouseDown={cmd(() => editor.chain().focus().undo().run())}><Undo2 className="w-3.5 h-3.5" /></TB>
      <TB title="Redo" onMouseDown={cmd(() => editor.chain().focus().redo().run())}><Redo2 className="w-3.5 h-3.5" /></TB>
      <Divider />
      <TB active={editor.isActive("heading",{level:1})} title="Heading 1" onMouseDown={cmd(() => editor.chain().focus().toggleHeading({level:1}).run())}><Heading1 className="w-3.5 h-3.5" /></TB>
      <TB active={editor.isActive("heading",{level:2})} title="Heading 2" onMouseDown={cmd(() => editor.chain().focus().toggleHeading({level:2}).run())}><Heading2 className="w-3.5 h-3.5" /></TB>
      <TB active={editor.isActive("heading",{level:3})} title="Heading 3" onMouseDown={cmd(() => editor.chain().focus().toggleHeading({level:3}).run())}><Heading3 className="w-3.5 h-3.5" /></TB>
      <Divider />
      <TB active={editor.isActive("bold")}      title="Bold (⌘B)"      onMouseDown={cmd(() => editor.chain().focus().toggleBold().run())}><Bold className="w-3.5 h-3.5" /></TB>
      <TB active={editor.isActive("italic")}    title="Italic (⌘I)"    onMouseDown={cmd(() => editor.chain().focus().toggleItalic().run())}><Italic className="w-3.5 h-3.5" /></TB>
      <TB active={editor.isActive("underline")} title="Underline (⌘U)" onMouseDown={cmd(() => editor.chain().focus().toggleUnderline().run())}><UnderlineIcon className="w-3.5 h-3.5" /></TB>
      <TB active={editor.isActive("strike")}    title="Strikethrough"  onMouseDown={cmd(() => editor.chain().focus().toggleStrike().run())}><Strikethrough className="w-3.5 h-3.5" /></TB>
      <Divider />
      <TB active={editor.isActive("bulletList")}  title="Bullet list"   onMouseDown={cmd(() => editor.chain().focus().toggleBulletList().run())}><List className="w-3.5 h-3.5" /></TB>
      <TB active={editor.isActive("orderedList")} title="Numbered list" onMouseDown={cmd(() => editor.chain().focus().toggleOrderedList().run())}><ListOrdered className="w-3.5 h-3.5" /></TB>
      <Divider />
      <TB active={editor.isActive("blockquote")} title="Blockquote"  onMouseDown={cmd(() => editor.chain().focus().toggleBlockquote().run())}><Quote className="w-3.5 h-3.5" /></TB>
      <TB active={editor.isActive("code")}       title="Inline code" onMouseDown={cmd(() => editor.chain().focus().toggleCode().run())}><Code className="w-3.5 h-3.5" /></TB>
      <TB active={editor.isActive("codeBlock")}  title="Code block"  onMouseDown={cmd(() => editor.chain().focus().toggleCodeBlock().run())}><FileCode className="w-3.5 h-3.5" /></TB>
      <TB title="Divider line" onMouseDown={cmd(() => editor.chain().focus().setHorizontalRule().run())}><Minus className="w-3.5 h-3.5" /></TB>
    </div>
  );
}

/* ─── Rich editor (imperative handle) ───────────────────────────── */
const RichEditorWithRef = forwardRef<EditorHandle, {
  initialContent?: string;
  placeholder?: string;
  minHeight?: string;
}>(function RichEditorWithRef({ initialContent, placeholder, minHeight = "120px" }, ref) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: placeholder ?? "Write something…" }),
    ],
    content: initialContent ? toHtml(initialContent) : "",
  });

  useEffect(() => {
    if (editor && initialContent !== undefined) {
      const html = toHtml(initialContent);
      if (editor.getHTML() !== html) editor.commands.setContent(html, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent]);

  useImperativeHandle(ref, () => ({
    getHTML: () => editor?.getHTML() ?? "",
    isEmpty: () => editor?.isEmpty ?? true,
  }), [editor]);

  return (
    <div className="rounded-xl border border-border/30 overflow-hidden">
      <Toolbar editor={editor} />
      <div className="px-3 py-2 overflow-y-auto" style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});

/* ─── Color picker popover ───────────────────────────────────────── */
function ColorPicker({ current, onChange }: { current: string; onChange: (c: NoteColor) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }} title="Change color"
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors">
        <Palette className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 bg-popover border border-border/50 rounded-xl shadow-2xl p-2 flex gap-1.5 flex-wrap w-52">
          {COLORS.map(c => (
            <button key={c.id} type="button" onClick={(e) => { e.stopPropagation(); onChange(c.id); setOpen(false); }}
              className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${current === c.id ? "border-white scale-110" : "border-transparent"}`}
              style={{ backgroundColor: c.dot }} title={c.label} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Inline create ──────────────────────────────────────────────── */
function InlineCreate({ onSave }: { onSave: (data: Partial<Note>) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState<NoteColor>("default");
  const editorRef = useRef<EditorHandle>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const col = getColor(color);

  const save = useCallback(() => {
    const html  = editorRef.current?.getHTML() ?? "";
    const empty = editorRef.current?.isEmpty() ?? true;
    if (empty) { setExpanded(false); setTitle(""); setColor("default"); return; }
    onSave({ title: title.trim(), content: html, color, isPinned: false });
    setExpanded(false); setTitle(""); setColor("default");
  }, [title, color, onSave]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) save();
    }
    if (expanded) {
      const id = setTimeout(() => document.addEventListener("mousedown", handler), 150);
      return () => { clearTimeout(id); document.removeEventListener("mousedown", handler); };
    }
  }, [expanded, save]);

  return (
    <div ref={wrapperRef} className={`rounded-2xl border shadow-lg transition-all duration-200 mb-8 overflow-hidden ${col.bg} ${col.border}`}>
      {expanded ? (
        <div>
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" maxLength={150}
            className="w-full bg-transparent px-4 pt-3 pb-1 text-sm font-semibold text-foreground placeholder:text-muted-foreground/40 focus:outline-none" />
          <div className="px-3 pb-2">
            <RichEditorWithRef ref={editorRef} placeholder="Take a note…" minHeight="100px" />
          </div>
          <div className="flex items-center justify-between px-3 pb-3 mt-1">
            <ColorPicker current={color} onChange={setColor} />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground/40">⌘↵ saves</span>
              <button type="button" onClick={save}
                className="text-xs font-semibold text-foreground hover:text-amber-400 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setExpanded(true)}
          className="w-full flex items-center gap-3 px-5 py-4 text-left group transition-all hover:bg-amber-500/5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0 group-hover:bg-amber-500/25 group-hover:border-amber-500/40 transition-all">
            <Pencil className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="text-sm font-medium text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">Take a note…</span>
          <span className="ml-auto text-xs text-muted-foreground/30 group-hover:text-muted-foreground/50 transition-colors hidden sm:block">Click to start writing</span>
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
  const [editTitle, setEditTitle] = useState(note.title);
  const editorRef = useRef<EditorHandle>(null);
  const col = getColor(note.color);

  function openEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setEditTitle(note.title);
    setEditing(true);
  }

  function saveEdit() {
    const html = editorRef.current?.getHTML() ?? note.content;
    onUpdate(note.id, { title: editTitle.trim(), content: html });
    setEditing(false);
  }

  return (
    <>
      <div onClick={openEdit}
        className={`group relative rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer hover:-translate-y-0.5 break-inside-avoid mb-4 ${col.bg} ${col.border}`}>
        {note.isPinned && (
          <div className="absolute top-2.5 right-2.5">
            <Pin className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          </div>
        )}
        <div className="p-4">
          {note.title && <h3 className="font-semibold text-sm text-foreground mb-2 leading-snug pr-5">{note.title}</h3>}
          <div className="note-html-preview text-xs text-muted-foreground overflow-hidden max-h-52 [&>*:first-child]:mt-0"
            dangerouslySetInnerHTML={{ __html: toHtml(note.content) }} />
        </div>
        <div className="flex items-center justify-between px-3 pb-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-0.5">
            <ColorPicker current={note.color} onChange={(c) => { onUpdate(note.id, { color: c }); }} />
            <button type="button" onClick={(e) => { e.stopPropagation(); onUpdate(note.id, { isPinned: !note.isPinned }); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-400 hover:bg-white/10 transition-colors"
              title={note.isPinned ? "Unpin" : "Pin"}>
              {note.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onUpdate(note.id, { isArchived: !note.isArchived }); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-400 hover:bg-white/10 transition-colors"
              title={note.isArchived ? "Unarchive" : "Archive"}>
              {note.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center gap-0.5">
            <button type="button" onClick={openEdit}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors" title="Edit">
              <Edit2 className="w-4 h-4" />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-white/10 transition-colors" title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="px-4 pb-2 text-xs text-muted-foreground/40">
          {format(new Date(note.updatedAt), "MMM d, yyyy")}
        </div>
      </div>

      <Dialog open={editing} onOpenChange={(o) => { if (!o) setEditing(false); }}>
        <DialogContent className={`border shadow-2xl max-w-2xl max-h-[85vh] flex flex-col ${col.bg} ${col.border}`}>
          <DialogHeader>
            <div className="flex items-center justify-between mb-2">
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Title" maxLength={150}
                className="bg-transparent text-base font-semibold text-foreground placeholder:text-muted-foreground/40 focus:outline-none flex-1 mr-3" />
              <div className="flex items-center gap-1 shrink-0">
                <ColorPicker current={note.color} onChange={(c) => onUpdate(note.id, { color: c })} />
                <button type="button" onClick={() => onUpdate(note.id, { isPinned: !note.isPinned })}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-400 hover:bg-white/10 transition-colors"
                  title={note.isPinned ? "Unpin" : "Pin"}>
                  {note.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            <RichEditorWithRef ref={editorRef} initialContent={note.content} placeholder="Note content…" minHeight="200px" />
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-border/20 shrink-0">
            <button type="button" onClick={() => { onUpdate(note.id, { isArchived: !note.isArchived }); setEditing(false); }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              {note.isArchived
                ? <><ArchiveRestore className="w-3.5 h-3.5" />Unarchive</>
                : <><Archive className="w-3.5 h-3.5" />Archive</>}
            </button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="button" size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold" onClick={saveEdit}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Section label ──────────────────────────────────────────────── */
function SectionLabel({ label }: { label: string }) {
  return <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest mb-3 px-1">{label}</p>;
}

/* ─── Main page ──────────────────────────────────────────────────── */
export default function Notes() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [showArchive, setShowArchive] = useState(false);

  const { data: notes = [],    isLoading: loadNotes    } = useQuery({ queryKey: ["/api/notes"],          queryFn: fetchNotes    });
  const { data: archived = [], isLoading: loadArchived } = useQuery({ queryKey: ["/api/notes/archived"], queryFn: fetchArchived });

  const createMutation = useMutation({
    mutationFn: apiCreate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notes"] }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Note> }) => apiPatch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes/archived"] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: apiDelete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes/archived"] });
    },
  });

  const active   = showArchive ? archived : notes;
  const filtered = query.trim()
    ? active.filter(n => n.title.toLowerCase().includes(query.toLowerCase()) || n.content.toLowerCase().includes(query.toLowerCase()))
    : active;
  const pinned    = filtered.filter(n => n.isPinned);
  const others    = filtered.filter(n => !n.isPinned);
  const isLoading = showArchive ? loadArchived : loadNotes;

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto flex flex-col h-full pb-20">
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Notes</h1>
            <p className="text-muted-foreground mt-1">{showArchive ? "Archived notes" : "Keep your thoughts and ideas organized."}</p>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search notes…"
                className="w-full pl-8 pr-3 py-2 text-sm bg-card border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => { setShowArchive(s => !s); setQuery(""); }}
              className={`gap-2 shrink-0 ${showArchive ? "border-amber-500/50 text-amber-400" : ""}`}>
              {showArchive ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
              {showArchive ? "Exit Archive" : "Archive"}
            </Button>
          </div>
        </div>

        {!showArchive && <InlineCreate onSave={(data) => createMutation.mutate(data)} />}

        {isLoading ? (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-36 rounded-2xl bg-card border border-border/50 animate-pulse mb-4 break-inside-avoid" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary/50 mb-4">
              {showArchive ? <Archive className="w-6 h-6 text-muted-foreground/40" /> : <Search className="w-6 h-6 text-muted-foreground/40" />}
            </div>
            <p className="text-muted-foreground font-medium">
              {query ? "No notes match your search" : showArchive ? "No archived notes" : "No notes yet"}
            </p>
            {!query && !showArchive && <p className="text-xs text-muted-foreground/50 mt-1">Click "Take a note…" above to get started.</p>}
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <div className="mb-6">
                <SectionLabel label="Pinned" />
                <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
                  {pinned.map(note => (
                    <NoteCard key={note.id} note={note}
                      onUpdate={(id, data) => updateMutation.mutate({ id, data })}
                      onDelete={(id) => deleteMutation.mutate(id)} />
                  ))}
                </div>
              </div>
            )}
            {others.length > 0 && (
              <div>
                {pinned.length > 0 && <SectionLabel label="Other" />}
                <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
                  {others.map(note => (
                    <NoteCard key={note.id} note={note}
                      onUpdate={(id, data) => updateMutation.mutate({ id, data })}
                      onDelete={(id) => deleteMutation.mutate(id)} />
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
