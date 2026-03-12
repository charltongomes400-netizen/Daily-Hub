import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, CheckCircle2, Wallet, Dumbbell, Target, StickyNote,
  Mail, Lock, User, Eye, EyeOff, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";

const FEATURES = [
  { icon: LayoutDashboard, label: "Dashboard overview", color: "text-violet-400" },
  { icon: CheckCircle2,    label: "Task management",   color: "text-blue-400"   },
  { icon: Wallet,          label: "Finance tracker",   color: "text-emerald-400"},
  { icon: Dumbbell,        label: "Gym planner",       color: "text-orange-400" },
  { icon: Target,          label: "Goals tracker",     color: "text-pink-400"   },
  { icon: StickyNote,      label: "Notes",             color: "text-amber-400"  },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      const url = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body = mode === "register"
        ? { name: name.trim(), email, password }
        : { email, password };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.fields) {
          setFieldErrors(data.fields);
        }
        if (res.status === 401) {
          setFieldErrors({ email: ["Invalid email or password"], password: ["Invalid email or password"] });
        } else if (!data.fields) {
          setError(data.error || "Something went wrong");
        }
        return;
      }

      queryClient.setQueryData(["/api/auth/me"], data);
      setLocation("/");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(m => m === "signin" ? "register" : "signin");
    setError("");
    setFieldErrors({});
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent/5 blur-[140px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="text-primary-foreground font-bold tracking-tight">PH</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-foreground text-lg leading-tight">
                Productivity Hub
              </h1>
              <p className="text-xs text-muted-foreground">Your personal workspace</p>
            </div>
          </div>

          <h2 className="text-2xl font-display font-bold text-foreground mb-2">
            {mode === "signin" ? "Welcome back." : "Create account."}
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            {mode === "signin"
              ? "Sign in to access your personal workspace."
              : "Set up your account to get started."}
          </p>

          <div className="grid grid-cols-2 gap-2 mb-6">
            {FEATURES.map(({ icon: Icon, label, color }) => (
              <div
                key={label}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/40 border border-border/30"
              >
                <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                <span className="text-xs text-muted-foreground font-medium">{label}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <AnimatePresence mode="popLayout">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="popLayout">
              {mode === "register" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <Input
                      placeholder="Full name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="pl-10 h-11 rounded-xl bg-secondary/40 border-border/40 focus:border-primary/50 transition-colors"
                      required
                    />
                  </div>
                  {fieldErrors.name && (
                    <p className="text-xs text-red-400 mt-1 ml-1">{fieldErrors.name[0]}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-10 h-11 rounded-xl bg-secondary/40 border-border/40 focus:border-primary/50 transition-colors"
                  required
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-red-400 mt-1 ml-1">{fieldErrors.email[0]}</p>
              )}
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "register" ? "Password (min. 6 characters)" : "Password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 rounded-xl bg-secondary/40 border-border/40 focus:border-primary/50 transition-colors"
                  required
                  minLength={mode === "register" ? 6 : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-red-400 mt-1 ml-1">{fieldErrors.password[0]}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl font-semibold transition-all"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-5">
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}
            <button
              onClick={toggleMode}
              className="ml-1.5 text-primary hover:text-primary/80 font-semibold transition-colors"
            >
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </p>

          <p className="text-center text-xs text-muted-foreground/60 mt-3">
            Your data is private and only visible to you.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
