/* ============================================================
   Council sessions in the cloud — one row each in owlry_council_sessions.

   A session is edited on one device at a time, so per-session last-write-
   wins (by the client's updatedAt) is enough; `revealed` takes the max so a
   discussion never "un-plays". The transient `pending` list never leaves
   the device. A cast session's `cast` travels in the payload, so another
   device can register its placeholders and re-ask for the cards.
   ============================================================ */
import { supabase } from '../../../lib/supabase';
import type { CastInfo, CastSeat, CouncilSession } from '../../store/types';

const TABLE = 'owlry_council_sessions';
const AREAS = ['health', 'career', 'investing', 'relationships', 'literature', 'other'];

interface Row {
  id: string;
  script_id: string;
  question: string;
  title: string;
  area: string;
  seats: unknown;
  stage: string;
  saved: boolean;
  source: string;
  payload: Record<string, unknown>;
}

function toRow(s: CouncilSession, uid: string) {
  const { pending: _pending, ...rest } = s;
  void _pending;
  const payload = {
    messages: rest.messages,
    replaced: rest.replaced,
    context: rest.context,
    followUps: rest.followUps,
    revealed: rest.revealed,
    live: rest.live ?? null,
    cast: rest.cast ?? null,
    createdAt: rest.createdAt,
    updatedAt: rest.updatedAt,
  };
  return {
    id: s.id,
    user_id: uid,
    script_id: s.scriptId,
    question: s.question.slice(0, 600),
    title: s.title,
    area: s.area,
    seats: s.seats,
    stage: s.stage,
    saved: s.saved,
    source: s.source === 'live' ? 'live' : 'scripted',
    payload,
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

function castSeatOf(v: unknown): CastSeat | null {
  if (!isObj(v) || !str(v.id) || !str(v.name)) return null;
  return {
    id: str(v.id),
    name: str(v.name),
    canonicalName: str(v.canonicalName) || str(v.name),
    short: str(v.short) || str(v.name),
    label: str(v.label),
    role: str(v.role),
    why: str(v.why),
    stance: str(v.stance),
    bookId: str(v.bookId),
    bookTitle: str(v.bookTitle),
    bookYear: str(v.bookYear),
  };
}

/** a cast from another device's payload, or nothing — a session without one simply reads as scripted */
function castOf(v: unknown): CastInfo | undefined {
  if (!isObj(v)) return undefined;
  const seats = (Array.isArray(v.seats) ? v.seats : []).map(castSeatOf).filter((s): s is CastSeat => s !== null);
  if (seats.length !== 3) return undefined;
  const alternates = (Array.isArray(v.alternates) ? v.alternates : []).map(castSeatOf).filter((s): s is CastSeat => s !== null);
  return { title: str(v.title), seats: seats as CastInfo['seats'], alternates };
}

function fromRow(r: Row): CouncilSession | null {
  const p = r.payload ?? {};
  const cast = castOf(p.cast);
  // a cast session is only readable with its cast: there is no script of that name to fall back on
  if (r.script_id === 'cast' && !cast) return null;
  const seats = Array.isArray(r.seats) ? r.seats.filter((x): x is string => typeof x === 'string') : [];
  if (seats.length !== 3 || !Array.isArray(p.messages)) return null;
  const stage = ['convening', 'introduced', 'live', 'summarized'].includes(r.stage) ? (r.stage as CouncilSession['stage']) : 'summarized';
  return {
    id: r.id,
    scriptId: r.script_id,
    question: r.question,
    title: r.title,
    area: AREAS.includes(r.area) ? (r.area as CouncilSession['area']) : 'other',
    seats: seats as [string, string, string],
    replaced: Array.isArray(p.replaced) ? (p.replaced as CouncilSession['replaced']) : [],
    messages: p.messages as CouncilSession['messages'],
    revealed: typeof p.revealed === 'number' ? p.revealed : (p.messages as unknown[]).length,
    context: Array.isArray(p.context) ? (p.context as string[]) : [],
    stage,
    followUps: typeof p.followUps === 'number' ? p.followUps : 0,
    createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
    updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : Date.now(),
    saved: !!r.saved,
    ...(r.source === 'live' ? { source: 'live' as const } : {}),
    ...(p.live && typeof p.live === 'object' ? { live: p.live as CouncilSession['live'] } : {}),
    ...(cast ? { cast } : {}),
  };
}

export async function pullSessions(uid: string): Promise<CouncilSession[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, script_id, question, title, area, seats, stage, saved, source, payload')
    .eq('user_id', uid)
    .order('updated_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as Row[]).map(fromRow).filter((s): s is CouncilSession => s !== null);
}

export async function pushSessions(sessions: CouncilSession[], uid: string): Promise<void> {
  if (!supabase || !sessions.length) return;
  const rows = sessions.map((s) => toRow(s, uid));
  const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteSessions(ids: string[], uid: string): Promise<void> {
  if (!supabase || !ids.length) return;
  const { error } = await supabase.from(TABLE).delete().eq('user_id', uid).in('id', ids);
  if (error) throw error;
}

/** per id: the newer copy, never fewer revealed messages */
export function mergeSessions(local: Record<string, CouncilSession>, cloud: CouncilSession[]): Record<string, CouncilSession> {
  const out = { ...local };
  for (const c of cloud) {
    const l = out[c.id];
    if (!l) {
      out[c.id] = c;
      continue;
    }
    const winner = l.updatedAt >= c.updatedAt ? l : c;
    out[c.id] = { ...winner, revealed: Math.max(l.revealed, c.revealed, winner.revealed), saved: l.saved || c.saved };
  }
  return out;
}
