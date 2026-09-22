// Zustand store for the Council Room.
// Server generates the whole run eagerly; this store paces the reveal so the reader
// sees one bubble at a time, can skip to the summary, and can reply to a mind.

import { create } from "zustand";
import { streamSse } from "./sse";

export type Cycle = "positions" | "pressure" | "application" | "reply";

export interface Book {
  title: string;
  author: string;
  read_free?: string | null;
  buy?: string | null;
}

export interface Seat {
  seat: 1 | 2 | 3;
  slug: string;
  name: string;
  lived: string | null;
  lens: string;
  why: string;
  intro: string;
  books: Book[];
}

export interface TurnView {
  turn: number;
  speaker: string; // slug or 'reader'
  name: string;
  cycle: Cycle;
  text: string;
  done: boolean;
  position?: string | null;
  move?: "hold" | "shift" | "concede" | null;
  open?: string | null;
}

export interface Summary {
  title: string;
  agree: string[];
  differ: string[];
  fits: string;
  next_step: string;
  books: Array<{
    mind: string;
    title: string;
    author: string;
    why: string;
    access: "read_free" | "buy";
    url?: string | null;
  }>;
}

export type Status = "idle" | "casting" | "running" | "replying" | "done" | "error";

export interface CouncilConfig {
  functionUrl: string; // `${SUPABASE_URL}/functions/v1/council`
  anonKey: string;
  getAccessToken: () => Promise<string | null>;
  /** Optional: called when the reader skips, with the turn index. Wire it to a Supabase update. */
  onSkip?: (sessionId: string, atTurn: number) => void;
}

interface CouncilState {
  config: CouncilConfig | null;
  status: Status;
  error: string | null;
  sessionId: string | null;
  kind: string | null;
  tension: string | null;
  seats: Seat[];
  turns: TurnView[];
  revealed: number; // number of turns currently visible
  skipped: boolean;
  summary: Summary | null;

  configure: (c: CouncilConfig) => void;
  start: (question: string, situation?: string, category?: string) => Promise<void>;
  reply: (message: string) => Promise<void>;
  skip: () => void;
  revealNow: () => void;
  reset: () => void;
}

const WORD_MS = 150; // reading pace used for the reveal dwell
const MIN_DWELL = 1200;
const MAX_DWELL = 7000;

function dwellFor(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(MAX_DWELL, Math.max(MIN_DWELL, words * WORD_MS));
}

let revealTimer: ReturnType<typeof setTimeout> | null = null;

export const useCouncil = create<CouncilState>((set, get) => {
  const clearTimer = () => {
    if (revealTimer) clearTimeout(revealTimer);
    revealTimer = null;
  };

  /** Reveal the next turn if it exists and the previous one has been read. */
  const scheduleReveal = () => {
    const { turns, revealed, skipped } = get();
    if (skipped) {
      clearTimer();
      set({ revealed: turns.length });
      return;
    }
    if (revealed >= turns.length) return; // nothing new yet
    if (revealed === 0) {
      set({ revealed: 1 });
      return;
    }
    const prev = turns[revealed - 1];
    if (!prev.done) return; // the visible bubble is still streaming
    if (revealTimer) return; // already waiting
    revealTimer = setTimeout(() => {
      revealTimer = null;
      const s = get();
      if (s.revealed < s.turns.length) set({ revealed: s.revealed + 1 });
      scheduleReveal();
    }, dwellFor(prev.text));
  };

  const upsertTurn = (patch: Partial<TurnView> & { turn: number }) => {
    set((s) => {
      const i = s.turns.findIndex((t) => t.turn === patch.turn);
      if (i < 0) {
        const view: TurnView = {
          turn: patch.turn,
          speaker: patch.speaker ?? "",
          name: patch.name ?? "",
          cycle: patch.cycle ?? "positions",
          text: patch.text ?? "",
          done: patch.done ?? false,
        };
        return { turns: [...s.turns, view].sort((a, b) => a.turn - b.turn) };
      }
      const next = [...s.turns];
      next[i] = { ...next[i], ...patch };
      return { turns: next };
    });
  };

  const handleEvent = (event: string, data: unknown) => {
    const d = data as Record<string, unknown>;
    switch (event) {
      case "cast":
        set({
          sessionId: d.session_id as string,
          kind: (d.kind as string) ?? null,
          tension: (d.tension as string) ?? null,
          seats: d.seats as Seat[],
          status: "running",
        });
        break;
      case "seats":
        set({ seats: d.seats as Seat[] });
        break;
      case "turn_start":
        upsertTurn({
          turn: d.turn as number,
          speaker: d.speaker as string,
          name: d.name as string,
          cycle: d.cycle as Cycle,
          text: "",
          done: false,
        });
        scheduleReveal();
        break;
      case "delta": {
        const turn = d.turn as number;
        const t = get().turns.find((x) => x.turn === turn);
        upsertTurn({ turn, text: (t?.text ?? "") + (d.text as string) });
        break;
      }
      case "turn_end":
        upsertTurn({
          turn: d.turn as number,
          text: d.text as string,
          done: true,
          position: d.position as string | null,
          move: d.move as TurnView["move"],
          open: d.open as string | null,
        });
        scheduleReveal();
        break;
      case "summary":
        set({ summary: d as unknown as Summary });
        break;
      case "done":
        set({ status: "done" });
        scheduleReveal();
        break;
      case "error":
        set({ status: "error", error: (d.message as string) ?? "Unknown error" });
        break;
    }
  };

  const call = async (body: Record<string, unknown>) => {
    const cfg = get().config;
    if (!cfg) throw new Error("Council not configured");
    const token = await cfg.getAccessToken();
    if (!token) throw new Error("Not signed in");
    await streamSse(
      cfg.functionUrl,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          apikey: cfg.anonKey,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      },
      handleEvent,
    );
  };

  const blank = {
    status: "idle" as Status,
    error: null,
    sessionId: null,
    kind: null,
    tension: null,
    seats: [],
    turns: [],
    revealed: 0,
    skipped: false,
    summary: null,
  };

  return {
    config: null,
    ...blank,

    configure: (c) => set({ config: c }),

    start: async (question, situation, category) => {
      clearTimer();
      set({ ...blank, status: "casting" });
      try {
        await call({ action: "start", question, situation: situation ?? "", category: category ?? null });
      } catch (e) {
        set({ status: "error", error: e instanceof Error ? e.message : String(e) });
      }
    },

    reply: async (message) => {
      const { sessionId, turns } = get();
      if (!sessionId) return;
      const nextTurn = (turns.at(-1)?.turn ?? 0) + 1;
      // Show the reader's message immediately; reply turns reveal as they stream.
      upsertTurn({ turn: nextTurn, speaker: "reader", name: "You", cycle: "reply", text: message, done: true });
      clearTimer();
      set({ status: "replying", skipped: true, revealed: get().turns.length });
      try {
        await call({ action: "reply", session_id: sessionId, message });
      } catch (e) {
        set({ status: "error", error: e instanceof Error ? e.message : String(e) });
      }
    },

    skip: () => {
      clearTimer();
      const { revealed, turns, sessionId, config } = get();
      set({ skipped: true, revealed: turns.length });
      if (sessionId && config?.onSkip) config.onSkip(sessionId, revealed);
    },

    revealNow: () => {
      clearTimer();
      const s = get();
      if (s.revealed < s.turns.length) set({ revealed: s.revealed + 1 });
      scheduleReveal();
    },

    reset: () => {
      clearTimer();
      set({ ...blank });
    },
  };
});
