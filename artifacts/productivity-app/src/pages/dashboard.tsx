import { useGetTasks, useGetExpenses, useGetSubscriptions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Wallet, CreditCard, ArrowRight, Activity } from "lucide-react";
import { Layout } from "@/components/layout";
import { format, subDays, isAfter } from "date-fns";
import { motion } from "framer-motion";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: tasks = [], isLoading: loadingTasks } = useGetTasks();
  const { data: expenses = [], isLoading: loadingExpenses } = useGetExpenses();
  const { data: subscriptions = [], isLoading: loadingSubs } = useGetSubscriptions();

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
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
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
          <div className="pt-12 pb-6 px-4 md:px-8">
            <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-foreground">
              Welcome back.
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Here is your productivity and finance overview.
            </p>
          </div>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 md:px-0"
        >
          <motion.div variants={itemVariants}>
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-lg shadow-black/10 overflow-hidden relative group hover:border-primary/30 transition-colors">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <CheckCircle2 className="w-24 h-24 text-primary" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">Task Completion</CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold font-display">{taskProgress}%</div>
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

          <motion.div variants={itemVariants}>
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-lg shadow-black/10 overflow-hidden relative group hover:border-accent/30 transition-colors">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Wallet className="w-24 h-24 text-accent" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Expenses</CardTitle>
                <Wallet className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold font-display">${monthlyExpenses.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total spent in {format(new Date(), 'MMMM')}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-lg shadow-black/10 overflow-hidden relative group hover:border-chart-4/30 transition-colors">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <CreditCard className="w-24 h-24 text-chart-4" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
                <CreditCard className="h-4 w-4 text-chart-4" />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold font-display">${activeMonthlySubs.toFixed(2)}<span className="text-lg text-muted-foreground font-normal">/mo</span></div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {subscriptions.filter(s => s.isActive).length} active services
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <motion.div variants={itemVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4 md:px-0">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-lg shadow-black/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-display">Recent Expenses</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Last 7 days spending activity</p>
              </div>
              <Link href="/finance">
                <Button variant="ghost" size="icon" className="hover-elevate">
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
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
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
                    <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-lg shadow-black/10 flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="font-display">Upcoming Tasks</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Tasks requiring your attention</p>
              </div>
              <Link href="/tasks">
                <Button variant="ghost" size="icon" className="hover-elevate">
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
        </motion.div>
      </div>
    </Layout>
  );
}
