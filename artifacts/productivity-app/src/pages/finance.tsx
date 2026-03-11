import { useState } from "react";
import { Layout } from "@/components/layout";
import { 
  useGetExpenses, useCreateExpense, useDeleteExpense,
  useGetSubscriptions, useCreateSubscription, useUpdateSubscription, useDeleteSubscription
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, TrendingDown, TrendingUp, RefreshCw, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const EXPENSE_CATEGORIES = ["Food", "Transport", "Shopping", "Health", "Entertainment", "Other"];
const SUB_CATEGORIES = ["Streaming", "Software", "Fitness", "News", "Other"];

const expenseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z.coerce.number().min(0.01, "Amount must be > 0"),
  type: z.enum(["expense", "income"]),
  category: z.string().min(1, "Category is required"),
  date: z.string().min(1, "Date is required"),
});

const subSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.coerce.number().min(0.01, "Amount must be > 0"),
  billingCycle: z.enum(["monthly", "quarterly", "yearly"]),
  category: z.string().min(1, "Category is required"),
  nextBillingDate: z.string().min(1, "Date is required"),
});

export default function Finance() {
  const queryClient = useQueryClient();
  const [isExpOpen, setIsExpOpen] = useState(false);
  const [isSubOpen, setIsSubOpen] = useState(false);

  const { data: expenses = [], isLoading: loadExp } = useGetExpenses();
  const { data: subscriptions = [], isLoading: loadSub } = useGetSubscriptions();

  const { mutate: createExp, isPending: isCreatingExp } = useCreateExpense({
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/expenses"] }); setIsExpOpen(false); expForm.reset(); } }
  });
  const { mutate: deleteExp } = useDeleteExpense({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/expenses"] }) }
  });
  const { mutate: createSub, isPending: isCreatingSub } = useCreateSubscription({
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] }); setIsSubOpen(false); subForm.reset(); } }
  });
  const { mutate: updateSub } = useUpdateSubscription({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] }) }
  });
  const { mutate: deleteSub } = useDeleteSubscription({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] }) }
  });

  const expForm = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { title: "", amount: 0, type: "expense", category: "", date: format(new Date(), 'yyyy-MM-dd') }
  });

  const subForm = useForm<z.infer<typeof subSchema>>({
    resolver: zodResolver(subSchema),
    defaultValues: { name: "", amount: 0, billingCycle: "monthly", category: "", nextBillingDate: format(new Date(), 'yyyy-MM-dd') }
  });

  const watchType = expForm.watch("type");

  const totalIncome   = expenses.filter(e => (e as any).type === "income").reduce((s, e) => s + e.amount, 0);
  const totalSpent    = expenses.filter(e => (e as any).type !== "income").reduce((s, e) => s + e.amount, 0);
  const netBalance    = totalIncome - totalSpent;

  const totalMonthlySubs = subscriptions.filter(s => s.isActive).reduce((sum, s) => {
    if (s.billingCycle === "monthly")   return sum + s.amount;
    if (s.billingCycle === "yearly")    return sum + (s.amount / 12);
    if (s.billingCycle === "quarterly") return sum + (s.amount / 3);
    return sum;
  }, 0);

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto flex flex-col h-full pb-20">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Finance</h1>
          <p className="text-muted-foreground mt-1">Track your spending and manage recurring costs.</p>
        </div>

        <Tabs defaultValue="expenses" className="flex-1 flex flex-col">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-secondary/50 p-1 mb-8">
            <TabsTrigger value="expenses" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Expenses</TabsTrigger>
            <TabsTrigger value="subscriptions" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Subscriptions</TabsTrigger>
          </TabsList>

          {/* EXPENSES TAB */}
          <TabsContent value="expenses" className="flex-1 flex flex-col m-0 outline-none">
            {/* Summary cards */}
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
                  {netBalance >= 0
                    ? <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                    : <ArrowDownLeft className="w-5 h-5 text-destructive" />}
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
                    <DialogHeader>
                      <DialogTitle>Log Entry</DialogTitle>
                    </DialogHeader>
                    <Form {...expForm}>
                      <form
                        onSubmit={expForm.handleSubmit(d =>
                          createExp({ data: { title: d.title, amount: d.amount, type: d.type, category: d.category, date: new Date(d.date).toISOString() } as any })
                        )}
                        className="space-y-4"
                      >
                        {/* Type toggle */}
                        <FormField control={expForm.control} name="type" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <div className="flex rounded-xl overflow-hidden border border-border/60 w-full">
                              <button
                                type="button"
                                onClick={() => field.onChange("expense")}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all
                                  ${field.value === "expense"
                                    ? "bg-destructive/15 text-destructive border-r border-border/60"
                                    : "bg-background text-muted-foreground hover:text-foreground border-r border-border/60"}`}
                              >
                                <ArrowDownLeft className="w-4 h-4" />
                                Expense (−)
                              </button>
                              <button
                                type="button"
                                onClick={() => field.onChange("income")}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all
                                  ${field.value === "income"
                                    ? "bg-emerald-500/15 text-emerald-400"
                                    : "bg-background text-muted-foreground hover:text-foreground"}`}
                              >
                                <ArrowUpRight className="w-4 h-4" />
                                Income (+)
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
                                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm ${watchType === "income" ? "text-emerald-400" : "text-destructive"}`}>
                                    {watchType === "income" ? "+" : "−"}
                                  </span>
                                  <Input type="number" step="0.01" className="bg-background pl-7" {...field} />
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger className="bg-background"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                              <SelectContent>
                                {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <Button
                          type="submit"
                          className={`w-full ${watchType === "income" ? "bg-emerald-600 hover:bg-emerald-500" : ""}`}
                          disabled={isCreatingExp}
                        >
                          {isCreatingExp ? "Saving..." : watchType === "income" ? "Log Income" : "Log Expense"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </Card>
            </div>

            {/* Table */}
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
                      [...expenses]
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((exp) => {
                          const isIncome = (exp as any).type === "income";
                          return (
                            <tr key={exp.id} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                              <td className="px-6 py-4 font-medium text-foreground">{format(new Date(exp.date), 'MMM dd, yyyy')}</td>
                              <td className="px-6 py-4 text-foreground">
                                <span className="flex items-center gap-2">
                                  {isIncome
                                    ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    : <ArrowDownLeft className="w-3.5 h-3.5 text-destructive shrink-0" />}
                                  {exp.title}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                                  {exp.category}
                                </span>
                              </td>
                              <td className={`px-6 py-4 text-right font-semibold ${isIncome ? "text-emerald-400" : "text-foreground"}`}>
                                {isIncome ? "+" : "−"}${exp.amount.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <Button variant="ghost" size="icon" onClick={() => deleteExp({ id: exp.id })} className="text-muted-foreground hover:text-destructive h-8 w-8">
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

          {/* SUBSCRIPTIONS TAB */}
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
                    <DialogHeader>
                      <DialogTitle>Add New Subscription</DialogTitle>
                    </DialogHeader>
                    <Form {...subForm}>
                      <form onSubmit={subForm.handleSubmit(d => createSub({ data: { ...d, nextBillingDate: new Date(d.nextBillingDate).toISOString() } }))} className="space-y-4">
                        <FormField control={subForm.control} name="name" render={({ field }) => (
                          <FormItem><FormLabel>Service Name</FormLabel><FormControl><Input className="bg-background" {...field} /></FormControl></FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={subForm.control} name="amount" render={({ field }) => (
                            <FormItem><FormLabel>Amount ($)</FormLabel><FormControl><Input type="number" step="0.01" className="bg-background" {...field} /></FormControl></FormItem>
                          )} />
                          <FormField control={subForm.control} name="billingCycle" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cycle</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                  <SelectItem value="quarterly">Quarterly</SelectItem>
                                  <SelectItem value="yearly">Yearly</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={subForm.control} name="category" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger className="bg-background"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  {SUB_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                              </Select>
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
                        <Switch
                          checked={sub.isActive}
                          onCheckedChange={(checked) => updateSub({ id: sub.id, data: { isActive: checked } })}
                        />
                      </div>
                      <div className="flex items-end gap-1 mb-6">
                        <span className="text-3xl font-bold font-display text-foreground">${sub.amount.toFixed(2)}</span>
                        <span className="text-sm text-muted-foreground mb-1 pb-0.5">/{sub.billingCycle === 'monthly' ? 'mo' : sub.billingCycle === 'yearly' ? 'yr' : 'qtr'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-muted-foreground">
                          <RefreshCw className="w-4 h-4 mr-1.5 opacity-70" />
                          <span className={sub.isActive ? 'text-foreground' : ''}>
                            {format(new Date(sub.nextBillingDate), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteSub({ id: sub.id })} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
