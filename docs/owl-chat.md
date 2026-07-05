# The owl chat — live LLM + the mockup, side by side

The Owl Post chat now has **two brains** behind one seam. The UI, store, and
chat log don't care which one is answering.

| | **Live owl** | **Classic owl (the mockup)** |
|---|---|---|
| Brain | Claude Sonnet 4.6, in the `owl-chat` edge function | `respond()` in `src/lib/owlBrain.ts` — pure, offline, regex intent matching |
| Books | open-world — any real, well-loved book; chosen by the model | the fixed 23-book catalog (`content/books.ts`) |
| Letters | the framing is spoken in voice; rich letter overlay is catalog-only | the 7 hand-written `GUIDES` letters, fully rendered |
| Greeting | the visitor's **real** local weather + time (geolocation → Open-Meteo) | the faked weather cycle (tap the glyph) |
| Needs | a Supabase backend + `ANTHROPIC_API_KEY` secret | nothing — always available |

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
# 1. the Anthropic key is a server-side secret (never in the browser bundle)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# 2. deploy the function
supabase functions deploy owl-chat

# 3. point the web app at the backend (.env.local)
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

**Switching model vendor (Claude ⇄ Gemini).** The function supports both,
chosen by the `OWL_PROVIDER` secret — the `OWL_SYSTEM` prompt and the
`{say,letter,picks,chips}` contract are shared, so the client never changes:

```sh
# Claude (default)
supabase secrets set OWL_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-ant-...
# Gemini  (get a key at https://aistudio.google.com/apikey — free tier available)
supabase secrets set OWL_PROVIDER=gemini    GEMINI_API_KEY=AIza...
supabase functions deploy owl-chat
```

Keep both keys set and you can flip vendor just by changing `OWL_PROVIDER`.
Models live in `supabase/functions/owl-chat/owl-system.ts`
(`OWL_MODEL = claude-sonnet-4-6`; `OWL_GEMINI_MODEL = gemini-2.5-flash` —
swap to `gemini-2.5-flash-lite` for the cheapest tier). Both run with
thinking disabled for low latency on the short reply. The function returns

```json
{ "say": "...", "letter": {"title","author"}|null,
  "picks": [{"title","author","note"}], "chips": ["..."] }
```

which the client (`src/lib/owl/liveOwl.ts`) maps onto the chat's message nodes,
weaving the named titles back into the owl's prose as styled mentions.

## Known v1 limits / next steps

- **Open-world books have no reader or rich letter.** They're real
  recommendations rendered as styled mentions (title + tooltip). The catalog's
  Reader / About-sheet / 7-section Letter overlays remain a classic-owl feature.
  A future `owl-letter` function could generate a letter on demand for any book.
- **Ink meters the live owl (local economy).** Each live reply costs 1 ink and
  grants +3 XP (the backend plan's chat cost); a failed delivery is refunded.
  With a dry inkwell the chat falls through to the free offline brain and a
  toast explains that pages refill the well — so the live path is naturally
  capped per visitor. (Server-authoritative metering via
  `performAction('chat')` remains the follow-up when the economy backend is
  wired in.)
- **The live path can't be exercised without a deployed backend** — locally it
  transparently uses the mockup brain.
