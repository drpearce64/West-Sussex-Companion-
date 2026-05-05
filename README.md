# The West Sussex Companion

A personal golf-round logging app for West Sussex Golf Club. Editorial design, 18-hole scorecard, hole-level diagnostics, and a "Diagnosis" engine that tells you where your strokes are actually going.

## Stack

- **Frontend**: Vite + React + TypeScript + Tailwind CSS + shadcn/ui + wouter (hash routing)
- **Backend**: Express + Drizzle ORM + better-sqlite3
- **Persistence**: SQLite file (`data.db`) on local disk
- **State**: TanStack Query for server state, lightweight component state otherwise

## Features

- 18-hole logger with white/yellow tee selection per round
- Partial rounds (1–17 holes) with played-hole semantics
- "The Card" dashboard with status-coloured hole tiles
- Diagnosis engine: 7 rules + positive-observation fallback, runs over a 10-round window
- Per-round handicap differential (rating/slope per tee)
- JSON export / import
- Light-only editorial theme: cream paper, sepia ink, Cormorant Garamond + Inter + JetBrains Mono

## Local development

```bash
npm install
npm run dev
```

Opens on `http://localhost:5000` (or `process.env.PORT` if set). Express serves both the API and the Vite dev middleware on the same port.

## Production build

```bash
npm run build
npm run start
```

The build emits:

- `dist/public/` — static client bundle
- `dist/index.cjs` — bundled Express server

## Deployment on Replit

1. Import this repo on Replit ("Create Repl" → "Import from GitHub").
2. Replit reads `.replit` and `replit.nix` automatically.
3. Click **Run** for a dev preview, or use **Deploy → Reserved VM** for a permanent URL.
4. The Reserved VM persists `data.db` between restarts, which is what you want for personal use.

### Environment

No environment variables required for default operation. Optional:

- `PORT` — defaults to `5000`. Replit sets this automatically in production.
- `NODE_ENV` — set to `production` by `.replit`'s `[env]` block.

## Data

`data.db` is created automatically on first request. Back it up by downloading the file or using the in-app **Settings → Export** (JSON download). To restore from a JSON backup, **Settings → Import**.

## Course data

Course data (yardages, par, stroke index) is hard-coded in `client/src/features/course/west-sussex.ts`, sourced from the West Sussex Golf Club website. Both white and yellow tee yardages are included.

- White: 6,265y · rating 68 · slope 128
- Yellow: 5,961y · rating 67 · slope 124
- Par: 68 (both)

## Project layout

```
client/             Vite + React frontend
  src/
    features/       Domain modules (rounds, course, diagnosis)
    pages/          Route components
    components/     UI primitives (shadcn/ui)
    lib/            Helpers (queryClient, statistics, handicap)
server/             Express backend
  index.ts          Entry point
  routes.ts         REST routes (/api/*)
  storage.ts        Drizzle storage interface
  vite.ts           Dev-mode Vite middleware
  static.ts         Production static serving
shared/
  schema.ts         Drizzle tables + Zod schemas
script/
  build.ts          Production build script (Vite + esbuild)
```

## Licence

Personal project. All rights reserved.
