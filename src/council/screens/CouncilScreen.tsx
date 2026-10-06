import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { IconBook, IconBriefcase, IconChartBar, IconCheck, IconChevronDown, IconHeart, IconHeartbeat, IconMessageCircle } from '@tabler/icons-react';
import { navigate, parseRoute } from '../app/router';
import { useStore } from '../store/useStore';
import type { Area } from '../content/types';
import { areasList, suggestionsFor } from '../content/councils';
import { AppBar, Sheet, Thinking } from '../components/chrome';
import { Stage } from '../components/Stage';
import { Owl } from '../components/Owl';
import { useT } from '../i18n/react';
import { useAutoGrow } from '../hooks/useAutoGrow';
import { useReduceMotion } from '../hooks/useReduceMotion';
import './CouncilScreen.css';

/* ============================================================
   The room — the Home tab. The stage sits under the app bar with three
   empty chairs, their halos breathing: an invitation, never a replay of
   the last council (that one is in the Library). Under it the question:
   the ask box with the interest pill, four suggestions, "Ask the
   council" in the footer. Asking shows "Reading your question" for a
   beat, then the confirmation page offers the readings and casts.
   ============================================================ */

/** the mockup's category glyphs, one per interest area */
const ICONS: Record<Area, ReactNode> = {
  health: <IconHeartbeat stroke={1.8} />,
  career: <IconBriefcase stroke={1.8} />,
  investing: <IconChartBar stroke={1.8} />,
  relationships: <IconHeart stroke={1.8} />,
  literature: <IconBook stroke={1.8} />,
  other: <IconMessageCircle stroke={1.8} />,
};

/** how long "Reading your question" holds before the confirmation page */
const READING_BEAT_MS = 900;

export function CouncilScreen() {
  const t = useT();
  const reduce = useReduceMotion();
  const interests = useStore((s) => s.interests);
  const setInterests = useStore((s) => s.setInterests);
  const beginAsk = useStore((s) => s.beginAsk);
  const showToast = useStore((s) => s.showToast);

  // back from the confirmation page without casting: the question is still in the box, ready to change
  const [text, setText] = useState(() => useStore.getState().pendingAsk?.question ?? '');
  const [catsOpen, setCatsOpen] = useState(false);
  // "Reading your question": a beat between the ask and the confirmation page
  const [reading, setReading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useAutoGrow(inputRef, text);

  // an empty chair, tapped: the ask box takes the focus and a toast says what fills it
  const onEmptyTap = () => {
    if (reading) return;
    inputRef.current?.focus();
    showToast(t.council.seatHint);
  };

  /* ---- asking: the question is read, then the confirmation page offers its readings ---- */
  const submit = (q: string, councilId?: string) => {
    if (reading) return;
    // back from the confirmation page with a suggestion's words still in the box: it keeps its council
    const was = useStore.getState().pendingAsk;
    const pin = councilId ?? (was && q.trim() === was.question ? was.councilId : undefined);
    if (!beginAsk(q, pin)) {
      inputRef.current?.focus();
      return;
    }
    inputRef.current?.blur();
    setReading(true);
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit(text);
    }
  };
  useEffect(() => {
    if (!reading) return;
    // only while the room is still the screen on show: a tab tapped during the beat wins
    const tm = window.setTimeout(() => {
      if (parseRoute(location.hash).name === 'council') navigate({ name: 'confirm' });
    }, reduce ? 10 : READING_BEAT_MS);
    return () => clearTimeout(tm);
  }, [reading, reduce]);

  /* ---- interests + suggestions ---- */
  const areas = areasList();
  const picked = areas.filter((a) => interests.includes(a.id));
  const pillLabel = picked.length ? picked.map((a) => a.title).join(' · ') : t.council.chooseInterest;
  const toggle = (a: Area) => setInterests(interests.includes(a) ? interests.filter((x) => x !== a) : [...interests, a]);
  const suggestions = suggestionsFor(interests);

  return (
    <div className="screen council-room">
      <AppBar />
      {/* always the three empty chairs, breathing: the room invites a question, it does not replay the last one */}
      <Stage mode="mid" seats={[null, null, null]} onEmptyTap={onEmptyTap} emptyAria={t.council.seatEmptyAria} />
      <div className="content">
        <h1 className="lead rv">{t.council.lead}</h1>
        <div className="askbox rv" style={{ animationDelay: '.06s' }}>
          <textarea
            ref={inputRef}
            className="askq"
            rows={2}
            placeholder={t.council.ph}
            aria-label={t.council.ariaQ}
            autoComplete="off"
            autoCapitalize="sentences"
            enterKeyHint="send"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
          />
          <div className="askfoot">
            <button type="button" className={`pill ${picked.length ? 'on' : ''}`} aria-label={t.council.pickAria} onClick={() => setCatsOpen(true)}>
              <span className="pill-text">{pillLabel}</span>
              <IconChevronDown stroke={2} />
            </button>
          </div>
        </div>
        {/* keyed by its questions: a change of interests brings a fresh list in rather than swapping the words in place */}
        <ul key={suggestions.map((s) => s.text).join('|')} className="suggest rv" role="list" style={{ animationDelay: '.12s' }}>
          {suggestions.map((s, n) => (
            <li key={s.text}>
              <button type="button" onClick={() => submit(s.text, s.councilId)}>
                <span className="n" aria-hidden="true">
                  0{n + 1}
                </span>
                <span>{s.text}</span>
                <span className="arr" aria-hidden="true">
                  →
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="footer">
        {reading ? (
          <Thinking>{t.council.reading}</Thinking>
        ) : (
          <button type="button" className="btn gold" disabled={text.trim().length < 3} onClick={() => submit(text)}>
            {t.council.askCta}
          </button>
        )}
      </div>

      {/* the categories, in a sheet: a tap toggles the interest at once; the suggestions follow */}
      <Sheet open={catsOpen} onClose={() => setCatsOpen(false)} label={t.interests.sheetAria} className="cats">
        <h2 className="display">
          {t.interests.title1}
          <br />
          {t.interests.title2}
        </h2>
        <ul className="tiles" role="list">
          {areas.map((a) => {
            const on = interests.includes(a.id);
            return (
              <li key={a.id}>
                <button type="button" className={`tile ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggle(a.id)}>
                  <span className="tile-icon">{ICONS[a.id]}</span>
                  <span className="tile-text">
                    <span className="tile-title">{a.title}</span>
                    <span className="tile-sub">{a.tagline}</span>
                  </span>
                  <span className="tile-check" aria-hidden="true">
                    <IconCheck stroke={3} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="catfoot">
          <button type="button" className="btn gold" onClick={() => setCatsOpen(false)}>
            {t.interests.done}
          </button>
        </div>
        <Owl color="teal" size={84} pose="peek" className="interests-owl" title={t.interests.owl} />
      </Sheet>
    </div>
  );
}
