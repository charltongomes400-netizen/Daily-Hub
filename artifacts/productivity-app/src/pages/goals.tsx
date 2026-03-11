import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, CheckCircle2, Circle, ChevronLeft, ChevronRight, Target } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isPast, isToday } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Progress } from "@/components/ui/progress";

interface Goal {
  id: number;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: "active" | "completed";
  progress: number;
  category: string | null;
  createdAt: string;
}

const goalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  targetDate: z.string().optional(),
  category: z.string().optional(),
});

async function fetchGoals(): Promise<Goal[]> {
  const r = await fetch("/api/goals");
  if (!r.ok) throw new Error("Failed to fetch goals");
  return r.json();
}

async function createGoal(data: z.infer<typeof goalSchema>): Promise<Goal> {
  const r = await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
    title: data.title,
    description: data.description || null,
    targetDate: data.targetDate ? new Date(data.targetDate).toISOString() : null,
    category: data.category || null,
  }) });
  if (!r.ok) throw new Error("Failed to create goal");
  return r.json();
}

async function updateGoal(id: number, data: Partial<Goal>): Promise<Goal> {
  const r = await fetch(`/api/goals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!r.ok) throw new Error("Failed to update goal");
  return r.json();
}

async function deleteGoal(id: number): Promise<void> {
  await fetch(`/api/goals/${id}`, { method: "DELETE" });
}

export default function Goals() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["/api/goals"],
    queryFn: fetchGoals,
  });

  const createMutation = useMutation({
    mutationFn: createGoal,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/goals"] }); setIsOpen(false); form.reset(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Goal> }) => updateGoal(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/goals"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/goals"] }),
  });

  const form = useForm<z.infer<typeof goalSchema>>({
    resolver: zodResolver(goalSchema),
    defaultValues: { title: "", description: "", targetDate: "", category: "" },
  });

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const goalsWithDates = goals.filter(g => g.targetDate);
  const goalsWithoutDates = goals.filter(g => !g.targetDate);

  const goalsForDay = (day: Date) => goalsWithDates.filter(g => isSameDay(new Date(g.targetDate!), day));

  const stats = {
    total: goals.length,
    completed: goals.filter(g => g.status === "completed").length,
    active: goals.filter(g => g.status === "active").length,
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col h-full pb-20">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Goals</h1>
            <p className="text-muted-foreground mt-1">Track and achieve your targets.</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
                <Plus className="w-4 h-4 mr-2" />New Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border/50 shadow-2xl">
              <DialogHeader>
                <DialogTitle>Create New Goal</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal Title</FormLabel>
                      <FormControl><Input className="bg-background" placeholder="e.g. Learn Spanish, Run a 5K…" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <FormControl><Input className="bg-background" placeholder="Details about this goal…" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="targetDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Date <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                        <FormControl><Input type="date" className="bg-background" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                        <FormControl><Input className="bg-background" placeholder="e.g. Fitness, Learning…" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating…" : "Create Goal"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <Card className="bg-card border-border/50 p-4 text-center shadow">
            <p className="text-2xl font-display font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Goals</p>
          </Card>
          <Card className="bg-card border-border/50 p-4 text-center shadow">
            <p className="text-2xl font-display font-bold text-primary">{stats.active}</p>
            <p className="text-xs text-muted-foreground mt-1">Active</p>
          </Card>
          <Card className="bg-card border-border/50 p-4 text-center shadow">
            <p className="text-2xl font-display font-bold text-emerald-400">{stats.completed}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2 bg-card border-border/50 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display font-semibold text-lg text-foreground">{format(currentMonth, 'MMMM yyyy')}</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date())}>Today</Button>
                  <Button variant="outline" size="icon" onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">{day}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {daysInMonth.map((day, i) => {
                  const dayGoals = goalsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isTodayDate = isToday(day);
                  const isPastDate = isPast(day) && !isToday(day);
                  return (
                    <div
                      key={i}
                      className={`aspect-square rounded-lg border p-1 text-center text-xs transition-all ${
                        isCurrentMonth
                          ? isTodayDate
                            ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                            : isPastDate
                            ? "bg-secondary/30 border-border/30 text-muted-foreground"
                            : "bg-card border-border/50 hover:border-primary/30"
                          : "bg-secondary/20 border-border/30 text-muted-foreground/50"
                      }`}
                    >
                      <div className="font-semibold">{day.getDate()}</div>
                      {dayGoals.length > 0 && (
                        <div className="text-[10px] text-primary mt-0.5">
                          {dayGoals.length} goal{dayGoals.length > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Goals list */}
          <Card className="bg-card border-border/50 shadow-lg flex flex-col">
            <CardContent className="p-6 flex-1 flex flex-col gap-3 overflow-y-auto">
              <h3 className="font-display font-semibold text-lg text-foreground">Active Goals</h3>
              {isLoading ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-12 bg-secondary/50 rounded" />)}
                </div>
              ) : goals.filter(g => g.status === "active").length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-sm">No active goals</div>
              ) : (
                goals.filter(g => g.status === "active").map(goal => (
                  <div
                    key={goal.id}
                    className="p-3 rounded-lg bg-secondary/50 border border-border/30 hover:border-primary/30 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{goal.title}</p>
                        {goal.targetDate && (
                          <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(goal.targetDate), 'MMM dd')}</p>
                        )}
                        {goal.progress > 0 && (
                          <div className="mt-1.5">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-muted-foreground">{goal.progress}%</span>
                            </div>
                            <Progress value={goal.progress} className="h-1.5" />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => updateMutation.mutate({ id: goal.id, data: { status: "completed", progress: 100 } })}
                        className="text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-0.5"
                      >
                        <Circle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}

              {goals.filter(g => g.status === "completed").length > 0 && (
                <>
                  <div className="border-t border-border/30 my-2" />
                  <h3 className="font-semibold text-xs text-muted-foreground uppercase">Completed</h3>
                  {goals.filter(g => g.status === "completed").map(goal => (
                    <div key={goal.id} className="flex items-center justify-between p-2 rounded bg-secondary/20 opacity-60 group">
                      <p className="text-xs text-muted-foreground line-through">{goal.title}</p>
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-primary hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteMutation.mutate(goal.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
