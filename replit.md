# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, Tailwind CSS, Shadcn UI, React Query, Framer Motion, Recharts

## Application

**Productivity Hub** - A centralized productivity app with a dark theme consisting of two core modules:

1. **Task Management** - Full to-do list with title, description, priority (low/medium/high), optional deadlines, completion toggling, and filtering.
2. **Finance & Subscription Tracker** - Two tabs:
   - **Expenses**: Log daily expenses with title, amount, category, date, and notes. Shows monthly totals.
   - **Subscriptions**: Track recurring subscriptions with name, amount, billing cycle (monthly/quarterly/yearly), category, next billing date, and active/inactive status.
3. **Dashboard** - Overview with task completion %, monthly expenses, active subscriptions cost, recent expense chart, and upcoming tasks.

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── productivity-app/   # React + Vite frontend (dark theme productivity app)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Database Schema

- `lib/db/src/schema/tasks.ts` — Tasks table (id, title, description, completed, priority, deadline, createdAt, updatedAt)
- `lib/db/src/schema/expenses.ts` — Expenses table (id, title, amount, category, date, notes, createdAt)
- `lib/db/src/schema/subscriptions.ts` — Subscriptions table (id, name, amount, billingCycle, category, nextBillingDate, isActive, notes, createdAt)

## API Routes

- `GET/POST /api/tasks` — list and create tasks
- `PATCH/DELETE /api/tasks/:id` — update and delete tasks
- `GET/POST /api/expenses` — list and create expenses
- `DELETE /api/expenses/:id` — delete an expense
- `GET/POST /api/subscriptions` — list and create subscriptions
- `PATCH/DELETE /api/subscriptions/:id` — update and delete subscriptions
