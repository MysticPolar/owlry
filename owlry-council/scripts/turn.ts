// Test-harness helper. `next` prints the exact task message for the next turn using the
// production directorNote(); `add <reply.txt>` parses a mind's reply (text + POSITION line)
// into council/runs/state.json.
import { cycleForTurn, directorNote, mindSystem } from "../supabase/functions/council/prompts.ts";
import type { Mind, Seat, Tail, Turn } from "../supabase/functions/council/types.ts";

const STATE = "council/runs/state.json";
const state = JSON.parse(await Deno.readTextFile(STATE));
const seats: Seat[] = state.seats;
const turns: Turn[] = state.turns;
const [cmd, arg] = Deno.args;

function parseTail(full: string): { text: string; tail?: Tail } {
  const i = full.search(/\*{0,2}POSITION\s*:/i);
  if (i < 0) return { text: full.trim() };
  const m = full.slice(i).match(/POSITION\s*:\*{0,2}\s*([\s\S]*?)\s*\|\s*\*{0,2}MOVE\s*:\*{0,2}\s*(hold|shift|concede)\s*\|\s*\*{0,2}OPEN\s*:\*{0,2}\s*([\s\S]*)$/i);
  if (!m) return { text: full.slice(0, i).trim() };
  const open = m[3].trim().replace(/[.\s]+$/, "");
  return { text: full.slice(0, i).trim(), tail: { position: m[1].trim(), move: m[2].toLowerCase() as Tail["move"], open: /^none$/i.test(open) || !open ? null : open } };
}

if (cmd === "next") {
  const t = turns.length + 1;
  const idx = (state.opening_seat - 1 + t - 1) % 3;
  const me = seats[idx];
  const mind: Mind = JSON.parse(await Deno.readTextFile(`council/minds/${me.slug}.json`));
  const note = directorNote({ cycle: cycleForTurn(t, state.total), turn: t, totalTurns: state.total, question: state.question, situation: state.situation, tension: state.tension, me, others: seats.filter((_, j) => j !== idx), turns });
  console.log(`TURN ${t} · ${me.name} · ${cycleForTurn(t, state.total)}\n=====\n${mindSystem(mind)}\n\n=====\n${note}`);
} else if (cmd === "add") {
  const t = turns.length + 1;
  const idx = (state.opening_seat - 1 + t - 1) % 3;
  const reply = await Deno.readTextFile(arg);
  const { text, tail } = parseTail(reply);
  turns.push({ turn: t, speaker: seats[idx].slug, cycle: cycleForTurn(t, state.total), text, tail });
  await Deno.writeTextFile(STATE, JSON.stringify(state, null, 1));
  console.log(`added turn ${t} (${seats[idx].name}) — ${text.split(/\s+/).length} words — tail: ${tail ? `${tail.move} | open: ${tail.open ?? "none"}` : "MISSING"}`);
} else {
  console.log("usage: turn.ts next | add <reply.txt>");
}
