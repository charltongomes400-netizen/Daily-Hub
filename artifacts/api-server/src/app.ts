import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import connectPg from "connect-pg-simple";
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

app.use("/api", router);

export default app;
