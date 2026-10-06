import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { IconCheck } from '@tabler/icons-react';
import { navigate, parseRoute } from '../app/router';
import { markReveal } from '../app/stage';
import { useStore } from '../store/useStore';
import type { Focus } from '../store/types';
import type { Figure } from '../content/types';
import { figure } from '../content/figures';
import { readingsFor } from '../content/readings';
import { isLiveCouncilConfigured } from '../../lib/supabase';
import { AppBar, Thinking } from '../components/chrome';
import { Stage, type Curtain } from '../components/Stage';
import { usePresence } from '../hooks/usePresence';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { useT } from '../i18n/react';
import './ConfirmScreen.css';

/* ============================================================
   How the council reads your question (the v13 mockup's Confirm).
   The room's stage stays on, its seats empty; under it the question and
   "The council will debate" with one reading picked. "Not this? Change"
   opens the three readings — three tensions the question holds, from
   content/readings.ts — and "Other", in your own words. "Cast the
   council" draws the curtain over the seats; Act I opens it on the cast
   (app/stage.ts carries the hand-off).

   A scripted council is only seated when the curtain's beat ends, so
   leaving during it leaves nothing behind; a live cast starts at once
   (it takes a few seconds) and is called off if the reader leaves.
   ============================================================ */

/** the curtain's beat: it closes over the seats before Act I opens */
const CAST_BEAT_MS = 1150;

/** a seat's thinker, or an empty chair while a cast seat's card is still on its way */
function seatFigure(id: string): Figure | null {
  try {
    return figure(id);
  } catch {
    return null;
  }
}

/** this screen is still the one on show (an outgoing screen stays mounted for its exit, timers and all) */
const isHere = () => parseRoute(location.hash).name === 'confirm';

/** a cast under way: the session id once known; `deferred` until a scripted council is seated at the end of the beat */
interface Cast {
  id: string | null;
  deferred: boolean;
}

export function ConfirmScreen() {
  const t = useT();
  const reduce = useReduceMotion();
  const ask = useStore((s) => s.ask);
  const clearAsk = useStore((s) => s.clearAsk);
  const cancelCasting = useStore((s) => s.cancelCasting);
  const storeCasting = useStore((s) => s.casting);
  const activeCouncilId = useStore((s) => s.activeCouncilId);
  const councils = useStore((s) => s.councils);

  // the question as it was handed over: the screen keeps its copy, so clearing the store's never empties it mid-exit
  const [pending] = useState(() => useStore.getState().pendingAsk);
  // a reload or a deep link lands here with no question: back to the room
  useLayoutEffect(() => {
    if (!pending && isHere()) navigate({ name: 'council' }, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // the pick: one of the three readings, or Other (which remembers the reading it was switched on from)
  const [reading, setReading] = useState(0);
  const [other, setOther] = useState(false);
  const [otherText, setOtherText] = useState('');
  const [changing, setChanging] = useState(false);
  const otherRef = useRef<HTMLInputElement>(null);
  const changeRef = useRef<HTMLButtonElement>(null);
  const focusOther = useRef(false);

  const [cast, setCast] = useState<Cast | null>(null);
  const [curtain, setCurtain] = useState<Curtain>('none');
  const [beat, setBeat] = useState(false);
  const done = useRef(false);
  const castRef = useRef<Cast | null>(null);
  castRef.current = cast;
  const casting = !!cast;

  const list = usePresence(changing && !casting, 220);
  const otherField = usePresence(other, 180);

  // the script that answers: the suggestion's council, else the keyword match; neither means the general readings
  const scriptId = pending ? (pending.councilId ?? pending.scriptId ?? null) : null;
  const readings = readingsFor(scriptId);
  const picked = readings[reading];
  const own = otherText.trim();
  const title = other ? own || t.confirm.otherTitle : picked.title;
  const sub = other ? (own ? t.confirm.otherOwn : t.confirm.otherSub) : picked.detail;

  const focusNow = (): Focus | undefined => {
    if (other) return own ? { title: own.slice(0, 200), custom: true } : undefined;
    return { title: picked.title, detail: picked.detail, reading: { scriptId, index: reading } };
  };
  const focusAtCast = useRef<Focus | undefined>(undefined);

  const castCouncil = () => {
    if (!pending || casting) return;
    setChanging(false);
    const focus = focusNow();
    focusAtCast.current = focus;
    // a question no script covers, with a live council to ask: the cast starts now (it takes a few seconds)
    if (!scriptId && isLiveCouncilConfigured()) {
      setCast({ id: ask(pending.question, undefined, focus), deferred: false });
      return;
    }
    // a scripted council is seated when the curtain's beat ends
    setCast({ id: null, deferred: true });
  };

  // the live council answered: the seats are in; or the cast went away without a council, and the page is back as it was
  useEffect(() => {
    if (!cast || cast.deferred || cast.id !== null || storeCasting) return;
    if (activeCouncilId) setCast({ id: activeCouncilId, deferred: false });
    else setCast(null);
  }, [cast, storeCasting, activeCouncilId]);

  // the curtain closes over the seats: parked in the wings on one frame, drawn on the next, so the transition plays
  useEffect(() => {
    if (!casting) {
      setCurtain((c) => (c === 'closed' ? 'open' : 'none'));
      setBeat(false);
      return;
    }
    setCurtain('open');
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => setCurtain('closed'));
    });
    setBeat(false);
    const tm = window.setTimeout(() => setBeat(true), reduce ? 10 : CAST_BEAT_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(tm);
    };
  }, [casting, reduce]);

  // the beat has passed: a scripted council is seated now; once the session is known, Act I takes the reveal
  useEffect(() => {
    if (!beat || !cast || !pending || !isHere()) return;
    if (cast.deferred) {
      setCast({ id: ask(pending.question, scriptId ?? undefined, focusAtCast.current), deferred: false });
      return;
    }
    if (!cast.id) return;
    done.current = true;
    markReveal(cast.id);
    clearAsk();
    navigate({ name: 'stands', id: cast.id });
  }, [beat, cast]); // eslint-disable-line react-hooks/exhaustive-deps

  // leaving during a live cast calls it off (a late cast is dropped by the store); a deferred one never started
  useEffect(
    () => () => {
      const c = castRef.current;
      if (c && !c.deferred && c.id === null && !done.current) cancelCasting();
    },
    [cancelCasting],
  );

  // Other takes the focus when it is switched on (not when the list reopens with it already chosen)
  // (the field mounts a render after `other` turns on, so the flag waits for it)
  useEffect(() => {
    if (other && focusOther.current && otherRef.current) {
      focusOther.current = false;
      otherRef.current.focus();
    }
  }, [other, otherField.mounted]);

  if (!pending) return <div className="screen confirm-screen" />;

  const pick = (n: number) => {
    setReading(n);
    setOther(false);
    setChanging(false);
    // the list folds away under the finger: the focus goes back to the control that opened it
    requestAnimationFrame(() => changeRef.current?.focus());
  };
  const toggleOther = () => {
    focusOther.current = !other;
    setOther((v) => !v);
  };
  const onOtherKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      castCouncil();
    }
  };

  // the curtain names tonight's council once it is seated
  const castSession = cast?.id ? councils[cast.id] : undefined;
  const marquee = [t.council.marquee, ...(castSession ? castSession.seats.map(seatFigure).flatMap((f) => (f ? [f.short] : [])) : [])].join(' · ');

  return (
    <div className="screen confirm-screen">
      <AppBar back={{ name: 'council' }} />
      <Stage mode="mid" seats={[null, null, null]} curtain={curtain} marquee={marquee} onEmptyTap={casting ? undefined : castCouncil} emptyAria={t.council.cast} />
      <div className="content">
        <p className="sub rv confirm-q">“{pending.question}”</p>
        {/* typing under Other is not announced keystroke by keystroke; a new pick is */}
        <div className="confirm rv" style={{ animationDelay: '.06s' }} aria-live={other ? 'off' : 'polite'}>
          <div className="k">{t.confirm.willDebate}</div>
          {/* keyed by the choice (not its words): a new pick arrives, typing under Other does not replay it */}
          <div key={other ? 'other' : `r${reading}`} className="confirm-pick">
            <div className="t">{title}</div>
            <div className="d">{sub}</div>
          </div>
        </div>
        {!casting && (
          <div className="confirm-foot rv" style={{ animationDelay: '.1s' }}>
            <button ref={changeRef} type="button" className="btn text" aria-expanded={changing} onClick={() => setChanging((v) => !v)}>
              {changing ? t.confirm.keep : t.confirm.change}
            </button>
          </div>
        )}
        {list.mounted && (
          <div className={`opt-list ${list.closing ? 'closing' : ''}`} role="group" aria-label={t.confirm.readingsAria}>
            {readings.map((r, n) => {
              const on = !other && reading === n;
              return (
                <button
                  key={r.title}
                  type="button"
                  className={`opt rv ${on ? 'on' : ''}`}
                  style={{ animationDelay: `${(n * 0.06).toFixed(2)}s` }}
                  aria-pressed={on}
                  onClick={() => pick(n)}
                >
                  <span className="t">{r.title}</span>
                  <span className="d">{r.detail}</span>
                  <span className="box" aria-hidden="true">
                    {on && <IconCheck stroke={3} />}
                  </span>
                </button>
              );
            })}
            {/* Other: a button that toggles it, and its own field beside it (never inside a button) */}
            <div className={`opt opt-other rv ${other ? 'on' : ''}`} style={{ animationDelay: '.2s' }}>
              <button type="button" className="opt-toggle" aria-pressed={other} onClick={toggleOther}>
                <span className="t">{t.confirm.other}</span>
                {!other && <span className="d">{t.confirm.otherHint}</span>}
                <span className="box" aria-hidden="true">
                  {other && <IconCheck stroke={3} />}
                </span>
              </button>
              {otherField.mounted && (
                <div className={`chatbar other-field ${otherField.closing ? 'closing' : ''}`}>
                  <input
                    ref={otherRef}
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value)}
                    onKeyDown={onOtherKey}
                    placeholder={t.confirm.otherPh}
                    aria-label={t.confirm.otherPh}
                    autoComplete="off"
                    enterKeyHint="send"
                    maxLength={200}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="footer">
        {casting ? (
          <Thinking>{t.council.casting}</Thinking>
        ) : (
          <button type="button" className="btn gold" onClick={castCouncil}>
            {t.council.cast}
          </button>
        )}
      </div>
    </div>
  );
}
