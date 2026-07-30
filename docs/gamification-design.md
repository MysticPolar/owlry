# Owlry gamification — *A Season at the Theatre, on the House Ledger*

> **Status:** approved 2026-07-28, and **implemented the same day** on
> `renovation/homescreen`. The SQL migrations are written but **NOT APPLIED** to
> the live project — the three reconstructed migrations
> (`owlry_harden`, `owlry_calendar_question`, `owlry_v2_economy_defaults`) were
> rebuilt from a read-only audit and must be diffed against the live database
> before any `db push`. The client half runs today for guests, which is the
> whole economy minus the ledger.
> **Revised 2026-07-30 — the seat map was re-cut from 13 levels to 36** (§4): same thirteen rows,
> same 9,000-XP summit, but a seat now moves every third level and the first four levels are a
> learning curve a reader clears in one session. Level-up brass is keyed to the row (§4, §6) and
> the **peek slip** joins the stand as the recurring sink (§6). `ECONOMY_VERSION` → 3;
> `CURVE_VERSION` deliberately stays 2 (it marks the storage migration, not the curve's shape).
> **How it came to be:** three candidate designs were drafted, adversarially critiqued, and revised
> (A — *House Lights*, client-side; B — *The House Ledger*, server-authoritative; C — *A Season at
> the Theatre*, the theatrical superset). The decision: **C's soul on B's skeleton** — the theatre
> expression running on the server ledger. A second adversarial pass over the merge seams produced
> 27 findings; all are folded in here. The three originals are summarized in the appendix.
> **Companion docs:** `docs/story-bible.md` (canon — binding), `docs/Owlry-PRD.md` §9/§16,
> `docs/backend-plan.md`, `docs/backend-integration.md`.

---

## 1. Principles

1. **One economy, one truth.** The `owlry_activity` ledger is the single history; balances are
   derived, never asserted. The client is optimistic, the server is right.
2. **Everything on screen is real.** No seeded streaks, no fake XP flys, no toasts that lie.
   If Keeper says it, it happened.
3. **Reading out-earns launching.** No grant may make opening the app pay better than twenty
   minutes with a book.
4. **The dry well never blocks.** Ink gates only the live (LLM) owl; every refusal falls back
   silently to the free offline brain. This is canon, not UX preference (`story-bible.md` §"the
   small economy"; PRD §9).
5. **Coins buy comfort and costume** — never XP, levels, content, or forgiveness.
6. **In-fiction or not at all.** Ink is what letters are written with; coins are brass tokens found
   under the seats; levels are seats; the streak is Keeper's flame. Gold belongs to the house,
   never to an owl. "The Hush" is never named in copy. One owl per line.

---

## 2. Authority and the action contract

Server-authoritative for signed-in users. Every reward verb becomes a call site of
`performAction` (`src/lib/economy/api.ts`): **optimistic local delta → RPC
`owlry_perform_action` → `applySnapshot` reconcile (`src/store/backend.ts`) → adjust on refusal.**
`applySnapshot` retires the flat-400 `xpMax` lie by mapping `xp_into_level`/`xp_for_next`/`level`.

**Guards ship first.** The deployed RPC applies deltas unconditionally today; the guard suite
(§3) lands inside `owlry_perform_action` *before* any client call site exists.

**Result contract** (extend `src/lib/economy/types.ts`):

```ts
interface ActionResult extends Partial<Snapshot> {
  ok: boolean;
  granted: { xp: number; ink: number; coins: number };   // what actually happened
  withheld?: 'rate_limited' | 'duplicate' | 'insufficient_ink' | 'insufficient_coins';
  leveled_up?: boolean;
}
```

Guard refusals are **partial successes**: the library write lands, XP is withheld, `ok` stays
true. The client reconciles against `granted`, never against what it asked for.
`EconomyAction` gains `quote_keep` and `purchase`.

**Time.** Every guard evaluates a client-stamped `meta.occurred_at` (clamped to ≤ `now()` and
≥ the last accepted entry) — never server receipt time — so the offline queue can flush a day of
reading in one burst without the rate guards refusing it. All day/hour logic (checkin day, streak
day, dark night, full house, night-owl stub) derives from a persisted
`owlry_profiles.tz_offset_minutes`, refreshed on every action.

**Offline queue.** FIFO per device, monotonic sequence; idempotency key in `meta`, enforced by a
unique partial index `(user_id, (meta->>'idem')) WHERE meta ? 'idem'` on `owlry_activity`;
replayed in order, reconciled once from the final snapshot.

**Writes only via SECURITY DEFINER RPCs.** The peek charge/refund moves inside the `owl-peek`
edge function (§5). RLS stays as deployed: `owlry_profiles` readable own-row only, all mutation
through RPCs.

---

## 3. Experience — the action table

One config-alignment migration rewrites `owlry_action_config` (tunable later without an app
release):

| action | XP | ink | coins | guard (ledger-derived, evaluated on `occurred_at`) |
|---|---:|---:|---:|---|
| `turn_page` (5% tick) | 4 | +2 | 0 | dedupe on (user, book, `meta.step` 1–20); ≤ 20 steps/book ever; ≥ 60 s between XP-bearing steps; ≤ 60 steps/day |
| `open` (first time) | 8 | 0 | 0 | once per book; XP-bearing opens ≤ 3/day |
| `finish` | 60 | 0 | +25 | once per book; requires ≥ 19 of 20 steps in the ledger and ≥ 20 min since `open` |
| `save` | 5 | 0 | 0 | XP once per (user, book); save/unsave cycling nets zero |
| `chat` (live reply) | 3 | −1 | 0 | XP on the **first 6 live chats/day**; ink still spends past that |
| `preview` (live letter) | 0 | −5 | 0 | ≤ **6 live generations/day** regardless of ink, **+1 per peek slip bought today** (§6); cached re-opens free |
| `quote_keep` | 5 | 0 | 0 | text-hash dedupe; first 5/day pay XP, silent keep after |
| `checkin` | 10 | +10 | 0 | once per local day |
| `purchase` | 0 | varies | −price | sku validated against the season catalogue (§6) |

Notes, each of which closes a verified exploit:

- **`turn_page` meta carries both numbers:** `{ page: <real page>, step: <1-20> }`. The RPC's
  `pages_read` bookkeeping keeps consuming real pages (stats, radar, reading minutes); the XP
  dedupe uses `step` only. (Sending the step as `page` would collapse everyone's `pages_read`
  to ≤ 19.)
- **`preview` pays 0 XP.** The seeded 25 XP was a 1,000-XP/day idle farm; peeks are content, not
  labor. With the coin cost also gone (§6), the **6/day generation cap** is the LLM throttle —
  without it, regen + pages + checkin fund ~37 free Gemini letters a day.
- **`chat` XP caps at 6/day.** Otherwise passive regen (48 ink/day) converts to 144 XP/day of
  idle chatting, beating any reader.
- **Global daily XP ceiling: 150.** Grants past it are withheld (not banked). The learning curve
  (§4) is *meant* to fall in the first session — LV5 costs 90 XP — but the climb behind it is
  where the ceiling bites: a grinder still needs ≥ 60 days to reach the front row (LV36, 9,000
  XP) instead of exhausting the seat map in a week.
- **`full_house` (+5 XP)** — a matinée act (before 18:00 local) *and* an evening act the same
  local day, once/day — is **not callable**. It is granted server-side inside
  `owlry_perform_action`, like `levelup`, with its own `type='full_house'` ledger row.
- **`quote_keep` is the single quote path.** `owlry_save_quote` folds into
  `performAction('quote_keep')` (which already returns a full snapshot); the standalone RPC
  retires, so the hash-dedupe sees every insert.
- **Declined hooks stay declined:** epub upload, desk switch, bio edit, downvote pay nothing.
  Mirror stays near-silent.
- **Onboarding act 5 becomes honest:** the "+20 xp" fly and level bar wire to a real grant
  (signed-in through the ledger; guests through the local simulation).

---

## 4. Levels — the seat map

**Curve** (a hand-built table, `src/lib/economy/curve.ts`): **thirty-six levels**. The deployed
quadratic is retired from live pricing and survives only inside `legacyTotalXp` /
`owlry_migrate_balance`, which must keep quoting it (§9) or a grandfathered blob would re-price
against a curve the ledger never paid out on.

The first four steps are the **learning curve** — 32 / 6 / 17 / 35 XP, so LV2 costs 32 and LV5
costs 90 — and the climb proper starts at LV6: +100 a level through row 11, then the step widens
by 40 every third level (+140, +180, +220 … +460) and +510 for the last stride to the front.
**LV36 = 9,000 XP, exactly where LV13 used to sit** — the summit's price never moved, only the
number of stops on the way up. Past the cap, cumulative XP(L) = 9,000 + (L − 36)·1,000: one
honorary level per encore star, the same cadence on purpose, so the bar and the album never
disagree.

**Seats, canon resolved.** The house still has **thirteen rows, numbered from the stage** — but a
seat now moves every **third** level: `row = 13 − ⌊LV/3⌋`. LV1–2 sit in row 13 — the back row, so
*"everyone starts in the back row"* is literally true — and **LV36 alone holds row 1, the front
row and the last paid level.** Twelve moves across thirty-five level-ups: the row is the
milestone, the levels are the heartbeat between two of them.

| LV | row | cum. XP | casual day* | unlock |
|---:|---:|---:|---:|---|
| 2 | 13 | 32 | ~1 | the lobby stand opens |
| 3 | 12 | 38 | ~2 | **Scout's pro desk** (unchanged gate); the seat's first move |
| 5 | 12 | 90 | ~3 | **Profile / Mirror, chains fall** (unchanged gate) |
| 6 | 11 | 190 | ~6 | the climb proper begins |
| 9 | 10 | 530 | ~16 | — |
| 12 | 9 | 990 | ~30 | — |
| 15 | 8 | 1,570 | ~47 | — |
| 18 | 7 | 2,270 | ~67 | — |
| 21 | 6 | 3,090 | ~91 | — |
| 24 | 5 | 4,030 | ~119 | — |
| 27 | 4 | 5,090 | ~150 | — |
| 30 | 3 | 6,270 | ~185 | — |
| 33 | 2 | 7,570 | ~223 | — |
| 36 | 1 | 9,000 | ~265 | the front row |

\* casual ≈ 34 XP/day (§10). The whole meta layer opens at the start rather than six weeks in —
the stand and the pro desk in the first few minutes, the mirror by day 3 — which is the point of
the learning band: a seeded LV7 reader would never have watched any of it happen. Engaged
(~54 XP/day) clears the learning curve on day 2 and reaches row 8 (LV15) in ~30 days.

**Above LV36:** the server stops the level faucet (no row coins, no refill above LV36) and
`applySnapshot` clamps display `lv = min(level, 36)` — no row 0, ever. Every further 1,000 XP
stamps a cosmetic **encore star**: the bar runs on `(total_xp − 9000) mod 1000`; each star is a
ledger stub `type='stub', meta {id:'encore', n}` and the album renders "encore ×N".

**Level-up grants: brass is keyed to the ROW the new level lands in** (`ROW_COINS`), so the seats
near the stage pay better and coin velocity is part of the climb:

| row | 13 | 12 | 11 | 10 | 9 | 8–3 | 2–1 |
|---|---:|---:|---:|---:|---:|---:|---:|
| coins per level-up | 10 | 20 | 30 | 50 | 70 | 100 | 200 |

A single action that crosses several levels pays **each** level at its own row's rate (`engine.ts`
loops level by level), so one early finish can clear three levels and three payments at once.
Nothing is paid past LV36. **Lifetime LV2 → LV36: 3,120 coins.** On any level-up the well also
tops up **to the resting line (60), not the cap** — a full-cap refill was 24 free peeks per level,
outside every budget. Level-up copy names the row.

---

## 5. Ink

- **Cap 120** (migrate live `ink_max` 100 → 120; repo intent wins for tunables).
- **Earn:** +2 per 5% tick · +10 checkin · +10 onboarding bundle.
- **Regen:** +1 per 30 min (`ink_regen_minutes` 6 → 30), lazily from `last_active`, **seeping
  only up to a new config `ink_rest_line = 60`.** The well finds its level; pages and mornings
  fill it past that. The full-well coin latch (§6) can never fire passively, and regen alone can
  never fund a peek binge.
- **Spend:** −1 live ask · −2 generated letter (refund on failure) · −5 live peek.
- **Peek plumbing:** the `preview` charge/refund moves inside the `owl-peek` edge function —
  charged before generation, compensating ledger entry on failure; the client never touches the
  spend. The client keeps an **advisory** pre-check at `ink < 5` (today's `willGenerate` hold in
  `openLetter`), and a server `insufficient_ink` refusal lands as **the same soft-hold** —
  letter waits, Scout speaks, `letterStatus` stays `'idle'` — never an error state.
- **The dry well never hard-blocks.** Chat falls silently to the offline brain (existing
  behaviour); letters soft-hold as above. The dry-well line remains **Scout's single i18n key**
  at both existing call sites (`useStore.ts:711` and `:971`): *"the inkwell is dry — a few pages
  will refill it."*
- **A 30-minute session, arriving at 80:** +10 checkin, +4 pages, +1 regen, −4 spends → **91**.
  Weather, not a wallet. Generation-heavy nights draw down 20–40 and recover to 60 on their own.

---

## 6. Coins — the lobby stand

**Faucets — milestones only, no drip:**
row-keyed level-up brass, 10 → 200 a level by the row it lands in (§4; **3,120 across
LV2 → LV36**, nothing past the front row) · +25 per finish · +30 per 7-day streak · +50 once-ever
full-well latch. The client-side +50 in `addInk` is **deleted**; the latch becomes server-derived —
`ink_done` joins `owlry_profile_json` and `applySnapshot` sets it, so the bonus can never
double-fire, and the lying "daily ink full" toast is retired.

**The sink — the lobby stand.** `src/components/overlays/LobbyStand.tsx`, the one new surface.
Keeper runs it (he counts brass); it opens from the coins chip, LV2+. Stock:

| good | price | what it does |
|---|---:|---|
| letter stationery (per design) | 40 | Peek's letters arrive on that paper (cosmetic) |
| marquee letters | 80 | decorate the Today wordmark marquee (cosmetic) |
| seat cushion | 120 | shown on your row of the seat map (cosmetic) |
| **the small bottle** | 5 | +10 ink, **once a day** — a bounded valve, never required |
| **a slip for the desk** | 30 | one more live letter *today* — raises the day's generation ceiling by 1, **max 3/day**. No ink, no XP, never "owned" |

**The slip is the recurring sink the milestone faucets need.** Cosmetics are bought once and then
never again; the bottle is capped at 5 coins a day. The slip is the only thing brass can buy that
the free economy also grants — which is why it is bounded hard at three a day and grants nothing
but the desk's attention (the client guard is `daily.preview >= DAILY_CAPS.preview + daily.slips`;
the LLM ceiling is never lifted by ink, only by brass).

**Purchases are ledger entries:** `performAction('purchase', { sku, season })`, `type='purchase'`
rows; owned goods derive from the snapshot. There is **no client-blob `standGoods` field** — a
blob field would be self-grantable under the owner-writable RLS of `owlry_progress` and
resurrectable by max-wins merge.

**Seasons.** A season is a **calendar quarter**, defined by two `owlry_economy_config` keys:
`season_epoch` and `season_days` (90). `season_id = floor((now − epoch) / season_days)`, stamped
into `meta.season` on every purchase and stub. Each season rotates the stationery design and
regroups the album (§8).

**Balance (coins/month), casual reader:** the level faucet runs the whole climb rather than
front-loading it — the ladder spreads 3,120 across nine months, so inflow sits at **~345–585 a
month** (month one ≈ 525: 380 of level brass to LV12, plus ~145 of streak and finishes) and then
falls to **~145** the month the seat reaches row 1 and the faucet closes. Outflow: ~80/month
amortized on seasonal goods, up to ~150 on daily bottles — and up to **90 a day** (~2,700/month)
for a reader who buys all three slips. The entire lifetime 3,120 of level-up brass is about five
weeks of a three-slip habit: the milestones can afford to be generous precisely because the sink
outruns them. Mild pressure early, real pressure late, no drip.
**Coins never buy XP, levels, content, or forgiveness.**

---

## 7. Streak — Keeper's flame and the dark night

- **Active day:** any positive-XP ledger entry in the user's local day (via
  `tz_offset_minutes`). Checkin counts — but pays only 10 XP, so the flame is cheap to keep and
  worthless to farm.
- **Mechanism:** server-side day-compare on `owlry_profiles.last_active` inside
  `owlry_perform_action`: same day → no-op; yesterday → +1; older → dark-night check.
- **The dark night (free, fictional forgiveness):** the *first* missed day in any rolling 7 is
  auto-kept — *"the house was dark — your flame kept."* A second miss rests the flame warmly, no
  scolding, no fee. One new column `dark_night_at date` makes the rolling-7 check cheap. There is
  **no paid relight** — forgiveness is never a coin sink.
- **Rewards:** +30 coins each 7th real day; the 7-day stub.
- **The seeded 12 retires as fiction:** migration stamps a keepsake stub — *"last season's
  flame"* — and the real flame lights at 1 on the first post-migration active day. Flame chip
  states: dim at 0, lit at 1+, gold-bright at 7+ (house gold — the flame is the house's, not an
  owl's).

---

## 8. Achievements — ticket stubs

Stubs are **server-granted ledger entries** (`type='stub'`, `meta.id`), delta-granting — only
post-migration events count, so seeded demo state grants nothing on ship day. A second unique
partial index prevents double-stamping: `(user_id, (meta->>'id'), (meta->>'n')) WHERE
type='stub'`. Exposed via a new `stubs_json` read model wired into `owlry_snapshot_json`,
mirrored in `src/lib/economy/types.ts`. Guests evaluate local equivalents.

| stub | condition (ledger-derived) |
|---|---|
| opening night | onboarding completed |
| first real finish | first `finish` row |
| seven nights | streak reaches 7 (real counter) |
| twenty books | 20 finishes beyond the demo seed's (`oldman`, `none` excluded) |
| night owl | any XP-bearing row with local hour ≥ 22 |
| marathon | first and last XP-bearing rows within one local day ≥ 3,600 s apart — **ledger span, not client-reported seconds** |
| full well | the once-ever cap latch |
| returning patron | first active day after ≥ 14 dark days |
| last season's flame | keepsake, stamped at migration for old blobs with the seeded streak |
| encore ×N | each 1,000 XP past LV36 |

The Profile `.achgrid` becomes **the album**: stubs grouped under quarterly programme headers by
their ledger timestamp.

---

## 9. Migration & sync

Ordered; steps 2 and 4 must ship together.

1. **Drift audit first.** Snapshot the live schema; commit the 3 live migrations missing from the
   repo (`owlry_harden`, `owlry_calendar_question`, `owlry_v2_economy_defaults`). Patch
   `owlry_profile_json` to a 1-indexed display level and add `schema_v: 2` to the payload — this
   guards the new client against the *live* 0-indexed JSON (the repo has no `level + 1` shim
   today; confirm the live 0-index in this audit).
2. **`owlry_migrate_balance` — re-runnable, ratcheting.** On each snapshot until it stops
   improving, only ever upward (evidence on a second device arrives late):
   `total_xp = 50·lv² + 50·lv − 100 + xp`, **capped at the LV5 equivalent unless the blob holds
   evidence beyond demo data** — finishes not in the seed's (`oldman`, `none`), or `pagesRead`
   above the seeded `goldfinch: 463` / `pachinko: 118` / `tranq: 224`. Never demotes below the
   evidenced level. Clamps: xp ≤ 8,000 (~LV12), coins ≤ 300. Stores `evidence_hash` and
   `migrated_at`; audits the old blob into `meta`. `inkDone: true` carries as a zero-delta
   `well_full` ledger row — badge kept, no second +50.
3. **Blob demotion.** For authed users, `owlry_progress.state` keeps authority only over shelves,
   `pagesRead`, and prefs. Economy fields **stay mirrored** (absence would trigger the
   `{...SEED, ...state}` resurrection in `normalizePersisted`) plus `economyVersion: 3`;
   hydration ignores blob economy whenever a snapshot exists; `mergeProgress` compares economy
   only between legacy blobs.
4. **`adoptAccount` goes snapshot-first.** Today it saves and cloud-pushes the merged
   (LV7-seeded) state *before* any snapshot lands and tolerates the pull failing. New order:
   merge shelves → **await `getSnapshot()`** → apply → then `saveLocal`/`cloudPush`. On snapshot
   failure: mark dirty, skip both writes — a stale seed blob must never re-enter max-wins.
5. **Every new persisted field walks through all three literals** — `extractPersisted`
   (`useStore.ts`), `normalizePersisted` (`normalize.ts`), `mergeProgress`
   (`src/lib/sync/mergeProgress.ts`) — with an explicit default and an explicit merge rule.
   New fields: `stubsSince`, `streakLastDay`, `quoteDay` (day + count + hashes — never quote
   text), `fullHouseDay`, `curveV`, `economyVersion`. Guests get a one-time `curveV: 2` pass that
   converts a pre-ledger flat-400 blob onto lifetime `totalXp`. **`curveV` stays 2 across the
   36-level re-cut**: it marks that storage conversion, not the curve's shape, and `derive()`
   re-labels every post-ledger blob against whatever table ships today. Bumping it would flip
   real lifetime totals back through `legacyTotalXp` — data loss, not a no-op.
6. **Guests.** A versioned `ACTION_CONFIG` constants module (keyed to `curveV`) carries the same
   numbers **and the same guards** (anon cannot read `owlry_action_config`, and numbers without
   guards are an unbounded farm). `adoptAccount`'s guest carry-over clamps XP/coins exactly as
   `owlry_migrate_balance` does. The guest "gain a level" buttons reroute to `debugLevelUp()` —
   bumps `lv` only, no coins, no refill — so minted brass can never launder into a real account.

---

## 10. Numbers sanity (worked)

- **Casual day** (~20 min ≈ ~10% of a book ≈ 2 ticks): pages 8 + checkin 10 + the odd
  save/quote/ask ~8 + one finish a week amortized ~8 → **~34 XP/day** → LV3 ~day 2, LV5 ~day 3,
  LV13 ~day 35, the front row ~day 265. Engaged (~40 min): ~54 XP/day → LV5 on day 2, LV13 in
  ~22 days.
- **The learning curve is the onboarding, not a tutorial:** onboarding 20 + a first open 8 + one
  5% tick 4 = **32 exactly** — LV2 and the lobby stand, before the reader finishes a chapter.
  Six more XP is LV3 and Scout's pro desk. LV5 and the mirror cost 90: day one for a session that
  opens a few books, day 3 for the ~34 XP/day casual. Nobody waits six weeks to meet the app's
  own features anymore.
- **Idle ceiling** (no reading): checkin 10 + 6 chats × 3 = **28 XP/day** — less than one
  casual reading day. Principle 3 holds.
- **Grinder ceiling:** global 150/day → the learning curve falls inside day 1 (by design), LV13
  in ≥ 8 days, LV36 in ≥ 60 days — the summit's pace is exactly what it was when it was LV13.
- **Peeks/day fundable:** the 6/day generation guard binds, not ink (a full well would fund 24);
  three slips lift the day's ceiling to 9 and cost 90 brass to do it. The resting line means a
  binge recovers to 60, not 120.
- **30-min session ink:** 80 → 91 (§5). A five-peek night: −25, back to the resting line by
  morning, pages refill the rest.
- **Coins:** ~345–585/month across the ~9-month climb (3,120 of level brass spread over it, plus
  ~145 of streak and finishes) vs ~80 amortized goods + optional bottles; **~145/month** once the
  seat reaches the front row and the faucet closes, against the same sinks plus slips at up to
  90/day. Surplus shrinks as the album fills. No drip: every faucet is a milestone.

---

## 11. UI touchpoints (one new surface)

| surface | change |
|---|---|
| StatChips + CompactStrip (`src/components/screens/TodayScreen.tsx:23-47`) | crown becomes the **seat chip** — the row, never the level ("ROW 13" on opening night, "ROW 1" at LV36); it takes `id="lvLab"`, reclaiming the dead burst anchor (`src/components/chrome.tsx:177`) so level-up sparks finally land |
| ProfileScreen (`src/components/screens/ProfileScreen.tsx`) | 13-row **seat map** above the XP bar; coins chip opens the LobbyStand; `.achgrid` becomes the stub album; flame chip dim/lit/bright |
| MirrorRoom (`src/components/overlays/MirrorRoom.tsx`) | same LV5 logic; stepper labeled by row, **counting down** (row 13 → row 12 — LV5 is one move off the back wall). Direction rule: rows count down as levels count up — state once, apply everywhere. `lvOf` gets a row-worded en+zh variant |
| Settings (`src/components/overlays/Settings.tsx`) | account line reads live values, e.g. "ROW 12 · LV 5 · 70 COINS" |
| LobbyStand (`src/components/overlays/LobbyStand.tsx`, **new**) | §6; built from existing overlay primitives (`useOverlayPresence`, `usePullDismiss`, `.pb-psheet` paper grammar) |
| Onboarding act 5 (`src/components/overlays/Onboarding.tsx`) | ink HUD, XP fly, and level bar all wired to real grants |
| Toasts (`showToast`) | all new lines below; migration morning gets one Keeper toast |

---

## 12. Copy (every key ships en + zh in `src/i18n/dicts`; one owl per line)

| owl | line |
|---|---|
| keeper | "level up! LV 6 — row 11. your seat moved toward the stage." |
| keeper | "the front row. the seat stops moving — the reading does not." |
| keeper | "the house was dark last night — your flame kept." |
| keeper | "checked in — your ticket, stamped. +10 XP" |
| keeper | "finished — entered in the ledger. +60 XP · +25 coins" |
| keeper | "a small bottle — 5 coins, 10 ink." |
| keeper | "the desk has written its letters for today — but a slip is 30 coins." |
| keeper | "a stub for the album — opening night." |
| keeper | "the house opened its ledger — your page is copied in. the flame starts fresh tonight." |
| scribe | "kept — the nib remembers. +5 XP" |
| peek | "new stationery — your letters arrive on laid paper now." |
| mirror | "the fifth chain falls." |
| scout | "the inkwell is dry — a few pages will refill it" *(existing key, existing owl, both call sites)* |

**Retired / rewritten (both languages):** `peekOpened` loses its "+5 XP" clause (previews pay 0
now); `finishedTwice` becomes the ledger line above (+60, not +40). Gold stays the house's; no
line names the Hush; every line passes the one-owl test.

---

## 13. Merge decisions (where B and C conflicted)

| conflict | B said | C said | merged | why |
|---|---|---|---|---|
| peek pricing | +25 XP · −5 ink · −10 coins | 0 XP · −5 ink · 0 coins | **C + a 6/day generation cap** | coins must feed the stand; the cap replaces the throttle the merge removed |
| streak mercy | banked embers | free dark night | **C** | warmer fiction, no bank column |
| migration | grandfather floor, none demote | LV5 cap unless evidence | **C, made ratcheting** | the LV7 seed is fake for nearly everyone; the ratchet protects real multi-device readers |
| seat math | unbounded house | 13 rows + encore stars | **C's 13 rows, re-cut as 36 levels — the seat moves every third one, enforced server-side above LV36** | the soul, made overflow-proof; the house keeps its thirteen rows, the ladder gets the rungs a first session needs |
| checkin ink | +20 | +10 | **C** | fits the resting-line flow |
| turn_page XP | 2 | 4 | **C** | reading must out-earn launching |
| guards, ledger, queue, contract | full suite | lighter | **B, hardened** | `occurred_at`, granted/withheld, the 150/day ceiling |

---

## 14. Implementation roadmap (~4–5 focused weeks)

| # | step | size |
|---|---|---|
| 1 | drift audit → commit 3 live migrations; `schema_v` + 1-indexed profile JSON | S |
| 2 | guards migration: full suite on `occurred_at`, config table, rest line/regen 30/cap 120, streak + dark night + full house, stub grants, `purchase`, LV36 faucet stop, `tz_offset_minutes`, `dark_night_at`, both unique indexes | L |
| 3 | `owlry_migrate_balance` (ratcheting evidence filter, clamps, well_full carry, keepsake stub) | M |
| 4 | peek charge/refund in `owl-peek` with the soft-hold contract | M |
| 5 | wire `performAction` call sites; granted/withheld reconciliation; offline queue; `adoptAccount` snapshot-first | L |
| 6 | blob demotion, `economyVersion`, new fields through the three literals, guest `ACTION_CONFIG` + guards, `curveV` | M |
| 7 | stub engine, ledger-span marathon, album UI | M |
| 8 | seat chip/map, `lvLab`, MirrorRoom row labels | M |
| 9 | LobbyStand, season config, catalogue, bottle | L |
| 10 | checkin trigger, real onboarding, copy rewrites en+zh, `debugLevelUp()` | M |

**Ship-together constraint:** steps 3 + 6 land in the same release, or the conversion cap
self-reverts through max-wins merge. **Top risks:** reconciliation flicker (snapshot is truth —
animate the catch-up, never snap backwards mid-view); guard tuning (the 150/day ceiling and both
6/day caps get a telemetry review after week one); the migration is the one change reviewed
line-by-line.

---

## Appendix — the three original designs

Full revised texts live in the design-session journal
(`~/.claude/projects/-Users-polar-owlry/dbce78c2-1924-4bb2-9fa9-cc570a9d079f/subagents/workflows/wf_865f63d6-969/journal.jsonl`).

- **A — House Lights** (client-authoritative, ~4 days). Finish what's built, nothing new
  backstage: dawn-refill checkin, real streak with a 20-coin relight, `min(400, 100·L)` curve,
  achievements evaluator, honest-seed migration, dead server bridge deleted. Rejected as the
  destination but its honesty work (seed reckoning, three-literal discipline, `debugLevelUp`)
  is absorbed above.
- **B — The House Ledger** (server-authoritative, ~4 weeks). Wire the deployed economy: quadratic
  curve, timer regen, coin-priced peeks, banked embers, grandfather-floor migration, the guard
  suite. Its skeleton **is** this spec; its coin-priced peeks and embers lost to C's stances.
- **C — A Season at the Theatre** (~2–3 weeks on a lighter server base). Seat map, lobby stand,
  ticket stubs, seasons, dark night, resting-line ink. Its soul **is** this spec; its lighter
  guards were replaced by B's, hardened.
