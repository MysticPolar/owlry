import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../store/useAuth';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import { isConfigured } from '../../lib/supabase';
import { getBook } from '../../lib/bookRegistry';
import {
  renderChatItem,
  renderStreamedNodes,
  messageLength,
  charAt,
  letterNumbers,
} from '../chat/ChatItems';
import type { BookRef } from '../../content/types';
import type { ChatItem } from '../../store/types';
import { useT } from '../../i18n/react';
import { Icon } from '../Icon';
import { CastOwl } from '../CastOwl';
import { StageBar } from '../stage';

/* honour both the OS setting and the in-app "reduce motion" toggle, and react
   live when the OS setting flips mid-session (not only on the next re-render) */
function useReduceMotion(): boolean {
  const pref = useStore((s) => s.prefs.reduceMotion);
  const [osReduce, setOsReduce] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setOsReduce(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return pref || osReduce;
}

/* spine geometry — thickness reads the page count, height jitters by id so
   the tops sit unevenly (it reads as a shelf, not a bar chart) */
const spineThickness = (id: BookRef): number => {
  const b = getBook(id);
  return Math.max(9, Math.min(19, Math.round(9 + (b?.n || 250) / 78)));
};
const spineHeight = (id: BookRef): number => 20 + (id.charCodeAt(0) % 5);

/* ============================================================
   one owl line, typed in with a gold caret (the calm stream).
   Only lines flagged `stream` animate; the rest render whole.
   The last streaming line of a turn reports done → the store
   plays the after-text beat (letter → flight → chips).
   ============================================================ */
interface StreamMsgProps {
  item: Extract<ChatItem, { kind: 'msg' }>;
  active: boolean;
  reduce: boolean;
  skipRef: React.MutableRefObject<boolean>;
  onDone: (id: number) => void;
  onScroll: () => void;
  openSheet: (id: BookRef) => void;
}

function StreamMsg({ item, active, reduce, skipRef, onDone, onScroll, openSheet }: StreamMsgProps) {
  const nodes = item.nodes;
  const total = useMemo(() => messageLength(nodes), [nodes]);
  const shouldStream = !!item.stream && !reduce;
  const [n, setN] = useState(shouldStream ? 0 : total);
  const [done, setDone] = useState(!shouldStream);
  const firedDone = useRef(!item.stream); // only flagged lines report completion

  // reduced-motion (a flagged line that isn't animating): report as soon as active
  useEffect(() => {
    if (active && item.stream && !shouldStream && !firedDone.current) {
      firedDone.current = true;
      onDone(item.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // the typewriter — one run, kicked off when this line becomes active
  useEffect(() => {
    if (!active || !shouldStream || done) return;
    let cancelled = false;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      if (cancelled) return;
      if (skipRef.current || i >= total) {
        setN(total);
        setDone(true);
        if (!firedDone.current) {
          firedDone.current = true;
          onDone(item.id);
        }
        return;
      }
      i += 1;
      setN(i);
      if (i % 14 === 0) onScroll();
      const ch = charAt(nodes, i - 1);
      const d = /[.!?…—]/.test(ch) ? 115 : ch === ',' ? 70 : ch === ' ' ? 9 : 14;
      timer = setTimeout(step, d);
    };
    timer = setTimeout(step, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // a queued (not-yet-active) streaming line renders nothing until its turn
  if (shouldStream && !active && !done && n === 0) return null;
  const caret = active && !done;
  // the char-by-char text lives in an aria-hidden node so the polite #chat log
  // doesn't re-announce every keystroke; the finished line is spoken once via
  // a single sr-only node that appears when typing completes
  const animating = !!item.stream;
  return (
    <div className={`msg owl${item.tone === 'note' ? ' note' : ''}`}>
      {item.speaker && <span className="who">{item.speaker}</span>}
      <span className="tw" aria-hidden={animating || undefined}>
        {renderStreamedNodes(nodes, done ? total : n, openSheet)}
      </span>
      {caret && <span className="tw-cur" aria-hidden="true" />}
      {animating && done && <span className="sr-only">{nodes.map((nd) => nd.v).join('')}</span>}
    </div>
  );
}

/* ---------- the calm stream ---------- */
function Chat({ reduce }: { reduce: boolean }) {
  const messages = useStore((s) => s.owl.messages);
  const onDiscover = useStore((s) => s.activeTab === 'discover');
  const openSheet = useStore((s) => s.openSheet);
  const openLetter = useStore((s) => s.openLetter);
  const revealAfterText = useStore((s) => s.revealAfterText);
  const kb = useKeyboardInset();
  const ref = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);
  const completed = useRef<Set<number>>(new Set());
  const skipRef = useRef(false);
  const [, bump] = useReducer((x: number) => x + 1, 0);

  const scrollToEnd = useCallback(
    (smooth: boolean) => {
      const c = ref.current;
      if (!c) return;
      c.scrollTo({ top: c.scrollHeight, behavior: smooth && !reduce ? 'smooth' : 'auto' });
    },
    [reduce],
  );

  // glide to new items; jump on tab entry / keyboard open
  useEffect(() => {
    if (!onDiscover) return;
    const grew = messages.length > prevCount.current;
    prevCount.current = messages.length;
    scrollToEnd(grew);
  }, [messages, onDiscover, kb, scrollToEnd]);

  // the ordered queue of owl lines still waiting to type in
  const activeStreamId = (() => {
    for (const m of messages) {
      if (m.kind === 'msg' && m.who === 'owl' && m.stream && !completed.current.has(m.id)) return m.id;
    }
    return null;
  })();

  const handleDone = useCallback(
    (id: number) => {
      if (completed.current.has(id)) return;
      completed.current.add(id);
      const stillStreaming = useStore
        .getState()
        .owl.messages.some((m) => m.kind === 'msg' && m.who === 'owl' && m.stream && !completed.current.has(m.id));
      if (!stillStreaming) {
        const skipped = skipRef.current;
        skipRef.current = false;
        revealAfterText(skipped);
      }
      bump();
    },
    [revealAfterText],
  );

  // tap the stream (not a control) to skip the typing and complete the turn
  const onTapSkip = (e: React.MouseEvent) => {
    if (activeStreamId == null) return;
    if ((e.target as HTMLElement).closest('button,[data-sheet],[data-letter],[data-open],[data-save],.bk')) return;
    skipRef.current = true;
  };

  const nos = letterNumbers(messages);

  return (
    <div className="chat" id="chat" role="log" aria-live="polite" ref={ref} onClick={onTapSkip}>
      {messages.map((m) =>
        m.kind === 'msg' && m.who === 'owl' ? (
          <StreamMsg
            key={m.id}
            item={m}
            active={m.id === activeStreamId}
            reduce={reduce}
            skipRef={skipRef}
            onDone={handleDone}
            onScroll={() => scrollToEnd(false)}
            openSheet={openSheet}
          />
        ) : (
          renderChatItem(m, openSheet, openLetter, nos.get(m.id))
        ),
      )}
    </div>
  );
}

/* ============================================================
   the shelf rail — state lives in the chrome, the event lives in
   motion. Spines stand on a hairline board; a new pick lifts off
   its letter and flies onto the rail, then the count announces it.
   ============================================================ */
function ShelfRail({ reduce }: { reduce: boolean }) {
  const t = useT();
  const collected = useStore((s) => s.owl.collected);
  const shelfFly = useStore((s) => s.shelfFly);
  const collectBooks = useStore((s) => s.collectBooks);
  const openSheet = useStore((s) => s.openSheet);
  const booksRef = useRef<HTMLDivElement>(null);
  const seenFly = useRef(0);
  const [expanded, setExpanded] = useState(false);
  const [glow, setGlow] = useState(false);
  const [flightVisible, setFlightVisible] = useState(false);
  const [announce, setAnnounce] = useState<string | null>(null);

  const land = useCallback((title: string) => {
    setAnnounce('+ ' + title.toLowerCase());
    setGlow(true);
    setTimeout(() => setGlow(false), 900);
    setTimeout(() => setAnnounce(null), 1500);
  }, []);

  const flyToShelf = useCallback(
    (bookId: BookRef, fromEl: Element | null) => {
      const collect = [bookId];
      const app = document.getElementById('app');
      const booksEl = booksRef.current;
      const b = getBook(bookId);
      if (reduce || !fromEl || !app || !booksEl || !b) {
        collectBooks(collect);
        if (b) land(b.t);
        return;
      }
      setFlightVisible(true); // the board must be on screen to land on
      requestAnimationFrame(() => {
        const a = app.getBoundingClientRect();
        const src = (fromEl.querySelector('.cover-xs') || fromEl).getBoundingClientRect();
        const slot = booksEl.getBoundingClientRect();
        // rail not laid out (hidden while the composer is focused) → no flight,
        // just shelve it; the spine is waiting when the chrome returns on blur
        if (!slot.width || !slot.height || !src.width) {
          collectBooks(collect);
          land(b.t);
          return;
        }
        const fly = document.createElement('span');
        fly.className = 'sr-fly';
        fly.style.cssText = `background:${b.c};width:${spineThickness(bookId)}px;height:${spineHeight(bookId)}px;left:${src.left - a.left + src.width / 2}px;top:${src.top - a.top + src.height / 2}px`;
        app.appendChild(fly);
        const dx = slot.left - a.left + 6 - (src.left - a.left + src.width / 2);
        const dy = slot.top - a.top + 10 - (src.top - a.top + src.height / 2);
        const anim = fly.animate(
          [
            { transform: 'translate(-50%,-50%) scale(2.2) rotate(-8deg)', opacity: 0 },
            { transform: 'translate(-50%,-50%) scale(1.6) rotate(-4deg)', opacity: 1, offset: 0.18 },
            {
              transform: `translate(calc(-50% + ${dx * 0.55}px), calc(-50% + ${dy * 0.42}px)) scale(1.25) rotate(6deg)`,
              opacity: 1,
              offset: 0.62,
            },
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(0deg)`, opacity: 1 },
          ],
          { duration: 820, easing: 'cubic-bezier(.35,.05,.3,1)' },
        );
        anim.onfinish = () => {
          fly.remove();
          // if the conversation was wiped mid-flight (new chat / reset / sign-out),
          // the letter card detached — don't re-shelve a book from a discarded turn
          if (!document.body.contains(fromEl)) {
            setFlightVisible(false);
            return;
          }
          collectBooks(collect); // the real spine renders on the rail
          land(b.t);
        };
      });
    },
    [reduce, collectBooks, land],
  );

  // the reader peeked a book → its spine lifts off that letter's card and flies
  // onto the rail (a beat after the peek letter slides away, so the chat shows)
  useEffect(() => {
    if (!shelfFly || shelfFly.n <= seenFly.current) return;
    seenFly.current = shelfFly.n;
    const { id } = shelfFly;
    if (collected.includes(id)) return; // already shelved
    if (reduce) {
      collectBooks([id]);
      return;
    }
    const t = setTimeout(() => {
      const cards = document.querySelectorAll(`.gletter[data-book="${id}"]`);
      flyToShelf(id, cards.length ? cards[cards.length - 1] : null);
    }, 340);
    return () => clearTimeout(t);
  }, [shelfFly, collected, reduce, collectBooks, flyToShelf]);

  // when the shelf is cleared (new chat / reset / sign-out), drop the forced
  // visibility so the empty rail hides instead of lingering as "0 books"
  useEffect(() => {
    if (!collected.length) setFlightVisible(false);
  }, [collected.length]);

  const on = collected.length > 0 || flightVisible;
  const countText = announce ?? t.discover.shelfCount(collected.length);

  return (
    <div className={`shelfrail${on ? ' on' : ''}${expanded ? ' expanded' : ''}${glow ? ' glow' : ''}`} aria-hidden={!on}>
      <div className="sr-books" id="srBooks" ref={booksRef}>
        {collected.map((id) => {
          const b = getBook(id);
          if (!b) return null;
          return (
            <button
              key={id}
              className="sr-spine"
              data-sheet={id}
              aria-label={b.t}
              title={b.t}
              style={{ background: b.c, width: spineThickness(id), height: spineHeight(id) }}
              onClick={() => openSheet(id)}
            />
          );
        })}
      </div>
      <button
        className={`sr-count${announce ? ' flash' : ''}`}
        id="srCount"
        aria-label={t.discover.shelfAria}
        onClick={() => setExpanded((v) => !v)}
      >
        {countText}
      </button>
    </div>
  );
}

/* ---------- chips ---------- */
function Chips() {
  const t = useT();
  const chips = useStore((s) => s.owl.chips);
  const send = useStore((s) => s.sendToOwl);
  // cold start (no question asked yet) → the starter prompts read as prominent,
  // tappable suggestions to ease opening a chat; post-reply chips stay quiet
  const started = useStore((s) => s.owl.messages.some((m) => m.kind === 'msg' && m.who === 'me'));
  const starter = !started && chips.length > 0;
  return (
    <>
      {starter && (
        <div className="chip-hint" aria-hidden="true">
          {t.discover.chipHint}
        </div>
      )}
      <div className={`chips cz${starter ? ' starter' : ''}`} id="chiprow" aria-label={starter ? t.discover.starterPromptsAria : undefined}>
        {chips.map((c, i) => (
          <button key={i} className="chip" data-say={c} onClick={() => send(c)}>
            {c.toUpperCase()}
          </button>
        ))}
      </div>
    </>
  );
}

/* ---------- composer ---------- */
function Composer({ onTyping }: { onTyping: (v: boolean) => void }) {
  const t = useT();
  const send = useStore((s) => s.sendToOwl);
  const busy = useStore((s) => s.owl.busy);
  const desk = useStore((s) => s.deskMode);
  const scoutDraft = useStore((s) => s.scoutDraft);
  const clearScoutDraft = useStore((s) => s.clearScoutDraft);
  const [val, setVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!scoutDraft) return;
    setVal(scoutDraft);
    clearScoutDraft();
    inputRef.current?.focus({ preventScroll: true });
  }, [scoutDraft, clearScoutDraft]);

  const submit = () => {
    const t = val.trim();
    if (!t || busy) return;
    send(t);
    setVal('');
    // do NOT refocus: keeping focus holds the .typing state, which hides the
    // header + shelf rail and suppresses the spine flight. Letting the composer
    // blur lets the chrome return so the flight plays (matches the mockup).
    inputRef.current?.blur();
  };
  return (
    <div className="composer">
      <div className="search cz">
        <Icon name="ti-feather" />
        <input
          ref={inputRef}
          id="qIn"
          type="text"
          placeholder={desk === 'pro' ? t.discover.composerPlaceholderPro : t.discover.composerPlaceholder}
          aria-label={t.discover.composerAria}
          autoCapitalize="none"
          autoComplete="off"
          enterKeyHint="send"
          value={val}
          onFocus={() => onTyping(true)}
          onBlur={() => onTyping(false)}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
      </div>
      <button className="iconbtn" id="sendBtn" aria-label={t.discover.sendAria} onClick={submit}>
        <Icon name="ti-send" />
      </button>
    </div>
  );
}

/* guest-only preview: walk the level ladder from Scout's desk. Docked in the
   header (never floating over the stream — the app.owlry.ai overlap bug). */
function GuestDeskLevel() {
  const t = useT();
  const authed = useAuth((s) => s.status === 'authed');
  const lv = useStore((s) => s.lv);
  const addXP = useStore((s) => s.addXP);
  const xpMax = useStore((s) => s.xpMax);
  if (authed) return null;
  return (
    <button className="desk-lvl" onClick={() => addXP(xpMax)} aria-label={t.discover.guestLevelAria(lv)}>
      <Icon name="ti-sparkles" />
      <b className="d">LV {lv}</b>
    </button>
  );
}

export function DiscoverScreen() {
  const t = useT();
  const active = useStore((s) => s.activeTab === 'discover');
  const desk = useStore((s) => s.deskMode);
  const setDeskMode = useStore((s) => s.setDeskMode);
  const lv = useStore((s) => s.lv);
  const openHistory = useStore((s) => s.openHistory);
  const chatting = useStore((s) => s.owl.messages.some((m) => m.kind === 'msg' && m.who === 'me'));
  const reduce = useReduceMotion();
  const [typing, setTyping] = useState(false);

  const cls = ['screen', 'calm', 'one-letter', 'desk-head'];
  if (active) cls.push('on');
  if (chatting) cls.push('chatting');
  if (typing) cls.push('typing');

  return (
    <section className={cls.join(' ')} id="screen-discover" data-desk={desk}>
      <StageBar />
      <div className="pad-h disc-head">
        <span className="ghost" aria-hidden="true">
          Scout
        </span>
        <h1 className="hl sm d">
          <span className="u" />
          <span className="t">
            {t.discover.title}<span className="gdot">.</span>
          </span>
        </h1>

        {/* scout's two desks: the whole desk, or office hours (non-fiction only) */}
        <div className="deskrow" role="tablist" aria-label={t.discover.deskAria}>
          <button
            className={`deskchip ${desk === 'all' ? 'on' : ''}`}
            role="tab"
            aria-selected={desk === 'all'}
            onClick={() => setDeskMode('all')}
          >
            {t.discover.deskAll}
          </button>
          <button
            className={`deskchip ${desk === 'pro' ? 'on' : ''}${lv < 3 ? ' oh-locked' : ''}`}
            role="tab"
            aria-selected={desk === 'pro'}
            aria-label={lv < 3 ? t.discover.officeHourLockedAria : t.discover.nonFictionAria}
            onClick={() => setDeskMode('pro')}
          >
            {lv < 3 ? (
              <>
                <span className="ohlock">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="5.5" y="11" width="13" height="8.5" rx="2" />
                    <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
                  </svg>
                </span>
                {t.discover.deskOfficeHour}
              </>
            ) : (
              t.discover.deskNonFiction
            )}
          </button>
        </div>

        <GuestDeskLevel />

        <div className="disc-head-right">
          <CastOwl owl="scout" cls="mini" variant={desk === 'pro' ? 'pro' : undefined} />
          {isConfigured && (
            <button className="iconbtn lite" aria-label={t.discover.historyAria} onClick={openHistory}>
              <Icon name="ti-history" />
            </button>
          )}
        </div>
      </div>

      <ShelfRail reduce={reduce} />
      <Chat reduce={reduce} />
      <Chips />
      <Composer onTyping={setTyping} />
    </section>
  );
}
