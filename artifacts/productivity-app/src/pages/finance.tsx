import { useState } from "react";
import { Layout } from "@/components/layout";
import { 
  useGetExpenses, useCreateExpense, useDeleteExpense,
  useGetSubscriptions, useCreateSubscription, useUpdateSubscription, useDeleteSubscription
} from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Trash2, TrendingDown, TrendingUp, RefreshCw,
  ArrowDownLeft, ArrowUpRight, Banknote, Clock, CheckCircle2, User,
  Target, PiggyBank, BarChart3, Edit2,
} from "lucide-react";
import { format, isPast, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

/* ── Schemas ─────────────────────────────────────────────────────── */
const expenseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z.coerce.number().min(0.01, "Amount must be > 0"),
  type: z.enum(["expense", "income"]),
  category: z.string().min(1, "Category is required"),
  date: z.string().min(1, "Date is required"),
});

const subSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.coerce.number().min(0, "Amount can't be negative"),
  billingCycle: z.enum(["weekly", "monthly", "quarterly", "yearly", "free_trial"]),
  category: z.string().min(1, "Category is required"),
  nextBillingDate: z.string().min(1, "Date is required"),
});

const owedSchema = z.object({
  fromName: z.string().min(1, "Name is required"),
  amount: z.coerce.number().min(0.01, "Amount must be > 0"),
  description: z.string().min(1, "Description is required"),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

const savingsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  targetAmount: z.coerce.number().min(0.01, "Target must be > 0"),
  currentAmount: z.coerce.number().min(0, "Amount can't be negative").default(0),
  notes: z.string().optional(),
});

const addFundsSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be > 0"),
});

const investmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["stock", "crypto", "etf", "real_estate", "fund", "other"]),
  ticker: z.string().optional(),
  quantity: z.coerce.number().min(0, "Can't be negative").default(0),
  purchasePrice: z.coerce.number().min(0, "Can't be negative"),
  currentPrice: z.coerce.number().min(0, "Can't be negative"),
  notes: z.string().optional(),
});

const updatePriceSchema = z.object({
  currentPrice: z.coerce.number().min(0, "Can't be negative"),
});

/* ── Savings API ──────────────────────────────────────────────────── */
interface SavingsEntry { id: number; userId: string | null; name: string; targetAmount: number; currentAmount: number; notes: string | null; createdAt: string; }
async function fetchSavings(): Promise<SavingsEntry[]> { const r = await fetch("/api/savings"); if (!r.ok) throw new Error("Failed"); return r.json(); }
async function createSavings(d: Omit<SavingsEntry,"id"|"createdAt"|"userId">): Promise<SavingsEntry> {
  const r = await fetch("/api/savings", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(d) });
  if (!r.ok) throw new Error("Failed to create");
  return r.json();
}
async function patchSavings(id: number, d: Partial<SavingsEntry>): Promise<SavingsEntry> {
  const r = await fetch(`/api/savings/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(d) });
  if (!r.ok) throw new Error("Failed to update");
  return r.json();
}
async function deleteSavings(id: number): Promise<void> { await fetch(`/api/savings/${id}`, { method:"DELETE" }); }

/* ── Investments API ──────────────────────────────────────────────── */
interface InvestmentEntry { id: number; userId: string | null; name: string; type: string; ticker: string | null; quantity: number; purchasePrice: number; currentPrice: number; notes: string | null; createdAt: string; }
async function fetchInvestments(): Promise<InvestmentEntry[]> { const r = await fetch("/api/investments"); if (!r.ok) throw new Error("Failed"); return r.json(); }
async function createInvestment(d: Omit<InvestmentEntry,"id"|"createdAt"|"userId">): Promise<InvestmentEntry> {
  const r = await fetch("/api/investments", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(d) });
  if (!r.ok) throw new Error("Failed to create");
  return r.json();
}
async function patchInvestment(id: number, d: Partial<InvestmentEntry>): Promise<InvestmentEntry> {
  const r = await fetch(`/api/investments/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(d) });
  if (!r.ok) throw new Error("Failed to update");
  return r.json();
}
async function deleteInvestment(id: number): Promise<void> { await fetch(`/api/investments/${id}`, { method:"DELETE" }); }

/* ── Owed API ─────────────────────────────────────────────────────── */
interface OwedEntry {
  id: number;
  fromName: string;
  amount: number;
  description: string;
  dueDate: string | null;
  status: "pending" | "received" | "paid";
  notes: string | null;
  type: "received" | "sent";
  createdAt: string;
}

async function fetchOwed(): Promise<OwedEntry[]> {
  const r = await fetch("/api/owed");
  if (!r.ok) throw new Error("Failed to fetch owed entries");
  return r.json();
}
async function createOwed(data: Omit<OwedEntry, "id" | "createdAt" | "status">): Promise<OwedEntry> {
  const r = await fetch("/api/owed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!r.ok) {
    const body = await r.json().catch(() => ({ error: r.statusText }));
    throw new Error(body?.error ?? "Failed to create owed entry");
  }
  return r.json();
}
async function createOwedToOthers(data: Omit<OwedEntry, "id" | "createdAt" | "status">): Promise<OwedEntry> {
  return createOwed({ ...data, type: "sent" });
}
async function updateOwed(id: number, data: Partial<OwedEntry>): Promise<OwedEntry> {
  const r = await fetch(`/api/owed/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!r.ok) throw new Error("Failed to update owed entry");
  return r.json();
}
async function deleteOwed(id: number): Promise<void> {
  await fetch(`/api/owed/${id}`, { method: "DELETE" });
}
async function createExpenseDirect(data: { title: string; amount: number; category: string; date: string; notes?: string | null }): Promise<void> {
  const r = await fetch("/api/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, type: "expense" }),
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({ error: r.statusText }));
    throw new Error(body?.error ?? "Failed to create expense");
  }
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function Finance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isExpOpen, setIsExpOpen] = useState(false);
  const [isSubOpen, setIsSubOpen] = useState(false);
  const [isOwedOpen, setIsOwedOpen] = useState(false);
  const [isOwedToOthersOpen, setIsOwedToOthersOpen] = useState(false);
  const [isSavingsOpen, setIsSavingsOpen] = useState(false);
  const [addFundsTarget, setAddFundsTarget] = useState<SavingsEntry | null>(null);
  const [isInvestOpen, setIsInvestOpen] = useState(false);
  const [updatePriceTarget, setUpdatePriceTarget] = useState<InvestmentEntry | null>(null);

  /* ── Expenses ── */
  const { data: expenses = [], isLoading: loadExp } = useGetExpenses();
  const { mutate: createExp, isPending: isCreatingExp } = useCreateExpense({
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/expenses"] }); setIsExpOpen(false); expForm.reset(); } }
  });
  const { mutate: deleteExp, isPending: isDeletingExp } = useDeleteExpense({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/expenses"] }) }
  });

  /* ── Subscriptions ── */
  const { data: subscriptions = [], isLoading: loadSub } = useGetSubscriptions();
  const { mutate: createSub, isPending: isCreatingSub } = useCreateSubscription({
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] }); setIsSubOpen(false); subForm.reset(); } }
  });
  const { mutate: updateSub } = useUpdateSubscription({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] }) }
  });
  const { mutate: deleteSub, isPending: isDeletingSub } = useDeleteSubscription({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] }) }
  });

  /* ── Owed to Me ── */
  const { data: owedList = [], isLoading: loadOwed } = useQuery({
    queryKey: ["/api/owed"],
    queryFn: fetchOwed,
  });
  const createOwedMutation = useMutation({
    mutationFn: createOwed,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/owed"] }); setIsOwedOpen(false); owedForm.reset(); },
  });
  const updateOwedMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<OwedEntry> }) => updateOwed(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/owed"] }),
  });
  const deleteOwedMutation = useMutation({
    mutationFn: deleteOwed,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/owed"] }),
  });
  const createOwedToOthersMutation = useMutation({
    mutationFn: createOwedToOthers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owed"] });
      setIsOwedToOthersOpen(false);
      owedToOthersForm.reset();
      toast({ title: "Entry added", description: "Your debt has been recorded." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });
  const markOwedToOthersPaidMutation = useMutation({
    mutationFn: async (entry: OwedEntry) => {
      await updateOwed(entry.id, { status: "paid" });
      await createExpenseDirect({
        title: `${entry.description} — paid to ${entry.fromName}`,
        amount: entry.amount,
        category: "Other",
        date: new Date().toISOString(),
        notes: entry.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Marked as paid", description: "Payment recorded in your expenses." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  /* ── Savings ── */
  const { data: savingsList = [], isLoading: loadSavings } = useQuery({ queryKey: ["/api/savings"], queryFn: fetchSavings });
  const createSavingsMutation = useMutation({
    mutationFn: createSavings,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/savings"] }); setIsSavingsOpen(false); savingsForm.reset(); toast({ title: "Goal created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const addFundsMutation = useMutation({
    mutationFn: ({ id, extra }: { id: number; extra: number; current: number }) =>
      patchSavings(id, { currentAmount: extra }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/savings"] }); setAddFundsTarget(null); addFundsForm.reset(); toast({ title: "Funds added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteSavingsMutation = useMutation({
    mutationFn: deleteSavings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/savings"] }),
  });

  /* ── Investments ── */
  const { data: investmentsList = [], isLoading: loadInvest } = useQuery({ queryKey: ["/api/investments"], queryFn: fetchInvestments });
  const createInvestmentMutation = useMutation({
    mutationFn: createInvestment,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/investments"] }); setIsInvestOpen(false); investForm.reset(); toast({ title: "Investment added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updatePriceMutation = useMutation({
    mutationFn: ({ id, currentPrice }: { id: number; currentPrice: number }) => patchInvestment(id, { currentPrice }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/investments"] }); setUpdatePriceTarget(null); updatePriceForm.reset(); toast({ title: "Price updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteInvestmentMutation = useMutation({
    mutationFn: deleteInvestment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/investments"] }),
  });

  /* ── Forms ── */
  const expForm = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { title: "", amount: 0, type: "expense", category: "", date: format(new Date(), 'yyyy-MM-dd') }
  });
  const subForm = useForm<z.infer<typeof subSchema>>({
    resolver: zodResolver(subSchema),
    defaultValues: { name: "", amount: 0, billingCycle: "monthly", category: "", nextBillingDate: format(new Date(), 'yyyy-MM-dd') }
  });
  const owedForm = useForm<z.infer<typeof owedSchema>>({
    resolver: zodResolver(owedSchema),
    defaultValues: { fromName: "", amount: 0, description: "", dueDate: "", notes: "" },
  });
  const owedToOthersForm = useForm<z.infer<typeof owedSchema>>({
    resolver: zodResolver(owedSchema),
    defaultValues: { fromName: "", amount: 0, description: "", dueDate: "", notes: "" },
  });
  const savingsForm = useForm<z.infer<typeof savingsSchema>>({
    resolver: zodResolver(savingsSchema),
    defaultValues: { name: "", targetAmount: 0, currentAmount: 0, notes: "" },
  });
  const addFundsForm = useForm<z.infer<typeof addFundsSchema>>({
    resolver: zodResolver(addFundsSchema),
    defaultValues: { amount: 0 },
  });
  const investForm = useForm<z.infer<typeof investmentSchema>>({
    resolver: zodResolver(investmentSchema),
    defaultValues: { name: "", type: "stock", ticker: "", quantity: 0, purchasePrice: 0, currentPrice: 0, notes: "" },
  });
  const updatePriceForm = useForm<z.infer<typeof updatePriceSchema>>({
    resolver: zodResolver(updatePriceSchema),
    defaultValues: { currentPrice: 0 },
  });

  /* ── Derived values ── */
  const watchType = expForm.watch("type");
  const totalIncome = expenses.filter(e => (e as any).type === "income").reduce((s, e) => s + e.amount, 0);
  const totalSpent  = expenses.filter(e => (e as any).type !== "income").reduce((s, e) => s + e.amount, 0);
  const netBalance  = totalIncome - totalSpent;

  const totalMonthlySubs = subscriptions.filter(s => s.isActive).reduce((sum, s) => {
    if (s.billingCycle === "weekly")    return sum + (s.amount * 52) / 12;
    if (s.billingCycle === "monthly")   return sum + s.amount;
    if (s.billingCycle === "yearly")    return sum + s.amount / 12;
    if (s.billingCycle === "quarterly") return sum + s.amount / 3;
    if (s.billingCycle === "free_trial") return sum;
    return sum;
  }, 0);

  const owedToMe      = owedList.filter(o => !o.type || o.type === "received");
  const owedToOthers  = owedList.filter(o => o.type === "sent");

  const totalOwed      = owedToMe.filter(o => o.status === "pending").reduce((s, o) => s + o.amount, 0);
  const totalReceived  = owedToMe.filter(o => o.status === "received").reduce((s, o) => s + o.amount, 0);
  const overdueOwed    = owedToMe.filter(o => o.status === "pending" && o.dueDate && isPast(new Date(o.dueDate)));

  const totalIOwe      = owedToOthers.filter(o => o.status === "pending").reduce((s, o) => s + o.amount, 0);
  const totalIPaid     = owedToOthers.filter(o => o.status === "paid").reduce((s, o) => s + o.amount, 0);
  const overdueIOwe    = owedToOthers.filter(o => o.status === "pending" && o.dueDate && isPast(new Date(o.dueDate)));

  /* ── Monthly breakdown ── */
  const now = new Date();
  const monthInterval = { start: startOfMonth(now), end: endOfMonth(now) };
  const thisMonthExpenses = expenses.filter(e =>
    (e as any).type !== "income" && isWithinInterval(new Date(e.date), monthInterval)
  );
  const thisMonthIncome = expenses.filter(e =>
    (e as any).type === "income" && isWithinInterval(new Date(e.date), monthInterval)
  );

  const expByCategoryMap: Record<string, number> = {};
  thisMonthExpenses.forEach(e => {
    const cat = e.category || "Uncategorised";
    expByCategoryMap[cat] = (expByCategoryMap[cat] || 0) + e.amount;
  });
  const expCategoryData = Object.entries(expByCategoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const incomeByCategoryMap: Record<string, number> = {};
  thisMonthIncome.forEach(e => {
    const cat = e.category || "Uncategorised";
    incomeByCategoryMap[cat] = (incomeByCategoryMap[cat] || 0) + e.amount;
  });
  const incomeCategoryData = Object.entries(incomeByCategoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const CHART_COLORS = ["#10b981","#3b82f6","#f59e0b","#ec4899","#8b5cf6","#ef4444","#06b6d4","#84cc16","#f97316","#a855f7"];

  /* ═══════════════════════════════════════════════════════════════════ */
  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto flex flex-col h-full pb-20">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Finance</h1>
          <p className="text-muted-foreground mt-1">Track spending, subscriptions, and money owed to you.</p>
        </div>

        <Tabs defaultValue="expenses" className="flex-1 flex flex-col">
          <TabsList className="grid w-full max-w-4xl grid-cols-6 bg-secondary/50 p-1 mb-8">
            <TabsTrigger value="expenses"      className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Expenses</TabsTrigger>
            <TabsTrigger value="subscriptions" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Subscriptions</TabsTrigger>
            <TabsTrigger value="owed"          className="data-[state=active]:bg-background data-[state=active]:shadow-sm relative">
              Owed to Me
              {owedToMe.filter(o => o.status === "pending").length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-[10px] font-bold text-white flex items-center justify-center">
                  {owedToMe.filter(o => o.status === "pending").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="owed-to-others" className="data-[state=active]:bg-background data-[state=active]:shadow-sm relative">
              Owed to Others
              {owedToOthers.filter(o => o.status === "pending").length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-[10px] font-bold text-white flex items-center justify-center">
                  {owedToOthers.filter(o => o.status === "pending").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="savings" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Savings</TabsTrigger>
            <TabsTrigger value="investments" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Investments</TabsTrigger>
          </TabsList>

          {/* ── EXPENSES TAB ───────────────────────────────────────────── */}
          <TabsContent value="expenses" className="flex-1 flex flex-col m-0 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-card border-border/50 shadow-lg flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Spent</p>
                  <h2 className="text-2xl font-display font-bold text-foreground mt-0.5">${totalSpent.toFixed(2)}</h2>
                </div>
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <TrendingDown className="w-5 h-5 text-destructive" />
                </div>
              </Card>
              <Card className="bg-card border-border/50 shadow-lg flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Income</p>
                  <h2 className="text-2xl font-display font-bold text-emerald-400 mt-0.5">${totalIncome.toFixed(2)}</h2>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
              </Card>
              <Card className="bg-card border-border/50 shadow-lg flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Net Balance</p>
                  <h2 className={`text-2xl font-display font-bold mt-0.5 ${netBalance >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                    {netBalance >= 0 ? "+" : ""}{netBalance.toFixed(2)}
                  </h2>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${netBalance >= 0 ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
                  {netBalance >= 0 ? <ArrowUpRight className="w-5 h-5 text-emerald-400" /> : <ArrowDownLeft className="w-5 h-5 text-destructive" />}
                </div>
              </Card>
              <Card className="bg-card border-border/50 shadow-lg p-4 flex flex-col justify-center">
                <Dialog open={isExpOpen} onOpenChange={setIsExpOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full h-full py-5 bg-accent hover:bg-accent/90 text-accent-foreground hover-elevate border-0 shadow-lg shadow-accent/20">
                      <Plus className="w-5 h-5 mr-2" />Log Entry
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border/50 shadow-2xl">
                    <DialogHeader><DialogTitle>Log Entry</DialogTitle></DialogHeader>
                    <Form {...expForm}>
                      <form onSubmit={expForm.handleSubmit(d => createExp({ data: { title: d.title, amount: d.amount, type: d.type, category: d.category, date: new Date(d.date).toISOString() } as any }))} className="space-y-4">
                        <FormField control={expForm.control} name="type" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <div className="flex rounded-xl overflow-hidden border border-border/60 w-full">
                              <button type="button" onClick={() => field.onChange("expense")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all ${field.value === "expense" ? "bg-destructive/15 text-destructive border-r border-border/60" : "bg-background text-muted-foreground hover:text-foreground border-r border-border/60"}`}>
                                <ArrowDownLeft className="w-4 h-4" />Expense (−)
                              </button>
                              <button type="button" onClick={() => field.onChange("income")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all ${field.value === "income" ? "bg-emerald-500/15 text-emerald-400" : "bg-background text-muted-foreground hover:text-foreground"}`}>
                                <ArrowUpRight className="w-4 h-4" />Income (+)
                              </button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={expForm.control} name="title" render={({ field }) => (
                          <FormItem><FormLabel>Title</FormLabel><FormControl><Input className="bg-background" placeholder="e.g. Groceries, Salary…" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={expForm.control} name="amount" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount ($)</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm ${watchType === "income" ? "text-emerald-400" : "text-destructive"}`}>{watchType === "income" ? "+" : "−"}</span>
                                  <Input type="number" step="0.01" min="0" className="bg-background pl-7" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={expForm.control} name="date" render={({ field }) => (
                            <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" className="bg-background" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                        <FormField control={expForm.control} name="category" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <FormControl><Input className="bg-background" placeholder="e.g. Food, Travel, Health…" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <Button type="submit" className={`w-full ${watchType === "income" ? "bg-emerald-600 hover:bg-emerald-500" : ""}`} disabled={isCreatingExp}>
                          {isCreatingExp ? "Saving..." : watchType === "income" ? "Log Income" : "Log Expense"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </Card>
            </div>

            {/* ── Monthly Breakdown ───────────────────────────────────── */}
            {(expCategoryData.length > 0 || incomeCategoryData.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Expense donut */}
                <Card className="bg-card border-border/50 shadow-lg p-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                    {format(now, "MMMM")} — Expenses by Category
                  </h3>
                  {expCategoryData.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No expenses this month</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={expCategoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={95}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {expCategoryData.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]}
                            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 13, padding: "8px 12px" }}
                            itemStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                            labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 11, marginBottom: 2 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-1.5">
                        {expCategoryData.map((item, i) => {
                          const total = expCategoryData.reduce((s, d) => s + d.value, 0);
                          const pct = total > 0 ? (item.value / total * 100).toFixed(0) : "0";
                          return (
                            <div key={item.name} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                                <span className="truncate text-foreground">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                <span className="text-muted-foreground text-xs">{pct}%</span>
                                <span className="font-semibold text-foreground">${item.value.toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Income sources */}
                <Card className="bg-card border-border/50 shadow-lg p-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                    {format(now, "MMMM")} — Income Sources
                  </h3>
                  {incomeCategoryData.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No income logged this month</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {/* Top source highlight */}
                      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-emerald-400 font-medium uppercase tracking-wide mb-0.5">Top Source</p>
                          <p className="text-lg font-bold text-foreground">{incomeCategoryData[0].name}</p>
                        </div>
                        <p className="text-2xl font-display font-bold text-emerald-400">${incomeCategoryData[0].value.toFixed(2)}</p>
                      </div>
                      {/* All sources */}
                      <div className="flex flex-col gap-2">
                        {incomeCategoryData.map((item, i) => {
                          const total = incomeCategoryData.reduce((s, d) => s + d.value, 0);
                          const pct = total > 0 ? item.value / total * 100 : 0;
                          return (
                            <div key={item.name} className="flex flex-col gap-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-foreground font-medium">{item.name}</span>
                                <span className="text-emerald-400 font-semibold">+${item.value.toFixed(2)}</span>
                              </div>
                              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-emerald-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )}

            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border/50">
                    <tr>
                      <th className="px-6 py-4 font-medium">Date</th>
                      <th className="px-6 py-4 font-medium">Description</th>
                      <th className="px-6 py-4 font-medium">Category</th>
                      <th className="px-6 py-4 font-medium text-right">Amount</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadExp ? (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading...</td></tr>
                    ) : expenses.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No entries logged yet.</td></tr>
                    ) : (
                      [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => {
                        const isIncome = (exp as any).type === "income";
                        return (
                          <tr key={exp.id} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                            <td className="px-6 py-4 font-medium text-foreground">{format(new Date(exp.date), 'MMM dd, yyyy')}</td>
                            <td className="px-6 py-4 text-foreground">
                              <span className="flex items-center gap-2">
                                {isIncome ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <ArrowDownLeft className="w-3.5 h-3.5 text-destructive shrink-0" />}
                                {exp.title}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border">{exp.category}</span>
                            </td>
                            <td className={`px-6 py-4 text-right font-semibold ${isIncome ? "text-emerald-400" : "text-foreground"}`}>
                              {isIncome ? "+" : "−"}${exp.amount.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button variant="ghost" size="icon" disabled={isDeletingExp} onClick={() => deleteExp({ id: exp.id })} className="text-muted-foreground hover:text-destructive h-8 w-8">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ── SUBSCRIPTIONS TAB ──────────────────────────────────────── */}
          <TabsContent value="subscriptions" className="flex-1 flex flex-col m-0 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-card border-border/50 shadow-lg md:col-span-2 flex items-center justify-between p-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estimated Monthly Cost</p>
                  <h2 className="text-4xl font-display font-bold text-foreground mt-1">${totalMonthlySubs.toFixed(2)}</h2>
                </div>
                <div className="w-12 h-12 rounded-full bg-chart-4/10 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-chart-4" />
                </div>
              </Card>
              <Card className="bg-card border-border/50 shadow-lg p-6 flex flex-col justify-center">
                <Dialog open={isSubOpen} onOpenChange={setIsSubOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full h-full py-6 bg-chart-4 hover:bg-chart-4/90 text-primary-foreground hover-elevate border-0 shadow-lg shadow-chart-4/20">
                      <Plus className="w-5 h-5 mr-2" />Add Subscription
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border/50 shadow-2xl">
                    <DialogHeader><DialogTitle>Add New Subscription</DialogTitle></DialogHeader>
                    <Form {...subForm}>
                      <form onSubmit={subForm.handleSubmit(d => createSub({ data: { ...d, nextBillingDate: new Date(d.nextBillingDate).toISOString() } }))} className="space-y-4">
                        <FormField control={subForm.control} name="name" render={({ field }) => (
                          <FormItem><FormLabel>Service Name</FormLabel><FormControl><Input className="bg-background" {...field} /></FormControl></FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={subForm.control} name="amount" render={({ field }) => (
                            <FormItem><FormLabel>Amount ($)</FormLabel><FormControl><Input type="number" step="0.01" min="0" className="bg-background" {...field} /></FormControl></FormItem>
                          )} />
                          <FormField control={subForm.control} name="billingCycle" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cycle</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                  <SelectItem value="quarterly">Quarterly</SelectItem>
                                  <SelectItem value="yearly">Yearly</SelectItem>
                                  <SelectItem value="free_trial">Free Trial</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={subForm.control} name="category" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <FormControl><Input className="bg-background" placeholder="e.g. Streaming, Software…" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={subForm.control} name="nextBillingDate" render={({ field }) => (
                            <FormItem><FormLabel>Next Billing</FormLabel><FormControl><Input type="date" className="bg-background" {...field} /></FormControl></FormItem>
                          )} />
                        </div>
                        <Button type="submit" className="w-full bg-chart-4 hover:bg-chart-4/90 text-primary-foreground" disabled={isCreatingSub}>
                          {isCreatingSub ? "Adding..." : "Add Subscription"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loadSub ? (
                [1, 2, 3].map(i => <Card key={i} className="h-40 bg-card border-border/50 animate-pulse" />)
              ) : subscriptions.length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground">No subscriptions tracked yet.</div>
              ) : (
                subscriptions.map(sub => (
                  <Card key={sub.id} className={`border-border/50 shadow-md transition-all ${sub.isActive ? 'bg-card' : 'bg-secondary/30 opacity-75'}`}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg text-foreground">{sub.name}</h3>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">{sub.category}</p>
                        </div>
                        <Switch checked={sub.isActive} onCheckedChange={(checked) => updateSub({ id: sub.id, data: { isActive: checked } })} />
                      </div>
                      <div className="flex items-end gap-1 mb-6">
                        <span className="text-3xl font-bold font-display text-foreground">${sub.amount.toFixed(2)}</span>
                        <span className="text-sm text-muted-foreground mb-1 pb-0.5">
                          {sub.billingCycle === 'free_trial' ? '🆓 Free Trial' : `/${sub.billingCycle === 'weekly' ? 'wk' : sub.billingCycle === 'monthly' ? 'mo' : sub.billingCycle === 'yearly' ? 'yr' : 'qtr'}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-muted-foreground">
                          <RefreshCw className="w-4 h-4 mr-1.5 opacity-70" />
                          <span className={sub.isActive ? 'text-foreground' : ''}>{format(new Date(sub.nextBillingDate), 'MMM dd, yyyy')}</span>
                        </div>
                        <Button variant="ghost" size="icon" disabled={isDeletingSub} onClick={() => deleteSub({ id: sub.id })} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* ── OWED TO ME TAB ─────────────────────────────────────────── */}
          <TabsContent value="owed" className="flex-1 flex flex-col m-0 outline-none">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-card border-border/50 shadow-lg flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Outstanding</p>
                  <h2 className="text-2xl font-display font-bold text-emerald-400 mt-0.5">${totalOwed.toFixed(2)}</h2>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Banknote className="w-5 h-5 text-emerald-400" />
                </div>
              </Card>
              <Card className="bg-card border-border/50 shadow-lg flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Received</p>
                  <h2 className="text-2xl font-display font-bold text-foreground mt-0.5">${totalReceived.toFixed(2)}</h2>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
              </Card>
              <Card className={`border-border/50 shadow-lg flex items-center justify-between p-5 ${overdueOwed.length > 0 ? "bg-destructive/5 border-destructive/20" : "bg-card"}`}>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Overdue</p>
                  <h2 className={`text-2xl font-display font-bold mt-0.5 ${overdueOwed.length > 0 ? "text-destructive" : "text-foreground"}`}>
                    {overdueOwed.length}
                  </h2>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${overdueOwed.length > 0 ? "bg-destructive/10" : "bg-secondary"}`}>
                  <Clock className={`w-5 h-5 ${overdueOwed.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
                </div>
              </Card>
              <Card className="bg-card border-border/50 shadow-lg p-4 flex flex-col justify-center">
                <Dialog open={isOwedOpen} onOpenChange={setIsOwedOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full h-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white hover-elevate border-0 shadow-lg shadow-emerald-600/20">
                      <Plus className="w-5 h-5 mr-2" />Add Entry
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border/50 shadow-2xl">
                    <DialogHeader><DialogTitle>Track Money Owed to Me</DialogTitle></DialogHeader>
                    <Form {...owedForm}>
                      <form onSubmit={owedForm.handleSubmit(d => createOwedMutation.mutate({
                        fromName: d.fromName,
                        amount: d.amount,
                        description: d.description,
                        dueDate: d.dueDate ? new Date(d.dueDate).toISOString() : null,
                        notes: d.notes || null,
                      }))} className="space-y-4">
                        <FormField control={owedForm.control} name="fromName" render={({ field }) => (
                          <FormItem>
                            <FormLabel>From (Person / Company)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input className="bg-background pl-9" placeholder="e.g. John, Acme Corp…" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={owedForm.control} name="description" render={({ field }) => (
                          <FormItem>
                            <FormLabel>What for?</FormLabel>
                            <FormControl><Input className="bg-background" placeholder="e.g. Freelance invoice, split dinner…" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={owedForm.control} name="amount" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount ($)</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm text-emerald-400">+</span>
                                  <Input type="number" step="0.01" min="0" className="bg-background pl-7" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={owedForm.control} name="dueDate" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Due Date <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                              <FormControl><Input type="date" className="bg-background" {...field} /></FormControl>
                            </FormItem>
                          )} />
                        </div>
                        <FormField control={owedForm.control} name="notes" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                            <FormControl><Input className="bg-background" placeholder="Any extra details…" {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" disabled={createOwedMutation.isPending}>
                          {createOwedMutation.isPending ? "Saving..." : "Add Entry"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </Card>
            </div>

            {/* List */}
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border/50">
                    <tr>
                      <th className="px-6 py-4 font-medium">From</th>
                      <th className="px-6 py-4 font-medium">What For</th>
                      <th className="px-6 py-4 font-medium">Due Date</th>
                      <th className="px-6 py-4 font-medium text-right">Amount</th>
                      <th className="px-6 py-4 font-medium text-center">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadOwed ? (
                      <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading...</td></tr>
                    ) : owedToMe.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center">
                              <Banknote className="w-6 h-6 text-muted-foreground/40" />
                            </div>
                            <p className="text-muted-foreground font-medium">No entries yet</p>
                            <p className="text-xs text-muted-foreground/60">Track money people or companies owe you.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      [...owedToMe]
                        .sort((a, b) => {
                          if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
                          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                        })
                        .map(entry => {
                          const isOverdue = entry.status === "pending" && entry.dueDate && isPast(new Date(entry.dueDate));
                          return (
                            <tr key={entry.id} className={`border-b border-border/30 transition-colors ${entry.status === "received" ? "opacity-50" : "hover:bg-secondary/20"} ${isOverdue ? "bg-destructive/5" : ""}`}>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                                    <User className="w-3.5 h-3.5 text-emerald-400" />
                                  </div>
                                  <span className="font-semibold text-foreground">{entry.fromName}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-muted-foreground">
                                <div>
                                  <p className="text-foreground">{entry.description}</p>
                                  {entry.notes && <p className="text-xs text-muted-foreground/70 mt-0.5 italic">{entry.notes}</p>}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {entry.dueDate ? (
                                  <span className={`text-sm ${isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                                    {isOverdue && <span className="mr-1">⚠</span>}
                                    {format(new Date(entry.dueDate), 'MMM dd, yyyy')}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/40 text-sm">—</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="text-emerald-400 font-semibold">+${entry.amount.toFixed(2)}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {entry.status === "received" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                    <CheckCircle2 className="w-3 h-3" />Received
                                  </span>
                                ) : (
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${isOverdue ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                                    <Clock className="w-3 h-3" />{isOverdue ? "Overdue" : "Pending"}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-1">
                                  {entry.status === "pending" && (
                                    <Button
                                      variant="ghost" size="sm"
                                      className="h-8 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 gap-1"
                                      disabled={updateOwedMutation.isPending}
                                      onClick={() => updateOwedMutation.mutate({ id: entry.id, data: { status: "received" } })}
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />Mark received
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" disabled={deleteOwedMutation.isPending} onClick={() => deleteOwedMutation.mutate(entry.id)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ── OWED TO OTHERS TAB ────────────────────────────────────────── */}
          <TabsContent value="owed-to-others" className="flex-1 flex flex-col m-0 outline-none">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-card border-border/50 shadow-lg flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">I Owe</p>
                  <h2 className="text-2xl font-display font-bold text-orange-400 mt-0.5">${totalIOwe.toFixed(2)}</h2>
                </div>
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                  <Banknote className="w-5 h-5 text-orange-400" />
                </div>
              </Card>
              <Card className="bg-card border-border/50 shadow-lg flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Paid</p>
                  <h2 className="text-2xl font-display font-bold text-foreground mt-0.5">${totalIPaid.toFixed(2)}</h2>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
              </Card>
              <Card className={`border-border/50 shadow-lg flex items-center justify-between p-5 ${overdueIOwe.length > 0 ? "bg-destructive/5 border-destructive/20" : "bg-card"}`}>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Overdue</p>
                  <h2 className={`text-2xl font-display font-bold mt-0.5 ${overdueIOwe.length > 0 ? "text-destructive" : "text-foreground"}`}>
                    {overdueIOwe.length}
                  </h2>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${overdueIOwe.length > 0 ? "bg-destructive/10" : "bg-secondary"}`}>
                  <Clock className={`w-5 h-5 ${overdueIOwe.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
                </div>
              </Card>
              <Card className="bg-card border-border/50 shadow-lg p-4 flex flex-col justify-center">
                <Dialog open={isOwedToOthersOpen} onOpenChange={setIsOwedToOthersOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full h-full py-5 bg-orange-600 hover:bg-orange-500 text-white hover-elevate border-0 shadow-lg shadow-orange-600/20">
                      <Plus className="w-5 h-5 mr-2" />Add Entry
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border/50 shadow-2xl">
                    <DialogHeader><DialogTitle>Track Money I Owe to Others</DialogTitle></DialogHeader>
                    <Form {...owedToOthersForm}>
                      <form onSubmit={owedToOthersForm.handleSubmit(d => {
                        createOwedToOthersMutation.mutate({
                          fromName: d.fromName,
                          amount: d.amount,
                          description: d.description,
                          dueDate: d.dueDate ? new Date(d.dueDate).toISOString() : null,
                          notes: d.notes || null,
                          type: "sent",
                        });
                      })} className="space-y-4">
                        <FormField control={owedToOthersForm.control} name="fromName" render={({ field }) => (
                          <FormItem>
                            <FormLabel>To (Person / Company)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input className="bg-background pl-9" placeholder="e.g. John, Acme Corp…" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={owedToOthersForm.control} name="description" render={({ field }) => (
                          <FormItem>
                            <FormLabel>What for?</FormLabel>
                            <FormControl><Input className="bg-background" placeholder="e.g. Rent, borrowed money…" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={owedToOthersForm.control} name="amount" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount ($)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" min="0" className="bg-background" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={owedToOthersForm.control} name="dueDate" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Due Date <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                              <FormControl><Input type="date" className="bg-background" {...field} /></FormControl>
                            </FormItem>
                          )} />
                        </div>
                        <FormField control={owedToOthersForm.control} name="notes" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                            <FormControl><Input className="bg-background" placeholder="Any extra details…" {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white" disabled={createOwedToOthersMutation.isPending}>
                          {createOwedToOthersMutation.isPending ? "Saving..." : "Add Entry"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </Card>
            </div>

            {/* List */}
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border/50">
                    <tr>
                      <th className="px-6 py-4 font-medium">To</th>
                      <th className="px-6 py-4 font-medium">What For</th>
                      <th className="px-6 py-4 font-medium">Due Date</th>
                      <th className="px-6 py-4 font-medium text-right">Amount</th>
                      <th className="px-6 py-4 font-medium text-center">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadOwed ? (
                      <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading...</td></tr>
                    ) : owedToOthers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center">
                              <Banknote className="w-6 h-6 text-muted-foreground/40" />
                            </div>
                            <p className="text-muted-foreground font-medium">No entries yet</p>
                            <p className="text-xs text-muted-foreground/60">Track money you owe to others.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      [...owedToOthers]
                        .sort((a, b) => {
                          if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
                          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                        })
                        .map(entry => {
                          const isOverdue = entry.status === "pending" && entry.dueDate && isPast(new Date(entry.dueDate));
                          return (
                            <tr key={entry.id} className={`border-b border-border/30 transition-colors ${entry.status === "paid" ? "opacity-50" : "hover:bg-secondary/20"} ${isOverdue ? "bg-destructive/5" : ""}`}>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-orange-500/15 flex items-center justify-center shrink-0">
                                    <User className="w-3.5 h-3.5 text-orange-400" />
                                  </div>
                                  <span className="font-semibold text-foreground">{entry.fromName}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-muted-foreground">
                                <div>
                                  <p className="text-foreground">{entry.description}</p>
                                  {entry.notes && <p className="text-xs text-muted-foreground/70 mt-0.5 italic">{entry.notes}</p>}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {entry.dueDate ? (
                                  <span className={`text-sm ${isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                                    {isOverdue && <span className="mr-1">⚠</span>}
                                    {format(new Date(entry.dueDate), 'MMM dd, yyyy')}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/40 text-sm">—</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="text-orange-400 font-semibold">−${entry.amount.toFixed(2)}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {entry.status === "paid" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                    <CheckCircle2 className="w-3 h-3" />Paid
                                  </span>
                                ) : (
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${isOverdue ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                                    <Clock className="w-3 h-3" />{isOverdue ? "Overdue" : "Pending"}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-1">
                                  {entry.status === "pending" && (
                                    <Button
                                      variant="ghost" size="sm"
                                      className="h-8 text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 gap-1"
                                      disabled={markOwedToOthersPaidMutation.isPending}
                                      onClick={() => markOwedToOthersPaidMutation.mutate(entry)}
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />Mark paid
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" disabled={deleteOwedMutation.isPending} onClick={() => deleteOwedMutation.mutate(entry.id)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
          {/* ── SAVINGS TAB ────────────────────────────────────────────── */}
          <TabsContent value="savings" className="flex-1 flex flex-col m-0 outline-none">
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-card border-border/50 shadow-lg flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Saved</p>
                  <h2 className="text-2xl font-display font-bold text-emerald-400 mt-0.5">
                    ${savingsList.reduce((s, g) => s + g.currentAmount, 0).toFixed(2)}
                  </h2>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <PiggyBank className="w-5 h-5 text-emerald-400" />
                </div>
              </Card>
              <Card className="bg-card border-border/50 shadow-lg flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Target</p>
                  <h2 className="text-2xl font-display font-bold text-foreground mt-0.5">
                    ${savingsList.reduce((s, g) => s + g.targetAmount, 0).toFixed(2)}
                  </h2>
                </div>
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5 text-muted-foreground" />
                </div>
              </Card>
              <Card className="bg-card border-border/50 shadow-lg flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Goals</p>
                  <h2 className="text-2xl font-display font-bold text-foreground mt-0.5">{savingsList.length}</h2>
                </div>
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5 text-muted-foreground" />
                </div>
              </Card>
              <Card className="bg-card border-border/50 shadow-lg p-4 flex flex-col justify-center">
                <Dialog open={isSavingsOpen} onOpenChange={setIsSavingsOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full h-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-lg">
                      <Plus className="w-5 h-5 mr-2" />New Goal
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border/50 shadow-2xl">
                    <DialogHeader><DialogTitle>New Savings Goal</DialogTitle></DialogHeader>
                    <Form {...savingsForm}>
                      <form onSubmit={savingsForm.handleSubmit(d => createSavingsMutation.mutate({ name: d.name, targetAmount: d.targetAmount, currentAmount: d.currentAmount ?? 0, notes: d.notes ?? null }))} className="space-y-4">
                        <FormField control={savingsForm.control} name="name" render={({ field }) => (
                          <FormItem><FormLabel>Goal Name</FormLabel><FormControl><Input className="bg-background" placeholder="e.g. Emergency Fund, Vacation…" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={savingsForm.control} name="targetAmount" render={({ field }) => (
                            <FormItem><FormLabel>Target ($)</FormLabel><FormControl><Input type="number" step="0.01" min="0" className="bg-background" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={savingsForm.control} name="currentAmount" render={({ field }) => (
                            <FormItem><FormLabel>Already Saved ($)</FormLabel><FormControl><Input type="number" step="0.01" min="0" className="bg-background" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                        <FormField control={savingsForm.control} name="notes" render={({ field }) => (
                          <FormItem><FormLabel>Notes (optional)</FormLabel><FormControl><Input className="bg-background" placeholder="Why you're saving…" {...field} /></FormControl></FormItem>
                        )} />
                        <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" disabled={createSavingsMutation.isPending}>
                          {createSavingsMutation.isPending ? "Saving…" : "Create Goal"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </Card>
            </div>

            {/* Add Funds dialog */}
            <Dialog open={!!addFundsTarget} onOpenChange={open => { if (!open) setAddFundsTarget(null); }}>
              <DialogContent className="bg-card border-border/50 shadow-2xl">
                <DialogHeader><DialogTitle>Add Funds — {addFundsTarget?.name}</DialogTitle></DialogHeader>
                <Form {...addFundsForm}>
                  <form onSubmit={addFundsForm.handleSubmit(d => {
                    if (!addFundsTarget) return;
                    addFundsMutation.mutate({ id: addFundsTarget.id, extra: addFundsTarget.currentAmount + d.amount, current: addFundsTarget.currentAmount });
                  })} className="space-y-4">
                    <p className="text-sm text-muted-foreground">Current: <span className="font-semibold text-foreground">${addFundsTarget?.currentAmount.toFixed(2)}</span> / ${addFundsTarget?.targetAmount.toFixed(2)}</p>
                    <FormField control={addFundsForm.control} name="amount" render={({ field }) => (
                      <FormItem><FormLabel>Amount to Add ($)</FormLabel><FormControl><Input type="number" step="0.01" min="0" className="bg-background" autoFocus {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" disabled={addFundsMutation.isPending}>
                      {addFundsMutation.isPending ? "Saving…" : "Add Funds"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Goals list */}
            {loadSavings ? (
              <div className="text-center py-12 text-muted-foreground animate-pulse">Loading…</div>
            ) : savingsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <PiggyBank className="w-12 h-12 opacity-30" />
                <p>No savings goals yet. Create one to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {savingsList.map(goal => {
                  const pct = Math.min(100, goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0);
                  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
                  const done = pct >= 100;
                  return (
                    <Card key={goal.id} className={`bg-card border-border/50 shadow-lg p-6 flex flex-col gap-4 ${done ? "border-emerald-500/40" : ""}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {done && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                          <h3 className="font-semibold text-foreground text-base">{goal.name}</h3>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteSavingsMutation.mutate(goal.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      {goal.notes && <p className="text-xs text-muted-foreground -mt-2">{goal.notes}</p>}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className={`font-semibold ${done ? "text-emerald-400" : "text-foreground"}`}>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${done ? "bg-emerald-500" : "bg-emerald-600"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-emerald-400 font-semibold">${goal.currentAmount.toFixed(2)} saved</span>
                          <span className="text-muted-foreground">${goal.targetAmount.toFixed(2)} goal</span>
                        </div>
                        {!done && <p className="text-xs text-muted-foreground">${remaining.toFixed(2)} remaining</p>}
                      </div>
                      {!done && (
                        <Button size="sm" variant="outline" className="w-full border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10" onClick={() => { setAddFundsTarget(goal); addFundsForm.reset({ amount: 0 }); }}>
                          <Plus className="w-3.5 h-3.5 mr-1.5" />Add Funds
                        </Button>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── INVESTMENTS TAB ─────────────────────────────────────────── */}
          <TabsContent value="investments" className="flex-1 flex flex-col m-0 outline-none">
            {(() => {
              const totalCost    = investmentsList.reduce((s, i) => s + i.quantity * i.purchasePrice, 0);
              const totalValue   = investmentsList.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
              const totalPnL     = totalValue - totalCost;
              const pnlPct       = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
              const TYPE_LABELS: Record<string,string> = { stock:"Stock", crypto:"Crypto", etf:"ETF", real_estate:"Real Estate", fund:"Fund", other:"Other" };
              const TYPE_COLORS: Record<string,string> = { stock:"bg-blue-500/15 text-blue-400", crypto:"bg-orange-500/15 text-orange-400", etf:"bg-violet-500/15 text-violet-400", real_estate:"bg-emerald-500/15 text-emerald-400", fund:"bg-pink-500/15 text-pink-400", other:"bg-secondary text-muted-foreground" };
              return (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <Card className="bg-card border-border/50 shadow-lg flex items-center justify-between p-5">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Total Invested</p>
                        <h2 className="text-2xl font-display font-bold text-foreground mt-0.5">${totalCost.toFixed(2)}</h2>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <Banknote className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </Card>
                    <Card className="bg-card border-border/50 shadow-lg flex items-center justify-between p-5">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Current Value</p>
                        <h2 className="text-2xl font-display font-bold text-foreground mt-0.5">${totalValue.toFixed(2)}</h2>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                        <BarChart3 className="w-5 h-5 text-blue-400" />
                      </div>
                    </Card>
                    <Card className="bg-card border-border/50 shadow-lg flex items-center justify-between p-5">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Total P&amp;L</p>
                        <h2 className={`text-2xl font-display font-bold mt-0.5 ${totalPnL >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                          {totalPnL >= 0 ? "+" : ""}{totalPnL.toFixed(2)} <span className="text-sm font-normal">({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%)</span>
                        </h2>
                      </div>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${totalPnL >= 0 ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
                        {totalPnL >= 0 ? <TrendingUp className="w-5 h-5 text-emerald-400" /> : <TrendingDown className="w-5 h-5 text-destructive" />}
                      </div>
                    </Card>
                    <Card className="bg-card border-border/50 shadow-lg p-4 flex flex-col justify-center">
                      <Dialog open={isInvestOpen} onOpenChange={setIsInvestOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full h-full py-5 bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg">
                            <Plus className="w-5 h-5 mr-2" />Add Holding
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-border/50 shadow-2xl">
                          <DialogHeader><DialogTitle>Add Investment</DialogTitle></DialogHeader>
                          <Form {...investForm}>
                            <form onSubmit={investForm.handleSubmit(d => createInvestmentMutation.mutate({ name: d.name, type: d.type, ticker: d.ticker || null, quantity: d.quantity, purchasePrice: d.purchasePrice, currentPrice: d.currentPrice, notes: d.notes || null }))} className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <FormField control={investForm.control} name="name" render={({ field }) => (
                                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input className="bg-background" placeholder="e.g. Apple Inc." {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={investForm.control} name="ticker" render={({ field }) => (
                                  <FormItem><FormLabel>Ticker / Symbol</FormLabel><FormControl><Input className="bg-background" placeholder="e.g. AAPL" {...field} /></FormControl></FormItem>
                                )} />
                              </div>
                              <FormField control={investForm.control} name="type" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Type</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      <SelectItem value="stock">Stock</SelectItem>
                                      <SelectItem value="crypto">Crypto</SelectItem>
                                      <SelectItem value="etf">ETF</SelectItem>
                                      <SelectItem value="fund">Fund</SelectItem>
                                      <SelectItem value="real_estate">Real Estate</SelectItem>
                                      <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <div className="grid grid-cols-3 gap-3">
                                <FormField control={investForm.control} name="quantity" render={({ field }) => (
                                  <FormItem><FormLabel>Shares / Units</FormLabel><FormControl><Input type="number" step="0.000001" min="0" className="bg-background" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={investForm.control} name="purchasePrice" render={({ field }) => (
                                  <FormItem><FormLabel>Buy Price ($)</FormLabel><FormControl><Input type="number" step="0.01" min="0" className="bg-background" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={investForm.control} name="currentPrice" render={({ field }) => (
                                  <FormItem><FormLabel>Current Price ($)</FormLabel><FormControl><Input type="number" step="0.01" min="0" className="bg-background" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                              </div>
                              <FormField control={investForm.control} name="notes" render={({ field }) => (
                                <FormItem><FormLabel>Notes (optional)</FormLabel><FormControl><Input className="bg-background" {...field} /></FormControl></FormItem>
                              )} />
                              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white" disabled={createInvestmentMutation.isPending}>
                                {createInvestmentMutation.isPending ? "Adding…" : "Add Investment"}
                              </Button>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </Card>
                  </div>

                  {/* Update Price dialog */}
                  <Dialog open={!!updatePriceTarget} onOpenChange={open => { if (!open) setUpdatePriceTarget(null); }}>
                    <DialogContent className="bg-card border-border/50 shadow-2xl">
                      <DialogHeader><DialogTitle>Update Price — {updatePriceTarget?.name}</DialogTitle></DialogHeader>
                      <Form {...updatePriceForm}>
                        <form onSubmit={updatePriceForm.handleSubmit(d => { if (!updatePriceTarget) return; updatePriceMutation.mutate({ id: updatePriceTarget.id, currentPrice: d.currentPrice }); })} className="space-y-4">
                          <p className="text-sm text-muted-foreground">Previous: <span className="font-semibold text-foreground">${updatePriceTarget?.currentPrice.toFixed(2)}</span></p>
                          <FormField control={updatePriceForm.control} name="currentPrice" render={({ field }) => (
                            <FormItem><FormLabel>New Price ($)</FormLabel><FormControl><Input type="number" step="0.01" min="0" className="bg-background" autoFocus {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white" disabled={updatePriceMutation.isPending}>
                            {updatePriceMutation.isPending ? "Updating…" : "Update Price"}
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>

                  {/* Holdings table */}
                  {loadInvest ? (
                    <div className="text-center py-12 text-muted-foreground animate-pulse">Loading…</div>
                  ) : investmentsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                      <BarChart3 className="w-12 h-12 opacity-30" />
                      <p>No holdings yet. Add your first investment.</p>
                    </div>
                  ) : (
                    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-lg">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border/50">
                            <tr>
                              <th className="px-5 py-4 font-medium">Name</th>
                              <th className="px-5 py-4 font-medium">Type</th>
                              <th className="px-5 py-4 font-medium text-right">Qty</th>
                              <th className="px-5 py-4 font-medium text-right">Buy Price</th>
                              <th className="px-5 py-4 font-medium text-right">Current</th>
                              <th className="px-5 py-4 font-medium text-right">Value</th>
                              <th className="px-5 py-4 font-medium text-right">P&amp;L</th>
                              <th className="px-5 py-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {investmentsList.map(inv => {
                              const value = inv.quantity * inv.currentPrice;
                              const cost  = inv.quantity * inv.purchasePrice;
                              const pnl   = value - cost;
                              const pnlP  = cost > 0 ? (pnl / cost) * 100 : 0;
                              return (
                                <tr key={inv.id} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                                  <td className="px-5 py-4">
                                    <div className="font-semibold text-foreground">{inv.name}</div>
                                    {inv.ticker && <div className="text-xs text-muted-foreground">{inv.ticker}</div>}
                                  </td>
                                  <td className="px-5 py-4">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[inv.type] ?? TYPE_COLORS.other}`}>{TYPE_LABELS[inv.type] ?? inv.type}</span>
                                  </td>
                                  <td className="px-5 py-4 text-right text-muted-foreground">{inv.quantity}</td>
                                  <td className="px-5 py-4 text-right text-muted-foreground">${inv.purchasePrice.toFixed(2)}</td>
                                  <td className="px-5 py-4 text-right font-medium text-foreground">${inv.currentPrice.toFixed(2)}</td>
                                  <td className="px-5 py-4 text-right font-semibold text-foreground">${value.toFixed(2)}</td>
                                  <td className={`px-5 py-4 text-right font-semibold ${pnl >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                                    {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}<br/>
                                    <span className="text-xs font-normal">({pnlP >= 0 ? "+" : ""}{pnlP.toFixed(1)}%)</span>
                                  </td>
                                  <td className="px-5 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-400" onClick={() => { setUpdatePriceTarget(inv); updatePriceForm.reset({ currentPrice: inv.currentPrice }); }}>
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteInvestmentMutation.mutate(inv.id)}>
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </TabsContent>

        </Tabs>
      </div>
    </Layout>
  );
}
