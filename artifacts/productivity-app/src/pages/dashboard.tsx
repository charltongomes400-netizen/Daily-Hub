import { useGetTasks, useGetExpenses, useGetSubscriptions } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import {
  Wallet, ArrowRight, Dumbbell, Moon, Flame, StickyNote, Target,
  CheckCircle2, Settings2, Eye, EyeOff, X, Circle,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/useAuth";
import { WelcomeAnimation } from "@/components/WelcomeAnimation";
import { format, isAfter } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";

interface GymExercise { id: number; dayOfWeek: number; name: string; sets: number | null; reps: number | null; weight: string | null; notes: string | null; }
interface Note { id: number; title: string; content: string; updatedAt: string; }
interface Goal { id: number; title: string; description: string | null; status: "active" | "completed"; progress: number; targetDate: string | null; category: string | null; }

type WidgetId = "tasks" | "gym" | "notes" | "goals";
const WIDGET_META: { id: WidgetId; label: string; color: string }[] = [
  { id: "tasks", label: "Upcoming Tasks",  color: "text-blue-400"   },
  { id: "gym",   label: "Today's Workout", color: "text-orange-400" },
  { id: "notes", label: "Latest Note",     color: "text-amber-400"  },
  { id: "goals", label: "Goals",           color: "text-pink-400"   },
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

/* ── Small reusable pieces ─────────────────────────────────── */
function IconBox({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div className={`p-3 rounded-2xl shadow-lg ${color} flex items-center justify-center shrink-0`}>
      {children}
    </div>
  );
}

function StatTile({ href, label, sub, value, icon, iconBg }: {
  href: string; label: string; sub: string; value: React.ReactNode; icon: React.ReactNode; iconBg: string;
}) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.15 }}
        className="group flex items-start justify-between gap-3 p-5 rounded-2xl bg-card border border-border/60
          hover:border-border transition-all cursor-pointer"
      >
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-none">{label}</p>
          <div className="text-[2rem] font-display font-bold text-foreground tabular-nums leading-tight mt-2">{value}</div>
          <p className="text-xs text-muted-foreground mt-1 leading-none">{sub}</p>
        </div>
        <IconBox color={iconBg}>{icon}</IconBox>
      </motion.div>
    </Link>
  );
}

/* ── Widget card shell ─────────────────────────────────────── */
function WidgetCard({ gradient, border, glow, headerAccent, title, sub, href, arrowColor, children }: {
  gradient: string; border: string; glow: string; headerAccent: string; title: string; sub: string;
  href: string; arrowColor: string; children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col h-full rounded-2xl border ${border} bg-gradient-to-b ${gradient} overflow-hidden`}
      style={{ boxShadow: glow }}>
      <div className="flex items-center justify-between px-5 py-4 pb-3 shrink-0">
        <div>
          <p className={`text-sm font-semibold ${headerAccent}`}>{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
        </div>
        <Link href={href}>
          <div className={`p-1.5 rounded-xl ${arrowColor} hover:opacity-100 opacity-50 transition-opacity`}>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4 pt-0">{children}</div>
    </div>
  );
}

function EmptyState({ icon, label, linkHref, linkLabel }: { icon: React.ReactNode; label: string; linkHref: string; linkLabel: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-6">
      <div className="opacity-30">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <Link href={linkHref}><span className="text-xs text-primary hover:underline cursor-pointer">{linkLabel}</span></Link>
    </div>
  );
}

function RowItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-secondary/50 border border-border/30">
      {children}
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────── */
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
    function h(e: MouseEvent) { if (customizeRef.current && !customizeRef.current.contains(e.target as Node)) setShowCustomize(false); }
    if (showCustomize) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showCustomize]);

  function toggleWidget(id: WidgetId) {
    setWidgets(c => {
      const next = { ...c, [id]: !c[id] };
      try { localStorage.setItem("dashboard-widgets", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  const { data: tasks = [],        isLoading: lt } = useGetTasks();
  const { data: expenses = [],      isLoading: le } = useGetExpenses();
  const { data: subscriptions = [],  isLoading: ls } = useGetSubscriptions();
  const { data: gymExercises = [] } = useQuery<GymExercise[]>({ queryKey: ["/api/gym"],   queryFn: () => fetch("/api/gym").then(r => r.json()) });
  const { data: notes = [] }        = useQuery<Note[]>({        queryKey: ["/api/notes"], queryFn: () => fetch("/api/notes").then(r => r.json()) });
  const { data: goals = [] }        = useQuery<Goal[]>({        queryKey: ["/api/goals"], queryFn: () => fetch("/api/goals").then(r => r.json()) });

  const todayIdx        = new Date().getDay();
  const restDays        = getRestDays();
  const isTodayRest     = restDays.has(todayIdx);
  const todaysExercises = gymExercises.filter(e => e.dayOfWeek === todayIdx);
  const weekDays        = Array.from({ length: 7 }, (_, i) => i).filter(i => !restDays.has(i) && gymExercises.some(e => e.dayOfWeek === i)).length;
  const curMonth        = now.getMonth();
  const curYear         = now.getFullYear();
  const monthSpend      = expenses.filter(e => { const d = new Date(e.date); return d.getMonth() === curMonth && d.getFullYear() === curYear; }).reduce((s, e) => s + e.amount, 0);
  const latestNote      = [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  const activeGoals     = goals.filter(g => g.status === "active");
  const doneGoals       = goals.filter(g => g.status === "completed");
  const goalPct         = goals.length === 0 ? 0 : Math.round((doneGoals.length / goals.length) * 100);
  const pendingTasks    = tasks.filter(t => !t.completed).length;
  const isLoading       = lt || le || ls;

  const fade    = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 26 } } };
  const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-4 flex flex-col gap-4 animate-pulse h-full">
          <div className="h-36 bg-card border border-border/40 rounded-2xl" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-28 bg-card border border-border/40 rounded-2xl" />)}
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
        <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto lg:overflow-hidden">

          {/* ── HERO CARD ──────────────────────────────────────────── */}
          <motion.div variants={fade} initial="hidden" animate="show" className="shrink-0">
            <div className="relative overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/20 via-blue-600/10 to-card"
              style={{ boxShadow: "0 0 40px rgba(124,58,237,0.12), 0 0 80px rgba(59,130,246,0.06)" }}>

              {/* decorative orbs */}
              <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-6 right-20 w-32 h-32 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

              <div className="relative flex items-center justify-between px-6 py-5 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-violet-300/70 uppercase tracking-widest mb-1">{format(now, 'EEEE, MMMM d')}</p>
                  <h1 className="text-2xl sm:text-3xl font-display font-bold text-white leading-tight">
                    {firstName ? `Good to see you, ${firstName}.` : "Welcome back."}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    {pendingTasks > 0
                      ? <><span className="text-foreground font-semibold">{pendingTasks}</span> task{pendingTasks !== 1 ? "s" : ""} pending · <span className="text-emerald-400 font-semibold">${monthSpend.toFixed(2)}</span> spent this month</>
                      : <>All caught up · <span className="text-emerald-400 font-semibold">${monthSpend.toFixed(2)}</span> spent this month</>
                    }
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {/* Clock */}
                  <div className="hidden sm:flex flex-col items-end">
                    <p className="text-4xl font-display font-bold tabular-nums text-white/90 leading-none">
                      {format(now, 'h:mm')}
                    </p>
                    <p className="text-sm font-semibold text-muted-foreground mt-0.5">{format(now, 'aa')}</p>
                  </div>
                  {/* Customize */}
                  <div ref={customizeRef} className="relative">
                    <button
                      onClick={() => setShowCustomize(s => !s)}
                      className={`p-2.5 rounded-xl border transition-all ${showCustomize ? "bg-white/10 border-white/20 text-white" : "border-white/10 text-white/40 hover:bg-white/10 hover:text-white/80"}`}
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
                          transition={{ duration: 0.14 }}
                          className="absolute top-full right-0 mt-2 w-52 bg-popover border border-border/60 rounded-xl shadow-2xl z-50 overflow-hidden"
                        >
                          <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
                            <span className="text-xs font-semibold text-foreground">Visible widgets</span>
                            <button onClick={() => setShowCustomize(false)} className="text-muted-foreground hover:text-foreground">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {WIDGET_META.map(w => (
                            <button key={w.id} onClick={() => toggleWidget(w.id)}
                              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-secondary/60 transition-colors group">
                              <span className={`text-sm font-medium ${widgets[w.id] ? w.color : "text-muted-foreground/50"}`}>{w.label}</span>
                              {widgets[w.id]
                                ? <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                                : <EyeOff className="w-3.5 h-3.5 text-muted-foreground/30" />}
                            </button>
                          ))}
                          <div className="px-4 py-2.5 border-t border-border/30">
                            <button onClick={() => setShowWelcome(true)} className="w-full text-[10px] text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors text-left">
                              ▶ preview welcome animation
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── STAT TILES (Vision UI style icon-box) ─────────────── */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <motion.div variants={fade}>
              <StatTile href="/tasks" label="Tasks pending" sub="across all lists"
                value={pendingTasks}
                iconBg="bg-blue-500 shadow-blue-500/40"
                icon={<CheckCircle2 className="w-5 h-5 text-white" />}
              />
            </motion.div>
            <motion.div variants={fade}>
              <StatTile href="/finance" label="Spent this month" sub="total expenses"
                value={<span className="text-2xl">${monthSpend.toFixed(0)}</span>}
                iconBg="bg-emerald-500 shadow-emerald-500/40"
                icon={<Wallet className="w-5 h-5 text-white" />}
              />
            </motion.div>
            <motion.div variants={fade}>
              <StatTile href="/goals" label="Goals complete" sub={`${doneGoals.length} of ${goals.length} goals`}
                value={<>{goalPct}<span className="text-lg font-semibold text-muted-foreground">%</span></>}
                iconBg="bg-pink-500 shadow-pink-500/40"
                icon={<Target className="w-5 h-5 text-white" />}
              />
            </motion.div>
            <motion.div variants={fade}>
              <StatTile href="/gym" label="Today's exercises" sub={isTodayRest ? "rest day" : `${weekDays} days/week`}
                value={isTodayRest ? <Moon className="w-7 h-7 text-muted-foreground/50 inline" /> : todaysExercises.length}
                iconBg="bg-orange-500 shadow-orange-500/40"
                icon={<Dumbbell className="w-5 h-5 text-white" />}
              />
            </motion.div>
          </motion.div>

          {/* ── WIDGET CARDS ───────────────────────────────────────── */}
          {visibleWidgets.length > 0 ? (
            <motion.div
              variants={stagger} initial="hidden" animate="show"
              className={`grid gap-3 lg:gap-4 flex-1 min-h-0
                ${visibleWidgets.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}
            >
              <AnimatePresence>

                {/* Tasks */}
                {widgets.tasks && (
                  <motion.div key="tasks" variants={fade} layout className="min-h-[200px] lg:min-h-0">
                    <WidgetCard
                      gradient="from-blue-500/12 to-transparent"
                      border="border-blue-500/25"
                      glow="0 0 30px rgba(59,130,246,0.08)"
                      headerAccent="text-blue-400"
                      title="Upcoming Tasks"
                      sub={pendingTasks === 0 ? "All caught up" : `${pendingTasks} pending`}
                      href="/tasks"
                      arrowColor="text-blue-400"
                    >
                      {pendingTasks === 0 ? (
                        <EmptyState icon={<CheckCircle2 className="w-9 h-9 text-blue-400" />} label="No pending tasks right now." linkHref="/tasks" linkLabel="Go to Tasks →" />
                      ) : (
                        <div className="space-y-1.5">
                          {tasks.filter(t => !t.completed).sort((a, b) => {
                            if (a.priority === "high" && b.priority !== "high") return -1;
                            if (a.priority !== "high" && b.priority === "high") return 1;
                            return 0;
                          }).slice(0, 8).map(task => (
                            <RowItem key={task.id}>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-medium text-foreground truncate">{task.title}</span>
                                {task.deadline && (
                                  <span className={`text-[10px] mt-0.5 ${isAfter(new Date(), new Date(task.deadline)) ? "text-red-400" : "text-muted-foreground"}`}>
                                    Due {format(new Date(task.deadline), 'MMM d')}
                                  </span>
                                )}
                              </div>
                              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-semibold capitalize shrink-0 border
                                ${task.priority === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' : ''}
                                ${task.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : ''}
                                ${task.priority === 'low' ? 'bg-border/40 text-muted-foreground border-border/30' : ''}
                              `}>{task.priority}</span>
                            </RowItem>
                          ))}
                        </div>
                      )}
                    </WidgetCard>
                  </motion.div>
                )}

                {/* Gym */}
                {widgets.gym && (
                  <motion.div key="gym" variants={fade} layout className="min-h-[200px] lg:min-h-0">
                    <WidgetCard
                      gradient="from-orange-500/12 to-transparent"
                      border="border-orange-500/25"
                      glow="0 0 30px rgba(249,115,22,0.08)"
                      headerAccent="text-orange-400"
                      title="Today's Workout"
                      sub={`${format(new Date(), 'EEEE')} · ${weekDays} day${weekDays !== 1 ? "s" : ""}/week`}
                      href="/gym"
                      arrowColor="text-orange-400"
                    >
                      {isTodayRest ? (
                        <EmptyState icon={<Moon className="w-9 h-9 text-muted-foreground" />} label="Rest day — recovery is part of the plan." linkHref="/gym" linkLabel="View schedule →" />
                      ) : todaysExercises.length === 0 ? (
                        <EmptyState icon={<Dumbbell className="w-9 h-9 text-orange-400" />} label="No workout planned today." linkHref="/gym" linkLabel="Plan it →" />
                      ) : (
                        <div className="space-y-1.5">
                          {todaysExercises.slice(0, 8).map(ex => (
                            <RowItem key={ex.id}>
                              <span className="text-xs font-medium text-foreground truncate">{ex.name}</span>
                              {(ex.sets || ex.reps) && (
                                <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                                  {ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ex.sets ? `${ex.sets} sets` : `${ex.reps} reps`}
                                  {ex.weight ? ` @ ${ex.weight}` : ""}
                                </span>
                              )}
                            </RowItem>
                          ))}
                          {todaysExercises.length > 8 && <p className="text-[10px] text-muted-foreground text-center pt-1">+{todaysExercises.length - 8} more</p>}
                          <div className="flex items-center gap-1.5 pt-1">
                            <Flame className="w-3 h-3 text-orange-400" />
                            <span className="text-[10px] text-muted-foreground">{todaysExercises.length} exercise{todaysExercises.length !== 1 ? "s" : ""}</span>
                          </div>
                        </div>
                      )}
                    </WidgetCard>
                  </motion.div>
                )}

                {/* Notes */}
                {widgets.notes && (
                  <motion.div key="notes" variants={fade} layout className="min-h-[200px] lg:min-h-0">
                    <WidgetCard
                      gradient="from-amber-500/12 to-transparent"
                      border="border-amber-500/25"
                      glow="0 0 30px rgba(245,158,11,0.08)"
                      headerAccent="text-amber-400"
                      title="Latest Note"
                      sub={`${notes.length} note${notes.length !== 1 ? "s" : ""} saved`}
                      href="/notes"
                      arrowColor="text-amber-400"
                    >
                      {!latestNote ? (
                        <EmptyState icon={<StickyNote className="w-9 h-9 text-amber-400" />} label="No notes yet." linkHref="/notes" linkLabel="Create one →" />
                      ) : (
                        <div className="h-full p-3 rounded-xl bg-amber-500/6 border border-amber-500/15">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-sm text-foreground leading-snug truncate">{latestNote.title || "Untitled"}</h3>
                            <span className="text-[10px] text-muted-foreground shrink-0">{format(new Date(latestNote.updatedAt), 'MMM d')}</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-5 leading-relaxed">{latestNote.content.replace(/<[^>]*>/g, '')}</p>
                          {notes.length > 1 && <p className="text-[10px] text-muted-foreground/50 mt-2">+{notes.length - 1} more</p>}
                        </div>
                      )}
                    </WidgetCard>
                  </motion.div>
                )}

                {/* Goals */}
                {widgets.goals && (
                  <motion.div key="goals" variants={fade} layout className="min-h-[200px] lg:min-h-0">
                    <WidgetCard
                      gradient="from-pink-500/12 to-transparent"
                      border="border-pink-500/25"
                      glow="0 0 30px rgba(236,72,153,0.08)"
                      headerAccent="text-pink-400"
                      title="Goals"
                      sub={`${doneGoals.length} of ${goals.length} completed · ${goalPct}%`}
                      href="/goals"
                      arrowColor="text-pink-400"
                    >
                      {goals.length === 0 ? (
                        <EmptyState icon={<Target className="w-9 h-9 text-pink-400" />} label="No goals set yet." linkHref="/goals" linkLabel="Set one →" />
                      ) : (
                        <div className="space-y-2">
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] text-muted-foreground">Overall progress</span>
                              <span className="text-[10px] font-semibold text-pink-400">{goalPct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-secondary/70 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${goalPct}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="h-full rounded-full bg-gradient-to-r from-pink-500 to-pink-400"
                              />
                            </div>
                          </div>
                          {activeGoals.slice(0, 5).map(goal => (
                            <RowItem key={goal.id}>
                              <div className="relative w-7 h-7 shrink-0">
                                <svg width="28" height="28" className="-rotate-90">
                                  <circle cx="14" cy="14" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-border/60" />
                                  <circle cx="14" cy="14" r="10" fill="none" stroke="rgb(244 114 182)" strokeWidth="2.5"
                                    strokeDasharray={2 * Math.PI * 10}
                                    strokeDashoffset={2 * Math.PI * 10 * (1 - goal.progress / 100)}
                                    strokeLinecap="round" className="transition-all" />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-foreground">{goal.progress}%</span>
                              </div>
                              <div className="flex-1 min-w-0 ml-3">
                                <p className="text-xs font-medium text-foreground truncate">{goal.title}</p>
                                {goal.targetDate && <p className="text-[10px] text-muted-foreground">Due {format(new Date(goal.targetDate), 'MMM d, yy')}</p>}
                              </div>
                            </RowItem>
                          ))}
                          {activeGoals.length > 5 && <p className="text-[10px] text-muted-foreground text-center">+{activeGoals.length - 5} more</p>}
                        </div>
                      )}
                    </WidgetCard>
                  </motion.div>
                )}

              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
              <Settings2 className="w-10 h-10 text-muted-foreground/20" />
              <p className="text-sm font-medium text-muted-foreground">All widgets hidden</p>
              <p className="text-xs text-muted-foreground/50">Click the settings icon in the header to show widgets.</p>
            </div>
          )}

        </div>
      </Layout>
    </>
  );
}
