import { useGetTasks, useGetExpenses, useGetSubscriptions } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Wallet, ArrowRight, Dumbbell, Moon, Flame, StickyNote, Target,
  CheckCircle2, Settings2, Eye, EyeOff, X,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/useAuth";
import { WelcomeAnimation } from "@/components/WelcomeAnimation";
import { format, isAfter } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface GymExercise { id: number; dayOfWeek: number; name: string; sets: number | null; reps: number | null; weight: string | null; notes: string | null; }
interface Note { id: number; title: string; content: string; updatedAt: string; }
interface Goal { id: number; title: string; description: string | null; status: "active" | "completed"; progress: number; targetDate: string | null; category: string | null; }

type WidgetId = "tasks" | "gym" | "notes" | "goals";

const WIDGET_META: { id: WidgetId; label: string; color: string }[] = [
  { id: "tasks", label: "Upcoming Tasks", color: "text-blue-400" },
  { id: "gym",   label: "Today's Workout", color: "text-orange-400" },
  { id: "notes", label: "Latest Note",    color: "text-amber-400" },
  { id: "goals", label: "Goals",          color: "text-pink-400" },
];

const DEFAULT_WIDGETS: Record<WidgetId, boolean> = { tasks: true, gym: true, notes: true, goals: true };

function loadWidgets(): Record<WidgetId, boolean> {
  try { const s = localStorage.getItem("dashboard-widgets"); if (s) return { ...DEFAULT_WIDGETS, ...JSON.parse(s) }; } catch {}
  return DEFAULT_WIDGETS;
}

function getRestDays(): Set<number> {
  try { const s = localStorage.getItem("gym-rest-days"); if (s) return new Set(JSON.parse(s) as number[]); } catch {}
  return new Set();
}

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "";
  const [showWelcome, setShowWelcome] = useState(() => {
    try { if (!sessionStorage.getItem("ph_welcomed")) { sessionStorage.setItem("ph_welcomed", "1"); return true; } } catch {}
    return false;
  });
  const [now, setNow] = useState(new Date());
  const [widgets, setWidgets] = useState<Record<WidgetId, boolean>>(loadWidgets);
  const [showCustomize, setShowCustomize] = useState(false);
  const customizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (customizeRef.current && !customizeRef.current.contains(e.target as Node)) setShowCustomize(false);
    }
    if (showCustomize) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCustomize]);

  function toggleWidget(id: WidgetId) {
    setWidgets(c => {
      const next = { ...c, [id]: !c[id] };
      try { localStorage.setItem("dashboard-widgets", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  const { data: tasks = [],         isLoading: loadingTasks    } = useGetTasks();
  const { data: expenses = [],       isLoading: loadingExpenses } = useGetExpenses();
  const { data: subscriptions = [],  isLoading: loadingSubs     } = useGetSubscriptions();
  const { data: gymExercises = [] }  = useQuery<GymExercise[]>({ queryKey: ["/api/gym"],    queryFn: () => fetch("/api/gym").then(r => r.json()) });
  const { data: notes = [] }         = useQuery<Note[]>({         queryKey: ["/api/notes"],  queryFn: () => fetch("/api/notes").then(r => r.json()) });
  const { data: goals = [] }         = useQuery<Goal[]>({         queryKey: ["/api/goals"],  queryFn: () => fetch("/api/goals").then(r => r.json()) });

  const todayIndex       = new Date().getDay();
  const restDaySet       = getRestDays();
  const isTodayRest      = restDaySet.has(todayIndex);
  const todaysExercises  = gymExercises.filter(e => e.dayOfWeek === todayIndex);
  const weekTrainingDays = Array.from({ length: 7 }, (_, i) => i).filter(i => !restDaySet.has(i) && gymExercises.some(e => e.dayOfWeek === i)).length;
  const currentMonth     = new Date().getMonth();
  const currentYear      = new Date().getFullYear();
  const monthlyExpenses  = expenses.filter(e => { const d = new Date(e.date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; }).reduce((s, e) => s + e.amount, 0);
  const latestNote       = [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  const activeGoals      = goals.filter(g => g.status === "active");
  const completedGoals   = goals.filter(g => g.status === "completed");
  const goalCompletionPct = goals.length === 0 ? 0 : Math.round((completedGoals.length / goals.length) * 100);
  const pendingTasks     = tasks.filter(t => !t.completed).length;
  const isLoading        = loadingTasks || loadingExpenses || loadingSubs;

  const fade    = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 28 } } };
  const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-4 flex flex-col gap-4 animate-pulse h-full">
          <div className="h-14 bg-card border border-border/40 rounded-2xl" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-20 bg-card border border-border/40 rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            {[1,2,3,4].map(i => <div key={i} className="min-h-[160px] bg-card border border-border/40 rounded-2xl" />)}
          </div>
        </div>
      </Layout>
    );
  }

  const visibleWidgets = WIDGET_META.filter(w => widgets[w.id]);

  return (
    <>
      {showWelcome && <WelcomeAnimation name={user?.name ?? ""} onComplete={() => setShowWelcome(false)} />}
      <Layout>
        <div className="flex flex-col gap-3 p-3 lg:p-4 h-full overflow-y-auto lg:overflow-hidden lg:gap-4"
          style={{ gridTemplateRows: undefined }}>

          {/* ── Header ── */}
          <motion.div variants={fade} initial="hidden" animate="show"
            className="flex items-center justify-between gap-4 px-5 py-3.5 rounded-2xl bg-card border border-border/40 shrink-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-display font-bold tracking-tight text-foreground leading-tight">
                {firstName ? `Good to see you, ${firstName}.` : "Welcome back."}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">{format(now, 'EEEE, MMMM d')}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {/* Clock */}
              <div className="hidden sm:block text-right">
                <div className="text-2xl font-display font-bold tabular-nums text-foreground/90 leading-none">
                  {format(now, 'h:mm')}
                  <span className="text-sm font-semibold text-muted-foreground ml-1">{format(now, 'aa')}</span>
                </div>
              </div>
              {/* Customise */}
              <div ref={customizeRef} className="relative">
                <button
                  onClick={() => setShowCustomize(s => !s)}
                  className={`p-2 rounded-xl border transition-all ${showCustomize ? "bg-secondary border-border/60 text-foreground" : "border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground hover:border-border/40"}`}
                  title="Customise dashboard"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {showCustomize && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full right-0 mt-2 w-52 bg-popover border border-border/50 rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">Visible widgets</span>
                        <button onClick={() => setShowCustomize(false)} className="text-muted-foreground hover:text-foreground">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {WIDGET_META.map(w => (
                        <button key={w.id} onClick={() => toggleWidget(w.id)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-secondary/50 transition-colors group">
                          <span className={`text-sm font-medium ${widgets[w.id] ? w.color : "text-muted-foreground"}`}>{w.label}</span>
                          {widgets[w.id]
                            ? <Eye className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                            : <EyeOff className="w-3.5 h-3.5 text-muted-foreground/40" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* ── Quick-stat tiles ── */}
          <motion.div variants={stagger} initial="hidden" animate="show"
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">

            <motion.div variants={fade}>
              <Link href="/tasks">
                <div className="group flex flex-col gap-1.5 px-4 py-3.5 rounded-2xl bg-card border border-blue-500/20 bg-gradient-to-br from-blue-500/8 to-transparent hover:border-blue-500/40 transition-all cursor-pointer">
                  <div className="flex items-center justify-between">
                    <CheckCircle2 className="w-4 h-4 text-blue-400/70" />
                    <ArrowRight className="w-3.5 h-3.5 text-blue-400/30 group-hover:text-blue-400/70 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-foreground tabular-nums leading-none">{pendingTasks}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{pendingTasks === 1 ? "task" : "tasks"} pending</p>
                  </div>
                </div>
              </Link>
            </motion.div>

            <motion.div variants={fade}>
              <Link href="/finance">
                <div className="group flex flex-col gap-1.5 px-4 py-3.5 rounded-2xl bg-card border border-emerald-500/20 bg-gradient-to-br from-emerald-500/8 to-transparent hover:border-emerald-500/40 transition-all cursor-pointer">
                  <div className="flex items-center justify-between">
                    <Wallet className="w-4 h-4 text-emerald-400/70" />
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400/30 group-hover:text-emerald-400/70 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-foreground tabular-nums leading-none">${monthlyExpenses.toFixed(0)}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">spent this month</p>
                  </div>
                </div>
              </Link>
            </motion.div>

            <motion.div variants={fade}>
              <Link href="/goals">
                <div className="group flex flex-col gap-1.5 px-4 py-3.5 rounded-2xl bg-card border border-pink-500/20 bg-gradient-to-br from-pink-500/8 to-transparent hover:border-pink-500/40 transition-all cursor-pointer">
                  <div className="flex items-center justify-between">
                    <Target className="w-4 h-4 text-pink-400/70" />
                    <ArrowRight className="w-3.5 h-3.5 text-pink-400/30 group-hover:text-pink-400/70 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-foreground tabular-nums leading-none">{goalCompletionPct}%</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">goals complete</p>
                    {goals.length > 0 && (
                      <div className="mt-1.5 h-0.5 rounded-full bg-secondary/60 overflow-hidden">
                        <div className="h-full rounded-full bg-pink-400 transition-all duration-700" style={{ width: `${goalCompletionPct}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>

            <motion.div variants={fade}>
              <Link href="/gym">
                <div className="group flex flex-col gap-1.5 px-4 py-3.5 rounded-2xl bg-card border border-orange-500/20 bg-gradient-to-br from-orange-500/8 to-transparent hover:border-orange-500/40 transition-all cursor-pointer">
                  <div className="flex items-center justify-between">
                    <Dumbbell className="w-4 h-4 text-orange-400/70" />
                    <ArrowRight className="w-3.5 h-3.5 text-orange-400/30 group-hover:text-orange-400/70 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div>
                    {isTodayRest ? (
                      <>
                        <p className="text-2xl font-display font-bold text-foreground leading-none flex items-center gap-1.5">
                          <Moon className="w-5 h-5 text-muted-foreground/50" />
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">rest day</p>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-display font-bold text-foreground tabular-nums leading-none">{todaysExercises.length}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">exercises today</p>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>

          </motion.div>

          {/* ── Widget grid ── */}
          {visibleWidgets.length > 0 ? (
            <motion.div
              variants={stagger} initial="hidden" animate="show"
              className={`grid gap-3 lg:gap-4 flex-1 min-h-0
                ${visibleWidgets.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}
            >
              <AnimatePresence>

                {/* Tasks */}
                {widgets.tasks && (
                  <motion.div key="tasks" variants={fade} layout
                    className="min-h-[200px] lg:min-h-0 flex flex-col">
                    <Card className="bg-gradient-to-b from-blue-500/8 to-transparent border-blue-500/20 flex flex-col h-full overflow-hidden">
                      <CardHeader className="flex flex-row items-center justify-between px-5 py-4 pb-3 shrink-0">
                        <div>
                          <CardTitle className="text-sm font-semibold text-blue-400">Upcoming Tasks</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">{pendingTasks === 0 ? "All caught up" : `${pendingTasks} pending`}</p>
                        </div>
                        <Link href="/tasks">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-400/60 hover:text-blue-300">
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </CardHeader>
                      <CardContent className="flex-1 min-h-0 overflow-y-auto px-5 pb-4 pt-0">
                        {pendingTasks === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                            <CheckCircle2 className="w-8 h-8 text-blue-400/30" />
                            <p className="text-sm font-medium text-foreground">All caught up!</p>
                            <p className="text-xs text-muted-foreground">No pending tasks right now.</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {tasks.filter(t => !t.completed).sort((a, b) => {
                              if (a.priority === "high" && b.priority !== "high") return -1;
                              if (a.priority !== "high" && b.priority === "high") return 1;
                              return 0;
                            }).slice(0, 8).map(task => (
                              <div key={task.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-secondary/40 border border-border/30">
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-medium text-foreground truncate">{task.title}</span>
                                  {task.deadline && (
                                    <span className={`text-[10px] mt-0.5 ${isAfter(new Date(), new Date(task.deadline)) ? "text-destructive" : "text-muted-foreground"}`}>
                                      Due {format(new Date(task.deadline), 'MMM d')}
                                    </span>
                                  )}
                                </div>
                                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-semibold capitalize shrink-0 border
                                  ${task.priority === 'high' ? 'bg-destructive/10 text-destructive border-destructive/20' : ''}
                                  ${task.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : ''}
                                  ${task.priority === 'low' ? 'bg-border/40 text-muted-foreground border-border/30' : ''}
                                `}>{task.priority}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Gym */}
                {widgets.gym && (
                  <motion.div key="gym" variants={fade} layout
                    className="min-h-[200px] lg:min-h-0 flex flex-col">
                    <Card className="bg-gradient-to-b from-orange-500/8 to-transparent border-orange-500/20 flex flex-col h-full overflow-hidden">
                      <CardHeader className="flex flex-row items-center justify-between px-5 py-4 pb-3 shrink-0">
                        <div>
                          <CardTitle className="text-sm font-semibold text-orange-400">Today's Workout</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(), 'EEEE')} · {weekTrainingDays} day{weekTrainingDays !== 1 ? "s" : ""}/week</p>
                        </div>
                        <Link href="/gym">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-orange-400/60 hover:text-orange-300">
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </CardHeader>
                      <CardContent className="flex-1 min-h-0 overflow-y-auto px-5 pb-4 pt-0">
                        {isTodayRest ? (
                          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                            <Moon className="w-8 h-8 text-muted-foreground/40" />
                            <p className="text-sm font-medium text-foreground">Rest Day</p>
                            <p className="text-xs text-muted-foreground">Recovery is part of the plan.</p>
                          </div>
                        ) : todaysExercises.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                            <Dumbbell className="w-8 h-8 text-muted-foreground/30" />
                            <p className="text-xs text-muted-foreground">No workout planned.</p>
                            <Link href="/gym"><span className="text-xs text-primary hover:underline cursor-pointer">Plan it →</span></Link>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {todaysExercises.slice(0, 8).map(ex => (
                              <div key={ex.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-secondary/40 border border-border/30">
                                <span className="text-xs font-medium text-foreground truncate">{ex.name}</span>
                                {(ex.sets || ex.reps) && (
                                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                                    {ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ex.sets ? `${ex.sets} sets` : `${ex.reps} reps`}
                                    {ex.weight ? ` @ ${ex.weight}` : ""}
                                  </span>
                                )}
                              </div>
                            ))}
                            {todaysExercises.length > 8 && <p className="text-[10px] text-muted-foreground text-center pt-1">+{todaysExercises.length - 8} more</p>}
                            <div className="flex items-center gap-1.5 pt-1 text-[10px] text-muted-foreground">
                              <Flame className="w-3 h-3 text-orange-400" />
                              {todaysExercises.length} exercise{todaysExercises.length !== 1 ? "s" : ""}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Notes */}
                {widgets.notes && (
                  <motion.div key="notes" variants={fade} layout
                    className="min-h-[200px] lg:min-h-0 flex flex-col gap-3">
                    <Card className="bg-gradient-to-b from-amber-500/8 to-transparent border-amber-500/20 flex flex-col flex-1 overflow-hidden">
                      <CardHeader className="flex flex-row items-center justify-between px-5 py-4 pb-3 shrink-0">
                        <div>
                          <CardTitle className="text-sm font-semibold text-amber-400">Latest Note</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">{notes.length} note{notes.length !== 1 ? "s" : ""} saved</p>
                        </div>
                        <Link href="/notes">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-400/60 hover:text-amber-300">
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </CardHeader>
                      <CardContent className="flex-1 min-h-0 overflow-hidden px-5 pb-4 pt-0">
                        {!latestNote ? (
                          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                            <StickyNote className="w-8 h-8 text-muted-foreground/30" />
                            <p className="text-xs text-muted-foreground">No notes yet.</p>
                            <Link href="/notes"><span className="text-xs text-primary hover:underline cursor-pointer">Create one →</span></Link>
                          </div>
                        ) : (
                          <div className="h-full p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <h3 className="font-semibold text-sm text-foreground leading-snug truncate">{latestNote.title || "Untitled"}</h3>
                              <span className="text-[10px] text-muted-foreground shrink-0">{format(new Date(latestNote.updatedAt), 'MMM d')}</span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed">{latestNote.content.replace(/<[^>]*>/g, '')}</p>
                            {notes.length > 1 && <p className="text-[10px] text-muted-foreground/60 mt-2">+{notes.length - 1} more</p>}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    <button
                      onClick={() => setShowWelcome(true)}
                      className="w-full py-1.5 rounded-lg text-[10px] font-medium tracking-widest uppercase text-muted-foreground/40 border border-border/20 hover:text-muted-foreground/70 hover:border-border/40 transition-all"
                    >
                      ▶ preview animation
                    </button>
                  </motion.div>
                )}

                {/* Goals */}
                {widgets.goals && (
                  <motion.div key="goals" variants={fade} layout
                    className="min-h-[200px] lg:min-h-0 flex flex-col">
                    <Card className="bg-gradient-to-b from-pink-500/8 to-transparent border-pink-500/20 flex flex-col h-full overflow-hidden">
                      <CardHeader className="flex flex-row items-center justify-between px-5 py-4 pb-3 shrink-0">
                        <div>
                          <CardTitle className="text-sm font-semibold text-pink-400">Goals</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">{completedGoals.length} of {goals.length} completed · {goalCompletionPct}%</p>
                        </div>
                        <Link href="/goals">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-pink-400/60 hover:text-pink-300">
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </CardHeader>
                      <CardContent className="flex-1 min-h-0 overflow-y-auto px-5 pb-4 pt-0">
                        {goals.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                            <Target className="w-8 h-8 text-muted-foreground/30" />
                            <p className="text-xs text-muted-foreground">No goals yet.</p>
                            <Link href="/goals"><span className="text-xs text-primary hover:underline cursor-pointer">Set one →</span></Link>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {goals.length > 0 && (
                              <div className="mb-3">
                                <div className="h-1 rounded-full bg-secondary/60 overflow-hidden">
                                  <div className="h-full rounded-full bg-pink-400 transition-all duration-700" style={{ width: `${goalCompletionPct}%` }} />
                                </div>
                              </div>
                            )}
                            {activeGoals.slice(0, 5).map(goal => (
                              <div key={goal.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-secondary/40 border border-border/30">
                                <div className="relative w-7 h-7 shrink-0">
                                  <svg width="28" height="28" className="-rotate-90">
                                    <circle cx="14" cy="14" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-border/50" />
                                    <circle cx="14" cy="14" r="10" fill="none" stroke="rgb(244 114 182)" strokeWidth="2.5"
                                      strokeDasharray={2 * Math.PI * 10}
                                      strokeDashoffset={2 * Math.PI * 10 * (1 - goal.progress / 100)}
                                      strokeLinecap="round" className="transition-all" />
                                  </svg>
                                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-foreground">{goal.progress}%</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-foreground truncate">{goal.title}</p>
                                  {goal.targetDate && <p className="text-[10px] text-muted-foreground">Due {format(new Date(goal.targetDate), 'MMM d, yy')}</p>}
                                </div>
                              </div>
                            ))}
                            {activeGoals.length > 5 && <p className="text-[10px] text-muted-foreground text-center">+{activeGoals.length - 5} more</p>}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
              <Settings2 className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">All widgets hidden</p>
              <p className="text-xs text-muted-foreground/60">Use the settings icon above to show widgets.</p>
            </div>
          )}

        </div>
      </Layout>
    </>
  );
}
