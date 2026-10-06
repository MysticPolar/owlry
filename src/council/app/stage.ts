/* ============================================================
   Hand-offs between screens that the URL does not carry.

   The curtain: casting a council on the ask screen closes it over the
   empty seats; Act I then finds it closed and opens it on the cast. The
   ask screen marks the session before navigating and Act I takes the
   mark on mount — a deep link or a return to Act I plays no reveal.
   ============================================================ */
let pendingReveal: string | null = null;

export function markReveal(sessionId: string) {
  pendingReveal = sessionId;
}

/** true once, for the session the ask screen just cast */
export function takeReveal(sessionId: string): boolean {
  if (pendingReveal !== sessionId) return false;
  pendingReveal = null;
  return true;
}

/* Joining the debate from Act I: the stage is already open there, so Act II keeps the curtain parked in the wings
   (the mockup's stage only grows). A deep link or a return to Act II finds it closed and opens it. */
let pendingJoin: string | null = null;

export function markJoin(sessionId: string) {
  pendingJoin = sessionId;
}

/** true for the session the stands just joined; the mark lifts on the next tick, so StrictMode's second call of a
    state initialiser (dev) reads the same answer as the first */
export function takeJoin(sessionId: string): boolean {
  if (pendingJoin !== sessionId) return false;
  setTimeout(() => {
    if (pendingJoin === sessionId) pendingJoin = null;
  }, 0);
  return true;
}
