/* ============================================================
   State types. Content (figures, books, scripts) lives in src/content and
   is never persisted — sessions only store ids + the generated transcript,
   so a content edit re-renders old sessions correctly.
   ============================================================ */
export type Area = 'health' | 'career' | 'investing' | 'relationships' | 'literature' | 'other';

export interface Segment {
  kind: 'text' | 'quote';
  text: string;
  /** for quotes: where the words come from (verbatim) */
  source?: { work: string; loc?: string; url?: string };
}

/** which scripted line a figure message was generated from — used to regenerate a seat after "Replace" */
export type Slot =
  | 'r1'
  | 'r2'
  | 'f1'
  | 'f2'
  | 'ctx'
  | 'direct'
  | 'passage'
  | 'generic';

export interface Message {
  id: string;
  kind: 'figure' | 'user' | 'system' | 'takeaways' | 'reading';
  ts: number;
  /** figure messages */
  figureId?: string;
  seat?: number;
  slot?: Slot;
  /** which scripted variant / generic line was used — keeps regeneration deterministic */
  variant?: number;
  /** for regenerating: the user text this message replied to */
  replyTo?: string;
  segments?: Segment[];
  /** user + system messages */
  text?: string;
  userKind?: 'question' | 'followup' | 'context' | 'passage';
  target?: string;
  passage?: { bookId: string; text: string };
  /** system notices */
  sys?: 'replace';
}

export interface Replacement {
  seat: number;
  from: string;
  to: string;
  ts: number;
}

export interface CouncilSession {
  id: string;
  scriptId: string;
  question: string;
  title: string;
  area: Area;
  seats: [string, string, string];
  replaced: Replacement[];
  messages: Message[];
  /** how many messages are visible; the rest are still "being typed" */
  revealed: number;
  context: string[];
  stage: 'convening' | 'introduced' | 'live' | 'summarized';
  followUps: number;
  createdAt: number;
  updatedAt: number;
  saved: boolean;
}

export interface Progress {
  /** 0..1 through the recommended section */
  pct: number;
  /** scrollTop in px, restored on resume */
  pos: number;
  lastReadAt: number;
  status: 'reading' | 'completed';
}

export interface Highlight {
  id: string;
  bookId: string;
  text: string;
  ts: number;
  note?: string;
  councilId?: string;
}

export interface Post {
  id: string;
  author: { handle: string; name: string; color: string; initial: string };
  ts: number;
  quote: string;
  bookId?: string;
  attribution: string;
  caption: string;
  likes: number;
  comments: number;
  mine?: boolean;
  /** the composer's prompt answered, for the "What did this change for you?" framing */
  prompt?: string;
}

export interface UserProfile {
  name: string;
  handle: string;
  bio: string;
  signedIn: boolean;
  initial: string;
}

export type TextSize = 'S' | 'M' | 'L';

export interface Toast {
  id: string;
  text: string;
  action?: { label: string; onClick: () => void };
}
