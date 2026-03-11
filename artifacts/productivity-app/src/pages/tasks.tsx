import { useState } from "react";
import { Layout } from "@/components/layout";
import { useGetTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Trash2, Calendar as CalendarIcon, CheckCircle2, Circle,
  Tv2, Home, Briefcase, Monitor, LayoutGrid,
} from "lucide-react";
import { format, isAfter } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Category = "all" | "streaming" | "life" | "work" | "tech";
type StatusFilter = "all" | "active" | "completed";

const CATEGORIES: { id: Category; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { id: "all",       label: "All Tasks",  icon: LayoutGrid, color: "text-foreground",      bg: "bg-secondary" },
  { id: "streaming", label: "Streaming",  icon: Tv2,        color: "text-purple-400",      bg: "bg-purple-500/10" },
  { id: "life",      label: "Life / IRL", icon: Home,       color: "text-emerald-400",     bg: "bg-emerald-500/10" },
  { id: "work",      label: "Work",       icon: Briefcase,  color: "text-blue-400",        bg: "bg-blue-500/10" },
  { id: "tech",      label: "Tech / PC",  icon: Monitor,    color: "text-amber-400",       bg: "bg-amber-500/10" },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  category: z.enum(["streaming", "life", "work", "tech"]),
  deadline: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), { message: "Invalid date" }),
});

export default function Tasks() {
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading } = useGetTasks();
  const { mutate: createTask, isPending: isCreating } = useCreateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        setIsAddOpen(false);
        form.reset();
      }
    }
  });
  const { mutate: updateTask } = useUpdateTask({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }) }
  });
  const { mutate: deleteTask } = useDeleteTask({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }) }
  });

  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", description: "", priority: "medium", category: "life", deadline: "" }
  });

  const onSubmit = (data: z.infer<typeof taskSchema>) => {
    createTask({
      data: {
        title: data.title,
        description: data.description || undefined,
        priority: data.priority,
        category: data.category,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
      }
    });
  };

  const filteredTasks = tasks
    .filter(t => activeCategory === "all" || t.category === activeCategory)
    .filter(t => {
      if (statusFilter === "active") return !t.completed;
      if (statusFilter === "completed") return t.completed;
      return true;
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const pMap = { high: 3, medium: 2, low: 1 };
      return pMap[b.priority as keyof typeof pMap] - pMap[a.priority as keyof typeof pMap];
    });

  const countByCategory = (cat: Category) =>
    cat === "all" ? tasks.length : tasks.filter(t => t.category === cat).length;

  const activeCount = (cat: Category) =>
    cat === "all"
      ? tasks.filter(t => !t.completed).length
      : tasks.filter(t => t.category === cat && !t.completed).length;

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col h-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Tasks</h1>
            <p className="text-muted-foreground mt-1">
              {activeCount("all")} task{activeCount("all") !== 1 ? "s" : ""} remaining
            </p>
          </div>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="hover-elevate active-elevate-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20 border-0">
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[440px] bg-card border-border/50 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="font-display">Create New Task</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="What needs to be done?" className="bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Add some details..." className="bg-background resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Pick a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="streaming">Streaming</SelectItem>
                            <SelectItem value="life">Life / IRL</SelectItem>
                            <SelectItem value="work">Work</SelectItem>
                            <SelectItem value="tech">Tech / PC</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="priority" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
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

                  <FormField control={form.control} name="deadline" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deadline (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" className="bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button type="submit" className="w-full mt-2 hover-elevate" disabled={isCreating}>
                    {isCreating ? "Creating..." : "Create Task"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            const total = countByCategory(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap
                  transition-all duration-200 border
                  ${isActive
                    ? `${cat.bg} ${cat.color} border-current/20 shadow-sm`
                    : "bg-card/50 text-muted-foreground border-border/40 hover:border-border hover:text-foreground hover:bg-card"
                  }
                `}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {cat.label}
                <span className={`
                  ml-0.5 text-xs px-1.5 py-0.5 rounded-full font-semibold
                  ${isActive ? "bg-black/10 dark:bg-white/10" : "bg-secondary text-muted-foreground"}
                `}>
                  {total}
                </span>
              </button>
            );
          })}
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 mb-6 p-1 bg-secondary/50 rounded-xl w-fit">
          {(["all", "active", "completed"] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 capitalize
                ${statusFilter === f
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-card/50 border border-border/50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <CheckCircle2 className="w-16 h-16 opacity-20 mb-4" />
              <p className="text-lg font-medium">No tasks here</p>
              <p className="text-sm opacity-60 mt-1">
                {activeCategory !== "all"
                  ? `Add a task to ${CATEGORY_MAP[activeCategory]?.label}`
                  : "All caught up!"}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3 pb-8">
                {filteredTasks.map(task => {
                  const isOverdue = task.deadline && !task.completed && isAfter(new Date(), new Date(task.deadline));
                  const cat = CATEGORY_MAP[task.category as Category];
                  const CatIcon = cat?.icon ?? LayoutGrid;
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                    >
                      <Card className={`
                        group flex items-start gap-4 p-4 border transition-all duration-200
                        ${task.completed ? "bg-secondary/30 border-border/30 opacity-60" : "bg-card border-border/50 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"}
                        ${isOverdue ? "border-destructive/50 bg-destructive/5" : ""}
                      `}>
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
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center flex-wrap gap-2 mt-2.5">
                            {/* Category badge */}
                            {cat && (
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-current/20 ${cat.color} ${cat.bg}`}>
                                <CatIcon className="w-3 h-3" />
                                {cat.label}
                              </div>
                            )}
                            {/* Priority badge */}
                            <div className={`
                              px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border
                              ${task.priority === "high" ? "bg-destructive/10 text-destructive border-destructive/20" : ""}
                              ${task.priority === "medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : ""}
                              ${task.priority === "low" ? "bg-primary/10 text-primary border-primary/20" : ""}
                            `}>
                              {task.priority}
                            </div>
                            {/* Deadline */}
                            {task.deadline && (
                              <div className={`flex items-center text-xs font-medium ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                                <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                                {format(new Date(task.deadline), "MMM d, yyyy")}
                                {isOverdue && " · Overdue"}
                              </div>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTask({ id: task.id })}
                          className="opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                        >
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
    </Layout>
  );
}
