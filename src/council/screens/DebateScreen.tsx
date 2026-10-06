import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { IconArrowLeft, IconArrowRight } from '@tabler/icons-react';
import { takeJoin } from '../app/stage';
import { navigate } from '../app/router';
import { useStore, selectCouncil } from '../store/useStore';
import type { Message } from '../store/types';
import { figure } from '../content/figures';
import { cyclesFor, answeredBy } from '../engine/council';
import { AppBar, Steps, Thinking } from '../components/chrome';
import { Stage, SEAT_HEX, type Curtain } from '../components/Stage';
import { Avatar } from '../components/Avatar';
import { LineView } from '../components/Line';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { useT, useLang, fmt } from '../i18n/react';
import './DebateScreen.css';

/* ============================================================
   Act II — the Debate. One line at a time, the reader sets the pace: a
   tap (the pair, the stage, a seat, the arrow) brings the next line; an
   optional auto-play turns the page every PACE. The spotlight follows
   the speaker, reply lines run to whoever they answer, and the grey
   strip above a line recalls what it answers. The cycle on show is the
   latest one — the question, or the last follow-up / added context. As
   the reader advances, `reveal(id)` keeps the store's count in step so
   progress persists; a line the live council is still writing holds the
   reader with "{name} is writing" until it lands. At the end the curtain
   lowers, the stage collapses and Act III opens.
   ============================================================ */
const PACE = 9000;
type Phase = 'in' | 'closing' | 'closed';

/** the grey context strip's length: the mockup's 92 characters, half that in Chinese (a character is about two letters wide) */
const CTX_CHARS = { en: 92, zh: 46 } as const;

/** the first n characters of a line, cut at a word, for the grey context strip */
function trunc(s: string, n: number): string {
  return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s;
}
/**
 * What an earlier line said, for the strip: its own words before any quotation (the mockup recalls the line's
 * paraphrase, never a clipped quote), else all its own words; only a line that is nothing but a quote shows the quote.
 */
function gist(m: Message): string {
  const segs = m.segments ?? [];
  const q = segs.findIndex((s) => s.kind === 'quote');
  const words = (list: typeof segs) =>
    list
      .filter((s) => s.kind === 'text')
      .map((s) => s.text.trim())
      .filter(Boolean)
      .join(' ');
  return words(q < 0 ? segs : segs.slice(0, q)) || words(segs) || segs.map((s) => `“${s.text}”`).join(' ');
}

export function DebateScreen({ id }: { id: string }) {
  const session = useStore(selectCouncil(id));
  const join = useStore((s) => s.joinDiscussion);
  const reveal = useStore((s) => s.reveal);
  const revealAll = useStore((s) => s.revealAll);
  const ensureSeats = useStore((s) => s.ensureSeats);
  const reduce = useReduceMotion();
  const lang = useLang();
  const t = useT();
  const T = (ms: number) => (reduce ? 10 : ms);

  // a convening council is seated as this screen opens
  useEffect(() => {
    if (session?.stage === 'convening') join(session.id);
  }, [session?.id, session?.stage, join]);
  // a cast session's seats get their cards now that they are on screen (and again in a new language)
  useEffect(() => {
    if (session?.cast) ensureSeats(session.id);
  }, [session?.id, session?.cast, lang, ensureSeats]);

  // the cycle on show is the latest one; its lines are what the debate turns through
  const cycles = session ? cyclesFor(session) : [];
  const cycle = cycles.length ? cycles[cycles.length - 1] : null;
  const L = cycle?.lines ?? [];
  const messages = session?.messages ?? [];
  const revealed = session?.revealed ?? 0;
  const pending = session?.pending;
  // the message index of the n-th line: cycle.start + n, unless a notice was slipped in between
  const idxOf = (n: number): number => {
    const m = L[n];
    if (!m) return -1;
    const k = messages.findIndex((x) => x.id === m.id);
    return k >= 0 ? k : (cycle?.start ?? 0) + n;
  };
  const isPending = (m?: Message | null): boolean => !!m && !!pending?.includes(m.id);

  // the line on show: as many lines of this cycle as are already revealed, minus one (0 on a first visit)
  const startAt = (): number => {
    const shown = L.filter((_, k) => idxOf(k) < revealed).length;
    return Math.max(0, Math.min(L.length - 1, shown - 1));
  };
  const [iState, setI] = useState(startAt);
  const [phase, setPhase] = useState<Phase>('in');
  // from the stands the curtain is already open; any other arrival finds it closed and opens it
  const [fromStands] = useState(() => (id ? takeJoin(id) : false));
  const [curtain, setCurtain] = useState<Curtain>(() => (fromStands ? 'open' : 'closed'));
  const [auto, setAuto] = useState(false);
  // the reader asked for the next line while the live council is still writing it
  const [waiting, setWaiting] = useState(false);
  // a different cycle came in under the screen (a sync from another device, a session that arrived after the first
  // render): its lines start afresh from what is revealed of them
  const cycleKey = cycle?.prompt.id ?? '';
  const [cycleSeen, setCycleSeen] = useState(cycleKey);
  if (cycleSeen !== cycleKey) {
    setCycleSeen(cycleKey);
    setI(startAt());
    setWaiting(false);
  }
  // kept inside the lines in case they shrank under us
  const i = Math.max(0, Math.min(iState, L.length - 1));
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;

  // every timer of the choreography, cleared on unmount
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => {
    const h = window.setTimeout(fn, ms);
    timers.current.push(h);
  };
  useEffect(() => () => timers.current.forEach((h) => clearTimeout(h)), []);

  // on a cold arrival the curtain is found closed and opens
  useEffect(() => {
    if (fromStands) return;
    later(() => {
      if (phaseRef.current === 'in') setCurtain('open');
    }, T(700));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // the store's count follows the line on show, one reveal per call. The store refuses to pass a line the live council
  // is still writing; `pending` brings this back when it lands. The count is read afresh, not from the render: under
  // StrictMode an effect runs twice on mount with one closure, and two reveals would pass a line the reader never saw
  const target = idxOf(i);
  useEffect(() => {
    if (target < 0) return;
    const c = useStore.getState().councils[id];
    if (!c || c.revealed > target) return;
    reveal(id);
  }, [id, revealed, target, pending, reveal]);

  const line: Message | undefined = L[i];
  const last = L.length > 0 && i === L.length - 1;
  const nextLine: Message | null = i < L.length - 1 ? L[i + 1] : null;
  // who the reader is waiting on: the line on show while it is still being written, or the next one once asked for
  const writing: Message | null = line && isPending(line) ? line : waiting && nextLine && isPending(nextLine) ? nextLine : null;

  // the next line lands: carry on
  useEffect(() => {
    if (!waiting) return;
    if (!nextLine) setWaiting(false);
    else if (!isPending(nextLine)) {
      setWaiting(false);
      setI(i + 1);
    }
  }, [waiting, nextLine?.id, pending]); // eslint-disable-line react-hooks/exhaustive-deps

  const end = () => {
    if (phaseRef.current !== 'in') return;
    phaseRef.current = 'closing';
    setPhase('closing');
    setCurtain('closed');
    setWaiting(false);
    later(() => {
      setPhase('closed');
      later(() => {
        revealAll(id);
        navigate({ name: 'summary', id });
      }, T(700));
    }, T(1050));
  };
  const next = () => {
    if (phaseRef.current !== 'in') return;
    // the line on show is still being written: it lands first (a tap now would skip it once the council answers)
    if (line && isPending(line)) return;
    if (i < L.length - 1) {
      if (isPending(L[i + 1])) {
        setWaiting(true);
        return;
      }
      setWaiting(false);
      setI(i + 1);
    } else end();
  };
  const prev = () => {
    if (phaseRef.current !== 'in') return;
    setWaiting(false);
    if (i > 0) setI(i - 1);
  };
  const toggleAuto = () => setAuto((a) => !a);
  const onPairKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      next();
    }
  };

  // auto-play: one line per PACE; any tap restarts it (the line changes), a line still being written pauses it.
  // The pace is reading time, not motion, so it is not shortened under reduced motion.
  const nextRef = useRef(next);
  nextRef.current = next;
  useEffect(() => {
    if (!auto || phase !== 'in' || writing || !L.length) return;
    const h = window.setTimeout(() => nextRef.current(), PACE);
    return () => clearTimeout(h);
  }, [auto, phase, writing?.id, i, L.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!session) {
    return (
      <div className="screen debate">
        <AppBar back={{ name: 'council' }} />
        <div className="content">
          <p className="muted">{t.stands.missing}</p>
        </div>
      </div>
    );
  }

  const seats = session.seats.map((fid) => figure(fid));
  const seatOf = (m: Message): number => m.seat ?? session.seats.indexOf(m.figureId ?? '');
  const speaker = line ? seatOf(line) : null;
  // the line as the reader sees it: none while the live council is still writing it (nor the strip above it)
  const shown = line && !isPending(line) ? line : null;
  const ctx = cycle && shown ? answeredBy(cycle, i) : null;
  const ctxSeat = ctx ? seatOf(ctx) : -1;
  const marquee = `${t.council.marquee} · ${seats.map((f) => f.short).join(' · ')}`;

  return (
    <div className="screen debate">
      <AppBar />
      <Steps current="debate" />
      <div className="debate-stage" onClick={next}>
        <Stage mode="full" seats={seats} show={phase !== 'closed'} curtain={curtain} marquee={marquee} speaker={speaker} addressing={line?.to ?? []} dim onSeatTap={() => next()} />
      </div>
      <div className="content">
        {L.length === 0 ? (
          <p className="muted rv">{t.debate.noLines}</p>
        ) : (
          <>
            <div className="segs" role="progressbar" aria-valuemin={1} aria-valuemax={L.length} aria-valuenow={i + 1} aria-label={fmt(t.debate.lineAria, { i: i + 1, n: L.length })}>
              {L.map((m, j) => (
                <i key={m.id} className={j <= i ? 'done' : ''} />
              ))}
            </div>
            <div className="pair" role="button" tabIndex={0} aria-label={last ? t.debate.toSummary : t.debate.tapAria} aria-live="polite" style={{ marginTop: 14 }} onClick={next} onKeyDown={onPairKey}>
              {ctx && shown && (
                <div key={`ctx-${shown.id}`} className="ctx rv" style={ctxSeat >= 0 && ctxSeat < 3 ? { borderLeftColor: SEAT_HEX[ctxSeat] } : undefined}>
                  <Avatar figure={figure(ctx.figureId ?? '')} size={20} seat={ctxSeat >= 0 ? ctxSeat : undefined} className="sm" />
                  <span>{trunc(gist(ctx), CTX_CHARS[lang])}</span>
                </div>
              )}
              {shown && <LineView key={shown.id} m={shown} seats={session.seats} className="rv" style={{ animationDelay: '.08s' }} />}
            </div>
          </>
        )}
      </div>
      <div className="footer">
        {phase !== 'in' ? (
          <Thinking>{t.debate.lowering}</Thinking>
        ) : (
          <>
            {writing ? (
              <Thinking>{fmt(t.debate.writing, { name: figure(writing.figureId ?? '').short })}</Thinking>
            ) : (
              L.length > 0 && (
                <div className="arrowrow">
                  <div className="arrows">
                    <button type="button" className="arrow" aria-label={t.debate.prev} disabled={i === 0} style={i === 0 ? { opacity: 0.35 } : undefined} onClick={prev}>
                      <IconArrowLeft stroke={2.2} />
                    </button>
                    <button type="button" className="arrow primary" aria-label={last ? t.debate.toSummary : t.debate.next} onClick={next}>
                      {auto && (
                        <svg key={i} className="timer" viewBox="0 0 62 62" aria-hidden="true">
                          <circle cx="31" cy="31" r="29" style={{ '--pace': `${PACE}ms` } as CSSProperties} />
                        </svg>
                      )}
                      <IconArrowRight stroke={2.2} />
                    </button>
                  </div>
                  <button type="button" className="autop" aria-pressed={auto} onClick={toggleAuto}>
                    <span className={`sw ${auto ? 'on' : ''}`} />
                    {t.debate.autoplay}
                  </button>
                </div>
              )
            )}
            <button type="button" className="btn gold" onClick={end}>
              {t.debate.skip}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
