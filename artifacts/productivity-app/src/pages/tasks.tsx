import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import {
  useGetTasks, useCreateTask, useUpdateTask, useDeleteTask,
  useGetCategories, useCreateCategory, useDeleteCategory,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Trash2, Calendar as CalendarIcon, CheckCircle2, Circle,
  Tv2, Home, Briefcase, Monitor, Tag, Music, BookOpen, Heart,
  Star, Zap, Coffee, Globe, LayoutGrid, Settings, GripVertical,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, isAfter, isBefore, addDays, startOfDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/* ─── Icon map ─────────────────────────────────────────────────────── */
const ICON_OPTIONS: { id: string; label: string; Icon: React.ElementType }[] = [
  { id: "tv-2",       label: "Streaming",  Icon: Tv2 },
  { id: "home",       label: "Home",       Icon: Home },
  { id: "briefcase",  label: "Work",       Icon: Briefcase },
  { id: "monitor",    label: "Tech",       Icon: Monitor },
  { id: "tag",        label: "General",    Icon: Tag },
  { id: "music",      label: "Music",      Icon: Music },
  { id: "book-open",  label: "Learning",   Icon: BookOpen },
  { id: "heart",      label: "Health",     Icon: Heart },
  { id: "star",       label: "Favorites",  Icon: Star },
  { id: "zap",        label: "Urgent",     Icon: Zap },
  { id: "coffee",     label: "Leisure",    Icon: Coffee },
  { id: "globe",      label: "Online",     Icon: Globe },
];
const ICON_MAP = Object.fromEntries(ICON_OPTIONS.map(o => [o.id, o.Icon]));

function getIcon(id: string): React.ElementType {
  return ICON_MAP[id] ?? Tag;
}

/* ─── Color map ─────────────────────────────────────────────────────── */
const COLOR_OPTIONS = [
  { id: "blue",    text: "text-blue-400",    bg: "bg-blue-500/12",    ring: "ring-blue-500",    hex: "#60a5fa" },
  { id: "purple",  text: "text-purple-400",  bg: "bg-purple-500/12",  ring: "ring-purple-500",  hex: "#c084fc" },
  { id: "emerald", text: "text-emerald-400", bg: "bg-emerald-500/12", ring: "ring-emerald-500", hex: "#34d399" },
  { id: "amber",   text: "text-amber-400",   bg: "bg-amber-500/12",   ring: "ring-amber-500",   hex: "#fbbf24" },
  { id: "red",     text: "text-red-400",     bg: "bg-red-500/12",     ring: "ring-red-500",     hex: "#f87171" },
  { id: "pink",    text: "text-pink-400",    bg: "bg-pink-500/12",    ring: "ring-pink-500",    hex: "#f472b6" },
  { id: "cyan",    text: "text-cyan-400",    bg: "bg-cyan-500/12",    ring: "ring-cyan-500",    hex: "#22d3ee" },
  { id: "orange",  text: "text-orange-400",  bg: "bg-orange-500/12",  ring: "ring-orange-500",  hex: "#fb923c" },
];
const COLOR_MAP = Object.fromEntries(COLOR_OPTIONS.map(c => [c.id, c]));
function getColor(id: string) { return COLOR_MAP[id] ?? COLOR_OPTIONS[0]; }

/* ─── Task form schema ─────────────────────────────────────────────── */
const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  category: z.string().min(1, "Category is required"),
  deadline: z.string().optional().refine(v => !v || !isNaN(Date.parse(v)), { message: "Invalid date" }),
});

/* ─── New-category form schema ─────────────────────────────────────── */
const catSchema = z.object({
  name:  z.string().min(1, "Name is required").max(24),
  color: z.string().min(1),
  icon:  z.string().min(1),
});

type StatusFilter = "all" | "due-soon" | "active" | "completed";

/* ─── Sortable category row (used inside Manage Categories dialog) ─── */
function SortableCategoryRow({
  cat, countFor, onDelete,
}: {
  cat: { id: number; name: string; color: string; icon: string };
  countFor: (name: string) => number;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: cat.id });

  const col  = getColor(cat.color);
  const Icon = getIcon(cat.icon);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 p-3 rounded-xl border bg-background/50 select-none transition-shadow ${
        isDragging
          ? "border-primary/50 shadow-lg shadow-primary/10 z-50 opacity-90"
          : "border-border/40"
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none p-0.5"
        tabIndex={-1}
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Icon */}
      <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${col.bg} ${col.text}`}>
        <Icon className="w-4 h-4" />
      </span>

      <span className="flex-1 font-medium text-sm">{cat.name}</span>
      <span className="text-xs text-muted-foreground mr-1">{countFor(cat.name)} tasks</span>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        title="Remove category"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function Tasks() {
  const queryClient = useQueryClient();

  /* data */
  const { data: tasks = [],      isLoading: loadingTasks } = useGetTasks();
  const { data: categories = [], isLoading: loadingCats  } = useGetCategories();

  /* mutations */
  const { mutate: createTask,    isPending: isCreatingTask } = useCreateTask({
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }); setIsTaskOpen(false); taskForm.reset(); } }
  });
  const { mutate: updateTask  } = useUpdateTask({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }) }
  });
  const { mutate: deleteTask  } = useDeleteTask({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }) }
  });
  const { mutate: createCat,     isPending: isCreatingCat  } = useCreateCategory({
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/categories"] }); setIsCatOpen(false); catForm.reset(); } }
  });
  const { mutate: deleteCat   } = useDeleteCategory({
    mutation: { onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setActiveCategory("all");
    } }
  });

  /* local state */
  const [activeCategory,   setActiveCategory]   = useState<string>("all");
  const [statusFilter,     setStatusFilter]     = useState<StatusFilter>("all");
  const [isTaskOpen,       setIsTaskOpen]       = useState(false);
  const [isCatOpen,        setIsCatOpen]        = useState(false);
  const [isSettingsOpen,   setIsSettingsOpen]   = useState(false);
  const [catToDelete,      setCatToDelete]      = useState<{ id: number; name: string } | null>(null);
  const [catOrder,         setCatOrder]         = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem("cat-order") ?? "[]"); } catch { return []; }
  });

  /* keep local order in sync when categories load/change */
  useEffect(() => {
    if (!categories.length) return;
    const ids = categories.map(c => c.id);
    const existing = catOrder.filter(id => ids.includes(id));
    const added    = ids.filter(id => !existing.includes(id));
    const merged   = [...existing, ...added];
    if (merged.join() !== catOrder.join()) {
      setCatOrder(merged);
      localStorage.setItem("cat-order", JSON.stringify(merged));
    }
  }, [categories]);  // eslint-disable-line react-hooks/exhaustive-deps

  const sortedCategories = [...categories].sort(
    (a, b) => catOrder.indexOf(a.id) - catOrder.indexOf(b.id),
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleCatDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = catOrder.indexOf(active.id as number);
    const newIdx = catOrder.indexOf(over.id as number);
    const next   = arrayMove(catOrder, oldIdx, newIdx);
    setCatOrder(next);
    localStorage.setItem("cat-order", JSON.stringify(next));
  };

  const confirmDeleteCat = () => {
    if (!catToDelete) return;
    deleteCat({ id: catToDelete.id });
    setCatToDelete(null);
    setActiveCategory("all");
  };

  /* forms */
  const taskForm = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", description: "", priority: "medium", category: "", deadline: "" },
  });
  const catForm = useForm<z.infer<typeof catSchema>>({
    resolver: zodResolver(catSchema),
    defaultValues: { name: "", color: "blue", icon: "tag" },
  });

  /* submit handlers */
  const onSubmitTask = (data: z.infer<typeof taskSchema>) => {
    createTask({ data: {
      title: data.title,
      description: data.description || undefined,
      priority: data.priority,
      category: data.category,
      deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
    }});
  };
  const onSubmitCat = (data: z.infer<typeof catSchema>) => {
    createCat({ data: { name: data.name, color: data.color, icon: data.icon } });
  };

  /* derived */
  const dueSoonCutoff = addDays(startOfDay(new Date()), 7);
  const isDueSoon = (t: typeof tasks[number]) =>
    !t.completed && !!t.deadline && isBefore(new Date(t.deadline), dueSoonCutoff);

  const filteredTasks = tasks
    .filter(t => activeCategory === "all" || t.category === (categories.find(c => c.name === activeCategory)?.name ?? activeCategory))
    .filter(t => {
      if (statusFilter === "due-soon")  return isDueSoon(t);
      if (statusFilter === "active")    return !t.completed;
      if (statusFilter === "completed") return t.completed;
      return true;
    })
    .sort((a, b) => {
      if (statusFilter === "due-soon") {
        return new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime();
      }
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const pMap = { high: 3, medium: 2, low: 1 };
      return (pMap[b.priority as keyof typeof pMap] ?? 0) - (pMap[a.priority as keyof typeof pMap] ?? 0);
    });

  const countFor = (catName: string) =>
    catName === "all" ? tasks.length : tasks.filter(t => t.category === catName).length;

  const pendingFor = (catName: string) =>
    catName === "all"
      ? tasks.filter(t => !t.completed).length
      : tasks.filter(t => t.category === catName && !t.completed).length;

  const selectedColor = catForm.watch("color");
  const selectedIcon  = catForm.watch("icon");

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col h-full">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Tasks</h1>
            <p className="text-muted-foreground mt-1">{pendingFor("all")} remaining</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Category settings button */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
              title="Manage categories"
              className="border-border/50 hover:border-primary/40 hover:text-primary"
            >
              <Settings className="w-4 h-4" />
            </Button>

            {/* New Task dialog */}
            <Dialog open={isTaskOpen} onOpenChange={setIsTaskOpen}>
              <DialogTrigger asChild>
                <Button className="hover-elevate active-elevate-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20 border-0">
                  <Plus className="w-4 h-4 mr-2" />New Task
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[440px] bg-card border-border/50 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="font-display">Create New Task</DialogTitle>
              </DialogHeader>
              <Form {...taskForm}>
                <form onSubmit={taskForm.handleSubmit(onSubmitTask)} className="space-y-4 mt-4">
                  <FormField control={taskForm.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Title</FormLabel>
                      <FormControl><Input placeholder="What needs to be done?" className="bg-background" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={taskForm.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description (Optional)</FormLabel>
                      <FormControl><Textarea placeholder="Add some details..." className="bg-background resize-none" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={taskForm.control} name="category" render={({ field }) => (
                      <FormItem><FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background"><SelectValue placeholder="Pick category" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map(c => {
                              const col = getColor(c.color);
                              const Icon = getIcon(c.icon);
                              return (
                                <SelectItem key={c.id} value={c.name}>
                                  <span className="flex items-center gap-2">
                                    <Icon className={`w-3.5 h-3.5 ${col.text}`} />
                                    {c.name}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={taskForm.control} name="priority" render={({ field }) => (
                      <FormItem><FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={taskForm.control} name="deadline" render={({ field }) => (
                    <FormItem><FormLabel>Deadline (Optional)</FormLabel>
                      <FormControl><Input type="date" className="bg-background" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button type="submit" className="w-full hover-elevate" disabled={isCreatingTask}>
                    {isCreatingTask ? "Creating..." : "Create Task"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
            </Dialog>
          </div>{/* end buttons flex */}
        </div>{/* end header */}

        {/* ── Category Tabs ── */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
          {/* All tab */}
          <button
            onClick={() => setActiveCategory("all")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap border transition-all duration-200
              ${activeCategory === "all"
                ? "bg-secondary text-foreground border-border/60 shadow-sm"
                : "bg-card/50 text-muted-foreground border-border/40 hover:border-border hover:text-foreground hover:bg-card"}`}
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            All Tasks
            <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold bg-muted text-muted-foreground">{countFor("all")}</span>
          </button>

          {/* Dynamic category tabs */}
          {!loadingCats && sortedCategories.map(cat => {
            const col   = getColor(cat.color);
            const Icon  = getIcon(cat.icon);
            const isAct = activeCategory === cat.name;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.name)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap border transition-all duration-200
                  ${isAct
                    ? `${col.bg} ${col.text} border-current/20 shadow-sm`
                    : "bg-card/50 text-muted-foreground border-border/40 hover:border-border hover:text-foreground hover:bg-card"
                  }
                `}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {cat.name}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold
                  ${isAct ? "bg-black/10 dark:bg-white/10" : "bg-muted text-muted-foreground"}`}>
                  {countFor(cat.name)}
                </span>
              </button>
            );
          })}

          {/* Add Category button */}
          <Dialog open={isCatOpen} onOpenChange={setIsCatOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap border border-dashed border-border/50 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all duration-200">
                <Plus className="w-4 h-4" />New category
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[360px] bg-card border-border/50 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="font-display">New Category</DialogTitle>
              </DialogHeader>
              <Form {...catForm}>
                <form onSubmit={catForm.handleSubmit(onSubmitCat)} className="space-y-5 mt-3">
                  <FormField control={catForm.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Name</FormLabel>
                      <FormControl><Input placeholder="e.g. Gaming, Studies…" className="bg-background" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Color picker */}
                  <FormField control={catForm.control} name="color" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {COLOR_OPTIONS.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => field.onChange(c.id)}
                            className={`w-7 h-7 rounded-full transition-all ring-offset-background ring-offset-2
                              ${selectedColor === c.id ? `ring-2 ${c.ring} scale-110` : "hover:scale-105 opacity-80 hover:opacity-100"}`}
                            style={{ backgroundColor: c.hex }}
                            title={c.id}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Icon picker */}
                  <FormField control={catForm.control} name="icon" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon</FormLabel>
                      <div className="grid grid-cols-6 gap-2 mt-1">
                        {ICON_OPTIONS.map(({ id, label, Icon }) => {
                          const col = getColor(selectedColor);
                          const isSelected = selectedIcon === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              title={label}
                              onClick={() => field.onChange(id)}
                              className={`flex items-center justify-center w-10 h-10 rounded-xl border transition-all
                                ${isSelected
                                  ? `${col.bg} ${col.text} border-current/20 scale-105 shadow-sm`
                                  : "bg-background border-border/40 text-muted-foreground hover:text-foreground hover:border-border"}`}
                            >
                              <Icon className="w-4 h-4" />
                            </button>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Preview */}
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-background border border-border/40">
                    <span className="text-xs text-muted-foreground">Preview:</span>
                    {(() => {
                      const col  = getColor(selectedColor);
                      const Icon = getIcon(selectedIcon);
                      const name = catForm.watch("name") || "My Category";
                      return (
                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium ${col.bg} ${col.text}`}>
                          <Icon className="w-3.5 h-3.5" />{name}
                        </span>
                      );
                    })()}
                  </div>

                  <Button type="submit" className="w-full hover-elevate" disabled={isCreatingCat}>
                    {isCreatingCat ? "Creating…" : "Create Category"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* ── Status filter ── */}
        {(() => {
          const catFilter = (t: typeof tasks[number]) =>
            activeCategory === "all" || t.category === (categories.find(c => c.name === activeCategory)?.name ?? activeCategory);
          const tabs = [
            { key: "all"       as const, label: "All",      count: tasks.filter(catFilter).length },
            { key: "due-soon"  as const, label: "Due Soon", count: tasks.filter(t => catFilter(t) && isDueSoon(t)).length },
            { key: "active"    as const, label: "Active",   count: tasks.filter(t => catFilter(t) && !t.completed).length },
            { key: "completed" as const, label: "Completed",count: tasks.filter(t => catFilter(t) && t.completed).length },
          ];
          return (
            <div className="flex gap-1 mb-6 p-1 bg-secondary/50 rounded-xl w-fit">
              {tabs.map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all
                    ${statusFilter === key
                      ? key === "due-soon"
                        ? "bg-orange-500/15 text-orange-400 shadow-sm"
                        : "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}
                >
                  {label}
                  {count > 0 && (
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold tabular-nums ${
                      statusFilter === key
                        ? key === "due-soon"
                          ? "bg-orange-500/20 text-orange-400"
                          : "bg-muted text-muted-foreground"
                        : key === "due-soon" && count > 0
                          ? "bg-orange-500/10 text-orange-400/80"
                          : "bg-background/60 text-muted-foreground"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          );
        })()}

        {/* ── Task list ── */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {loadingTasks ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-card/50 border border-border/50 rounded-2xl animate-pulse" />)}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <CheckCircle2 className="w-16 h-16 opacity-20 mb-4" />
              <p className="text-lg font-medium">
                {statusFilter === "due-soon" ? "Nothing due soon" : "No tasks here"}
              </p>
              <p className="text-sm opacity-60 mt-1">
                {statusFilter === "due-soon"
                  ? "No deadlines approaching in the next 7 days."
                  : activeCategory !== "all" ? `Add a task to ${activeCategory}` : "All caught up!"}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3 pb-8">
                {filteredTasks.map(task => {
                  const isOverdue = task.deadline && !task.completed && isAfter(new Date(), new Date(task.deadline));
                  const cat  = categories.find(c => c.name === task.category);
                  const col  = getColor(cat?.color ?? "blue");
                  const Icon = getIcon(cat?.icon ?? "tag");
                  return (
                    <motion.div key={task.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}>
                      <Card className={`group flex items-start gap-4 p-4 border transition-all duration-200
                        ${task.completed ? "bg-secondary/30 border-border/30 opacity-60" : "bg-card border-border/50 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"}
                        ${isOverdue ? "border-destructive/50 bg-destructive/5" : ""}`}>

                        <button
                          onClick={() => updateTask({ id: task.id, data: { completed: !task.completed } })}
                          className={`mt-1 rounded-full transition-colors shrink-0 ${task.completed ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                        >
                          {task.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold text-base truncate ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex items-center flex-wrap gap-2 mt-2.5">
                            {cat && (
                              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-current/15 ${col.text} ${col.bg}`}>
                                <Icon className="w-3 h-3" />{cat.name}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border
                              ${task.priority === "high"   ? "bg-destructive/10 text-destructive border-destructive/20" : ""}
                              ${task.priority === "medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : ""}
                              ${task.priority === "low"    ? "bg-primary/10 text-primary border-primary/20" : ""}`}>
                              {task.priority}
                            </span>
                            {task.deadline && (
                              <span className={`flex items-center text-xs font-medium ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                                <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                                {format(new Date(task.deadline), "MMM d, yyyy")}
                                {isOverdue && " · Overdue"}
                              </span>
                            )}
                          </div>
                        </div>

                        <Button variant="ghost" size="icon" onClick={() => deleteTask({ id: task.id })}
                          className="opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ── Manage Categories Dialog ── */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[420px] bg-card border-border/50 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Settings className="w-4 h-4" /> Manage Categories
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">
            Reorder or remove categories. Removing a category also deletes its tasks.
          </p>
          <p className="text-xs text-muted-foreground/60 -mt-1 mb-1 flex items-center gap-1">
            <GripVertical className="w-3 h-3" /> Drag the handle to reorder
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCatDragEnd}>
            <SortableContext items={catOrder} strategy={verticalListSortingStrategy}>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {sortedCategories.map(cat => (
                  <SortableCategoryRow
                    key={cat.id}
                    cat={cat}
                    countFor={countFor}
                    onDelete={() => setCatToDelete({ id: cat.id, name: cat.name })}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation AlertDialog ── */}
      <AlertDialog open={!!catToDelete} onOpenChange={open => { if (!open) setCatToDelete(null); }}>
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{catToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the <span className="font-semibold text-foreground">{catToDelete?.name}</span> category
              and all <span className="font-semibold text-foreground">{catToDelete ? countFor(catToDelete.name) : 0} task(s)</span> inside it.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCat}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, remove it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </Layout>
  );
}
