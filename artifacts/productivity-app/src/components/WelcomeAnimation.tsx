import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { CheckCircle2 } from "lucide-react";

const getTimeGreeting = () => {
  const h = new Date().getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
};

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: `${(i * 41 + 7) % 86 + 7}%`,
  top: `${(i * 53 + 11) % 76 + 12}%`,
  size: (i % 3) + 1,
  delay: (i * 0.17) % 2.2,
  duration: 3.5 + (i % 5),
}));

interface Props {
  name: string;
  onComplete: () => void;
}

export function WelcomeAnimation({ name, onComplete }: Props) {
  const [exiting, setExiting] = useState(false);
  const firstName = name.split(" ")[0] || "there";
  const greeting = getTimeGreeting();

  const triggerExit = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    setTimeout(onComplete, 950);
  }, [exiting, onComplete]);

  useEffect(() => {
    const t = setTimeout(triggerExit, 3600);
    return () => clearTimeout(t);
  }, [triggerExit]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center cursor-pointer overflow-hidden"
      style={{ background: "linear-gradient(145deg, #05060e 0%, #090b14 55%, #05060e 100%)" }}
      animate={exiting ? { y: "-100%" } : { y: 0 }}
      transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
      onClick={triggerExit}
    >
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Ambient center glow — white */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 70%)",
        }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Corner accents */}
      {[
        { top: 24, left: 24 },
        { top: 24, right: 24 },
        { bottom: 24, left: 24 },
        { bottom: 24, right: 24 },
      ].map((pos, i) => (
        <motion.div
          key={i}
          className="absolute w-6 h-6 pointer-events-none"
          style={{
            ...pos,
            borderTop: i < 2 ? "1px solid rgba(255,255,255,0.18)" : undefined,
            borderBottom: i >= 2 ? "1px solid rgba(255,255,255,0.18)" : undefined,
            borderLeft: i % 2 === 0 ? "1px solid rgba(255,255,255,0.18)" : undefined,
            borderRight: i % 2 === 1 ? "1px solid rgba(255,255,255,0.18)" : undefined,
          }}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 + i * 0.07, duration: 0.4, ease: "easeOut" }}
        />
      ))}

      {/* Floating particles — white */}
      {PARTICLES.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: "rgba(255,255,255,0.7)",
            boxShadow: `0 0 ${p.size * 4}px rgba(255,255,255,0.25)`,
          }}
          animate={{
            y: [0, -(12 + p.size * 4), 0],
            opacity: [0.08, 0.6, 0.08],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Scan line — top quarter of screen, well above content */}
      <div className="absolute inset-x-0 pointer-events-none" style={{ top: "22%" }}>
        <motion.div
          style={{
            height: 1,
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 20%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0.12) 80%, transparent 100%)",
            transformOrigin: "center",
          }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
        />
      </div>

      {/* Scan line — bottom quarter of screen, well below content */}
      <div className="absolute inset-x-0 pointer-events-none" style={{ bottom: "22%" }}>
        <motion.div
          style={{
            height: 1,
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 20%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0.12) 80%, transparent 100%)",
            transformOrigin: "center",
          }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
        />
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-col items-center text-center select-none px-8">

        {/* App label with flanking lines */}
        <motion.div
          className="mb-10 flex items-center gap-4"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.55, ease: "easeOut" }}
        >
          <div
            className="h-px"
            style={{
              width: 48,
              background: "linear-gradient(to left, rgba(255,255,255,0.35), transparent)",
            }}
          />
          <span
            className="text-[11px] font-semibold tracking-[0.3em] uppercase"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Productivity Hub
          </span>
          <div
            className="h-px"
            style={{
              width: 48,
              background: "linear-gradient(to right, rgba(255,255,255,0.35), transparent)",
            }}
          />
        </motion.div>

        {/* Time greeting */}
        <motion.p
          className="font-light tracking-wide mb-2"
          style={{
            fontSize: "clamp(1.1rem, 2.5vw, 1.5rem)",
            color: "rgba(255,255,255,0.4)",
          }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.78, duration: 0.55, type: "spring", stiffness: 200, damping: 22 }}
        >
          {greeting},
        </motion.p>

        {/* Name — big hero */}
        <motion.h1
          className="font-display font-bold tracking-tight text-white"
          style={{
            fontSize: "clamp(4rem, 11vw, 8rem)",
            lineHeight: 1.0,
            textShadow: "0 0 80px rgba(255,255,255,0.25), 0 0 200px rgba(255,255,255,0.1)",
          }}
          initial={{ opacity: 0, x: 80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.0, duration: 0.65, type: "spring", stiffness: 155, damping: 15 }}
        >
          {firstName}.
        </motion.h1>

        {/* Progress bar — white */}
        <motion.div
          className="mt-10 rounded-full overflow-hidden"
          style={{
            width: "clamp(160px, 25vw, 240px)",
            height: 1,
            background: "rgba(255,255,255,0.08)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.3 }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: "rgba(255,255,255,0.7)" }}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ delay: 1.7, duration: 1.2, ease: [0.4, 0, 0.15, 1] }}
          />
        </motion.div>

        {/* Status */}
        <motion.div
          className="mt-5 flex items-center gap-2.5"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.7, duration: 0.55 }}
        >
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 2.75, type: "spring", stiffness: 380, damping: 14 }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.4)" }} />
          </motion.div>
          <span
            className="text-xs font-medium tracking-[0.22em] uppercase"
            style={{ color: "rgba(255,255,255,0.22)" }}
          >
            Workspace ready
          </span>
        </motion.div>
      </div>

      {/* Skip hint */}
      <motion.p
        className="absolute bottom-7 text-[10px] tracking-[0.22em] uppercase select-none pointer-events-none"
        style={{ color: "rgba(255,255,255,0.1)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.0, duration: 0.6 }}
      >
        Click anywhere to continue
      </motion.p>
    </motion.div>
  );
}
