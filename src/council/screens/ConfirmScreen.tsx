import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { IconCheck } from '@tabler/icons-react';
import { navigate, parseRoute } from '../app/router';
import { markReveal } from '../app/stage';
import { useStore } from '../store/useStore';
import type { Focus, FocusPick } from '../store/types';
import { readingsFor } from '../content/readings';
import { isLiveCouncilConfigured } from '../../lib/supabase';
import { AppBar, Thinking } from '../components/chrome';
import { usePresence } from '../hooks/usePresence';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { fmt, useT } from '../i18n/react';
import './ConfirmScreen.css';

/* ============================================================
   What the question is really about — the selection page. No stage
   here: the question, then the options. Three readings of it — three
   tensions it could be about, written for this question by the live
   council while the room said "Reading your question", or the script's
   own (content/readings.ts) — and "Other", in the reader's own words.
   The reader picks any of them, and that is what the council debates:
   picking is how the reader, and the model, come to understand the
   question. "Cast the council" waits for at least one, holds a beat
   ("Casting the council"), then Act I opens its curtain on the cast
   (app/stage.ts carries the hand-off).

   A scripted council is only seated when the beat ends, so leaving
   during it leaves nothing behind; a live cast starts at once (it takes
   a few seconds) and is called off if the reader leaves.
   ============================================================ */

/** the beat between the tap and Act I: long enough to read "Casting the council", short enough to feel like one motion */
const CAST_BEAT_MS = 650;

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

  // the question as it was handed over: the screen keeps its copy, so clearing the store's never empties it mid-exit
  const [pending] = useState(() => useStore.getState().pendingAsk);
  // a reload or a deep link lands here with no question: back to the room
  useLayoutEffect(() => {
    if (!pending && isHere()) navigate({ name: 'council' }, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // the picks: any of the three readings, and Other with its words
  const [picked, setPicked] = useState<number[]>([]);
  const [other, setOther] = useState(false);
  const [otherText, setOtherText] = useState('');
  const [nudge, setNudge] = useState(0);
  const otherRef = useRef<HTMLInputElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);
  const focusOther = useRef(false);

  const [cast, setCast] = useState<Cast | null>(null);
  const [beat, setBeat] = useState(false);
  const done = useRef(false);
  const castRef = useRef<Cast | null>(null);
  castRef.current = cast;
  const casting = !!cast;

  const otherField = usePresence(other, 180);

  // the script that answers: the suggestion's council, else the keyword match; neither means the general readings
  const scriptId = pending ? (pending.councilId ?? pending.scriptId ?? null) : null;
  // the live council's three for this very question, else the script's own (re-read in the language of the moment)
  const liveReadings = pending?.readings;
  const readings = liveReadings ?? readingsFor(scriptId);
  const own = other ? otherText.trim() : '';
  const count = picked.length + (own ? 1 : 0);

  const focusNow = (): Focus | undefined => {
    const picks: FocusPick[] = [...picked]
      .sort((a, b) => a - b)
      .flatMap((n) => {
        const r = readings[n];
        if (!r) return [];
        // an authored reading is kept by reference too, so it is re-read in the language of the moment; a live one stays as written
        return [{ title: r.title, ...(r.detail ? { detail: r.detail } : {}), ...(liveReadings ? {} : { reading: { scriptId, index: n } }) }];
      });
    if (!picks.length && !own) return undefined;
    return { picks, ...(own ? { own: own.slice(0, 200) } : {}) };
  };
  const focusAtCast = useRef<Focus | undefined>(undefined);

  const castCouncil = () => {
    if (!pending || casting) return;
    const focus = focusNow();
    // nothing picked yet: the page says so, and the first reading takes the focus
    if (!focus) {
      setNudge((n) => n + 1);
      if (!other) firstRef.current?.focus();
      return;
    }
    focusAtCast.current = focus;
    otherRef.current?.blur();
    // a question no script covers, with a live council to ask: the cast starts now (it takes a few seconds)
    if (!scriptId && isLiveCouncilConfigured()) {
      setCast({ id: ask(pending.question, undefined, focus), deferred: false });
      return;
    }
    // a scripted council is seated when the beat ends
    setCast({ id: null, deferred: true });
  };

  // the live council answered: the seats are in; or the cast went away without a council, and the page is back as it was
  useEffect(() => {
    if (!cast || cast.deferred || cast.id !== null || storeCasting) return;
    if (activeCouncilId) setCast({ id: activeCouncilId, deferred: false });
    else setCast(null);
  }, [cast, storeCasting, activeCouncilId]);

  // the beat: "Casting the council" holds for a moment before Act I
  useEffect(() => {
    setBeat(false);
    if (!casting) return;
    const tm = window.setTimeout(() => setBeat(true), reduce ? 10 : CAST_BEAT_MS);
    return () => clearTimeout(tm);
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

  // Other takes the focus when it is switched on (the field mounts a render after `other` turns on, so the flag waits for it)
  useEffect(() => {
    if (other && focusOther.current && otherRef.current) {
      focusOther.current = false;
      otherRef.current.focus();
    }
  }, [other, otherField.mounted]);

  if (!pending) return <div className="screen confirm-screen" />;

  const toggle = (n: number) => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));
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

  return (
    <div className={`screen confirm-screen ${casting ? 'is-casting' : ''}`}>
      <AppBar back={{ name: 'council' }} />
      <div className="content">
        {/* the question, then the options: the reader's words first, the room's reading of them under it */}
        <p className="confirm-q rv">“{pending.question}”</p>
        <div className="pick-head rv" style={{ animationDelay: '.04s' }}>
          <h2 className="k" id="pick-k">
            {t.confirm.kicker}
          </h2>
          <p className="pick-lead">{t.confirm.lead}</p>
        </div>
        <div className="opt-list" role="group" aria-labelledby="pick-k" aria-describedby="pick-count">
          {readings.map((r, n) => {
            const on = picked.includes(n);
            return (
              <button
                // a new set of readings (the language changed) arrives afresh
                key={`${n}:${r.title}`}
                ref={n === 0 ? firstRef : undefined}
                type="button"
                className={`opt rv ${on ? 'on' : ''}`}
                style={{ animationDelay: `${(0.08 + n * 0.06).toFixed(2)}s` }}
                aria-pressed={on}
                disabled={casting}
                onClick={() => toggle(n)}
              >
                <span className="t">{r.title}</span>
                {r.detail && <span className="d">{r.detail}</span>}
                <span className="box" aria-hidden="true">
                  {on && <IconCheck stroke={3} />}
                </span>
              </button>
            );
          })}
          {/* Other: a button that toggles it, and its own field beside it (never inside a button) */}
          <div className={`opt opt-other rv ${other ? 'on' : ''}`} style={{ animationDelay: '.26s' }}>
            <button type="button" className="opt-toggle" aria-pressed={other} disabled={casting} onClick={toggleOther}>
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
                  readOnly={casting}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="footer">
        {casting ? (
          <Thinking>{t.council.casting}</Thinking>
        ) : (
          <>
            {/* how many are picked — or, on a cast with none, that one is needed (re-keyed so it says so again) */}
            <p id="pick-count" key={count ? 'n' : `none${nudge}`} className={`pick-count ${!count && nudge ? 'nudge' : ''}`} aria-live="polite">
              {count ? fmt(t.confirm.picked, { n: String(count) }) : t.confirm.none}
            </p>
            <button type="button" className="btn gold" aria-disabled={!count} onClick={castCouncil}>
              {t.council.cast}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
