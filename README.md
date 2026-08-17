# Antren — Opportunities without limits

A premium global education & opportunity platform. Students discover internships,
competitions, scholarships, summer programs, fellowships, and more — filtered by
stream, curated into a personal pipeline, and shared with peers.

## Tech stack

- **Vite + React 19 + TypeScript** (frontend)
- **React Router v7** (all imports from `react-router`)
- **Tailwind v4 + shadcn/ui** (styling)
- **Supabase** (backend & database: auth, opportunities, profiles, saved items,
  applications, messaging)
- **Framer Motion** (animations)
- **Three.js / React Three Fiber** (subtle 3D hero elements)
- **Bun** (package manager)

All app code lives in `src/`. The Deno backend entrypoint is `main.ts` (serves the
built `dist/` SPA).

## Environment variables

The app reads the following vars at runtime (managed in the platform's Keys tab):

| Var | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (publishable) key |
| `VITE_VLY_APP_ID` | Vly app id (monitoring) |
| `VITE_VLY_MONITORING_URL` | Vly monitoring endpoint |

Supabase-side config (not in the build): the magic-link email sender is set up
through Supabase's SMTP settings, and the site URL/redirect allowlist points at
the deployed app URL.

## Scripts

- `bun run dev` — start the Vite dev server
- `bun run build` — typecheck (`tsc -b`) then production build (`vite build`)
- `bun run lint` — eslint
- `scripts/` — one-off data tooling used to bulk-import the opportunity catalog
  into Supabase (`import-sheet.ts`, `migrate-supabase.ts`, `catalog.ts`)

## Auth

Auth is handled by Supabase (email magic links / OTP), wired through
`src/lib/supabase.ts` and `src/hooks/use-auth.ts`. Routes are protected with
`RequireAuth`, which sends signed-out users to `/auth?returnTo=<route>`. The
`/auth` route redirects authenticated users into `/app/for-you`.
