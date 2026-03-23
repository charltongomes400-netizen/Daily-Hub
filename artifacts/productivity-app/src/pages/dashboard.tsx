import { useGetTasks, useGetExpenses, useGetSubscriptions } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, ArrowRight, Dumbbell, Moon, Flame, StickyNote, Target } from "lucide-react";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/useAuth";
import { WelcomeAnimation } from "@/components/WelcomeAnimation";
import { format, isAfter } from "date-fns";
import { motion } from "framer-motion";
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

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyExpenses = expenses
    .filter(e => { const d = new Date(e.date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; })
    .reduce((sum, e) => sum + e.amount, 0);

  const isLoading = loadingTasks || loadingExpenses || loadingSubs;

  const latestNote = [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  const activeGoals = goals.filter(g => g.status === "active");
  const completedGoals = goals.filter(g => g.status === "completed");
  const goalCompletionPct = goals.length === 0 ? 0 : Math.round((completedGoals.length / goals.length) * 100);
  const pendingTasks = tasks.filter(t => !t.completed).length;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex flex-col gap-3 p-3 animate-pulse lg:grid lg:h-full lg:overflow-hidden lg:gap-4 lg:p-4" style={{ gridTemplateRows: 'auto minmax(0,1fr) minmax(0,1fr)' }}>
          <div className="h-16 sm:h-20 bg-card border border-border/40 rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
            {[1,2].map(i => <div key={i} className="min-h-[220px] lg:min-h-0 bg-card border border-border/40 rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
            {[1,2].map(i => <div key={i} className="min-h-[200px] lg:min-h-0 bg-card border border-border/40 rounded-2xl" />)}
          </div>
        </div>
      </Layout>
    );
  }

  const fade = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 28 } }
  };
  const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };

  return (
    <>
      {showWelcome && <WelcomeAnimation name={user?.name ?? ""} onComplete={() => setShowWelcome(false)} />}
      <Layout>
        <div
          className="flex flex-col gap-3 p-3 overflow-y-auto lg:grid lg:h-full lg:overflow-hidden lg:gap-4 lg:p-4"
          style={{ gridTemplateRows: 'auto minmax(0,1fr) minmax(0,1fr)' }}
        >
          {/* ── Header ── */}
          <motion.div variants={fade} initial="hidden" animate="show"
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-5 py-4 sm:px-6 sm:py-5 rounded-2xl bg-card border border-border/40">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight text-foreground leading-tight">
                {firstName ? `Good to see you, ${firstName}.` : "Welcome back."}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                <p className="text-sm text-muted-foreground">{format(now, 'EEEE, MMM d')}</p>
                <span className="w-px h-3.5 bg-border/60 hidden sm:block" />
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="font-medium text-emerald-400">${monthlyExpenses.toFixed(2)}</span>
                  <span>this month</span>
                </span>
                {pendingTasks > 0 && (
                  <span className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{pendingTasks}</span> task{pendingTasks !== 1 ? "s" : ""} pending
                  </span>
                )}
              </div>
            </div>
            <div className="hidden sm:block text-right shrink-0">
              <div className="text-3xl font-display font-bold tabular-nums text-foreground/90 leading-none">
                {format(now, 'h:mm')}
                <span className="text-base font-semibold text-muted-foreground ml-1">{format(now, 'aa')}</span>
              </div>
            </div>
          </motion.div>

          {/* ── Row 2: Tasks · Gym ── */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 lg:min-h-0">

            {/* Upcoming Tasks */}
            <motion.div variants={fade} className="min-h-[220px] lg:min-h-0 flex flex-col">
              <Card className="bg-gradient-to-b from-blue-500/8 to-transparent border-blue-500/20 flex flex-col h-full overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between px-5 py-4 pb-3 shrink-0">
                  <div>
                    <CardTitle className="text-sm font-semibold text-blue-400">Upcoming Tasks</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {pendingTasks === 0 ? "All caught up" : `${pendingTasks} pending`}
                    </p>
                  </div>
                  <Link href="/tasks">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-400/60 hover:text-blue-300">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 overflow-y-auto px-5 pb-4 pt-0">
                  {pendingTasks === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">All caught up!</div>
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

            {/* Today's Workout */}
            <motion.div variants={fade} className="min-h-[220px] lg:min-h-0 flex flex-col">
              <Card className="bg-gradient-to-b from-orange-500/8 to-transparent border-orange-500/20 flex flex-col h-full overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between px-5 py-4 pb-3 shrink-0">
                  <div>
                    <CardTitle className="text-sm font-semibold text-orange-400">Today's Workout</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(), 'EEEE')} · {weekTrainingDays} day{weekTrainingDays !== 1 ? "s" : ""}/week
                    </p>
                  </div>
                  <Link href="/gym">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-orange-400/60 hover:text-orange-300">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 overflow-y-auto px-5 pb-4 pt-0">
                  {isTodayRest ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-1.5">
                      <Moon className="w-6 h-6 text-muted-foreground/50" />
                      <p className="text-sm font-medium text-foreground">Rest Day</p>
                      <p className="text-xs text-muted-foreground">Recovery is part of the plan.</p>
                    </div>
                  ) : todaysExercises.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-1.5">
                      <Dumbbell className="w-6 h-6 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">No workout planned.</p>
                      <Link href="/gym"><span className="text-xs text-primary hover:underline cursor-pointer">Plan it →</span></Link>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {todaysExercises.slice(0, 8).map((ex) => (
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
                      {todaysExercises.length > 8 && (
                        <p className="text-[10px] text-muted-foreground text-center pt-1">+{todaysExercises.length - 8} more</p>
                      )}
                      <div className="flex items-center gap-1.5 pt-1 text-[10px] text-muted-foreground">
                        <Flame className="w-3 h-3 text-orange-400" />
                        {todaysExercises.length} exercise{todaysExercises.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* ── Row 3: Notes · Goals ── */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 lg:min-h-0">

            {/* Latest Note */}
            <motion.div variants={fade} className="min-h-[200px] lg:min-h-0 flex flex-col gap-3">
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
                    <div className="flex flex-col items-center justify-center h-full text-center gap-1.5">
                      <StickyNote className="w-6 h-6 text-muted-foreground/40" />
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
                      {notes.length > 1 && (
                        <p className="text-[10px] text-muted-foreground/60 mt-2">+{notes.length - 1} more</p>
                      )}
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

            {/* Goals */}
            <motion.div variants={fade} className="min-h-[200px] lg:min-h-0 flex flex-col">
              <Card className="bg-gradient-to-b from-pink-500/8 to-transparent border-pink-500/20 flex flex-col h-full overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between px-5 py-4 pb-3 shrink-0">
                  <div>
                    <CardTitle className="text-sm font-semibold text-pink-400">Goals</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {completedGoals.length} of {goals.length} completed · {goalCompletionPct}%
                    </p>
                  </div>
                  <Link href="/goals">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-pink-400/60 hover:text-pink-300">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 overflow-y-auto px-5 pb-4 pt-0">
                  {goals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-1.5">
                      <Target className="w-6 h-6 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">No goals yet.</p>
                      <Link href="/goals"><span className="text-xs text-primary hover:underline cursor-pointer">Set one →</span></Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {goals.length > 0 && (
                        <div className="mb-3">
                          <div className="h-1 rounded-full bg-secondary/60 overflow-hidden">
                            <div className="h-full rounded-full bg-pink-400 transition-all duration-700"
                              style={{ width: `${goalCompletionPct}%` }} />
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
                            {goal.targetDate && (
                              <p className="text-[10px] text-muted-foreground">Due {format(new Date(goal.targetDate), 'MMM d, yy')}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      {activeGoals.length > 5 && (
                        <p className="text-[10px] text-muted-foreground text-center">+{activeGoals.length - 5} more</p>
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
