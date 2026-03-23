import { useGetTasks, useGetExpenses, useGetSubscriptions } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
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

/* ─────────────────────────────────────── reusable pieces ──── */

/* Vision UI style icon box */
function IconBox({ children, bg, shadow }: { children: React.ReactNode; bg: string; shadow: string }) {
  return (
    <div className={`p-3 rounded-2xl flex items-center justify-center shrink-0 ${bg}`}
      style={{ boxShadow: shadow }}>
      {children}
    </div>
  );
}

/* Vision UI stat tile — dark gradient panel + colored icon box */
function StatTile({ href, label, sub, value, icon, iconBg, iconShadow, borderGlow }: {
  href: string; label: string; sub: string; value: React.ReactNode;
  icon: React.ReactNode; iconBg: string; iconShadow: string; borderGlow: string;
}) {
  return (
    <Link href={href}>
      <motion.div whileHover={{ y: -2, scale: 1.01 }} transition={{ duration: 0.15 }}
        className="group flex items-start justify-between gap-3 p-5 rounded-2xl cursor-pointer transition-all"
        style={{
          background: "linear-gradient(127deg, rgba(6,11,40,0.85) 20%, rgba(10,14,35,0.55) 77%)",
          border: `1px solid ${borderGlow}`,
          backdropFilter: "blur(12px)",
          boxShadow: "0 2px 20px rgba(0,0,0,0.4)",
        }}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-blue-200/50 uppercase tracking-widest leading-none">{label}</p>
          <div className="text-[2rem] font-display font-bold text-white tabular-nums leading-tight mt-2">{value}</div>
          <p className="text-[11px] text-blue-200/40 mt-1 leading-none">{sub}</p>
        </div>
        <IconBox bg={iconBg} shadow={iconShadow}>{icon}</IconBox>
      </motion.div>
    </Link>
  );
}

/* Vision UI widget card */
function WidgetCard({ headerAccent, accentRgb, title, sub, href, children }: {
  headerAccent: string; accentRgb: string; title: string; sub: string; href: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(127deg, rgba(6,11,40,0.92) 20%, rgba(10,14,35,0.60) 77%)",
        border: `1px solid rgba(${accentRgb}, 0.30)`,
        backdropFilter: "blur(12px)",
        boxShadow: `0 0 40px rgba(${accentRgb}, 0.07), 0 2px 20px rgba(0,0,0,0.4)`,
      }}>
      {/* header stripe */}
      <div className="flex items-center justify-between px-5 py-4 pb-3 shrink-0"
        style={{ borderBottom: `1px solid rgba(${accentRgb}, 0.15)` }}>
        <div>
          <p className={`text-sm font-bold ${headerAccent}`}>{title}</p>
          <p className="text-[11px] text-blue-200/40 mt-0.5">{sub}</p>
        </div>
        <Link href={href}>
          <div className={`p-1.5 rounded-xl ${headerAccent} opacity-40 hover:opacity-90 transition-opacity`}>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4 pt-3">{children}</div>
    </div>
  );
}

function EmptyState({ icon, label, linkHref, linkLabel }: { icon: React.ReactNode; label: string; linkHref: string; linkLabel: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-6">
      <div className="opacity-25">{icon}</div>
      <p className="text-xs text-blue-200/40">{label}</p>
      <Link href={linkHref}><span className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer transition-colors">{linkLabel}</span></Link>
    </div>
  );
}

function RowItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-xl"
      style={{ background: "rgba(10,14,50,0.60)", border: "1px solid rgba(100,130,255,0.12)" }}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────── main component ────── */
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

  const fade    = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 24 } } };
  const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-4 flex flex-col gap-4 animate-pulse h-full">
          <div className="h-36 rounded-2xl" style={{ background: "rgba(10,14,50,0.7)", border: "1px solid rgba(100,130,255,0.15)" }} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-2xl" style={{ background: "rgba(10,14,50,0.7)" }} />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            {[1,2,3,4].map(i => <div key={i} className="min-h-[160px] rounded-2xl" style={{ background: "rgba(10,14,50,0.7)" }} />)}
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
        <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">

          {/* ── HERO ─────────────────────────────────────────────── */}
          <motion.div variants={fade} initial="hidden" animate="show" className="shrink-0">
            <div className="relative overflow-hidden rounded-2xl"
              style={{
                background: "linear-gradient(127deg, rgba(25,15,80,0.95) 0%, rgba(8,25,80,0.90) 50%, rgba(6,11,40,0.95) 100%)",
                border: "1px solid rgba(120,100,255,0.35)",
                boxShadow: "0 0 60px rgba(100,60,255,0.18), 0 0 120px rgba(40,80,255,0.10), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}>

              {/* animated ambient glows */}
              <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(120,80,255,0.22) 0%, transparent 70%)" }} />
              <div className="absolute -bottom-10 left-1/3 w-48 h-48 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(50,100,255,0.16) 0%, transparent 70%)" }} />
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg, transparent, rgba(150,120,255,0.5), transparent)" }} />

              <div className="relative flex items-center justify-between px-6 py-5 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-1.5"
                    style={{ color: "rgba(160,140,255,0.70)" }}>
                    {format(now, 'EEEE, MMMM d')}
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-display font-bold text-white leading-tight">
                    {firstName ? `Welcome back, ${firstName}.` : "Welcome back."}
                  </h1>
                  <p className="text-sm mt-2" style={{ color: "rgba(180,190,255,0.55)" }}>
                    {pendingTasks > 0
                      ? <><span className="text-white font-semibold">{pendingTasks}</span> task{pendingTasks !== 1 ? "s" : ""} pending · <span style={{ color: "#4ade80" }} className="font-semibold">${monthSpend.toFixed(2)}</span> spent this month</>
                      : <>All caught up · <span style={{ color: "#4ade80" }} className="font-semibold">${monthSpend.toFixed(2)}</span> spent this month</>
                    }
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Clock */}
                  <div className="hidden sm:flex flex-col items-end">
                    <p className="text-4xl font-display font-bold tabular-nums leading-none"
                      style={{ color: "rgba(220,225,255,0.95)" }}>
                      {format(now, 'h:mm')}
                    </p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: "rgba(160,170,255,0.50)" }}>
                      {format(now, 'aa')}
                    </p>
                  </div>

                  {/* Customize */}
                  <div ref={customizeRef} className="relative">
                    <button onClick={() => setShowCustomize(s => !s)} title="Customise dashboard"
                      className="p-2.5 rounded-xl transition-all"
                      style={{
                        background: showCustomize ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: showCustomize ? "white" : "rgba(200,210,255,0.45)",
                      }}>
                      <Settings2 className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {showCustomize && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.96 }}
                          transition={{ duration: 0.14 }}
                          className="absolute top-full right-0 mt-2 w-52 rounded-xl shadow-2xl z-50 overflow-hidden"
                          style={{ background: "rgba(10,14,50,0.96)", border: "1px solid rgba(100,130,255,0.25)", backdropFilter: "blur(20px)" }}
                        >
                          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(100,130,255,0.15)" }}>
                            <span className="text-xs font-bold text-white/80">Visible widgets</span>
                            <button onClick={() => setShowCustomize(false)} className="text-blue-200/40 hover:text-white/80">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {WIDGET_META.map(w => (
                            <button key={w.id} onClick={() => toggleWidget(w.id)}
                              className="w-full flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-white/5">
                              <span className={`text-sm font-medium ${widgets[w.id] ? w.color : "text-blue-200/30"}`}>{w.label}</span>
                              {widgets[w.id]
                                ? <Eye className="w-3.5 h-3.5 text-blue-200/40" />
                                : <EyeOff className="w-3.5 h-3.5 text-blue-200/20" />}
                            </button>
                          ))}
                          <div className="px-4 py-2.5" style={{ borderTop: "1px solid rgba(100,130,255,0.12)" }}>
                            <button onClick={() => setShowWelcome(true)} className="w-full text-[10px] text-left text-blue-200/25 hover:text-blue-200/60 transition-colors">
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

          {/* ── STAT TILES ───────────────────────────────────────── */}
          <motion.div variants={stagger} initial="hidden" animate="show"
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">

            <motion.div variants={fade}>
              <StatTile href="/tasks" label="Tasks Pending" sub="across all lists"
                value={pendingTasks}
                iconBg="bg-blue-500"
                iconShadow="0 4px 20px rgba(59,130,246,0.50)"
                borderGlow="rgba(59,130,246,0.28)"
                icon={<CheckCircle2 className="w-5 h-5 text-white" />}
              />
            </motion.div>
            <motion.div variants={fade}>
              <StatTile href="/finance" label="Spent This Month" sub="total expenses"
                value={<>${monthSpend.toFixed(0)}</>}
                iconBg="bg-emerald-500"
                iconShadow="0 4px 20px rgba(16,185,129,0.50)"
                borderGlow="rgba(16,185,129,0.28)"
                icon={<Wallet className="w-5 h-5 text-white" />}
              />
            </motion.div>
            <motion.div variants={fade}>
              <StatTile href="/goals" label="Goals Complete" sub={`${doneGoals.length} of ${goals.length} total`}
                value={<>{goalPct}<span className="text-2xl text-white/40">%</span></>}
                iconBg="bg-pink-500"
                iconShadow="0 4px 20px rgba(236,72,153,0.50)"
                borderGlow="rgba(236,72,153,0.28)"
                icon={<Target className="w-5 h-5 text-white" />}
              />
            </motion.div>
            <motion.div variants={fade}>
              <StatTile href="/gym" label="Today's Exercises" sub={isTodayRest ? "rest day" : `${weekDays} days/week`}
                value={isTodayRest ? <Moon className="w-7 h-7 inline" style={{ color: "rgba(200,210,255,0.30)" }} /> : todaysExercises.length}
                iconBg="bg-orange-500"
                iconShadow="0 4px 20px rgba(249,115,22,0.50)"
                borderGlow="rgba(249,115,22,0.28)"
                icon={<Dumbbell className="w-5 h-5 text-white" />}
              />
            </motion.div>

          </motion.div>

          {/* ── WIDGET CARDS ─────────────────────────────────────── */}
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
                    <WidgetCard accentRgb="59,130,246" headerAccent="text-blue-400"
                      title="Upcoming Tasks" sub={pendingTasks === 0 ? "All caught up" : `${pendingTasks} pending`}
                      href="/tasks">
                      {pendingTasks === 0 ? (
                        <EmptyState icon={<CheckCircle2 className="w-9 h-9 text-blue-400" />} label="No pending tasks." linkHref="/tasks" linkLabel="Go to Tasks →" />
                      ) : (
                        <div className="space-y-1.5">
                          {tasks.filter(t => !t.completed).sort((a, b) => {
                            if (a.priority === "high" && b.priority !== "high") return -1;
                            if (a.priority !== "high" && b.priority === "high") return 1;
                            return 0;
                          }).slice(0, 8).map(task => (
                            <RowItem key={task.id}>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-medium text-white/85 truncate">{task.title}</span>
                                {task.deadline && (
                                  <span className={`text-[10px] mt-0.5 ${isAfter(new Date(), new Date(task.deadline)) ? "text-red-400" : "text-blue-200/40"}`}>
                                    Due {format(new Date(task.deadline), 'MMM d')}
                                  </span>
                                )}
                              </div>
                              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold capitalize shrink-0
                                ${task.priority === 'high' ? 'bg-red-500/15 text-red-400' : ''}
                                ${task.priority === 'medium' ? 'bg-yellow-500/15 text-yellow-400' : ''}
                                ${task.priority === 'low' ? 'text-blue-200/35' : ''}
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
                    <WidgetCard accentRgb="249,115,22" headerAccent="text-orange-400"
                      title="Today's Workout" sub={`${format(new Date(), 'EEEE')} · ${weekDays} day${weekDays !== 1 ? "s" : ""}/week`}
                      href="/gym">
                      {isTodayRest ? (
                        <EmptyState icon={<Moon className="w-9 h-9 text-blue-200/50" />} label="Rest day — recovery is part of the plan." linkHref="/gym" linkLabel="View schedule →" />
                      ) : todaysExercises.length === 0 ? (
                        <EmptyState icon={<Dumbbell className="w-9 h-9 text-orange-400" />} label="No workout planned today." linkHref="/gym" linkLabel="Plan it →" />
                      ) : (
                        <div className="space-y-1.5">
                          {todaysExercises.slice(0, 8).map(ex => (
                            <RowItem key={ex.id}>
                              <span className="text-xs font-medium text-white/85 truncate">{ex.name}</span>
                              {(ex.sets || ex.reps) && (
                                <span className="text-[10px] text-blue-200/40 shrink-0 ml-2">
                                  {ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ex.sets ? `${ex.sets} sets` : `${ex.reps} reps`}
                                  {ex.weight ? ` @ ${ex.weight}` : ""}
                                </span>
                              )}
                            </RowItem>
                          ))}
                          {todaysExercises.length > 8 && <p className="text-[10px] text-blue-200/35 text-center pt-1">+{todaysExercises.length - 8} more</p>}
                          <div className="flex items-center gap-1.5 pt-1">
                            <Flame className="w-3 h-3 text-orange-400" />
                            <span className="text-[10px] text-blue-200/40">{todaysExercises.length} exercise{todaysExercises.length !== 1 ? "s" : ""}</span>
                          </div>
                        </div>
                      )}
                    </WidgetCard>
                  </motion.div>
                )}

                {/* Notes */}
                {widgets.notes && (
                  <motion.div key="notes" variants={fade} layout className="min-h-[200px] lg:min-h-0">
                    <WidgetCard accentRgb="245,158,11" headerAccent="text-amber-400"
                      title="Latest Note" sub={`${notes.length} note${notes.length !== 1 ? "s" : ""} saved`}
                      href="/notes">
                      {!latestNote ? (
                        <EmptyState icon={<StickyNote className="w-9 h-9 text-amber-400" />} label="No notes yet." linkHref="/notes" linkLabel="Create one →" />
                      ) : (
                        <div className="h-full p-3 rounded-xl"
                          style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-bold text-sm text-white/90 leading-snug truncate">{latestNote.title || "Untitled"}</h3>
                            <span className="text-[10px] text-blue-200/35 shrink-0">{format(new Date(latestNote.updatedAt), 'MMM d')}</span>
                          </div>
                          <p className="text-xs text-blue-200/50 line-clamp-5 leading-relaxed">{latestNote.content.replace(/<[^>]*>/g, '')}</p>
                          {notes.length > 1 && <p className="text-[10px] text-blue-200/25 mt-2">+{notes.length - 1} more</p>}
                        </div>
                      )}
                    </WidgetCard>
                  </motion.div>
                )}

                {/* Goals */}
                {widgets.goals && (
                  <motion.div key="goals" variants={fade} layout className="min-h-[200px] lg:min-h-0">
                    <WidgetCard accentRgb="236,72,153" headerAccent="text-pink-400"
                      title="Goals" sub={`${doneGoals.length} of ${goals.length} completed · ${goalPct}%`}
                      href="/goals">
                      {goals.length === 0 ? (
                        <EmptyState icon={<Target className="w-9 h-9 text-pink-400" />} label="No goals set yet." linkHref="/goals" linkLabel="Set one →" />
                      ) : (
                        <div className="space-y-2.5">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] text-blue-200/40">Overall progress</span>
                              <span className="text-[10px] font-bold text-pink-400">{goalPct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(236,72,153,0.12)" }}>
                              <motion.div
                                initial={{ width: 0 }} animate={{ width: `${goalPct}%` }}
                                transition={{ duration: 0.9, ease: "easeOut" }}
                                className="h-full rounded-full"
                                style={{ background: "linear-gradient(90deg, #ec4899, #f472b6)", boxShadow: "0 0 8px rgba(236,72,153,0.5)" }}
                              />
                            </div>
                          </div>
                          {activeGoals.slice(0, 5).map(goal => (
                            <RowItem key={goal.id}>
                              <div className="relative w-7 h-7 shrink-0">
                                <svg width="28" height="28" className="-rotate-90">
                                  <circle cx="14" cy="14" r="10" fill="none" stroke="rgba(236,72,153,0.15)" strokeWidth="2.5" />
                                  <circle cx="14" cy="14" r="10" fill="none" stroke="#ec4899" strokeWidth="2.5"
                                    strokeDasharray={2 * Math.PI * 10}
                                    strokeDashoffset={2 * Math.PI * 10 * (1 - goal.progress / 100)}
                                    strokeLinecap="round" style={{ filter: "drop-shadow(0 0 3px rgba(236,72,153,0.6))" }} />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white/80">{goal.progress}%</span>
                              </div>
                              <div className="flex-1 min-w-0 ml-3">
                                <p className="text-xs font-medium text-white/85 truncate">{goal.title}</p>
                                {goal.targetDate && <p className="text-[10px] text-blue-200/40">Due {format(new Date(goal.targetDate), 'MMM d, yy')}</p>}
                              </div>
                            </RowItem>
                          ))}
                          {activeGoals.length > 5 && <p className="text-[10px] text-blue-200/30 text-center">+{activeGoals.length - 5} more</p>}
                        </div>
                      )}
                    </WidgetCard>
                  </motion.div>
                )}

              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
              <Settings2 className="w-10 h-10" style={{ color: "rgba(100,130,255,0.20)" }} />
              <p className="text-sm font-medium" style={{ color: "rgba(180,190,255,0.40)" }}>All widgets hidden</p>
              <p className="text-xs" style={{ color: "rgba(180,190,255,0.25)" }}>Click the settings icon in the header to show widgets.</p>
            </div>
          )}

        </div>
      </Layout>
    </>
  );
}
