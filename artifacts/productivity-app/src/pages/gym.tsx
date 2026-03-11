import { useState } from "react";
import { Layout } from "@/components/layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Pencil, Check, X, Dumbbell, RefreshCw, CalendarDays, Moon, Sunrise } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface GymExercise {
  id: number;
  dayOfWeek: number;
  name: string;
  sets: number | null;
  reps: number | null;
  weight: string | null;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
}

const exerciseSchema = z.object({
  name: z.string().min(1, "Exercise name is required"),
  sets: z.coerce.number().int().positive().optional().or(z.literal("")),
  reps: z.coerce.number().int().positive().optional().or(z.literal("")),
  weight: z.string().optional(),
  notes: z.string().optional(),
});

type ExerciseForm = z.infer<typeof exerciseSchema>;

async function fetchGym(): Promise<GymExercise[]> {
  const res = await fetch("/api/gym");
  if (!res.ok) throw new Error("Failed to fetch gym plan");
  return res.json();
}

async function createExercise(data: Omit<GymExercise, "id" | "createdAt">): Promise<GymExercise> {
  const res = await fetch("/api/gym", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create exercise");
  return res.json();
}

async function updateExercise(id: number, data: Partial<GymExercise>): Promise<GymExercise> {
  const res = await fetch(`/api/gym/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update exercise");
  return res.json();
}

async function deleteExercise(id: number): Promise<void> {
  const res = await fetch(`/api/gym/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete exercise");
}

function ExerciseCard({
  exercise,
  onDelete,
  onUpdate,
}: {
  exercise: GymExercise;
  onDelete: (id: number) => void;
  onUpdate: (id: number, data: Partial<GymExercise>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const form = useForm<ExerciseForm>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: exercise.name,
      sets: exercise.sets ?? ("" as any),
      reps: exercise.reps ?? ("" as any),
      weight: exercise.weight ?? "",
      notes: exercise.notes ?? "",
    },
  });

  const handleSave = (data: ExerciseForm) => {
    onUpdate(exercise.id, {
      name: data.name,
      sets: data.sets === "" || data.sets === undefined ? null : Number(data.sets),
      reps: data.reps === "" || data.reps === undefined ? null : Number(data.reps),
      weight: data.weight || null,
      notes: data.notes || null,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <Card className="bg-secondary/50 border-accent/30 shadow-md">
        <CardContent className="p-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-3">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input className="bg-background font-semibold" placeholder="Exercise name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-3 gap-2">
                <FormField control={form.control} name="sets" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">Sets</FormLabel>
                    <FormControl><Input type="number" className="bg-background text-center" placeholder="–" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="reps" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">Reps</FormLabel>
                    <FormControl><Input type="number" className="bg-background text-center" placeholder="–" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="weight" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">Weight</FormLabel>
                    <FormControl><Input className="bg-background text-center" placeholder="e.g. 60kg" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormControl><Input className="bg-background text-sm" placeholder="Notes (optional)" {...field} /></FormControl>
                </FormItem>
              )} />
              <div className="flex gap-2 pt-1">
                <Button type="submit" size="sm" className="flex-1 h-8 text-xs">
                  <Check className="w-3 h-3 mr-1" />Save
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setEditing(false)}>
                  <X className="w-3 h-3 mr-1" />Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  const hasMeta = exercise.sets || exercise.reps || exercise.weight;

  return (
    <Card className="bg-card border-border/50 hover:border-accent/30 hover:shadow-md transition-all group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground leading-tight truncate">{exercise.name}</p>
            {hasMeta && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
                {exercise.sets && <span className="text-foreground font-medium">{exercise.sets}</span>}
                {exercise.sets && exercise.reps && <span>×</span>}
                {exercise.reps && <span className="text-foreground font-medium">{exercise.reps} reps</span>}
                {exercise.weight && (
                  <>
                    {(exercise.sets || exercise.reps) && <span className="text-muted-foreground/50">@</span>}
                    <span className="text-accent font-medium">{exercise.weight}</span>
                  </>
                )}
              </p>
            )}
            {exercise.notes && (
              <p className="text-xs text-muted-foreground mt-1.5 italic">{exercise.notes}</p>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setEditing(true)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(exercise.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddExerciseDialog({
  dayOfWeek,
  dayName,
  currentCount,
  onAdd,
}: {
  dayOfWeek: number;
  dayName: string;
  currentCount: number;
  onAdd: (data: Omit<GymExercise, "id" | "createdAt">) => void;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<ExerciseForm>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: { name: "", sets: "" as any, reps: "" as any, weight: "", notes: "" },
  });

  const handleSubmit = (data: ExerciseForm) => {
    onAdd({
      dayOfWeek,
      name: data.name,
      sets: data.sets === "" || data.sets === undefined ? null : Number(data.sets),
      reps: data.reps === "" || data.reps === undefined ? null : Number(data.reps),
      weight: data.weight || null,
      notes: data.notes || null,
      sortOrder: currentCount,
    });
    form.reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full mt-2 border-dashed border-border/60 text-muted-foreground hover:text-foreground hover:border-accent/50 hover:bg-accent/5 h-9">
          <Plus className="w-4 h-4 mr-1.5" />Add exercise
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle>Add Exercise — {dayName}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Exercise Name</FormLabel>
                <FormControl>
                  <Input className="bg-background" placeholder="e.g. Bench Press, Squat…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-3 gap-3">
              <FormField control={form.control} name="sets" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sets</FormLabel>
                  <FormControl><Input type="number" className="bg-background text-center" placeholder="–" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="reps" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reps</FormLabel>
                  <FormControl><Input type="number" className="bg-background text-center" placeholder="–" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="weight" render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight</FormLabel>
                  <FormControl><Input className="bg-background text-center" placeholder="e.g. 60kg" {...field} /></FormControl>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                <FormControl><Input className="bg-background" placeholder="e.g. slow negatives, superset with…" {...field} /></FormControl>
              </FormItem>
            )} />
            <Button type="submit" className="w-full">Add Exercise</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function loadRestDays(): Set<number> {
  try {
    const saved = localStorage.getItem("gym-rest-days");
    if (saved) return new Set(JSON.parse(saved) as number[]);
  } catch {}
  return new Set();
}

function saveRestDays(days: Set<number>) {
  localStorage.setItem("gym-rest-days", JSON.stringify([...days]));
}

export default function Gym() {
  const queryClient = useQueryClient();
  const todayIndex = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const [restDaySet, setRestDaySet] = useState<Set<number>>(loadRestDays);

  const toggleRestDay = (dayIndex: number) => {
    setRestDaySet(prev => {
      const next = new Set(prev);
      if (next.has(dayIndex)) next.delete(dayIndex);
      else next.add(dayIndex);
      saveRestDays(next);
      return next;
    });
  };

  const { data: allExercises = [], isLoading } = useQuery({
    queryKey: ["/api/gym"],
    queryFn: fetchGym,
  });

  const createMutation = useMutation({
    mutationFn: createExercise,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/gym"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<GymExercise> }) =>
      updateExercise(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/gym"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExercise,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/gym"] }),
  });

  const exercisesByDay = DAYS.map((_, i) =>
    allExercises.filter((e) => e.dayOfWeek === i)
  );

  const selectedExercises = exercisesByDay[selectedDay] ?? [];
  const totalExercisesAllWeek = allExercises.length;
  const trainingDays = DAYS.filter((_, i) => !restDaySet.has(i) && exercisesByDay[i].length > 0).length;
  const markedRestDays = restDaySet.size;
  const isSelectedRest = restDaySet.has(selectedDay);

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col h-full pb-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            Gym Planner
          </h1>
          <p className="text-muted-foreground mt-1.5">
            Set your weekly workout template — it repeats every week automatically.
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-card border-border/50 shadow p-4 text-center">
            <p className="text-2xl font-display font-bold text-foreground">{totalExercisesAllWeek}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Exercises</p>
          </Card>
          <Card className="bg-card border-border/50 shadow p-4 text-center">
            <p className="text-2xl font-display font-bold text-primary">{trainingDays}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Training Days</p>
          </Card>
          <Card className="bg-card border-border/50 shadow p-4 text-center">
            <p className="text-2xl font-display font-bold text-amber-400">{markedRestDays}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Rest Days</p>
          </Card>
        </div>

        {/* Day selector */}
        <div className="overflow-x-auto -mx-4 px-4 mb-6 pb-1">
        <div className="grid grid-cols-7 gap-2 min-w-[400px]">
          {DAYS.map((day, i) => {
            const count = exercisesByDay[i].length;
            const isToday = i === todayIndex;
            const isSelected = i === selectedDay;
            const isRest = restDaySet.has(i);
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(i)}
                className={`
                  relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all
                  ${isSelected && isRest
                    ? "bg-amber-400/15 border-amber-400/50 text-amber-400 shadow-md shadow-amber-400/10"
                    : isSelected
                    ? "bg-primary/10 border-primary/40 text-primary shadow-md shadow-primary/10"
                    : isRest
                    ? "bg-amber-400/8 border-amber-400/30 text-amber-400/80 hover:bg-amber-400/12"
                    : isToday
                    ? "bg-accent/5 border-accent/30 text-foreground hover:bg-accent/10"
                    : "bg-card border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary/50"}
                `}
              >
                {isToday && !isRest && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
                )}
                {isRest && (
                  <span className="absolute top-1.5 right-1.5">
                    <Moon className="w-3 h-3 text-amber-400" />
                  </span>
                )}
                <span className="text-xs font-semibold uppercase tracking-wider">{DAYS_SHORT[i]}</span>
                {isRest ? (
                  <Moon className="w-4 h-4 opacity-70" />
                ) : count > 0 ? (
                  <span className={`text-lg font-display font-bold leading-none ${isSelected ? "text-primary" : ""}`}>
                    {count}
                  </span>
                ) : (
                  <span className="text-lg font-display font-bold leading-none opacity-20">–</span>
                )}
                {isRest ? (
                  <span className="text-[10px] opacity-70">rest</span>
                ) : count > 0 ? (
                  <span className="text-[10px] opacity-60">
                    {count === 1 ? "exercise" : "exercises"}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        </div>

        {/* Day detail */}
        <div className={`flex-1 border rounded-2xl shadow-lg overflow-hidden transition-colors ${
          isSelectedRest ? "bg-amber-400/5 border-amber-400/20" : "bg-card border-border/50"
        }`}>
          {/* Day header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between transition-colors ${
            isSelectedRest ? "border-amber-400/20 bg-amber-400/8" : "border-border/50 bg-secondary/30"
          }`}>
            <div>
              <h2 className={`text-lg font-display font-semibold flex items-center gap-2 ${
                isSelectedRest ? "text-amber-400" : "text-foreground"
              }`}>
                {isSelectedRest
                  ? <Moon className="w-4 h-4" />
                  : <CalendarDays className="w-4 h-4 text-muted-foreground" />}
                {DAYS[selectedDay]}
                {selectedDay === todayIndex && (
                  <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${
                    isSelectedRest ? "bg-amber-400/15 text-amber-400" : "bg-accent/15 text-accent"
                  }`}>Today</span>
                )}
                {isSelectedRest && (
                  <span className="text-xs font-normal bg-amber-400/15 text-amber-400 px-2 py-0.5 rounded-full">Rest Day</span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                Repeats every week
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleRestDay(selectedDay)}
              className={`h-8 text-xs gap-1.5 transition-all ${
                isSelectedRest
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 hover:border-amber-400/60"
                  : "border-border/60 text-muted-foreground hover:text-amber-400 hover:border-amber-400/40 hover:bg-amber-400/8"
              }`}
            >
              {isSelectedRest
                ? <><Sunrise className="w-3.5 h-3.5" />Unmark rest day</>
                : <><Moon className="w-3.5 h-3.5" />Mark as rest day</>}
            </Button>
          </div>

          <div className="p-6">
            {isSelectedRest ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-400/10 flex items-center justify-center mx-auto mb-4">
                  <Moon className="w-8 h-8 text-amber-400/60" />
                </div>
                <p className="text-amber-400/80 font-semibold text-lg">Rest Day</p>
                <p className="text-sm text-muted-foreground/60 mt-1.5">
                  Recovery is part of the plan. Relax — you've earned it.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleRestDay(selectedDay)}
                  className="mt-4 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                >
                  <Sunrise className="w-3.5 h-3.5" />Switch to training day
                </Button>
              </div>
            ) : isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-secondary/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : selectedExercises.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                  <Dumbbell className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground font-medium">No exercises for {DAYS[selectedDay]}</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Add exercises to plan your workout for this day.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedExercises.map((ex) => (
                  <ExerciseCard
                    key={ex.id}
                    exercise={ex}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onUpdate={(id, data) => updateMutation.mutate({ id, data })}
                  />
                ))}
              </div>
            )}

            {!isSelectedRest && (
              <AddExerciseDialog
                dayOfWeek={selectedDay}
                dayName={DAYS[selectedDay]}
                currentCount={selectedExercises.length}
                onAdd={(data) => createMutation.mutate(data)}
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
