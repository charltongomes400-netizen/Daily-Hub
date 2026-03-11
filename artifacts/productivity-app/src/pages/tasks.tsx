import { useState } from "react";
import { Layout } from "@/components/layout";
import { useGetTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Calendar as CalendarIcon, CheckCircle2, Circle } from "lucide-react";
import { format, isAfter } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Textarea } from "@/components/ui/textarea";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  deadline: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), { message: "Invalid date" }),
});

export default function Tasks() {
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading } = useGetTasks();
  const { mutate: createTask, isPending: isCreating } = useCreateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        setIsAddOpen(false);
        form.reset();
      }
    }
  });
  const { mutate: updateTask } = useUpdateTask({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tasks"] })
    }
  });
  const { mutate: deleteTask } = useDeleteTask({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tasks"] })
    }
  });

  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      deadline: "",
    }
  });

  const onSubmit = (data: z.infer<typeof taskSchema>) => {
    createTask({
      data: {
        title: data.title,
        description: data.description || undefined,
        priority: data.priority,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
      }
    });
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  }).sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const pMap = { high: 3, medium: 2, low: 1 };
    return pMap[b.priority] - pMap[a.priority];
  });

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col h-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Tasks</h1>
            <p className="text-muted-foreground mt-1">Manage your priorities and deadlines.</p>
          </div>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="hover-elevate active-elevate-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20 border-0">
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-card border-border/50 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="font-display">Create New Task</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="What needs to be done?" className="bg-background" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Add some details..." className="bg-background resize-none" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deadline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deadline (Optional)</FormLabel>
                          <FormControl>
                            <Input type="date" className="bg-background" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" className="w-full mt-4 hover-elevate" disabled={isCreating}>
                    {isCreating ? "Creating..." : "Create Task"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-2 mb-6 p-1 bg-secondary/50 rounded-xl w-fit">
          {(["all", "active", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 capitalize
                ${filter === f 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-card/50 border border-border/50 rounded-2xl animate-pulse" />)}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <CheckCircle2 className="w-16 h-16 opacity-20 mb-4" />
              <p className="text-lg">No tasks found.</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3 pb-8">
                {filteredTasks.map((task) => {
                  const isOverdue = task.deadline && !task.completed && isAfter(new Date(), new Date(task.deadline));
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    >
                      <Card className={`
                        group flex items-start gap-4 p-4 border transition-all duration-300 hover:shadow-lg
                        ${task.completed ? 'bg-secondary/30 border-border/30 opacity-70' : 'bg-card border-border/50 hover:border-primary/30'}
                        ${isOverdue ? 'border-destructive/50 bg-destructive/5' : ''}
                      `}>
                        <button 
                          onClick={() => updateTask({ id: task.id, data: { completed: !task.completed } })}
                          className={`mt-1 rounded-full transition-colors ${task.completed ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                        >
                          {task.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold text-lg truncate ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-3">
                            <div className={`
                              px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                              ${task.priority === 'high' ? 'bg-destructive/10 text-destructive border border-destructive/20' : ''}
                              ${task.priority === 'medium' ? 'bg-chart-4/10 text-chart-4 border border-chart-4/20' : ''}
                              ${task.priority === 'low' ? 'bg-primary/10 text-primary border border-primary/20' : ''}
                            `}>
                              {task.priority}
                            </div>
                            {task.deadline && (
                              <div className={`flex items-center text-xs font-medium ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                                <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                                {format(new Date(task.deadline), 'MMM d, yyyy')}
                                {isOverdue && " (Overdue)"}
                              </div>
                            )}
                          </div>
                        </div>

                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => deleteTask({ id: task.id })}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </Layout>
  );
}
