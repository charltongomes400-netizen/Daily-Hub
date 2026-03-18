import { useGetTasks, useGetExpenses, useGetSubscriptions } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Wallet, CreditCard, ArrowRight, Activity, Dumbbell, Moon, Flame, StickyNote, Target } from "lucide-react";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/useAuth";
import { WelcomeAnimation } from "@/components/WelcomeAnimation";
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
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "";
  const [showWelcome, setShowWelcome] = useState(() => {
    try {
      if (!sessionStorage.getItem("ph_welcomed")) {
        sessionStorage.setItem("ph_welcomed", "1");
        return true;
      }
    } catch {}
    return false;
  });
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
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
        <div className="h-full overflow-hidden grid p-2 gap-2 animate-pulse" style={{ gridTemplateRows: 'auto auto minmax(0,1.3fr) minmax(0,1fr)' }}>
          <div className="h-14 bg-card border border-border/50 rounded-2xl" />
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-card border border-border/50 rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3].map(i => <div key={i} className="bg-card border border-border/50 rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[1,2].map(i => <div key={i} className="bg-card border border-border/50 rounded-2xl" />)}
          </div>
        </div>
      </Layout>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 340, damping: 26 } }
  };

  return (
    <>
      {showWelcome && (
        <WelcomeAnimation
          name={user?.name ?? ""}
          onComplete={() => setShowWelcome(false)}
        />
      )}
    <Layout>
      <div
        className="h-full overflow-hidden grid p-3 gap-3"
        style={{ gridTemplateRows: 'auto auto minmax(0,1.3fr) minmax(0,1fr)' }}
      >
        {/* ── Header ── */}
        <motion.div initial="hidden" animate="show" variants={itemVariants}
          className="flex items-center justify-between px-6 py-4 rounded-2xl bg-card/40 border border-border/40 backdrop-blur-sm">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground leading-tight">Welcome back{firstName ? `, ${firstName}` : ""}.</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Your productivity &amp; finance overview</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-display font-bold tabular-nums tracking-tight text-foreground/90 leading-none">
              {format(now, 'HH:mm')}
            </div>
            <div className="text-sm text-muted-foreground font-medium mt-1">
              {format(now, 'EEEE, MMMM d, yyyy')}
            </div>
          </div>
        </motion.div>

        {/* ── Stat Cards ── */}
        <motion.div variants={containerVariants} initial="hidden" animate="show"
          className="grid grid-cols-3 gap-3">
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 overflow-hidden relative group hover:border-blue-400/40 transition-colors">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <CheckCircle2 className="w-14 h-14 text-blue-400" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between p-4 pb-1 relative z-10">
                <CardTitle className="text-xs font-medium text-muted-foreground">Task Completion</CardTitle>
                <Activity className="h-4 w-4 text-blue-400 shrink-0" />
              </CardHeader>
              <CardContent className="p-4 pt-0 relative z-10">
                <div className="text-3xl font-bold font-display text-blue-400">{taskProgress}%</div>
                <p className="text-sm text-muted-foreground mt-0.5">{completedTasks} of {totalTasks} tasks</p>
                {pendingHighPriority > 0 && (
                  <div className="mt-1.5 inline-flex items-center rounded-full border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                    {pendingHighPriority} high priority
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 overflow-hidden relative group hover:border-emerald-400/40 transition-colors">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Wallet className="w-14 h-14 text-emerald-400" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between p-4 pb-1 relative z-10">
                <CardTitle className="text-xs font-medium text-muted-foreground">Monthly Expenses</CardTitle>
                <Wallet className="h-4 w-4 text-emerald-400 shrink-0" />
              </CardHeader>
              <CardContent className="p-4 pt-0 relative z-10">
                <div className="text-3xl font-bold font-display text-emerald-400">${monthlyExpenses.toFixed(2)}</div>
                <p className="text-sm text-muted-foreground mt-0.5">Total in {format(new Date(), 'MMMM')}</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20 overflow-hidden relative group hover:border-yellow-400/40 transition-colors">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <CreditCard className="w-14 h-14 text-yellow-400" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between p-4 pb-1 relative z-10">
                <CardTitle className="text-xs font-medium text-muted-foreground">Active Subscriptions</CardTitle>
                <CreditCard className="h-4 w-4 text-yellow-400 shrink-0" />
              </CardHeader>
              <CardContent className="p-4 pt-0 relative z-10">
                <div className="text-3xl font-bold font-display text-yellow-400">${activeMonthlySubs.toFixed(2)}<span className="text-base text-muted-foreground font-normal">/mo</span></div>
                <p className="text-sm text-muted-foreground mt-0.5">{subscriptions.filter(s => s.isActive).length} active services</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* ── Middle Row: Chart · Tasks · Gym ── */}
        <motion.div variants={containerVariants} initial="hidden" animate="show"
          className="grid grid-cols-3 gap-3 min-h-0">

          {/* Upcoming Tasks — blue */}
          <motion.div variants={itemVariants} className="min-h-0 flex flex-col">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:border-blue-400/40 transition-colors flex flex-col h-full overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 shrink-0">
                <div>
                  <CardTitle className="font-display text-sm">Upcoming Tasks</CardTitle>
                  <p className="text-xs text-muted-foreground">Pending attention</p>
                </div>
                <Link href="/tasks">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-400 hover:text-blue-300">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 overflow-y-auto p-3 pt-0">
                <div className="space-y-1.5">
                  {tasks.filter(t => !t.completed).sort((a, b) => {
                    if (a.priority === "high" && b.priority !== "high") return -1;
                    if (a.priority !== "high" && b.priority === "high") return 1;
                    return 0;
                  }).slice(0, 6).map(task => (
                    <div key={task.id} className="flex items-center justify-between p-2 rounded-xl bg-blue-500/5 border border-blue-500/15">
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-xs text-foreground truncate">{task.title}</span>
                        {task.deadline && (
                          <span className={`text-[10px] mt-0.5 ${isAfter(new Date(), new Date(task.deadline)) ? "text-destructive" : "text-muted-foreground"}`}>
                            Due {format(new Date(task.deadline), 'MMM d')}
                          </span>
                        )}
                      </div>
                      <div className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold capitalize shrink-0 ml-2
                        ${task.priority === 'high' ? 'bg-destructive/10 text-destructive border border-destructive/20' : ''}
                        ${task.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : ''}
                        ${task.priority === 'low' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : ''}
                      `}>{task.priority}</div>
                    </div>
                  ))}
                  {tasks.filter(t => !t.completed).length === 0 && (
                    <div className="flex items-center justify-center h-full py-8 text-xs text-muted-foreground">All caught up!</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Expenses — emerald */}
          <motion.div variants={itemVariants} className="min-h-0 flex flex-col">
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 hover:border-emerald-400/40 transition-colors flex flex-col h-full overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 shrink-0">
                <div>
                  <CardTitle className="font-display text-sm">Recent Expenses</CardTitle>
                  <p className="text-xs text-muted-foreground">Last 7 days</p>
                </div>
                <Link href="/finance">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-400 hover:text-emerald-300">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 p-3 pt-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={last7Days} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(v: number) => [`$${v.toFixed(2)}`, 'Spent']}
                    />
                    <Area type="monotone" dataKey="total" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Gym — orange */}
          <motion.div variants={itemVariants} className="min-h-0 flex flex-col">
            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20 hover:border-orange-400/40 transition-colors flex flex-col h-full overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                {isTodayRest ? <Moon className="w-14 h-14 text-orange-400" /> : <Dumbbell className="w-14 h-14 text-orange-400" />}
              </div>
              <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 shrink-0 relative z-10">
                <div>
                  <CardTitle className="font-display text-sm">Today's Workout</CardTitle>
                  <p className="text-xs text-muted-foreground">{format(new Date(), 'EEEE')} · {weekTrainingDays} day{weekTrainingDays !== 1 ? "s" : ""}/week</p>
                </div>
                <Link href="/gym">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-orange-400 hover:text-orange-300 relative z-10">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 overflow-y-auto p-3 pt-0 relative z-10">
                {isTodayRest ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-10 h-10 rounded-2xl bg-orange-400/10 flex items-center justify-center mb-2">
                      <Moon className="w-5 h-5 text-orange-400" />
                    </div>
                    <p className="font-semibold text-orange-400 text-sm">Rest Day</p>
                    <p className="text-xs text-muted-foreground mt-1">Recovery is part of the plan.</p>
                  </div>
                ) : todaysExercises.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-2">
                      <Dumbbell className="w-5 h-5 text-orange-400/60" />
                    </div>
                    <p className="text-xs text-muted-foreground">No workout planned.</p>
                    <Link href="/gym"><span className="text-xs text-orange-400 hover:underline cursor-pointer">Plan it →</span></Link>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {todaysExercises.slice(0, 6).map((ex) => (
                      <div key={ex.id} className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-orange-500/5 border border-orange-500/15">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-1 h-1 rounded-full bg-orange-400 shrink-0" />
                          <span className="font-medium text-xs text-foreground truncate">{ex.name}</span>
                        </div>
                        {(ex.sets || ex.reps) && (
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                            {ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ex.sets ? `${ex.sets} sets` : `${ex.reps} reps`}
                            {ex.weight ? ` @ ${ex.weight}` : ""}
                          </span>
                        )}
                      </div>
                    ))}
                    {todaysExercises.length > 6 && (
                      <p className="text-[10px] text-muted-foreground text-center">+{todaysExercises.length - 6} more</p>
                    )}
                    <div className="flex items-center gap-1 pt-1 text-[10px] text-muted-foreground">
                      <Flame className="w-3 h-3 text-orange-400" />
                      {todaysExercises.length} exercise{todaysExercises.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* ── Bottom Row: Notes · Goals ── */}
        <motion.div variants={containerVariants} initial="hidden" animate="show"
          className="grid grid-cols-2 gap-3 min-h-0">

          {/* Latest Note — amber */}
          <motion.div variants={itemVariants} className="min-h-0 flex flex-col gap-2">
            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20 hover:border-amber-400/40 transition-colors flex flex-col flex-1 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <StickyNote className="w-14 h-14 text-amber-400" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 shrink-0 relative z-10">
                <div>
                  <CardTitle className="font-display text-sm">Latest Note</CardTitle>
                  <p className="text-xs text-muted-foreground">{notes.length} note{notes.length !== 1 ? "s" : ""} saved</p>
                </div>
                <Link href="/notes">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-400 hover:text-amber-300 relative z-10">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 overflow-hidden p-3 pt-0 relative z-10">
                {!latestNote ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center mb-2">
                      <StickyNote className="w-4 h-4 text-amber-400/60" />
                    </div>
                    <p className="text-xs text-muted-foreground">No notes yet.</p>
                    <Link href="/notes"><span className="text-xs text-amber-400 hover:underline cursor-pointer mt-1">Create one →</span></Link>
                  </div>
                ) : (
                  <div className="h-full p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="font-semibold text-sm text-foreground leading-snug truncate">{latestNote.title}</h3>
                      <span className="text-[10px] text-muted-foreground/60 shrink-0">{format(new Date(latestNote.updatedAt), 'MMM d')}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed">{latestNote.content}</p>
                    {notes.length > 1 && (
                      <p className="text-[10px] text-muted-foreground/60 mt-2">+{notes.length - 1} more</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            <button
              onClick={() => setShowWelcome(true)}
              className="w-full py-1.5 rounded-lg text-[10px] font-medium tracking-widest uppercase text-violet-400/50 border border-violet-500/15 bg-violet-500/5 hover:bg-violet-500/10 hover:text-violet-400/80 hover:border-violet-500/30 transition-all"
            >
              ▶ preview animation
            </button>
          </motion.div>

          {/* Goals — pink */}
          <motion.div variants={itemVariants} className="min-h-0 flex flex-col">
            <Card className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border-pink-500/20 hover:border-pink-400/40 transition-colors flex flex-col h-full overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Target className="w-14 h-14 text-pink-400" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 shrink-0 relative z-10">
                <div>
                  <CardTitle className="font-display text-sm">Goals</CardTitle>
                  <p className="text-xs text-muted-foreground">{completedGoals.length} of {goals.length} completed · {goalCompletionPct}%</p>
                </div>
                <Link href="/goals">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-pink-400 hover:text-pink-300 relative z-10">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 overflow-y-auto p-3 pt-0 relative z-10">
                {goals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center mb-2">
                      <Target className="w-4 h-4 text-pink-400/60" />
                    </div>
                    <p className="text-xs text-muted-foreground">No goals yet.</p>
                    <Link href="/goals"><span className="text-xs text-pink-400 hover:underline cursor-pointer mt-1">Set one →</span></Link>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="mb-2">
                      <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${goalCompletionPct}%`, background: "linear-gradient(90deg, #f472b6, #ec4899)" }} />
                      </div>
                    </div>
                    {activeGoals.slice(0, 4).map(goal => (
                      <div key={goal.id} className="flex items-center gap-2.5 p-2 rounded-xl bg-pink-500/5 border border-pink-500/15">
                        <div className="relative w-7 h-7 shrink-0">
                          <svg width="28" height="28" className="-rotate-90">
                            <circle cx="14" cy="14" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-border/40" />
                            <circle cx="14" cy="14" r="10" fill="none" stroke="#f472b6" strokeWidth="2.5"
                              strokeDasharray={2 * Math.PI * 10}
                              strokeDashoffset={2 * Math.PI * 10 * (1 - goal.progress / 100)}
                              strokeLinecap="round" className="transition-all" />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-foreground">{goal.progress}%</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{goal.title}</p>
                          {goal.targetDate && (
                            <p className="text-[10px] text-muted-foreground">Due {format(new Date(goal.targetDate), 'MMM d, yy')}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {activeGoals.length > 4 && (
                      <p className="text-[10px] text-muted-foreground text-center">+{activeGoals.length - 4} more</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

        </motion.div>
      </div>
    </Layout>
    </>
  );
}
