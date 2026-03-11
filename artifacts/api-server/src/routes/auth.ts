import { Router } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "@workspace/db";
import { usersTable, categoriesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
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
