import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, CheckCircle2, Wallet, Dumbbell, Target, StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: LayoutDashboard, label: "Dashboard overview", color: "text-violet-400" },
  { icon: CheckCircle2,    label: "Task management",   color: "text-blue-400"   },
  { icon: Wallet,          label: "Finance tracker",   color: "text-emerald-400"},
  { icon: Dumbbell,        label: "Gym planner",       color: "text-orange-400" },
  { icon: Target,          label: "Goals tracker",     color: "text-pink-400"   },
  { icon: StickyNote,      label: "Notes",             color: "text-amber-400"  },
];

export default function Login() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
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
            Welcome back.
          </h2>
          <p className="text-muted-foreground text-sm mb-8">
            Sign in to access your personal tasks, finance tracker, gym planner, and more.
          </p>

          <div className="grid grid-cols-2 gap-2 mb-8">
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

          <Button
            onClick={handleGoogleLogin}
            className="w-full h-12 rounded-xl bg-white hover:bg-gray-50 text-gray-900 font-semibold gap-3 shadow-md hover:shadow-lg transition-all"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <p className="text-center text-xs text-muted-foreground/60 mt-4">
            Your data is private and only visible to you.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
