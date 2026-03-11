import { useState } from "react";
import { Layout } from "@/components/layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Trash2, CheckCircle2, ChevronLeft, ChevronRight,
  Flame, Trophy, Target, Calendar, Star, RotateCcw,
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isPast, isToday, differenceInDays, startOfWeek, endOfWeek,
} from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const CATEGORY_COLORS: Record<string, string> = {
  fitness:   "bg-orange-500/15 text-orange-400 border-orange-500/20",
  health:    "bg-red-500/15 text-red-400 border-red-500/20",
  learning:  "bg-blue-500/15 text-blue-400 border-blue-500/20",
  career:    "bg-violet-500/15 text-violet-400 border-violet-500/20",
  finance:   "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  personal:  "bg-pink-500/15 text-pink-400 border-pink-500/20",
  travel:    "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  other:     "bg-secondary text-muted-foreground border-border",
};

function getCategoryColor(cat: string | null) {
  if (!cat) return CATEGORY_COLORS.other;
  const key = cat.toLowerCase().trim();
  return CATEGORY_COLORS[key] ?? CATEGORY_COLORS.other;
}

async function fetchGoals(): Promise<Goal[]> {
  const r = await fetch("/api/goals");
  if (!r.ok) throw new Error("Failed to fetch goals");
  return r.json();
}
async function createGoal(data: z.infer<typeof goalSchema>): Promise<Goal> {
  const r = await fetch("/api/goals", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: data.title,
      description: data.description || null,
      targetDate: data.targetDate ? new Date(data.targetDate).toISOString() : null,
      category: data.category || null,
    }),
  });
  if (!r.ok) throw new Error("Failed to create goal");
  return r.json();
}
async function updateGoal(id: number, data: Partial<Goal>): Promise<Goal> {
  const r = await fetch(`/api/goals/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error("Failed to update goal");
  return r.json();
}
async function deleteGoal(id: number): Promise<void> {
  await fetch(`/api/goals/${id}`, { method: "DELETE" });
}

/* ── Progress ring SVG ──────────────────────────────────────── */
function ProgressRing({ value, size = 80, stroke = 6 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-border/40" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-primary transition-all duration-700"
      />
    </svg>
  );
}

/* ── Goal card ──────────────────────────────────────────────── */
function GoalCard({ goal, onProgress, onComplete, onDelete }: {
  goal: Goal;
  onProgress: (id: number, p: number) => void;
  onComplete: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const daysLeft = goal.targetDate
    ? differenceInDays(new Date(goal.targetDate), new Date())
    : null;
  const isOverdue = daysLeft !== null && daysLeft < 0;
  const isAlmostDue = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
  const isHot = goal.progress >= 75;

  return (
    <div className={`group relative rounded-2xl border p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
      isOverdue ? "bg-destructive/5 border-destructive/20" : "bg-card border-border/50 hover:border-primary/30"
    }`}>
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 relative">
          <ProgressRing value={goal.progress} size={52} stroke={5} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-bold text-foreground">{goal.progress}%</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-base text-foreground leading-snug">{goal.title}</h3>
            {isHot && <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
          </div>
          {goal.description && (
            <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{goal.description}</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {goal.category && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getCategoryColor(goal.category)}`}>
                {goal.category}
              </span>
            )}
            {goal.targetDate && (
              <span className={`text-xs font-medium ${isOverdue ? "text-destructive" : isAlmostDue ? "text-amber-400" : "text-muted-foreground"}`}>
                {isOverdue
                  ? `${Math.abs(daysLeft!)}d overdue`
                  : daysLeft === 0
                  ? "Due today!"
                  : `${daysLeft}d left`}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onComplete(goal.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors" title="Mark complete">
            <CheckCircle2 className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(goal.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar + controls */}
      <div className="mt-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative h-2.5 bg-secondary/50 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              style={{
                width: `${goal.progress}%`,
                background: goal.progress >= 100
                  ? "linear-gradient(90deg, #10b981, #34d399)"
                  : goal.progress >= 75
                  ? "linear-gradient(90deg, #f97316, #fb923c)"
                  : "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary)/0.7))",
              }}
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onProgress(goal.id, Math.max(0, goal.progress - 10))}
              className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-xs font-bold"
            >−</button>
            <button
              onClick={() => onProgress(goal.id, Math.min(100, goal.progress + 10))}
              className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-xs font-bold"
            >+</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════ */
export default function Goals() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: goals = [], isLoading } = useQuery({ queryKey: ["/api/goals"], queryFn: fetchGoals });

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

  const active    = goals.filter(g => g.status === "active");
  const completed = goals.filter(g => g.status === "completed");
  const total     = goals.length;
  const pct       = total === 0 ? 0 : Math.round((completed.length / total) * 100);
  const avgProgress = active.length === 0 ? 0 : Math.round(active.reduce((s, g) => s + g.progress, 0) / active.length);

  /* calendar */
  const monthStart  = startOfMonth(currentMonth);
  const monthEnd    = endOfMonth(currentMonth);
  const calStart    = startOfWeek(monthStart);
  const calEnd      = endOfWeek(monthEnd);
  const calDays     = eachDayOfInterval({ start: calStart, end: calEnd });
  const goalsOnDay  = (day: Date) => goals.filter(g => g.targetDate && isSameDay(new Date(g.targetDate), day));

  const QUOTES = [
    "The secret of getting ahead is getting started.",
    "Dream big. Start small. Act now.",
    "Every day is a chance to be better than yesterday.",
    "Push yourself, because no one else is going to do it for you.",
    "Great things never come from comfort zones.",
  ];
  const quote = QUOTES[new Date().getDate() % QUOTES.length];

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-8 pb-20">

        {/* ── HERO ─────────────────────────────────────────────────── */}
        <div className="relative rounded-3xl overflow-hidden p-8 md:p-10"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.15) 0%, hsl(var(--primary)/0.05) 50%, transparent 100%)" }}>
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 w-60 h-60 rounded-full bg-primary/3 blur-2xl" />
          </div>
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Target className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs font-semibold text-primary uppercase tracking-widest">Goal Tracker</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-3 leading-tight">
                Make it<br />
                <span className="text-primary">happen.</span>
              </h1>
              <p className="text-muted-foreground text-sm md:text-base max-w-sm italic">"{quote}"</p>
            </div>

            {/* Stats ring cluster */}
            <div className="flex items-center gap-6 flex-shrink-0">
              <div className="relative">
                <ProgressRing value={pct} size={100} stroke={8} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-display font-bold text-foreground">{pct}%</span>
                  <span className="text-[10px] text-muted-foreground">done</span>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-2xl font-display font-bold text-foreground">{active.length}</p>
                  <p className="text-xs text-muted-foreground">Active goals</p>
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-emerald-400">{completed.length}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
                {active.length > 0 && (
                  <div>
                    <p className="text-2xl font-display font-bold text-orange-400">{avgProgress}%</p>
                    <p className="text-xs text-muted-foreground">Avg progress</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── TABS ─────────────────────────────────────────────────── */}
        <Tabs defaultValue="active" className="flex flex-col gap-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <TabsList className="bg-secondary/50 p-1">
              <TabsTrigger value="active" className="data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
                <Flame className="w-3.5 h-3.5" />
                Active
                {active.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary">{active.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" className="data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
                <Trophy className="w-3.5 h-3.5" />
                Completed
                {completed.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">{completed.length}</span>
                )}
              </TabsTrigger>
            </TabsList>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                  <Plus className="w-4 h-4 mr-2" />New Goal
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border/50 shadow-2xl">
                <DialogHeader><DialogTitle className="text-xl font-display">Set a New Goal</DialogTitle></DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(d => createMutation.mutate(d))} className="space-y-4 pt-2">
                    <FormField control={form.control} name="title" render={({ field }) => (
                      <FormItem>
                        <FormLabel>What do you want to achieve?</FormLabel>
                        <FormControl><Input className="bg-background text-base" placeholder="e.g. Run a 5K, Learn Spanish…" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Why does this matter? <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                        <FormControl><Input className="bg-background" placeholder="Your motivation…" {...field} /></FormControl>
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
                          <FormControl><Input className="bg-background" placeholder="Fitness, Learning…" {...field} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-11 text-base font-semibold" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Creating…" : "Create Goal"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* ── ACTIVE TAB ───────────────────────────────────────────── */}
          <TabsContent value="active" className="m-0 outline-none">
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              {/* Goal cards */}
              <div className="xl:col-span-3 flex flex-col gap-4">
                {isLoading ? (
                  [1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl bg-card border border-border/50 animate-pulse" />)
                ) : active.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/50 p-16 text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
                      <Target className="w-7 h-7 text-primary" />
                    </div>
                    <p className="font-semibold text-foreground mb-1">No active goals yet</p>
                    <p className="text-sm text-muted-foreground mb-4">Set your first goal and start making progress today.</p>
                    <Button onClick={() => setIsOpen(true)} variant="outline" size="sm">
                      <Plus className="w-3.5 h-3.5 mr-1.5" />Add your first goal
                    </Button>
                  </div>
                ) : (
                  active.map(goal => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onProgress={(id, p) => updateMutation.mutate({ id, data: { progress: p } })}
                      onComplete={(id) => updateMutation.mutate({ id, data: { status: "completed", progress: 100 } })}
                      onDelete={(id) => deleteMutation.mutate(id)}
                    />
                  ))
                )}
              </div>

              {/* Calendar */}
              <Card className="xl:col-span-2 bg-card border-border/50 shadow-lg self-start sticky top-4">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <h3 className="font-display font-semibold text-foreground">{format(currentMonth, 'MMMM yyyy')}</h3>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1))}>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-xs font-semibold" onClick={() => setCurrentMonth(new Date())}>
                        <span className="text-[10px] font-bold">●</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1))}>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-0.5 mb-1">
                    {["S","M","T","W","T","F","S"].map((d, i) => (
                      <div key={i} className="text-center text-[10px] font-bold text-muted-foreground/60 py-1.5">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {calDays.map((day, i) => {
                      const dayGoals = goalsOnDay(day);
                      const isThisMonth = day.getMonth() === currentMonth.getMonth();
                      const isTodayDate = isToday(day);
                      const hasDueGoal = dayGoals.length > 0;
                      return (
                        <div key={i} className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[11px] font-medium transition-all ${
                          !isThisMonth ? "text-muted-foreground/25" :
                          isTodayDate ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/30" :
                          hasDueGoal ? "bg-primary/15 text-primary border border-primary/25 font-bold" :
                          isPast(day) ? "text-muted-foreground/50" :
                          "text-foreground hover:bg-secondary"
                        }`}>
                          <span>{day.getDate()}</span>
                          {hasDueGoal && !isTodayDate && (
                            <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Upcoming goals list */}
                  {goals.filter(g => g.targetDate && !isPast(new Date(g.targetDate)) && g.status === "active").length > 0 && (
                    <div className="mt-5 pt-4 border-t border-border/30 space-y-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Upcoming deadlines</p>
                      {goals
                        .filter(g => g.targetDate && !isPast(new Date(g.targetDate)) && g.status === "active")
                        .sort((a, b) => new Date(a.targetDate!).getTime() - new Date(b.targetDate!).getTime())
                        .slice(0, 4)
                        .map(g => {
                          const d = differenceInDays(new Date(g.targetDate!), new Date());
                          return (
                            <div key={g.id} className="flex items-center gap-2.5">
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${d <= 7 ? "bg-amber-400" : "bg-primary"}`} />
                              <p className="text-xs text-foreground truncate flex-1">{g.title}</p>
                              <span className={`text-[10px] font-semibold flex-shrink-0 ${d <= 7 ? "text-amber-400" : "text-muted-foreground"}`}>
                                {d === 0 ? "Today" : `${d}d`}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── COMPLETED TAB ─────────────────────────────────────────── */}
          <TabsContent value="completed" className="m-0 outline-none">
            {completed.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/50 p-16 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 mb-4">
                  <Trophy className="w-7 h-7 text-emerald-400" />
                </div>
                <p className="font-semibold text-foreground mb-1">No completed goals yet</p>
                <p className="text-sm text-muted-foreground">Keep working — your wins will appear here.</p>
              </div>
            ) : (
              <>
                {/* Banner */}
                <div className="rounded-2xl p-6 mb-6 flex items-center gap-5"
                  style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))" }}>
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold text-foreground">
                      {completed.length} Goal{completed.length !== 1 ? "s" : ""} crushed! 🎉
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Every completed goal is proof you can do it. Keep going.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completed.map(goal => (
                    <div key={goal.id} className="group relative rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 hover:bg-emerald-500/10 transition-all">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => updateMutation.mutate({ id: goal.id, data: { status: "active", progress: 90 } })}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Move back to active"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(goal.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">{goal.title}</h3>
                      {goal.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{goal.description}</p>}
                      <div className="flex items-center justify-between mt-2">
                        {goal.category && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getCategoryColor(goal.category)}`}>
                            {goal.category}
                          </span>
                        )}
                        <div className="ml-auto flex items-center gap-1 text-emerald-400">
                          <Star className="w-3 h-3 fill-emerald-400" />
                          <span className="text-xs font-semibold">Completed</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
