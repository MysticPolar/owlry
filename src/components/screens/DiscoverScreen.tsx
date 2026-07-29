import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../store/useAuth';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import { useReduceMotion } from '../../hooks/useReduceMotion';
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
import { Wordmark } from '../Wordmark';


/* spine geometry — thickness reads the page count, height jitters by id so
   the tops sit unevenly (it reads as a shelf, not a bar chart) */
const spineThickness = (id: BookRef): number => {
  const b = getBook(id);
  // floor raised 9→14 so a thin-book spine is still a fingertip-sized tap target
  return Math.max(14, Math.min(20, Math.round(9 + (b?.n || 250) / 78)));
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
function Chat({ reduce, introLabel }: { reduce: boolean; introLabel?: string }) {
  const t = useT();
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
      {introLabel && (
        <div className="ask-intro-kicker" aria-hidden="true">
          {introLabel}
        </div>
      )}
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
          renderChatItem(m, openSheet, openLetter, nos.get(m.id), true)
        ),
      )}
      {activeStreamId != null && !reduce && (
        <button type="button" className="pb-skip" onClick={() => { skipRef.current = true; bump(); }}>
          {t.discover.skip}
        </button>
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
      const cards = document.querySelectorAll(
        `.gletter[data-book="${id}"], .pb-dealcard[data-book="${id}"], .pb-short-card[data-book="${id}"]`,
      );
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
        aria-label={`${t.discover.shelfAria}: ${t.discover.shelfCount(collected.length)}`}
        onClick={() => setExpanded((v) => !v)}
      >
        {countText}
      </button>
      {/* announce each landing / the running count to assistive tech */}
      <span className="sr-only" role="status" aria-live="polite">
        {announce ?? ''}
      </span>
    </div>
  );
}

/* ---------- chips ---------- */
function Chips() {
  const t = useT();
  const chips = useStore((s) => s.owl.chips);
  const send = useStore((s) => s.sendToOwl);
  const rowRef = useRef<HTMLDivElement>(null);
  const overflowRef = useRef(false);
  const [rail, setRail] = useState({ overflow: false, back: false, forward: false });
  // cold start (no question asked yet) → the starter prompts read as prominent,
  // tappable suggestions to ease opening a chat; post-reply chips stay quiet
  const started = useStore((s) => s.owl.messages.some((m) => m.kind === 'msg' && m.who === 'me'));
  const starter = !started && chips.length > 0;

  useEffect(() => {
    const row = rowRef.current;
    if (!row || starter) {
      overflowRef.current = false;
      setRail({ overflow: false, back: false, forward: false });
      return;
    }

    overflowRef.current = false;
    row.scrollLeft = 0;
    const measure = () => {
      // The overflowed state adds trailing breathing room so the final prompt
      // clears the edge cue. Exclude that decorative space from the decision,
      // otherwise the carousel can remain latched after the prompts begin fitting.
      const trailingSpace = Number.parseFloat(getComputedStyle(row).paddingInlineEnd) || 0;
      const max = Math.max(0, row.scrollWidth - row.clientWidth - trailingSpace);
      const overflow = max > 2;
      // When a resize turns a previously fitting row into a carousel, begin at
      // the first prompt instead of inheriting the browser's right-edge anchor.
      if (overflow && !overflowRef.current) row.scrollLeft = 0;
      if (!overflow && row.scrollLeft) row.scrollLeft = 0;
      const next = {
        overflow,
        back: row.scrollLeft > 2,
        forward: max - row.scrollLeft > 2,
      };
      overflowRef.current = overflow;
      setRail((current) => (
        current.overflow === next.overflow
        && current.back === next.back
        && current.forward === next.forward
          ? current
          : next
      ));
    };

    measure();
    row.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(row);
    Array.from(row.children).forEach((child) => observer?.observe(child));
    let active = true;
    void document.fonts?.ready.then(() => {
      if (active) measure();
    });

    return () => {
      active = false;
      row.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [chips, starter]);

  if (!chips.length) return null;

  const row = (
    <div
      ref={rowRef}
      className={`chips cz ${starter ? 'starter' : 'followup'}`}
      id="chiprow"
      role="group"
      aria-label={starter ? t.discover.starterPromptsAria : t.discover.followupPromptsAria}
      aria-roledescription={!starter && rail.overflow ? t.discover.followupCarouselRole : undefined}
      aria-describedby={!starter && rail.overflow ? 'followupSwipeHint' : undefined}
    >
      {chips.map((c, i) => (
        <button key={i} className="chip" data-say={c} onClick={() => send(c)}>
          <span>{c}</span>
          {starter && <Icon name="ti-arrow-right" />}
        </button>
      ))}
    </div>
  );

  if (!starter) {
    return (
      <div
        className={`followup-carousel${rail.overflow ? ' overflowing' : ''}${rail.back ? ' can-back' : ''}${rail.forward ? ' can-forward' : ''}`}
      >
        {row}
        {rail.back && (
          <span className="followup-edge back" aria-hidden="true">
            <Icon name="ti-arrow-left" />
          </span>
        )}
        {rail.forward && (
          <span className="followup-edge forward" aria-hidden="true">
            <Icon name="ti-arrow-right" />
          </span>
        )}
        {rail.overflow && (
          <span className="sr-only" id="followupSwipeHint">
            {t.discover.followupCarouselHint}
          </span>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="chip-hint" aria-hidden="true">
        {t.discover.chipHint}
      </div>
      {row}
    </>
  );
}

/* ---------- composer ---------- */
function Composer({
  onTyping,
  onDraftChange,
}: {
  onTyping: (v: boolean) => void;
  onDraftChange: (v: boolean) => void;
}) {
  const t = useT();
  const send = useStore((s) => s.sendToOwl);
  const busy = useStore((s) => s.owl.busy);
  const desk = useStore((s) => s.deskMode);
  const setDeskMode = useStore((s) => s.setDeskMode);
  const lv = useStore((s) => s.lv);
  const scoutDraft = useStore((s) => s.scoutDraft);
  const clearScoutDraft = useStore((s) => s.clearScoutDraft);
  const [val, setVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!scoutDraft) return;
    setVal(scoutDraft);
    onDraftChange(!!scoutDraft.trim());
    clearScoutDraft();
    inputRef.current?.focus({ preventScroll: true });
  }, [scoutDraft, clearScoutDraft, onDraftChange]);

  const submit = () => {
    const t = val.trim();
    if (!t || busy) return;
    send(t);
    setVal('');
    onDraftChange(false);
    // do NOT refocus: keeping focus holds the .typing state, which hides the
    // header + shelf rail and suppresses the spine flight. Letting the composer
    // blur lets the chrome return so the flight plays (matches the mockup).
    inputRef.current?.blur();
  };

  // the desk switch lives in the composer (Claude-style pill): tap flips between
  // the whole desk and office hours. setDeskMode owns the rules (busy guard,
  // the level-3 lock intro, the canned ack line).
  const pro = desk === 'pro';
  const ohLocked = !pro && lv < 3;
  const deskLabel = pro ? t.discover.deskNonFictionShort : t.discover.deskAllShort;
  return (
    <div className="composer pb-composer">
      <button
        type="button"
        className={`pb-deskpill${pro ? ' pro' : ''}`}
        role="switch"
        aria-checked={pro}
        aria-label={`${deskLabel}: ${ohLocked ? t.discover.officeHourLockedAria : t.discover.deskAria}`}
        onClick={() => setDeskMode(pro ? 'all' : 'pro')}
      >
        <Icon name={ohLocked ? 'ti-lock' : 'ti-feather'} />
        <span className="pb-deskpill-label">{deskLabel}</span>
      </button>
      <input
        ref={inputRef}
        id="qIn"
        type="text"
        placeholder={pro ? t.discover.composerPlaceholderPro : t.discover.composerPlaceholder}
        aria-label={t.discover.composerAria}
        autoCapitalize="none"
        autoComplete="off"
        enterKeyHint="send"
        value={val}
        onFocus={() => onTyping(true)}
        onBlur={() => onTyping(false)}
        onChange={(e) => {
          setVal(e.target.value);
          onDraftChange(!!e.target.value.trim());
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
      />
      <button
        className="pb-send"
        id="sendBtn"
        aria-label={t.discover.sendAria}
        disabled={!val.trim() || busy}
        onClick={submit}
      >
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
  // the seat moves, no coins, no refill — see chrome.tsx's GuestLevelButton
  const debugLevelUp = useStore((s) => s.debugLevelUp);
  if (authed) return null;
  return (
    <button className="desk-lvl" onClick={debugLevelUp} aria-label={t.discover.guestLevelAria(lv)}>
      <Icon name="ti-sparkles" />
      <b className="d">LV {lv}</b>
    </button>
  );
}

/* a big centered owl flashes on a successful desk switch — scout for the whole
   desk, scout pro for office hours — so the mode change is felt, not just read */
function DeskSwitchHint() {
  const t = useT();
  const nonce = useStore((s) => s.deskSwitchNonce);
  const pro = useStore((s) => s.deskMode === 'pro');
  const reduce = useReduceMotion();
  const [visible, setVisible] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduce) return; // the flash is decorative — skip it entirely under reduced motion
    setVisible(true);
    const id = setTimeout(() => setVisible(false), 1150);
    return () => clearTimeout(id);
  }, [nonce, reduce]);
  if (!visible) return null;
  return (
    <div className="pb-deskhint" key={nonce} aria-hidden="true">
      <svg className="owl" viewBox="0 0 120 130">
        <use href={`#owl-scout${pro ? '-pro' : ''}`} />
      </svg>
      <span className="pb-deskhint-lbl">{pro ? t.discover.deskNonFiction : t.discover.deskAll}</span>
    </div>
  );
}

export function DiscoverScreen() {
  const t = useT();
  const active = useStore((s) => s.activeTab === 'discover');
  const desk = useStore((s) => s.deskMode);
  const openHistory = useStore((s) => s.openHistory);
  const messages = useStore((s) => s.owl.messages);
  const chatting = messages.some((m) => m.kind === 'msg' && m.who === 'me');
  const reduce = useReduceMotion();
  const [typing, setTyping] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const pristine =
    messages.length === 0
    || (
      messages.length === 1
      && messages[0].kind === 'msg'
      && messages[0].who === 'owl'
    );
  const beforeAsk = !chatting;
  const opening = beforeAsk && !typing && !hasDraft;
  const coldStart = pristine && opening;

  const cls = ['screen', 'calm', 'one-letter', 'desk-head'];
  if (active) cls.push('on');
  if (chatting) cls.push('chatting');
  if (typing) cls.push('typing');
  if (beforeAsk) cls.push('before-ask');
  if (hasDraft) cls.push('drafting');
  if (opening) cls.push('opening');
  if (coldStart) cls.push('cold-start');

  return (
    <section className={cls.join(' ')} id="screen-discover" data-desk={desk}>
      <StageBar />
      <div className="pad-h disc-head">
        <h1 className="sr-only">{t.discover.title}</h1>

        {/* the desk switch now rides in the composer pill; the header stays lean */}
        <GuestDeskLevel />

        <span className="disc-wordmark" aria-hidden="true">
          <Wordmark decorative />
        </span>

        <div className="disc-head-right">
          <CastOwl owl="scout" cls="mini" variant={desk === 'pro' ? 'pro' : undefined} />
          {/* the reader's way back into past chats — always reachable from the
              desk (with a backend it lists past days; offline it opens empty) */}
          <button className="iconbtn lite" aria-label={t.discover.historyAria} onClick={openHistory}>
            <Icon name="ti-history" />
          </button>
        </div>
      </div>

      <div className="pb-ask-body">
        <ShelfRail reduce={reduce} />
        <Chat reduce={reduce} introLabel={coldStart ? t.discover.introKicker : undefined} />
        <Chips />
        <Composer onTyping={setTyping} onDraftChange={setHasDraft} />
      </div>
      <DeskSwitchHint />
    </section>
  );
}
