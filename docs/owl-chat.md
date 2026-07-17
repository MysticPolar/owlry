# The owl chat — live LLM + the mockup, side by side

The Owl Post chat now has **two brains** behind one seam. The UI, store, and
chat log don't care which one is answering.

| | **Live owl** | **Classic owl (the mockup)** |
|---|---|---|
| Brain | Gemini 3.5 Flash, in the `owl-chat` edge function | `respond()` in `src/lib/owlBrain.ts` — pure, offline, regex intent matching |
| Books | open-world — any real, well-loved book; chosen by the model | the fixed 24-book catalog (`content/books.ts`) |
| Peeks | spoken framing in voice, then a full peek generated on tap | the 7 hand-written `GUIDES` peeks, fully rendered |
| Greeting | the visitor's **real** local weather + time (geolocation → Open-Meteo) | the faked weather cycle (tap the glyph) |
| Needs | a Supabase backend + `GEMINI_API_KEY` secret | nothing — always available |

## How the engine is chosen

`liveOwlEnabled(prefs)` in `src/store/useStore.ts`:

```
isBackendConfigured()              // VITE_SUPABASE_* are set
  && prefs.owlEngine !== 'mockup'  // user hasn't pinned the mockup
  && import.meta.env.VITE_OWL_LIVE !== 'off'
```

If any of those is false, the **classic mockup brain answers** — so with no
backend (the default dev setup) the app behaves exactly as it always has.

The live path is also self-healing: if the edge function is missing, the
network is down, or it errors, the client **falls back to the mockup brain for
that turn**, so the chat never leaves the visitor hanging.

## How to get to the mockup (three ways)

1. **In the app:** Settings → **THE OWL** → tap **CLASSIC**. (Restarts the
   chat with the mockup brain. Tap **LIVE** to switch back.)
2. **For a whole build/demo:** set `VITE_OWL_LIVE=off` in the environment.
3. **Implicitly:** run without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
   — no backend means the mockup is the only owl, unchanged.

## Deploying the live owl

```sh
# 1. the Gemini key is a server-side secret (never in the browser bundle)
supabase secrets set GEMINI_API_KEY=AIza...   # https://aistudio.google.com/apikey

# 2. deploy the function
supabase functions deploy owl-chat

# 3. point the web app at the backend (.env.local)
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

**The model vendor.** Gemini, via `generateContent`. There is no vendor
switch: an earlier revision of this doc described an `OWL_PROVIDER` secret
and an `owl-system.ts` that no longer exist (and the Gemini half of which
never did) — the v2 rewrite replaced them with the four-call Scout/Peek
split, and the swap off Anthropic removed the second path outright.

Models live in `supabase/functions/_shared/gemini.ts`:

| Call | Model | thinking_level |
|---|---|---|
| A — digest | `gemini-3.1-flash-lite` | `minimal` |
| B — Scout | `gemini-3.5-flash` | `low` |
| C — Peek | `gemini-3.5-flash` | `medium` |
| memory merge | `gemini-3.1-flash-lite` | `minimal` |

**⚠ The free tier trains on reader content.** Google marks free-tier usage
"content used to improve our products: Yes"; the paid tier is explicitly
the inverse. On a free key, reader chat and stored memory — including asks
the digest tags `note_domain: crisis / addiction / grief / medical` — become
training data. The free tier also caps the *whole app* at roughly 10 req/min
and ~1,500 req/day: a chat turn spends 3 (digest + Scout + merge) and a
letter tap a 4th, so ~500 turns/day across all readers, against the 120/day
*per reader* that `owl-chat` itself allows. Fine for dev; revisit before
real readers arrive.

The function returns

```json
{ "say": "...", "letter": {"title","author"}|null,
  "picks": [{"title","author","note"}], "chips": ["..."] }
```

which the client (`src/lib/owl/liveOwl.ts`) maps onto the chat's message nodes,
weaving the named titles back into the owl's prose as styled mentions.

## Known v1 limits / next steps

- **Open-world peeks (lazy).** Every book a live reply names spawns
  a peek card in the chat (zero tokens — cards come straight from the reply
  payload, one per book, arriving a beat apart). Books matching a catalog
  guide reuse the curated GUIDES peek outright; open-world books generate
  their peek **only when the card is tapped** (`letterFor` mode on the
  `owl-chat` function, `LETTER_SYSTEM` prompt, GUIDES-shaped JSON), cached per
  book for the session so re-opening is free. The paper overlay renders both
  sources identically; open-world peeks skip further-reading/OPEN/SAVE
  (catalog-only affordances). Open-world books still have no page-turn reader.
- **Ink meters the live owl (local economy).** Each live reply costs 1 ink and
  grants +3 XP (the backend plan's chat cost); a failed delivery is refunded.
  With a dry inkwell the chat falls through to the free offline brain and a
  toast explains that pages refill the well — so the live path is naturally
  capped per visitor. (Server-authoritative metering via
  `performAction('chat')` remains the follow-up when the economy backend is
  wired in.)
- **The live path can't be exercised without a deployed backend** — locally it
  transparently uses the mockup brain.
