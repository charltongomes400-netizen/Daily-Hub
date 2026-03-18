import { useGetTasks, useGetExpenses, useGetSubscriptions } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Wallet, CreditCard, ArrowRight, Activity, Dumbbell, Moon, Flame, StickyNote, Target } from "lucide-react";
import { Layout } from "@/components/layout";
import { format, subDays, isAfter } from "date-fns";
import { motion } from "framer-motion";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface GymExercise {
  id: number;
  dayOfWeek: number;
  name: string;
  sets: number | null;
  reps: number | null;
  weight: string | null;
  notes: string | null;
}

function getRestDays(): Set<number> {
  try {
    const saved = localStorage.getItem("gym-rest-days");
    if (saved) return new Set(JSON.parse(saved) as number[]);
  } catch {}
  return new Set();
}

export default function Dashboard() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: tasks = [], isLoading: loadingTasks } = useGetTasks();
  const { data: expenses = [], isLoading: loadingExpenses } = useGetExpenses();
  const { data: subscriptions = [], isLoading: loadingSubs } = useGetSubscriptions();
  const { data: gymExercises = [] } = useQuery<GymExercise[]>({
    queryKey: ["/api/gym"],
    queryFn: () => fetch("/api/gym").then(r => r.json()),
  });

  interface Note { id: number; title: string; content: string; updatedAt: string; }
  interface Goal { id: number; title: string; description: string | null; status: "active" | "completed"; progress: number; targetDate: string | null; category: string | null; }

  const { data: notes = [] } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
    queryFn: () => fetch("/api/notes").then(r => r.json()),
  });
  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
    queryFn: () => fetch("/api/goals").then(r => r.json()),
  });

  const todayIndex = new Date().getDay();
  const restDaySet = getRestDays();
  const isTodayRest = restDaySet.has(todayIndex);
  const todaysExercises = gymExercises.filter(e => e.dayOfWeek === todayIndex);
  const weekTrainingDays = Array.from({ length: 7 }, (_, i) => i).filter(i => !restDaySet.has(i) && gymExercises.some(e => e.dayOfWeek === i)).length;

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const taskProgress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const pendingHighPriority = tasks.filter(t => !t.completed && t.priority === "high").length;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyExpenses = expenses
    .filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const activeMonthlySubs = subscriptions
    .filter(s => s.isActive)
    .reduce((sum, s) => {
      if (s.billingCycle === "monthly") return sum + s.amount;
      if (s.billingCycle === "yearly") return sum + (s.amount / 12);
      if (s.billingCycle === "quarterly") return sum + (s.amount / 3);
      return sum;
    }, 0);

  // Generate mock chart data based on real expenses if available, otherwise flat
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayTotal = expenses
      .filter(e => e.date.startsWith(dateStr))
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      name: format(d, 'EEE'),
      total: dayTotal
    };
  });

  const isLoading = loadingTasks || loadingExpenses || loadingSubs;

  const latestNote = [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  const activeGoals = goals.filter(g => g.status === "active");
  const completedGoals = goals.filter(g => g.status === "completed");
  const goalCompletionPct = goals.length === 0 ? 0 : Math.round((completedGoals.length / goals.length) * 100);

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 space-y-6 flex flex-col h-full animate-pulse">
          <div className="h-10 w-64 bg-muted rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-card border border-border/50 rounded-2xl" />)}
          </div>
          <div className="h-64 bg-card border border-border/50 rounded-2xl" />
        </div>
      </Layout>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-20">
        <motion.div initial="hidden" animate="show" variants={itemVariants} className="relative">
          <div className="absolute inset-0 rounded-3xl overflow-hidden -z-10">
             <img 
              src={`${import.meta.env.BASE_URL}images/hero-abstract.png`} 
              alt="Abstract gradient background" 
              className="w-full h-full object-cover opacity-40 mix-blend-screen"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </div>
          <div className="pt-12 pb-6 px-4 md:px-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-foreground">
                Welcome back.
              </h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Here is your productivity and finance overview.
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end shrink-0 pb-1">
              <span className="text-4xl md:text-5xl font-display font-bold tabular-nums tracking-tight text-foreground/90 leading-none">
                {format(now, 'HH:mm')}
                <span className="text-2xl md:text-3xl text-muted-foreground/60 font-normal">:{format(now, 'ss')}</span>
              </span>
              <span className="text-sm text-muted-foreground mt-1.5 font-medium">
                {format(now, 'EEEE, MMMM d, yyyy')}
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 md:px-0"
        >
          {/* Tasks — blue */}
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm border-blue-500/20 shadow-lg shadow-black/10 overflow-hidden relative group hover:border-blue-400/40 transition-colors">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <CheckCircle2 className="w-24 h-24 text-blue-400" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">Task Completion</CardTitle>
                <Activity className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold font-display text-blue-400">{taskProgress}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {completedTasks} of {totalTasks} tasks completed
                </p>
                {pendingHighPriority > 0 && (
                  <div className="mt-4 inline-flex items-center rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                    {pendingHighPriority} high priority pending
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Finance — emerald */}
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 backdrop-blur-sm border-emerald-500/20 shadow-lg shadow-black/10 overflow-hidden relative group hover:border-emerald-400/40 transition-colors">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Wallet className="w-24 h-24 text-emerald-400" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Expenses</CardTitle>
                <Wallet className="h-4 w-4 text-emerald-400" />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold font-display text-emerald-400">${monthlyExpenses.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total spent in {format(new Date(), 'MMMM')}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Subscriptions — yellow */}
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 backdrop-blur-sm border-yellow-500/20 shadow-lg shadow-black/10 overflow-hidden relative group hover:border-yellow-400/40 transition-colors">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <CreditCard className="w-24 h-24 text-yellow-400" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
                <CreditCard className="h-4 w-4 text-yellow-400" />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold font-display text-yellow-400">${activeMonthlySubs.toFixed(2)}<span className="text-lg text-muted-foreground font-normal">/mo</span></div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {subscriptions.filter(s => s.isActive).length} active services
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <motion.div variants={itemVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 md:px-0">
          {/* Recent Expenses — emerald */}
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 backdrop-blur-sm border-emerald-500/20 shadow-lg shadow-black/10 hover:border-emerald-400/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-display">Recent Expenses</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Last 7 days spending activity</p>
              </div>
              <Link href="/finance">
                <Button variant="ghost" size="icon" className="hover-elevate text-emerald-400 hover:text-emerald-300">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="h-[240px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={last7Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Spent']}
                    />
                    <Area type="monotone" dataKey="total" stroke="#34d399" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Tasks — blue */}
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm border-blue-500/20 shadow-lg shadow-black/10 flex flex-col hover:border-blue-400/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="font-display">Upcoming Tasks</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Tasks requiring your attention</p>
              </div>
              <Link href="/tasks">
                <Button variant="ghost" size="icon" className="hover-elevate text-blue-400 hover:text-blue-300">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              <div className="space-y-4 mt-4">
                {tasks.filter(t => !t.completed).sort((a, b) => {
                  if (a.priority === "high" && b.priority !== "high") return -1;
                  if (a.priority !== "high" && b.priority === "high") return 1;
                  return 0;
                }).slice(0, 4).map(task => (
                  <div key={task.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border/30">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{task.title}</span>
                      {task.deadline && (
                        <span className={`text-xs mt-1 ${isAfter(new Date(), new Date(task.deadline)) ? "text-destructive" : "text-muted-foreground"}`}>
                          Due: {format(new Date(task.deadline), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                    <div className={`
                      px-2.5 py-1 rounded-full text-xs font-semibold capitalize
                      ${task.priority === 'high' ? 'bg-destructive/10 text-destructive border border-destructive/20' : ''}
                      ${task.priority === 'medium' ? 'bg-chart-4/10 text-chart-4 border border-chart-4/20' : ''}
                      ${task.priority === 'low' ? 'bg-primary/10 text-primary border border-primary/20' : ''}
                    `}>
                      {task.priority}
                    </div>
                  </div>
                ))}
                {tasks.filter(t => !t.completed).length === 0 && (
                  <div className="h-full flex items-center justify-center text-muted-foreground py-12">
                    No pending tasks. You're all caught up!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Gym — orange */}
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 backdrop-blur-sm border-orange-500/20 shadow-lg shadow-black/10 flex flex-col overflow-hidden relative group hover:border-orange-400/40 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              {isTodayRest
                ? <Moon className="w-24 h-24 text-orange-400" />
                : <Dumbbell className="w-24 h-24 text-orange-400" />}
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <div>
                <CardTitle className="font-display">Today's Workout</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {format(new Date(), 'EEEE')} · {weekTrainingDays} training day{weekTrainingDays !== 1 ? "s" : ""} this week
                </p>
              </div>
              <Link href="/gym">
                <Button variant="ghost" size="icon" className="hover-elevate relative z-10 text-orange-400 hover:text-orange-300">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="flex-1 relative z-10">
              {isTodayRest ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-orange-400/10 flex items-center justify-center mb-3">
                    <Moon className="w-6 h-6 text-orange-400" />
                  </div>
                  <p className="font-semibold text-orange-400">Rest Day</p>
                  <p className="text-xs text-muted-foreground mt-1">Recovery is part of the plan.</p>
                </div>
              ) : todaysExercises.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-3">
                    <Dumbbell className="w-6 h-6 text-orange-400/60" />
                  </div>
                  <p className="text-sm text-muted-foreground">No workout planned for today.</p>
                  <Link href="/gym">
                    <span className="text-xs text-orange-400 hover:underline mt-1 cursor-pointer">Plan your workout →</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2 mt-2">
                  {todaysExercises.slice(0, 5).map((ex) => (
                    <div key={ex.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-orange-500/5 border border-orange-500/15">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                        <span className="font-medium text-sm text-foreground truncate">{ex.name}</span>
                      </div>
                      {(ex.sets || ex.reps || ex.weight) && (
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ex.sets ? `${ex.sets} sets` : ex.reps ? `${ex.reps} reps` : ""}
                          {ex.weight ? ` @ ${ex.weight}` : ""}
                        </span>
                      )}
                    </div>
                  ))}
                  {todaysExercises.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      +{todaysExercises.length - 5} more exercises
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 pt-2 text-xs text-muted-foreground">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    {todaysExercises.length} exercise{todaysExercises.length !== 1 ? "s" : ""} planned
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Bottom row: Notes + Goals ────────────────────────────── */}
        <motion.div variants={itemVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4 md:px-0">

          {/* Latest Note — amber */}
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 backdrop-blur-sm border-amber-500/20 shadow-lg shadow-black/10 group hover:border-amber-400/40 transition-colors overflow-hidden relative flex flex-col">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <StickyNote className="w-24 h-24 text-amber-400" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <div>
                <CardTitle className="font-display">Latest Note</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {notes.length} note{notes.length !== 1 ? "s" : ""} saved
                </p>
              </div>
              <Link href="/notes">
                <Button variant="ghost" size="icon" className="hover-elevate relative z-10 text-amber-400 hover:text-amber-300">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="flex-1 relative z-10">
              {!latestNote ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
                    <StickyNote className="w-5 h-5 text-amber-400/60" />
                  </div>
                  <p className="text-sm text-muted-foreground">No notes yet.</p>
                  <Link href="/notes">
                    <span className="text-xs text-amber-400 hover:underline mt-1 cursor-pointer">Create your first note →</span>
                  </Link>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 hover:border-amber-400/25 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-foreground leading-snug">{latestNote.title}</h3>
                    <span className="text-[10px] text-muted-foreground/60 shrink-0 mt-0.5">
                      {format(new Date(latestNote.updatedAt), 'MMM d')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{latestNote.content}</p>
                  {notes.length > 1 && (
                    <p className="text-xs text-muted-foreground/60 mt-3">
                      +{notes.length - 1} more note{notes.length - 1 !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Goals — pink */}
          <Card className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 backdrop-blur-sm border-pink-500/20 shadow-lg shadow-black/10 group hover:border-pink-400/40 transition-colors overflow-hidden relative flex flex-col">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Target className="w-24 h-24 text-pink-400" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <div>
                <CardTitle className="font-display">Goals</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {completedGoals.length} of {goals.length} completed · {goalCompletionPct}%
                </p>
              </div>
              <Link href="/goals">
                <Button variant="ghost" size="icon" className="hover-elevate relative z-10 text-pink-400 hover:text-pink-300">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="flex-1 relative z-10">
              {goals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center mb-3">
                    <Target className="w-5 h-5 text-pink-400/60" />
                  </div>
                  <p className="text-sm text-muted-foreground">No goals set yet.</p>
                  <Link href="/goals">
                    <span className="text-xs text-pink-400 hover:underline mt-1 cursor-pointer">Set your first goal →</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {goals.length > 0 && (
                    <div className="mb-4">
                      <div className="h-2 rounded-full bg-secondary/60 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${goalCompletionPct}%`,
                            background: "linear-gradient(90deg, #f472b6, #ec4899)",
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {activeGoals.slice(0, 4).map(goal => (
                    <div key={goal.id} className="flex items-center gap-3 p-3 rounded-xl bg-pink-500/5 border border-pink-500/15">
                      <div className="relative w-8 h-8 shrink-0">
                        <svg width="32" height="32" className="-rotate-90">
                          <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="3" className="text-border/40" />
                          <circle cx="16" cy="16" r="12" fill="none" stroke="#f472b6" strokeWidth="3"
                            strokeDasharray={2 * Math.PI * 12}
                            strokeDashoffset={2 * Math.PI * 12 * (1 - goal.progress / 100)}
                            strokeLinecap="round"
                            className="transition-all"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-foreground">{goal.progress}%</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{goal.title}</p>
                        {goal.targetDate && (
                          <p className="text-xs text-muted-foreground">Due {format(new Date(goal.targetDate), 'MMM d, yy')}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {activeGoals.length > 4 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">+{activeGoals.length - 4} more active goals</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

        </motion.div>
      </div>
    </Layout>
  );
}
