import { RequestHandler } from "express";
import type { User } from "@workspace/db/schema";

declare global {
  namespace Express {
    interface User extends Omit<import("@workspace/db/schema").User, never> {}
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
};

export function getUserId(req: Express.Request): string {
  return (req.user as User).id;
}
