import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import connectPg from "connect-pg-simple";
import { rateLimit } from "express-rate-limit";
import router from "./routes";

const PgStore = connectPg(session);

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new PgStore({
      conString: process.env.DATABASE_URL,
      tableName: "sessions",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      sameSite: "lax",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

function userKey(req: express.Request): string {
  const user = req.user as { id: number } | undefined;
  return user ? `user-${user.id}` : "unauthenticated";
}

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 200,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: userKey,
  message: { error: "Too many requests, please slow down." },
  skip: (req) => req.method === "GET",
});

const writeLimiter = rateLimit({
  windowMs: 10 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: userKey,
  message: { error: "Too many requests, please slow down." },
});

app.use("/api", apiLimiter);
app.use("/api", (req, _res, next) => {
  if (req.method === "POST" || req.method === "PATCH" || req.method === "DELETE") {
    return writeLimiter(req, _res, next);
  }
  return next();
});

app.use("/api", router);

export default app;
