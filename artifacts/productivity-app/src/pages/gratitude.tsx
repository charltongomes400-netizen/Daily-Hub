import { useState, useRef, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isFuture, isAfter, subMonths, addMonths, differenceInCalendarDays, startOfDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ChevronLeft, ChevronRight, Flame, Sparkles, X, Pencil, Trash2, Image } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface GratitudeEntry {
  id: number;
  date: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

async function fetchEntries(month: number, year: number): Promise<GratitudeEntry[]> {
  const r = await fetch(`/api/gratitude?month=${month}&year=${year}`);
  if (!r.ok) throw new Error();
  return r.json();
}
async function apiCreate(data: { date: string; content: string }): Promise<GratitudeEntry> {
  const r = await fetch("/api/gratitude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error || "Failed");
  }
  return r.json();
}
async function apiPatch(id: number, data: { content: string }): Promise<GratitudeEntry> {
  const r = await fetch(`/api/gratitude/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!r.ok) throw new Error();
  return r.json();
}
async function apiDelete(id: number): Promise<void> {
  const r = await fetch(`/api/gratitude/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error("Failed to delete");
}

function computeStreak(entries: GratitudeEntry[]): number {
  if (entries.length === 0) return 0;
  const dateSet = new Set(entries.map(e => e.date));
  let streak = 0;
  const today = startOfDay(new Date());
  let d = today;
  if (!dateSet.has(format(d, "yyyy-MM-dd"))) {
    d = new Date(d);
    d.setDate(d.getDate() - 1);
  }
  while (dateSet.has(format(d, "yyyy-MM-dd"))) {
    streak++;
    d = new Date(d);
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export default function Gratitude() {
  const queryClient = useQueryClient();
  const [viewDate, setViewDate] = useState(new Date());
  const month = viewDate.getMonth() + 1;
  const year = viewDate.getFullYear();
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<GratitudeEntry | null>(null);
  const [content, setContent] = useState("");
  const [showWrapUp, setShowWrapUp] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["/api/gratitude", month, year],
    queryFn: () => fetchEntries(month, year),
  });

  const prevMonth = subMonths(viewDate, 1);
  const { data: prevEntries = [] } = useQuery({
    queryKey: ["/api/gratitude", prevMonth.getMonth() + 1, prevMonth.getFullYear()],
    queryFn: () => fetchEntries(prevMonth.getMonth() + 1, prevMonth.getFullYear()),
  });

  const allEntries = [...entries, ...prevEntries];
  const streak = computeStreak(allEntries);

  const createMut = useMutation({
    mutationFn: apiCreate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/gratitude"] }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) => apiPatch(id, { content }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/gratitude"] }),
  });
  const deleteMut = useMutation({
    mutationFn: apiDelete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/gratitude"] }),
  });

  const entryMap = new Map<string, GratitudeEntry>();
  entries.forEach(e => entryMap.set(e.date, e));

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const today = startOfDay(new Date());
  const filledCount = entries.length;
  const totalDays = days.length;
  const pastDays = days.filter(d => !isFuture(d)).length;
  const completionPct = pastDays === 0 ? 0 : Math.round((filledCount / pastDays) * 100);
  const canGoNext = isAfter(startOfMonth(addMonths(viewDate, 1)), today) ? false : true;
  const isCurrentMonth = viewDate.getMonth() === today.getMonth() && viewDate.getFullYear() === today.getFullYear();

  const todayEntry = entryMap.get(format(today, "yyyy-MM-dd"));

  function openModal(dateStr: string) {
    const existing = entryMap.get(dateStr);
    if (existing) {
      setEditEntry(existing);
      setContent(existing.content);
    } else {
      setEditEntry(null);
      setContent("");
    }
    setModalDate(dateStr);
  }

  function closeModal() {
    setModalDate(null);
    setEditEntry(null);
    setContent("");
  }

  function handleSave() {
    if (!content.trim() || !modalDate) return;
    if (editEntry) {
      updateMut.mutate({ id: editEntry.id, content: content.trim() }, { onSuccess: closeModal });
    } else {
      createMut.mutate({ date: modalDate, content: content.trim() }, { onSuccess: closeModal });
    }
  }

  function handleDelete(id: number) {
    deleteMut.mutate(id);
    closeModal();
  }

  useEffect(() => {
    if (modalDate && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [modalDate]);

  const fade = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 24 } } };
  const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } };

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto flex flex-col h-full overflow-y-auto">
        <motion.div variants={fade} initial="hidden" animate="show">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground flex items-center gap-3">
                Gratitude
                <Heart className="w-7 h-7 text-rose-400 fill-rose-400/30" />
              </h1>
              <p className="text-muted-foreground mt-1">One thing you're grateful for, every day.</p>
            </div>

            <button
              onClick={() => setShowWrapUp(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, rgba(244,63,94,0.15), rgba(251,146,60,0.15))",
                border: "1px solid rgba(244,63,94,0.3)",
                color: "rgba(251,146,60,0.9)",
              }}
            >
              <Image className="w-4 h-4" />
              Monthly Wrap-Up
            </button>
          </div>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
          <motion.div variants={fade} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl p-4 flex items-center gap-4"
              style={{
                background: "linear-gradient(127deg, rgba(6,11,40,0.85) 20%, rgba(10,14,35,0.55) 77%)",
                border: "1px solid rgba(244,63,94,0.28)",
                backdropFilter: "blur(12px)",
              }}>
              <div className="p-3 rounded-2xl bg-rose-500 shrink-0" style={{ boxShadow: "0 4px 20px rgba(244,63,94,0.50)" }}>
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-blue-200/50 uppercase tracking-widest">Streak</p>
                <p className="text-2xl font-display font-bold text-white tabular-nums">{streak} <span className="text-sm text-white/40">day{streak !== 1 ? "s" : ""}</span></p>
              </div>
            </div>

            <div className="rounded-2xl p-4"
              style={{
                background: "linear-gradient(127deg, rgba(6,11,40,0.85) 20%, rgba(10,14,35,0.55) 77%)",
                border: "1px solid rgba(251,146,60,0.28)",
                backdropFilter: "blur(12px)",
              }}>
              <p className="text-[11px] font-semibold text-blue-200/50 uppercase tracking-widest mb-2">Month Progress</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(251,146,60,0.12)" }}>
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${completionPct}%` }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #f43f5e, #fb923c)", boxShadow: "0 0 8px rgba(244,63,94,0.5)" }}
                  />
                </div>
                <span className="text-sm font-bold text-white tabular-nums">{completionPct}%</span>
              </div>
              <p className="text-[10px] text-blue-200/40 mt-1">{filledCount} of {pastDays} days filled</p>
            </div>

            {isCurrentMonth && todayEntry ? (
              <div className="rounded-2xl p-4 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, rgba(244,63,94,0.12), rgba(251,146,60,0.08))",
                  border: "1px solid rgba(244,63,94,0.25)",
                }}>
                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                  <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full" style={{ background: "radial-gradient(circle, rgba(244,63,94,0.15) 0%, transparent 70%)" }} />
                </div>
                <p className="text-[11px] font-semibold text-rose-400/70 uppercase tracking-widest mb-1 relative">Today's Spotlight</p>
                <p className="text-sm text-white/85 leading-relaxed line-clamp-2 relative">{todayEntry.content}</p>
              </div>
            ) : isCurrentMonth ? (
              <button onClick={() => openModal(format(today, "yyyy-MM-dd"))}
                className="rounded-2xl p-4 text-left transition-all hover:scale-[1.01] cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, rgba(244,63,94,0.06), rgba(251,146,60,0.04))",
                  border: "1px dashed rgba(244,63,94,0.30)",
                }}>
                <p className="text-[11px] font-semibold text-rose-400/50 uppercase tracking-widest mb-1">Today</p>
                <p className="text-sm text-rose-300/50">Tap to add what you're grateful for...</p>
                <Sparkles className="w-4 h-4 text-rose-400/30 mt-2" />
              </button>
            ) : (
              <div className="rounded-2xl p-4"
                style={{
                  background: "linear-gradient(127deg, rgba(6,11,40,0.85) 20%, rgba(10,14,35,0.55) 77%)",
                  border: "1px solid rgba(100,130,255,0.15)",
                }}>
                <p className="text-[11px] font-semibold text-blue-200/50 uppercase tracking-widest mb-2">Entries</p>
                <p className="text-2xl font-display font-bold text-white tabular-nums">{filledCount} <span className="text-sm text-white/40">of {totalDays}</span></p>
              </div>
            )}
          </motion.div>

          <motion.div variants={fade}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setViewDate(subMonths(viewDate, 1))}
                className="p-2 rounded-xl text-muted-foreground/50 hover:text-foreground hover:bg-secondary/60 transition-all">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="font-display font-bold text-lg text-foreground">
                {format(viewDate, "MMMM yyyy")}
              </h2>
              <button onClick={() => canGoNext && setViewDate(addMonths(viewDate, 1))}
                disabled={!canGoNext}
                className={`p-2 rounded-xl transition-all ${canGoNext ? "text-muted-foreground/50 hover:text-foreground hover:bg-secondary/60" : "text-muted-foreground/20 cursor-not-allowed"}`}>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "rgba(10,14,50,0.5)" }} />
                ))}
              </div>
            ) : (
              <>
              {entries.length === 0 && isCurrentMonth && (
                <motion.div variants={fade} className="flex flex-col items-center justify-center py-6 gap-2 text-center mb-3">
                  <Heart className="w-10 h-10 text-rose-400/20" />
                  <p className="text-sm font-medium" style={{ color: "rgba(180,190,255,0.40)" }}>A fresh month awaits.</p>
                  <p className="text-xs" style={{ color: "rgba(180,190,255,0.25)" }}>Tap any day to start filling your gratitude grid.</p>
                </motion.div>
              )}
              <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-1.5">
                {days.map((day, idx) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const entry = entryMap.get(dateStr);
                  const isTodayDay = isToday(day);
                  const isFutureDay = isFuture(day);
                  const dayNum = day.getDate();
                  const intensity = idx / totalDays;
                  const fillHue = 350 + intensity * 30;

                  return (
                    <motion.div key={dateStr} variants={fade}>
                      {entry ? (
                        <div
                          onClick={() => openModal(dateStr)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all hover:scale-[1.005] group ${isTodayDay ? "ring-1 ring-rose-400/40" : ""}`}
                          style={{
                            background: `linear-gradient(135deg, hsla(${fillHue},70%,50%,0.10), hsla(${fillHue + 20},70%,50%,0.05))`,
                            border: `1px solid hsla(${fillHue},70%,50%,0.20)`,
                          }}
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `hsla(${fillHue},60%,50%,0.15)` }}>
                            <span className="text-xs font-bold" style={{ color: `hsla(${fillHue},60%,70%,0.9)` }}>{dayNum}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white/85 truncate">{entry.content}</p>
                            <p className="text-[10px] text-blue-200/35 mt-0.5">{format(day, "EEEE")}</p>
                          </div>
                          <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ) : isFutureDay ? (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl opacity-30"
                          style={{ background: "rgba(10,14,50,0.30)", border: "1px solid rgba(100,130,255,0.06)" }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(100,130,255,0.06)" }}>
                            <span className="text-xs font-bold text-blue-200/30">{dayNum}</span>
                          </div>
                          <p className="text-xs text-blue-200/25">{format(day, "EEEE")}</p>
                        </div>
                      ) : (
                        <button
                          onClick={() => openModal(dateStr)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-rose-500/5 hover:border-rose-500/20 group text-left ${isTodayDay ? "ring-1 ring-rose-400/30" : ""}`}
                          style={{ background: "rgba(10,14,50,0.40)", border: "1px dashed rgba(100,130,255,0.12)" }}
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-rose-500/10 transition-colors"
                            style={{ background: "rgba(100,130,255,0.08)" }}>
                            <span className="text-xs font-bold text-blue-200/40 group-hover:text-rose-400/70 transition-colors">{dayNum}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-blue-200/30 group-hover:text-rose-300/50 transition-colors">
                              {isTodayDay ? "What are you grateful for today?" : format(day, "EEEE")}
                            </p>
                          </div>
                          <Pencil className="w-3 h-3 text-blue-200/15 group-hover:text-rose-400/40 transition-colors shrink-0" />
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
              </>
            )}
          </motion.div>
        </motion.div>

        <Dialog open={!!modalDate} onOpenChange={o => { if (!o) closeModal(); }}>
          <DialogContent className="max-w-md border shadow-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(10,14,50,0.98), rgba(6,11,40,0.98))",
              borderColor: "rgba(244,63,94,0.25)",
            }}>
            <DialogTitle className="sr-only">Gratitude Entry</DialogTitle>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-rose-400/70 uppercase tracking-widest">
                    {modalDate ? format(new Date(modalDate + "T00:00:00"), "EEEE, MMMM d") : ""}
                  </p>
                  <h3 className="text-lg font-display font-bold text-white mt-1">
                    {editEntry ? "Edit your gratitude" : "What is one thing you are grateful for?"}
                  </h3>
                </div>
                {editEntry && (
                  <button onClick={() => handleDelete(editEntry.id)}
                    className="p-2 rounded-xl text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={content}
                  onChange={e => { if (e.target.value.length <= 140) setContent(e.target.value); }}
                  placeholder="I'm grateful for..."
                  rows={3}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-blue-200/30 resize-none focus:outline-none focus:ring-2 focus:ring-rose-400/30"
                  style={{
                    background: "rgba(10,14,50,0.60)",
                    border: "1px solid rgba(244,63,94,0.15)",
                  }}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-[11px] tabular-nums ${content.length >= 130 ? "text-rose-400" : "text-blue-200/30"}`}>
                    {content.length}/140
                  </span>
                  <div className="flex gap-2">
                    <button onClick={closeModal}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!content.trim() || createMut.isPending || updateMut.isPending}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-40"
                      style={{
                        background: "linear-gradient(135deg, #f43f5e, #fb923c)",
                        boxShadow: content.trim() ? "0 4px 15px rgba(244,63,94,0.35)" : "none",
                      }}
                    >
                      {createMut.isPending || updateMut.isPending ? "Saving..." : editEntry ? "Update" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showWrapUp} onOpenChange={o => { if (!o) setShowWrapUp(false); }}>
          <DialogContent className="max-w-lg border shadow-2xl p-0 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(10,14,50,0.99), rgba(6,11,40,0.99))",
              borderColor: "rgba(244,63,94,0.25)",
            }}>
            <DialogTitle className="sr-only">Monthly Wrap-Up</DialogTitle>
            <div className="p-6 space-y-5">
              <div className="text-center">
                <p className="text-xs font-semibold text-rose-400/60 uppercase tracking-[0.2em]">Monthly Wrap-Up</p>
                <h3 className="text-2xl font-display font-bold text-white mt-2">{format(viewDate, "MMMM yyyy")}</h3>
                <p className="text-sm text-blue-200/40 mt-1">{filledCount} moment{filledCount !== 1 ? "s" : ""} of gratitude</p>
              </div>

              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <Flame className="w-6 h-6 text-rose-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-white">{streak}</p>
                  <p className="text-[10px] text-blue-200/40">streak</p>
                </div>
                <div className="w-px h-10" style={{ background: "rgba(100,130,255,0.15)" }} />
                <div className="text-center">
                  <Heart className="w-6 h-6 text-rose-400 fill-rose-400/30 mx-auto mb-1" />
                  <p className="text-xl font-bold text-white">{filledCount}/{pastDays}</p>
                  <p className="text-[10px] text-blue-200/40">days filled</p>
                </div>
                <div className="w-px h-10" style={{ background: "rgba(100,130,255,0.15)" }} />
                <div className="text-center">
                  <Sparkles className="w-6 h-6 text-amber-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-white">{completionPct}%</p>
                  <p className="text-[10px] text-blue-200/40">complete</p>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days.map(day => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const entry = entryMap.get(dateStr);
                  const isFutureDay = isFuture(day);
                  const idx = day.getDate() - 1;
                  const hue = 350 + (idx / totalDays) * 30;
                  return (
                    <div key={dateStr} title={entry ? `${format(day, "MMM d")}: ${entry.content}` : format(day, "MMM d")}
                      className="aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold transition-all"
                      style={{
                        background: entry ? `hsla(${hue},60%,50%,0.20)` : isFutureDay ? "rgba(100,130,255,0.03)" : "rgba(100,130,255,0.06)",
                        border: entry ? `1px solid hsla(${hue},60%,50%,0.30)` : "1px solid rgba(100,130,255,0.08)",
                        color: entry ? `hsla(${hue},60%,70%,0.9)` : "rgba(100,130,255,0.20)",
                        boxShadow: entry ? `0 0 8px hsla(${hue},60%,50%,0.15)` : "none",
                      }}>
                      {day.getDate()}
                    </div>
                  );
                })}
              </div>

              {entries.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {entries.sort((a, b) => a.date.localeCompare(b.date)).map(entry => (
                    <div key={entry.id} className="flex items-start gap-2 px-3 py-2 rounded-lg"
                      style={{ background: "rgba(10,14,50,0.50)", border: "1px solid rgba(100,130,255,0.08)" }}>
                      <span className="text-[10px] font-bold text-rose-400/60 shrink-0 mt-0.5 w-8">
                        {format(new Date(entry.date + "T00:00:00"), "d")}
                      </span>
                      <p className="text-xs text-white/70 leading-relaxed">{entry.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
