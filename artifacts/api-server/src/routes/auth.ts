import { Router } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@workspace/db";
import { usersTable, categoriesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { User } from "@workspace/db/schema";

const DEFAULT_CATEGORIES = [
  { name: "Streaming",  color: "purple",  icon: "tv-2",      isDefault: true },
  { name: "Life / IRL", color: "emerald", icon: "home",      isDefault: true },
  { name: "Work",       color: "blue",    icon: "briefcase", isDefault: true },
  { name: "Tech / PC",  color: "amber",   icon: "monitor",   isDefault: true },
];

async function seedDefaultCategories(userId: string) {
  const existing = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.userId, userId));
  if (existing.length === 0) {
    await db.insert(categoriesTable).values(
      DEFAULT_CATEGORIES.map((c) => ({ ...c, userId }))
    );
  }
}

const callbackURL = process.env.APP_URL
  ? `${process.env.APP_URL}/api/auth/google/callback`
  : `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`;

const googleCredsConfigured =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

if (googleCredsConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value ?? "";
          const avatarUrl = profile.photos?.[0]?.value ?? null;

          const existing = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, profile.id))
            .limit(1);

          if (existing.length > 0) {
            const [user] = await db
              .update(usersTable)
              .set({ name: profile.displayName, avatarUrl })
              .where(eq(usersTable.id, profile.id))
              .returning();
            return done(null, user);
          }

          const [user] = await db
            .insert(usersTable)
            .values({ id: profile.id, email, name: profile.displayName, avatarUrl })
            .returning();

          await seedDefaultCategories(user.id);

          done(null, user);
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
}

passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.email, email.toLowerCase().trim()))
          .limit(1);

        if (!user || !user.passwordHash) {
          return done(null, false, { message: "Invalid email or password" });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return done(null, false, { message: "Invalid email or password" });
        }

        done(null, user);
      } catch (err) {
        done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, (user as User).id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);
    done(null, user ?? null);
  } catch (err) {
    done(err);
  }
});

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const router = Router();

if (googleCredsConfigured) {
  router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  router.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: "/?auth_error=1" }),
    (_req, res) => {
      res.redirect("/");
    }
  );
} else {
  router.get("/google", (_req, res) => {
    res.status(503).json({
      error: "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.",
    });
  });
}

router.post("/register", async (req, res) => {
  try {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      res.status(400).json({ error: "Validation failed", fields: errors });
      return;
    }

    const { name, email, password } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "An account with this email already exists", fields: { email: ["An account with this email already exists"] } });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();

    const [user] = await db
      .insert(usersTable)
      .values({ id, email: normalizedEmail, name: name.trim(), passwordHash })
      .returning();

    await seedDefaultCategories(user.id);

    req.login(user, (err) => {
      if (err) {
        res.status(500).json({ error: "Failed to create session" });
        return;
      }
      res.status(201).json({
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      });
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err: Error | null, user: User | false, info: { message: string }) => {
    if (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
    if (!user) {
      return res.status(401).json({ error: info?.message || "Invalid email or password" });
    }
    req.login(user, (loginErr) => {
      if (loginErr) {
        return res.status(500).json({ error: "Failed to create session" });
      }
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      });
    });
  })(req, res, next);
});

router.get("/me", (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const user = req.user as User;
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  });
});

router.post("/logout", (req, res) => {
  req.logout(() => {
    res.json({ ok: true });
  });
});

export default router;
