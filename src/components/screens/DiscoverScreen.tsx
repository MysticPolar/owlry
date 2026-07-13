import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import { isConfigured } from '../../lib/supabase';
import { getBook, hasGuide } from '../../lib/bookRegistry';
import { renderChatItem } from '../chat/ChatItems';
import type { BookRef } from '../../content/types';
import { Icon } from '../Icon';
import { Cover } from '../Cover';
import { CastOwl } from '../CastOwl';

/* ---------- selected-book card, shown inline in the tray ---------- */
function TrayCard({ id, onClose }: { id: BookRef; onClose: () => void }) {
  const b = getBook(id);
  const saved = useStore((s) => s.savedIds.includes(id));
  const toggleSave = useStore((s) => s.toggleSave);
  const openSheet = useStore((s) => s.openSheet);
  const openLetter = useStore((s) => s.openLetter);
  const openBook = useStore((s) => s.openBook);
  if (!b) return <div className="tray-card tray-empty">scout's picks will perch here</div>;

  // a peek is available for catalog guides (instant) and, with a backend, for any
  // recommended book (Peek writes it on tap); offline non-guides just open to read.
  const canPeek = hasGuide(id) || isConfigured;
  return (
    <article className="tray-card" aria-label={`Scout recommends ${b.t}`}>
      <button
        className={`save ${saved ? 'on' : ''}`}
        aria-label="Save to library"
        aria-pressed={saved}
        onClick={() => toggleSave(id)}
      >
        <Icon name="ti-heart" />
      </button>
      <Cover id={id} cls="cover-xs" />
      <div className="tray-info">
        <div className="tray-ttl d">{b.t}</div>
        <div className="tray-auth">
          {b.a} · {b.n} pages
        </div>
        <div className="tray-intro">{b.i ?? b.q}</div>
        <div className="tray-btns">
          <button
            className="btn xs ghost"
            onClick={() => {
              onClose();
              openSheet(id);
            }}
          >
            ABOUT
          </button>
          {canPeek ? (
            <button
              className="btn xs"
              onClick={() => {
                onClose();
                openLetter(id);
              }}
            >
              PEEK <Icon name="ti-mail" />
            </button>
          ) : (
            <button
              className="btn xs"
              onClick={() => {
                onClose();
                openBook(id);
              }}
            >
              OPEN <Icon name="ti-arrow-right" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/* ---------- shelf: every rec collected this session ---------- */
function Shelf({ onPick, activeId }: { onPick: (id: BookRef) => void; activeId: BookRef | null }) {
  const collected = useStore((s) => s.owl.collected);
  if (!collected.length) return null;
  return (
    <div className="strip" id="stripRow">
      <span className="strip-label">SHELF · {collected.length}</span>
      <div className="strip-row">
        {collected.map((id) => {
          const b = getBook(id);
          if (!b) return null;
          return (
            <button
              key={id}
              className={`spinelet ${activeId === id ? 'sel' : ''}`}
              style={{ background: b.c }}
              aria-label={b.t}
              aria-pressed={activeId === id}
              title={b.t}
              onClick={() => onPick(id)}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ---------- chat ---------- */
function Chat() {
  const messages = useStore((s) => s.owl.messages);
  const active = useStore((s) => s.activeTab === 'discover');
  const openSheet = useStore((s) => s.openSheet);
  const openLetter = useStore((s) => s.openLetter);
  const kb = useKeyboardInset();
  const ref = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);

  // glide to new messages; jump instantly on tab entry / keyboard open
  useEffect(() => {
    if (!active) return;
    const c = ref.current;
    if (!c) return;
    const grew = messages.length > prevCount.current;
    prevCount.current = messages.length;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    c.scrollTo({ top: c.scrollHeight, behavior: grew && !reduce ? 'smooth' : 'auto' });
  }, [messages, active, kb]);

  return (
    <div className="chat" id="chat" role="log" aria-live="polite" ref={ref}>
      {messages.map((m) => renderChatItem(m, openSheet, openLetter))}
    </div>
  );
}

/* ---------- chips + composer ---------- */
function Chips() {
  const chips = useStore((s) => s.owl.chips);
  const send = useStore((s) => s.sendToOwl);
  return (
    <div className="chips cz" id="chiprow">
      {chips.map((c, i) => (
        <button key={i} className="chip" onClick={() => send(c)}>
          {c.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function Composer() {
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
    inputRef.current?.focus({ preventScroll: true });
  };
  return (
    <div className="composer">
      <div className="search cz">
        <Icon name="ti-feather" />
        <input
          ref={inputRef}
          id="qIn"
          type="text"
          placeholder={desk === 'pro' ? 'tell scout what you’re solving…' : 'tell scout what’s going on…'}
          aria-label="Message scout"
          autoCapitalize="none"
          autoComplete="off"
          enterKeyHint="send"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
      </div>
      <button className="iconbtn" id="sendBtn" aria-label="Send" onClick={submit}>
        <Icon name="ti-send" />
      </button>
    </div>
  );
}

export function DiscoverScreen() {
  const active = useStore((s) => s.activeTab === 'discover');
  const desk = useStore((s) => s.deskMode);
  const setDeskMode = useStore((s) => s.setDeskMode);
  const openHistory = useStore((s) => s.openHistory);
  const lastBatch = useStore((s) => s.owl.lastBatch);
  const [popoverId, setPopoverId] = useState<BookRef | null>(null);

  // close the popover when leaving discover
  useEffect(() => {
    if (!active) setPopoverId(null);
  }, [active]);

  useEffect(() => {
    if (active && lastBatch?.main) setPopoverId(lastBatch.main);
  }, [active, lastBatch]);

  return (
    <section className={`screen ${active ? 'on' : ''}`} id="screen-discover" data-desk={desk}>
      <div className="pad-h disc-head" style={{ paddingBottom: 2 }}>
        <span className="ghost" aria-hidden="true">
          Scout
        </span>
        <h1 className="hl sm d">
          <span className="u" />
          <span className="t">
            discover<span className="gdot">.</span>
          </span>
        </h1>
        <div className="disc-head-right">
          <CastOwl owl="scout" cls="mini" variant={desk === 'pro' ? 'pro' : undefined} />
          {isConfigured && (
            <button className="iconbtn lite" aria-label="Chat history" onClick={openHistory}>
              <Icon name="ti-history" />
            </button>
          )}
        </div>
      </div>

      {/* scout's two desks: the whole desk, or office hours (non-fiction only) */}
      <div className="deskrow" role="tablist" aria-label="Scout's desk">
        <button
          className={`deskchip ${desk === 'all' ? 'on' : ''}`}
          role="tab"
          aria-selected={desk === 'all'}
          onClick={() => setDeskMode('all')}
        >
          EVERYTHING
        </button>
        <button
          className={`deskchip ${desk === 'pro' ? 'on' : ''}`}
          role="tab"
          aria-selected={desk === 'pro'}
          onClick={() => setDeskMode('pro')}
        >
          NON-FICTION
        </button>
      </div>

      {popoverId && (
        <div className="tray tray-arrived" id="tray">
          <TrayCard id={popoverId} onClose={() => setPopoverId(null)} />
        </div>
      )}
      <Shelf onPick={(id) => setPopoverId((p) => (p === id ? null : id))} activeId={popoverId} />

      <Chat />
      <Chips />
      <Composer />
    </section>
  );
}
