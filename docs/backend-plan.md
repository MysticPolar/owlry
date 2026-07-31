# Owlry — Backend Plan (Supabase)

Status: **proposal for review.** Nothing here has been applied. The Supabase
MCP connector is **not available in this Claude Code session** (verified — none
of its tools are exposed), so I can't read the shared database or run
migrations from here yet. Everything below is designed to be applied either
once that connector is live, or by you running the migration files directly.

This backend covers the **economy + analytics** only: experience, levels, ink,
coins, reading progress, calendar, radar, stats, streaks, quotes. The **AI chat
API is explicitly out of scope** for now — chatting still runs the client-side
simulated owl; we only wire up the *economy* of chatting (it spends ink, earns
XP, and logs activity).

---

## 0. What needs your permission (left for you)

These can't or shouldn't be done autonomously — flagged so you can do them:

1. **Enable Anonymous sign-ins** in Supabase → Authentication → Providers
   (needed to give each device a server-side identity without a login screen).
2. **Project URL + anon public key** for the web app's env (the anon key is safe
   to ship to the browser — RLS protects the data). Or confirm I may read them
   via the connector once it's live.
3. **Applying migrations to the shared production DB.** Because the landing page
   + waitlist live in the same database, I've designed everything to be
   **additive and namespaced** (`public.owlry_*`) so it can't touch your existing
   tables — but you should eyeball the migration before it runs, and either the
   connector needs to be active here or you run the SQL.
4. Anything involving **secrets / billing / the future chat model** — out of scope.

Everything *else* (schema, economy logic, RPC functions, RLS, the frontend
integration code) I can write and commit now.

---

## 1. Principles

- **Server-authoritative economy.** Balances (XP, ink, coins) and every spend/
  earn happen inside Postgres functions, never trusted from the client. The app
  calls an RPC; the function validates, mutates atomically, logs, and returns the
  new balances. This prevents the client from minting XP/coins or chatting for
  free.
- **Shared-DB safety.** All new objects are **additive** and live under a single
  prefix `owlry_` in the `public` schema. No existing table is read or altered.
  (Alternative: a dedicated `owlry` schema — cleaner isolation, but requires you
  to add it to the API's *Exposed schemas*. The prefix approach works with zero
  dashboard config, so it's the default. Easy to switch.)
- **Append-only ledger.** Every economy change writes an `owlry_activity` row.
  Balances are a materialized convenience; the ledger is the source of truth and
  powers the calendar, radar, and stats.
- **Identity without a login.** Supabase **anonymous auth** gives each device an
  `auth.users` row + JWT. Accounts/email-linking can come later without a schema
  change (link the anon user to an email).
- **Catalog stays client-side.** The 24 books are static content; the DB only
  stores *per-user* state keyed by the text `book_id`. (A server catalog table is
  a later option if you want to manage books without shipping the app.)

---

## 2. Identity / Auth

- On launch the app calls `supabase.auth.signInAnonymously()` (once; the session
  persists in localStorage). Every request carries that JWT; RLS scopes all rows
  to `auth.uid()`.
- A trigger creates the user's `owlry_profiles` row on first sign-in
  (`on auth.users insert`), seeded with starting balances.
- Later: when accounts ship, call `supabase.auth.updateUser({ email })` /
  `linkIdentity` to upgrade the anonymous user in place — their data carries over.

---

## 3. Data model (`public.owlry_*`, all RLS-protected)

```sql
-- one row per user; the economy balances live here (denormalized for speed)
owlry_profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  username    text,
  total_xp    bigint  not null default 0,   -- lifetime XP; level is derived
  ink         integer not null default 60,
  ink_max     integer not null default 120,
  coins       integer not null default 40,
  streak      integer not null default 0,
  last_active date,                          -- for streak + daily check-in
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
)

-- per-user, per-book state (saved / reading / finished + progress)
owlry_user_books (
  user_id     uuid    not null references auth.users(id) on delete cascade,
  book_id     text    not null,             -- matches client catalog id
  status      text    not null check (status in ('saved','reading','finished')),
  pages_read  integer not null default 0,
  started_at  timestamptz,
  finished_at timestamptz,
  last_read_at timestamptz,
  updated_at  timestamptz not null default now(),
  primary key (user_id, book_id)
)

-- append-only economy + activity ledger (powers calendar, radar, stats)
owlry_activity (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,                -- chat|preview|open|turn_page|finish|save|unsave|checkin
  book_id     text,
  xp_delta    integer not null default 0,
  ink_delta   integer not null default 0,
  coin_delta  integer not null default 0,
  meta        jsonb   not null default '{}',
  created_at  timestamptz not null default now()
)

-- tucked-away quotes (profile › quotes)
owlry_quotes (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references auth.users(id) on delete cascade,
  book_id   text not null,
  text      text not null,
  kept_at   timestamptz not null default now()
)

-- tunable economy config (no redeploy to retune costs/rewards)
owlry_action_config (
  action   text primary key,   -- 'chat','preview','open','turn_page','finish','save','checkin'
  xp       integer not null default 0,
  ink      integer not null default 0,   -- negative = spend, positive = earn
  coins    integer not null default 0,
  enabled  boolean not null default true
)

-- book → radar dimension tag (drives "reading balance")
owlry_book_dimensions (
  book_id   text primary key,
  dimension text not null  -- health|wealth|love|happiness|wonder
)
```

Indexes: `owlry_activity (user_id, created_at)`, `owlry_activity (user_id, type)`,
`owlry_user_books (user_id, status)`.

---

## 4. Economy logic

Three resources with distinct roles:

| Resource | Role | Direction |
| --- | --- | --- |
| **XP** | progression → **levels** | only goes up, never spent |
| **Ink** | "chances to talk to the owl" | **spent** by chat & preview; earned by reading + daily |
| **Coins** | premium currency | **spent** by preview; earned at milestones |

### 4a. XP — earning (preview is the biggest single action)

Proposed defaults (seeded into `owlry_action_config`, tunable):

| Action | XP | Ink | Coins |
| --- | ---: | ---: | ---: |
| chat (send a message) | **+3** | **−1** | 0 |
| open a book (reader) | **+8** | 0 | 0 |
| turn a page | **+1** | **+2** | 0 |
| **preview / generate a letter** | **+25** | **−5** | **−10** |
| finish a book | **+60** | 0 | **+25** |
| save a book | **+5** | 0 | 0 |
| daily check-in | **+10** | **+20** | 0 |

Preview is the premium action: it gives the most XP **and** is the only thing
that spends coins, and it spends ink too — so it's gated on `ink ≥ 5 AND
coins ≥ 10`.

### 4b. Levels (derived from `total_xp`)

We store **lifetime `total_xp`** and derive level + progress with a pure
function (no drift, retune anytime):

```
cumulative_xp_to_reach(L) = 150*(L-1) + 50*(L-1)^2     -- L2=200, L3=500, L4=900, L5=1400 …
level_for_xp(total)       = greatest L where cumulative_xp_to_reach(L) <= total
```

Returned to the UI: `level`, `xp_into_level`, `xp_for_next` (drives the XP bar).
Crossing a threshold awards a level-up bonus (full ink refill + coins) inside
the same transaction.

### 4c. Ink — the AI-credit loop

- **Spend:** chat −1, preview −5.
- **Earn:** turning pages +2 (reading fuels the owl — the core loop), daily
  check-in +20, level-up = top up to `ink_max`. *(Optional: buy 10 ink for 5
  coins — a coin→ink sink. Flagged as a decision.)*
- **Cap:** `ink_max` (default 120; +10 per level is an option).
- If a chat/preview is attempted with insufficient ink, the RPC returns a
  typed `insufficient_ink` result and the UI nudges "read a few pages to refill."

> The brief specified ink *consumption* (chat, preview) but not how it's
> replenished — **read-to-earn + daily top-up** is my proposal because it ties
> the owl to actually reading. This is decision #2 below.

### 4d. Coins — premium currency

- **Spend:** preview −10 (and future store items).
- **Earn:** finish a book +25, level-up +50, 7-day-streak milestone +30.
  *(No passive coin drip — coins stay "premium." Real-money purchase is a future
  add.)*

> Coin *earning* also wasn't specified — **milestones only** is my proposal
> (decision #3).

---

## 5. Subsystems (all derived from the tables above)

- **Calendar** (profile › calendar — "a day you asked the owl & previewed a
  pick"): distinct dates from `owlry_activity` where `type in ('preview','chat')`,
  with the previewed book per day. Plus optional "books finished" dots from
  `owlry_user_books.finished_at`. Served by a view `owlry_calendar(user_id, day, …)`.
- **Radar** ("reading balance — five shelves of you"): for each of the 5
  dimensions, count **+1 per saved book** and **+1 per kept quote** tagged to that
  pillar (unsaving or deleting a quote drops those points). Cap 100.
  Served by `owlry_radar_json(user_id)` → 5 rows.
- **Stats report card**: `books_read = count(status='finished')`,
  `pages_turned = sum(pages_read)`, `highlights = count(owlry_quotes)`.
  `time_reading` has no source yet — either estimate from page-turn events
  (e.g. ~45s/page) or add lightweight reading-session tracking later (noted).
- **Streak**: maintained on each activity — if `last_active = today` no-op; if
  `= yesterday` increment; else reset to 1. The week-dots read the last 7 days of
  `owlry_activity`.
- **Quotes**: straight CRUD on `owlry_quotes` (the mockup only had seeded quotes
  + copy; this makes "keep a quote" real).

---

## 6. Server RPCs (atomic, `security definer`)

One guarded entry point per action, e.g.:

```sql
owlry_perform_action(p_action text, p_book_id text default null, p_meta jsonb default '{}')
returns owlry_action_result      -- { ok, reason, xp, level, xp_into_level,
                                 --   xp_for_next, ink, ink_max, coins, leveled_up }
```

It runs in a single transaction: look up `owlry_action_config`, check ink/coin
sufficiency (preview gate), apply deltas to `owlry_profiles`, recompute level +
level-up bonus, upsert `owlry_user_books` when relevant (open→reading,
finish→finished, save), append an `owlry_activity` row, update streak, and return
fresh balances. Plus small helpers: `owlry_save_quote`, `owlry_set_progress`,
`owlry_get_snapshot` (one call that returns profile + library + calendar + radar
+ stats for first paint).

All functions are `security definer`, owned by a privileged role, `granted to
authenticated`, and internally constrained to `auth.uid()` — so the client can
only ever affect its own rows.

---

## 7. Row-Level Security

RLS `enable` on every `owlry_*` table; policy on each: `using (auth.uid() =
user_id)` for select/insert/update/delete. `owlry_action_config` and
`owlry_book_dimensions` are world-readable (`to authenticated using (true)`),
writable only by the service role. Mutations go through the RPCs, not direct
table writes.

---

## 8. Radar dimension mapping (five life pillars)

Life areas, not literary genres. One pillar per book. Google Books categories
map via `src/lib/pillars/categoryMap.ts`; catalog seeds override:

- **health**: wws
- **wealth**: deep, bird
- **love**: beach
- **happiness**: medit, frankl, pema, atomic, gentle, remains, oldman, circe, goldfinch
- **wonder**: snow, piranesi, pachinko, tranq, cuckoo, rose, hail, sleep, kindred, none, spqr

Empty shelves (e.g. little wealth reading) are intentional — Mirror names the quiet district.

---

## 9. Frontend integration (phase 2, after sign-off)

- Add `@supabase/supabase-js`; `src/lib/supabase.ts` creates the client from env
  (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- Bootstrap: anonymous sign-in → `owlry_get_snapshot` → hydrate the store.
- The store's existing **`ProgressRepository` seam** gains a `SupabaseRepository`;
  economy actions (`toggleSave`, `openReader`, `nextPage`, `openLetter`,
  `sendToOwl`, `finishBook`) call `owlry_perform_action` and apply the returned
  balances. Local optimistic update stays for snappiness, reconciled with the
  server response; IndexedDB stays as the offline cache.
- Because the loop is already centralized in `useStore`, the UI components don't
  change at all.

---

## 10. Decisions I need from you

1. **Identity** — anonymous auth (recommended), email login now, or reuse
   whatever the waitlist already uses?
2. **Ink replenishment** — read-to-earn + daily top-up (recommended), daily
   refill only, or time-based regen?
3. **Coins** — milestones only (recommended); is paid purchase on the roadmap?
4. **Apply strategy** — since the connector isn't live here, want me to write all
   migrations + integration code into the repo now (apply later), or hold?

## 11. Out of scope (now)

The live AI chat endpoint / Edge Function and any model keys. Chatting keeps
running the simulated owl; we only meter its economy.
