/* ============================================================
   owlry — chat history (the separate history list).

   Lists past days (grouped by the reader's LOCAL day) with a
   snippet + message count, and loads one day's transcript
   read-only. Both talk to Supabase directly — RLS scopes every
   row to the signed-in reader, so no edge function is involved.
   ============================================================ */
import { supabase } from './supabase';
import { rowsToChat } from './chatHydrate';
import type { ChatRow, HydratedChat } from './chatHydrate';

export interface HistoryDay {
  day: string; // YYYY-MM-DD (local)
  label: string; // e.g. "june 12"
  firstAsk: string; // the first thing the reader asked that day
  count: number;
}

const EMPTY_CHAT: HydratedChat = { messages: [], collected: [], lastBatch: null, chips: [], maxId: 0 };

function dayLabel(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).toLowerCase();
}

/** the LOCAL (reader's timezone) day a stored UTC timestamp falls on */
function localDayOf(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Group the reader's transcript by local day (newest first), excluding `today` — that's Discover's job. */
export async function listDays(today: string): Promise<HistoryDay[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('owlry_chat_messages')
    .select('who, kind, payload, created_at')
    .order('created_at', { ascending: true });
  if (error || !data) return [];

  const byDay = new Map<string, { firstAsk: string; count: number }>();
  for (const row of data as { who: string; kind: string; payload: Record<string, unknown>; created_at: string }[]) {
    const day = localDayOf(row.created_at);
    if (day === today) continue;
    const entry = byDay.get(day) ?? { firstAsk: '', count: 0 };
    entry.count++;
    if (!entry.firstAsk && row.who === 'me' && row.kind === 'msg') {
      entry.firstAsk = String(row.payload.text ?? '');
    }
    byDay.set(day, entry);
  }

  return [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, e]) => ({ day, label: dayLabel(day), firstAsk: e.firstAsk, count: e.count }));
}

/** Load one day's transcript, read-only — rebuilt via the same hydrator used at boot. */
export async function loadDay(day: string): Promise<HydratedChat> {
  if (!supabase) return EMPTY_CHAT;
  // date-time strings with no timezone suffix are parsed as LOCAL time (ECMA-262),
  // so this is local midnight → local end-of-day, converted to the correct UTC range.
  const start = new Date(`${day}T00:00:00`).toISOString();
  const end = new Date(`${day}T23:59:59.999`).toISOString();
  const { data, error } = await supabase
    .from('owlry_chat_messages')
    .select('id, who, kind, payload, created_at')
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: true });
  if (error || !data) return EMPTY_CHAT;
  return rowsToChat(data as unknown as ChatRow[]);
}
