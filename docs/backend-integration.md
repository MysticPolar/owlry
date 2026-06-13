# Owlry — Backend integration guide

Design rationale lives in [`backend-plan.md`](./backend-plan.md). This is the
"how to turn it on" checklist. Nothing here runs automatically — the app keeps
working **local-only** until the env vars below are set.

## What's in the repo

```
supabase/migrations/
  20260613170000_owlry_core.sql       tables, RLS, grants (public.owlry_*)
  20260613170100_owlry_functions.sql  economy RPCs + read models (calendar/radar/stats)
  20260613170200_owlry_seed.sql       tunable config + per-action costs + radar tags
src/lib/supabase.ts                   client (null until env is set)
src/lib/economy/{types,api}.ts        typed RPC wrappers
src/store/backend.ts                  snapshot → store bridge
.env.example                          VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
```

## Step 1 — apply the migrations (needs you / the connector)

The migrations are **additive and namespaced `public.owlry_*`** — they read or
alter nothing that already exists, so they're safe on the shared landing/waitlist
database. Apply them one of these ways:

- **Supabase MCP** (once it's live in the session): `apply_migration` each file in
  order — I can drive this for you.
- **SQL editor / CLI**: paste each file in order, or `supabase db push` if you use
  the CLI with this repo linked.

They're idempotent where it matters (`create … if not exists`, `on conflict do
update`), so re-running the seed just retunes the numbers.

## Step 2 — env (needs you)

Copy `.env.example` → `.env.local` and set the project URL + anon key (Settings →
API). Restart `dev`/redeploy. `supabase` becomes non-null and the backend is live.

## Step 3 — auth (needs you: confirm the waitlist's method)

You chose **reuse the waitlist's Supabase Auth**. Every RPC derives the user from
`auth.uid()`, so the app needs a session. Whatever the waitlist uses (email magic
link / OTP is most common) is what the app should call, e.g.:

```ts
await supabase!.auth.signInWithOtp({ email });   // magic link
// …or signInWithOAuth({ provider }) if the waitlist uses OAuth
```

Tell me the waitlist's method (or let me read it once the connector is live) and
I'll drop in the matching sign-in. Profiles are created lazily on first RPC call,
so existing waitlist users get an `owlry_profiles` row automatically — no
backfill needed.

## Step 4 — wire the store (I'll do this once the above is confirmed)

The store already centralizes the loop, so the change is contained to
`src/store/useStore.ts`:

- **bootstrap**: if `isBackendConfigured()` and signed in → `hydrateFromServer()`
  (from `store/backend.ts`) instead of the IndexedDB seed.
- **economy actions** become server calls + reconcile. Each maps 1:1 to an action:

  | store action | RPC call |
  | --- | --- |
  | `sendToOwl` | `performAction('chat')` |
  | `openLetter` (preview) | `performAction('preview', id)` |
  | `openReader` | `performAction('open', id, { page })` |
  | `nextPage` | `performAction('turn_page', id, { page })` |
  | `finishBook` | `performAction('finish', id, { pages })` |
  | `toggleSave` | `performAction('save'|'unsave', id)` |
  | daily first launch | `performAction('checkin')` |

  Apply optimistic local updates for snappiness, then `applySnapshot(result)` to
  reconcile with the authoritative balances. On `reason: 'insufficient_ink' |
  'insufficient_coins'`, roll back the optimistic update and nudge the user.

- **profile tabs**: point `radar`, `calendar`, `stats`, and `quotes` at the
  snapshot arrays instead of the static content modules (the shapes already
  match `RadarPoint` / `CalendarDay` / `StatsSnapshot` / `QuoteRow`).

Local IndexedDB stays as the offline/signed-out fallback via the existing
`ProgressRepository`.

## Economy reference (tunable in `owlry_action_config` / `owlry_economy_config`)

| Action | XP | Ink | Coins |
| --- | ---: | ---: | ---: |
| chat | +3 | −1 | 0 |
| open book | +8 | 0 | 0 |
| turn page | +1 | +2 | 0 |
| **preview / letter** | **+25** | **−5** | **−10** |
| finish book | +60 | 0 | +25 |
| save book | +5 | 0 | 0 |
| daily check-in | +10 | +20 | 0 |

- **Ink**: spent by chat/preview; earned by reading (+2/page) **and** energy-style
  time regen (+1 every 6 min to the cap); refilled on level-up.
- **Coins**: spent by preview; earned at milestones (finish +25, level-up +50,
  7-day streak +30). Paid purchase is architected-for (an `owlry_activity` row of
  type `purchase`) but the payment integration is a flagged future task.
- **Levels**: derived from lifetime XP via `owlry_level_for_xp` (curve
  `50·L² + 50·L − 100`).

## Out of scope (now)

The live AI chat endpoint and any model keys — chatting still runs the simulated
owl client-side; only its economy (ink/XP/activity) is metered.
