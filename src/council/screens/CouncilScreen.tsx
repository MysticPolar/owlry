import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { IconArrowUp, IconBook, IconBriefcase, IconChartBar, IconCheck, IconChevronDown, IconHeart, IconHeartbeat, IconMessageCircle } from '@tabler/icons-react';
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
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import './CouncilScreen.css';

/* ============================================================
   The room — the Home tab, and the v15 chat canvas. The stage sits under
   the app bar with three empty chairs, their halos breathing: an
   invitation, never a replay of the last council (that one is in the
   Library); they turn gold, listening, once there is a question to send.
   The composer is the bottom edge (the question, the interest pill, the
   send button) and three ideas stack on it. Asking lands the question in
   the room as the reader's own line, the composer emptied and inert,
   "Reading your question" while the live council writes three readings
   of it (a beat at least, its timeout at most); then the selection page
   offers them and casts.
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

/** the least "Reading your question" holds before the selection page (the live council's readings may take longer) */
const READING_BEAT_MS = 900;

/** an idea that wraps to two lines still hugs its text (CSS alone leaves a wrapped pill as wide as the column) */
function hugIdeas(root: HTMLElement) {
  const ideas = [...root.querySelectorAll<HTMLElement>('.idea')];
  const range = document.createRange();
  ideas.forEach((b) => (b.style.width = ''));
  const widths = ideas.map((b) => {
    range.selectNodeContents(b);
    const cs = getComputedStyle(b);
    const chrome = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    return [Math.ceil(range.getBoundingClientRect().width + chrome), b.offsetWidth];
  });
  ideas.forEach((b, i) => {
    if (widths[i][1] - widths[i][0] > 1) b.style.width = `${widths[i][0]}px`;
  });
}

/** if the room is taller than its box (a very short phone, a long draft), show its end: the ideas stay next to the
    input and the heading is what scrolls away. Measured from the layout, not scrollHeight: the 16px the ideas travel
    on their way in must not count as overflow */
function anchorRoom(content: HTMLElement) {
  const bottom = content.firstElementChild;
  if (!bottom) return;
  const over = content.scrollTop + bottom.getBoundingClientRect().bottom - content.getBoundingClientRect().bottom;
  content.scrollTop = over > 0.5 ? over : 0;
}

export function CouncilScreen() {
  const t = useT();
  const reduce = useReduceMotion();
  const kb = useKeyboardInset();
  const interests = useStore((s) => s.interests);
  const setInterests = useStore((s) => s.setInterests);
  const beginAsk = useStore((s) => s.beginAsk);
  const readAsk = useStore((s) => s.readAsk);
  const showToast = useStore((s) => s.showToast);

  // back from the confirmation page without casting: the question is still in the box, ready to change
  const [text, setText] = useState(() => useStore.getState().pendingAsk?.question ?? '');
  const [catsOpen, setCatsOpen] = useState(false);
  // the question as it landed in the room; set, the room is reading it (a beat before the confirmation page)
  const [asked, setAsked] = useState<string | null>(null);
  const reading = asked !== null;
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useAutoGrow(inputRef, text);
  const ready = !reading && text.trim().length >= 3;

  // a toast left over from another screen was placed for the bottom, where the composer is now
  useEffect(() => {
    if (useStore.getState().toast) useStore.getState().dismissToast();
  }, []);

  // an empty chair, tapped: the question takes the focus and a toast says what fills it
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
    // the question lands in the room as the reader's own line; the composer stays where it is, emptied and inert
    inputRef.current?.blur();
    setAsked(q.trim());
    setText('');
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit(text);
    }
  };
  useEffect(() => {
    if (!reading) return;
    let here = true;
    const pending = useStore.getState().pendingAsk;
    const beat = new Promise<void>((resolve) => window.setTimeout(resolve, reduce ? 10 : READING_BEAT_MS));
    // the live council reads the question meanwhile; without it (or past its timeout) the page offers the authored readings
    void Promise.all([beat, pending ? readAsk(pending) : null]).then(() => {
      // only while the room is still the screen on show: a tab tapped during the beat wins
      if (here && parseRoute(location.hash).name === 'council') navigate({ name: 'confirm' });
    });
    return () => {
      here = false;
    };
  }, [reading, reduce, readAsk]);

  /* ---- interests + suggestions ---- */
  const areas = areasList();
  const picked = areas.filter((a) => interests.includes(a.id));
  const pillLabel = picked.length
    ? picked
        .slice(0, 2)
        .map((a) => a.title)
        .join(' · ') + (picked.length > 2 ? ` +${picked.length - 2}` : '')
    : t.council.chooseInterest;
  const toggle = (a: Area) => setInterests(interests.includes(a) ? interests.filter((x) => x !== a) : [...interests, a]);
  const suggestions = suggestionsFor(interests);
  const ideasKey = suggestions.map((s) => s.text).join('|');

  /* ---- the room hangs from its bottom edge ---- */
  // a fresh list of ideas, or the question landing: the ideas hug their words, the end of the room stays in view
  useLayoutEffect(() => {
    const c = contentRef.current;
    if (!c) return;
    hugIdeas(c);
    anchorRoom(c);
  }, [ideasKey, reading]);
  // the question box grew or shrank (useAutoGrow ran first)
  useLayoutEffect(() => {
    if (contentRef.current) anchorRoom(contentRef.current);
  }, [text]);
  // while the room's box is still changing (the stage settling in, the keyboard, a turned phone) the ideas stay next
  // to the input; measured in the fallback face? measure again in the real one
  useEffect(() => {
    const c = contentRef.current;
    if (!c) return;
    let width = c.clientWidth;
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      if (c.clientWidth !== width) {
        width = c.clientWidth;
        hugIdeas(c);
      }
      anchorRoom(c);
    });
    ro?.observe(c);
    const onFonts = () => {
      const a = inputRef.current;
      if (a) {
        a.style.height = 'auto';
        a.style.height = `${a.scrollHeight}px`;
      }
      hugIdeas(c);
      anchorRoom(c);
    };
    document.fonts?.addEventListener?.('loadingdone', onFonts);
    return () => {
      ro?.disconnect();
      document.fonts?.removeEventListener?.('loadingdone', onFonts);
    };
  }, []);

  return (
    <div className="screen council-room">
      <AppBar />
      {/* always the three empty chairs, breathing: the room invites a question, it does not replay the last one */}
      <Stage mode="mid" seats={[null, null, null]} ready={ready} onEmptyTap={onEmptyTap} emptyAria={t.council.seatEmptyAria} className="toast-anchor" />
      <div ref={contentRef} className="content room">
        {reading ? (
          <div key="said" className="room-bottom said" aria-live="polite">
            <div className="msg-me rv">{asked}</div>
            <div className="rv" style={{ animationDelay: '.12s' }}>
              <Thinking>{t.council.reading}</Thinking>
            </div>
          </div>
        ) : (
          <div key="ask" className="room-bottom">
            <h1 className="lead room-lead rv">{t.council.lead}</h1>
            {/* keyed by its questions: a change of interests brings a fresh list in rather than swapping the words in place */}
            <ul key={ideasKey} className="ideas" role="list">
              {suggestions.map((s, n) => (
                <li key={s.text}>
                  <button type="button" className="idea rv" style={{ animationDelay: `${(0.05 + n * 0.05).toFixed(2)}s` }} onClick={() => submit(s.text, s.councilId)}>
                    {s.text}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {/* the composer; with the keyboard up (iOS lays it over the page) it sits on the keyboard, over the nav */}
      <div className="footer ask" style={kb ? { paddingBottom: kb + 12 } : undefined}>
        <div className="composer">
          <textarea
            ref={inputRef}
            className="askq"
            rows={1}
            placeholder={t.council.ph}
            aria-label={t.council.ariaQ}
            autoComplete="off"
            autoCapitalize="sentences"
            enterKeyHint="send"
            value={text}
            disabled={reading}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
          />
          <div className="askfoot">
            <button type="button" className={`pill ${picked.length ? 'on' : ''}`} aria-label={t.council.pickAria} disabled={reading} onClick={() => setCatsOpen(true)}>
              <span className="pill-text">{pillLabel}</span>
              <IconChevronDown stroke={2} />
            </button>
            <button type="button" className={`send ${ready ? 'ready' : ''}`} aria-label={t.council.askCta} aria-disabled={!ready} disabled={reading} onClick={() => submit(text)}>
              <IconArrowUp stroke={2.4} />
            </button>
          </div>
        </div>
      </div>

      {/* the categories, in a sheet: a tap toggles the interest at once; the ideas follow */}
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
