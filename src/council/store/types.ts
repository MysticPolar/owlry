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
  /** the words were recalled by the model (a thinker outside the curated catalogue) and are not verified: shown as "attributed", never as "verbatim" */
  attributed?: boolean;
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
  /** the seats this line addresses by name (the script's {0} {1} {2}), so the debate can say "to Marcus" and draw the reply line */
  to?: number[];
  segments?: Segment[];
  /** user + system messages */
  text?: string;
  userKind?: 'question' | 'followup' | 'context' | 'passage';
  target?: string;
  passage?: { bookId: string; text: string };
  /** system notices */
  sys?: 'replace';
  /** for a replace notice: who left and who joined, so the line follows the interface language */
  figures?: { from: string; to: string };
  /** words written by the live council for this seat; when present they replace the scripted `segments` */
  live?: Segment[];
}

/** what the live council wrote for the cards and the intro; valid only while `seats` still match */
export interface LiveOverrides {
  seats: [string, string, string];
  intros: string[];
  takeaways: { commonGround: string; differences: string[]; fits: string; nextStep: string };
  reading: { why: string; bestStart: boolean }[];
}

export interface Replacement {
  seat: number;
  from: string;
  to: string;
  ts: number;
  /** the live words the replacement discarded, so Undo can put them back without another call */
  restore?: { live?: LiveOverrides; lines: Record<string, Segment[]> };
  /** on a cast session: the seat that left, so Undo can seat them again */
  castSeat?: CastSeat;
}

/** one seat of a council the model cast for a question the scripts do not cover (council-chat mode `cast`) */
export interface CastSeat {
  /** a curated figure's id when the model seated one of ours, else the server's slug of the name */
  id: string;
  name: string;
  canonicalName: string;
  short: string;
  label: string;
  role: string;
  /** intro card: why this perspective fits the question */
  why: string;
  /** round one, in the thinker's voice */
  stance: string;
  /** the curated book, or `${keyOf(title)}--${figureId}` for one the catalogue lacks */
  bookId: string;
  bookTitle: string;
  bookYear: string;
}

export interface CastInfo {
  title: string;
  seats: [CastSeat, CastSeat, CastSeat];
  /** a later cast with `avoid` = the seats; any alternate can take any seat */
  alternates: CastSeat[];
}

/** the angle the reader chose on the confirmation page: one of the offered readings, or their own words */
export interface Focus {
  title: string;
  detail?: string;
  /** typed under "Other" rather than picked */
  custom?: boolean;
  /** a picked reading's place in its set, so it is re-read in the interface language of the moment */
  reading?: { scriptId: string | null; index: number };
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
  /** 'live' once the council-chat function wrote the opening; absent = the scripted council */
  source?: 'live';
  live?: LiveOverrides;
  /** message ids still waiting for the live council's words — playback pauses on them (never persisted to the cloud) */
  pending?: string[];
  /** set when the model cast the seats (scriptId 'cast'): the engine synthesises the script from it */
  cast?: CastInfo;
  /** the reading of the question the council debates (absent: the question as asked) */
  focus?: Focus;
}

export interface Progress {
  /** 0..1 through the recommended section */
  pct: number;
  /** scrollTop in px, restored on resume */
  pos: number;
  lastReadAt: number;
  status: 'reading' | 'completed';
}

/** a council's "one next step" the reader kept — it lands among the milestones on the profile */
export interface SavedStep {
  id: string;
  councilId: string;
  text: string;
  question: string;
  ts: number;
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
  /** true for posts that live in the cloud feed (owlry_council_posts); seed posts are local */
  remote?: boolean;
  /** the composer's prompt answered, for the "What did this change for you?" framing */
  prompt?: string;
}

export interface UserProfile {
  name: string;
  handle: string;
  bio: string;
  signedIn: boolean;
  initial: string;
  /** set when signed in to a real account (Supabase auth.users id) */
  id?: string;
  email?: string;
}

export type TextSize = 'S' | 'M' | 'L';

export interface Toast {
  id: string;
  text: string;
  action?: { label: string; onClick: () => void };
}
