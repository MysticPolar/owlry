/* ============================================================
   owlry — owl chat style bench.

   Puts the LIVE owl (Gemini via the owl-chat edge function) next to
   the MOCKUP owl (the offline respond() brain) for the canonical
   response types, so we can confirm the live output style matches
   the mockup's exactly — voice, brevity, and chip sets.

   Mockup side runs locally (deterministic). Live side runs only if
   the function is reachable; pass it via env:

     OWL_PROJECT_URL=https://<ref>.supabase.co \
     OWL_ANON_KEY=<anon public key> \
     npm run bench

   (or OWL_FN_URL=<full owl-chat url>). Without those, it prints the
   mockup reference alone — the target the live owl must match.
   ============================================================ */
import { respond, newSession, type OwlMessage } from '../src/lib/owlBrain';
import { BOOKS } from '../src/content/books';
import { SAL, FLAVOR, START_CHIPS } from '../src/content/owl';
import type { WeatherKey } from '../src/content/weather';
import type { DayPart } from '../src/content/owl';

type Turn = { role: 'user' | 'assistant'; text: string };
type Shape = { say: string; chips: string[]; letter?: string | null; picks?: string[] };

// fixed context so the bench is reproducible
const DP: DayPart = 'evening';
const WX: WeatherKey = 'rain';

const nodesToText = (nodes: OwlMessage): string =>
  nodes.map((n) => (n.t === 'book' ? BOOKS[n.id].t : n.t === 'rec' ? n.title : n.v)).join('');

function mockup(input: string | null): Shape {
  if (input === null) {
    return {
      say: `${SAL[DP]} ${FLAVOR[WX]}. i'm the owl at the post desk — tell me what's going on, and i'll sort you a reading letter.`,
      chips: START_CHIPS[DP],
    };
  }
  const r = respond(input, newSession(WX));
  return {
    say: r.msgs.map(nodesToText).join('\n'),
    chips: r.chips,
    letter: r.letter ? BOOKS[r.letter].t : null,
    picks: r.batch ? [r.batch.main, ...r.batch.also].map((id) => BOOKS[id].t) : [],
  };
}

const GREET_TURN: Turn = {
  role: 'user',
  text: `(a visitor sits down at the post desk. open with a greeting. local context for the greeting only — time of day: ${DP}; weather: rain, 11°C.)`,
};

async function live(turns: Turn[]): Promise<(Shape & { status: number }) | null> {
  const url = process.env.OWL_FN_URL ?? (process.env.OWL_PROJECT_URL ? `${process.env.OWL_PROJECT_URL}/functions/v1/owl-chat` : null);
  const key = process.env.OWL_ANON_KEY;
  if (!url || !key) return null;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ turns }),
  });
  const d = (await res.json()) as { say: string; chips: string[]; letter: { title: string } | null; picks: { title: string }[] };
  return {
    status: res.status,
    say: d.say,
    chips: d.chips ?? [],
    letter: d.letter?.title ?? null,
    picks: (d.picks ?? []).map((p) => p.title),
  };
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const same = (a: string[], b: string[]) => JSON.stringify(a) === JSON.stringify(b);

const SCENARIOS: { name: string; input: string | null; turns: Turn[]; chipsClientSide?: boolean }[] = [
  { name: 'GREETING', input: null, turns: [GREET_TURN], chipsClientSide: true },
  { name: 'LETTER (can\'t sleep)', input: 'i cannot switch off tonight, my mind wont quit', turns: [{ role: 'user', text: 'i cannot switch off tonight, my mind wont quit' }] },
  { name: 'FICTION (light)', input: 'something light and fun for the weekend', turns: [{ role: 'user', text: 'something light and fun for the weekend' }] },
  { name: 'CLARIFY', input: 'i dont really know what i want', turns: [{ role: 'user', text: 'i dont really know what i want' }] },
];

async function main() {
  const haveLive = !!(process.env.OWL_FN_URL || process.env.OWL_PROJECT_URL) && !!process.env.OWL_ANON_KEY;
  console.log(`\nowl chat bench — mockup ${haveLive ? 'vs LIVE (Claude)' : '(reference only; set OWL_PROJECT_URL + OWL_ANON_KEY for live)'}\n`);

  for (const s of SCENARIOS) {
    const m = mockup(s.input);
    const l = haveLive ? await live(s.turns).catch((e) => ({ status: 0, say: `‹error: ${e}›`, chips: [], letter: null, picks: [] })) : null;

    console.log(`══ ${s.name} ══`);
    console.log(`  mockup  say  : ${m.say.replace(/\n/g, '\n                 ')}`);
    console.log(`          chips: [${m.chips.join(', ')}]   (${words(m.say)} words)`);
    if (l) {
      console.log(`  live    say  : ${(l.say ?? '').replace(/\n/g, '\n                 ')}`);
      console.log(`          chips: [${(l.chips ?? []).join(', ')}]   (${words(l.say ?? '')} words, http ${l.status})`);
      const chipNote = s.chipsClientSide ? 'n/a (greeting chips are START_CHIPS, set client-side)' : same(m.chips, l.chips ?? []) ? 'MATCH ✓' : 'differ ✗';
      console.log(`          chips ${chipNote}`);
    }
    console.log('');
  }
}

main();
