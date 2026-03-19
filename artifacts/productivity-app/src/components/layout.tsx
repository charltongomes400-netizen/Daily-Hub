import { ReactNode, useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid, X, LayoutDashboard, CheckCircle2, Wallet,
  Dumbbell, Target, StickyNote, LogOut, ChevronUp, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const APPS = [
  { title: "Dashboard", url: "/",       icon: LayoutDashboard, gradient: "from-violet-500/20 to-violet-600/5",  accent: "text-violet-400",  bg: "bg-violet-500/12",   border: "border-violet-500/20",  ring: "ring-violet-400/40",  glow: "shadow-violet-500/10" },
  { title: "Tasks",     url: "/tasks",   icon: CheckCircle2,    gradient: "from-blue-500/20 to-blue-600/5",     accent: "text-blue-400",    bg: "bg-blue-500/12",     border: "border-blue-500/20",    ring: "ring-blue-400/40",    glow: "shadow-blue-500/10"   },
  { title: "Finance",   url: "/finance", icon: Wallet,          gradient: "from-emerald-500/20 to-emerald-600/5", accent: "text-emerald-400", bg: "bg-emerald-500/12", border: "border-emerald-500/20", ring: "ring-emerald-400/40", glow: "shadow-emerald-500/10" },
  { title: "Gym",       url: "/gym",     icon: Dumbbell,        gradient: "from-orange-500/20 to-orange-600/5", accent: "text-orange-400",  bg: "bg-orange-500/12",   border: "border-orange-500/20",  ring: "ring-orange-400/40",  glow: "shadow-orange-500/10" },
  { title: "Goals",     url: "/goals",   icon: Target,          gradient: "from-pink-500/20 to-pink-600/5",     accent: "text-pink-400",    bg: "bg-pink-500/12",     border: "border-pink-500/20",    ring: "ring-pink-400/40",    glow: "shadow-pink-500/10"   },
  { title: "Notes",     url: "/notes",   icon: StickyNote,      gradient: "from-amber-500/20 to-amber-600/5",   accent: "text-amber-400",   bg: "bg-amber-500/12",    border: "border-amber-500/20",   ring: "ring-amber-400/40",   glow: "shadow-amber-500/10"  },
];

function Avatar({ src, name, size = 8 }: { src?: string | null; name?: string; size?: number }) {
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  return src ? (
    <img src={src} alt={name} className={`w-${size} h-${size} rounded-full object-cover ring-1 ring-border/40`} referrerPolicy="no-referrer" />
  ) : (
    <div className={`w-${size} h-${size} rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0`}>
      <span className="text-primary text-xs font-semibold">{initials}</span>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    setLauncherOpen(false);
    setUserMenuOpen(false);
  }, [location]);

  const currentApp = APPS.find(
    a => a.url === location || (a.url !== "/" && location.startsWith(a.url)),
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-background overflow-hidden relative">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent/5 blur-[140px] pointer-events-none" />

      {/* ── Desktop Sidebar (lg+) ── */}
      <aside className="hidden lg:flex flex-col w-[220px] shrink-0 border-r border-border/50 bg-background/60 backdrop-blur-md z-20 relative">
        <div className="p-5 pb-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-shadow">
              <span className="text-primary-foreground text-xs font-bold tracking-tight">PH</span>
            </div>
            <span className="font-display font-bold text-foreground text-sm leading-tight">
              Productivity<br />Hub
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1.5">
          {APPS.map(app => {
            const isActive = app.url === location || (app.url !== "/" && location.startsWith(app.url));
            return (
              <Link key={app.url} href={app.url}>
                <div
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer
                    transition-all duration-200 select-none group relative
                    ${isActive
                      ? `bg-gradient-to-r ${app.gradient} ${app.border} border shadow-md ${app.glow}`
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 border border-transparent"
                    }
                  `}
                >
                  {isActive && (
                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full ${app.bg} ${app.accent}`}
                      style={{ background: "currentColor", opacity: 0.7 }}
                    />
                  )}
                  <app.icon className={`w-5 h-5 shrink-0 ${isActive ? app.accent : "group-hover:text-foreground"}`} />
                  <span className={`font-semibold text-sm flex-1 ${isActive ? app.accent : ""}`}>
                    {app.title}
                  </span>
                  <ChevronRight className={`w-4 h-4 shrink-0 transition-all duration-200 ${isActive ? `${app.accent} opacity-80` : "text-muted-foreground/30 group-hover:text-muted-foreground/70 group-hover:translate-x-0.5"}`} />
                </div>
              </Link>
            );
          })}
        </nav>

        {/* ── User section ── */}
        {user && (
          <div className="px-3 pb-4 relative">
            <button
              onClick={() => setUserMenuOpen(o => !o)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/60 border border-transparent hover:border-border/40 transition-all group"
            >
              <Avatar src={user.avatarUrl} name={user.name} size={8} />
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </div>
              <ChevronUp className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${userMenuOpen ? "" : "rotate-180"}`} />
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-3 right-3 mb-1 bg-popover border border-border/50 rounded-xl shadow-xl overflow-hidden"
                >
                  <button
                    onClick={() => { setUserMenuOpen(false); logout(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </aside>

      {/* ── Main content column ── */}
      <div className="flex flex-col flex-1 min-w-0 z-10 relative overflow-hidden">
        {/* ── Header ── */}
        <header className="flex items-center h-14 md:h-16 px-4 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-20 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-shadow">
              <span className="text-primary-foreground text-xs font-bold tracking-tight">PH</span>
            </div>
            <span className="font-display font-bold text-foreground hidden sm:block text-sm">
              Productivity Hub
            </span>
          </Link>

          <div className="flex-1 flex items-center justify-center lg:justify-start lg:pl-2">
            {currentApp && (
              <span className="text-sm font-semibold text-foreground/80 tracking-wide lg:text-base">
                {currentApp.title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <button
                onClick={() => { logout(); }}
                title="Sign out"
                className="hidden lg:flex w-9 h-9 items-center justify-center rounded-xl bg-secondary/70 hover:bg-red-500/10 border border-border/50 text-muted-foreground hover:text-red-400 transition-all active:scale-95"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setLauncherOpen(true)}
              aria-label="Open app launcher"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-secondary/70 hover:bg-secondary border border-border/50 text-muted-foreground hover:text-foreground transition-all active:scale-95 lg:hidden"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ── Mobile App Launcher Overlay (< lg only) ── */}
      <AnimatePresence>
        {launcherOpen && (
          <motion.div
            key="launcher"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-background/96 backdrop-blur-2xl flex flex-col lg:hidden"
          >
            <div className="flex items-center justify-between px-5 py-5 pb-3 border-b border-border/30">
              <div className="flex items-center gap-3">
                {user ? (
                  <Avatar src={user.avatarUrl} name={user.name} size={10} />
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                    <span className="text-primary-foreground font-bold text-sm">PH</span>
                  </div>
                )}
                <div>
                  <p className="font-display font-bold text-base text-foreground leading-tight">
                    {user ? user.name : "Productivity Hub"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user ? user.email : "Choose an app"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLauncherOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-secondary/70 hover:bg-secondary border border-border/50 text-muted-foreground hover:text-foreground transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pt-5 pb-8">
              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto sm:max-w-lg sm:grid-cols-3">
                {APPS.map((app, i) => {
                  const isActive = app.url === location || (app.url !== "/" && location.startsWith(app.url));
                  return (
                    <motion.div
                      key={app.url}
                      initial={{ opacity: 0, scale: 0.88, y: 12 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.88 }}
                      transition={{ delay: i * 0.045, type: "spring" as const, stiffness: 340, damping: 26 }}
                    >
                      <Link href={app.url}>
                        <div
                          className={`
                            relative flex flex-col items-center justify-center gap-3
                            p-5 rounded-2xl border cursor-pointer
                            bg-gradient-to-br ${app.gradient} ${app.border}
                            transition-all duration-200 active:scale-95
                            aspect-square select-none
                            ${isActive
                              ? `ring-2 ${app.ring} border-transparent shadow-lg`
                              : "hover:scale-[1.03] hover:shadow-md hover:border-border/60"}
                          `}
                        >
                          {isActive && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary shadow-sm shadow-primary/50"
                            />
                          )}
                          <app.icon className={`w-7 h-7 sm:w-8 sm:h-8 ${app.accent}`} />
                          <span className="font-semibold text-xs sm:text-sm text-foreground text-center leading-tight">
                            {app.title}
                          </span>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {user && (
              <div className="px-5 pb-6 border-t border-border/30 pt-4">
                <button
                  onClick={() => { setLauncherOpen(false); logout(); }}
                  className="w-full flex items-center justify-center gap-2 min-h-[52px] rounded-xl bg-secondary/60 hover:bg-red-500/10 border border-border/40 hover:border-red-500/20 text-sm text-muted-foreground hover:text-red-400 transition-all active:scale-[0.98]"
                >
                  <LogOut className="w-5 h-5" />
                  Sign out
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
