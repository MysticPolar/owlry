import { Fragment, useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import { BOOKS } from '../../content/books';
import type { BookId } from '../../content/types';
import type { OwlMessage } from '../../lib/owlBrain';
import { isGuide } from '../../lib/format';
import { Icon } from '../Icon';
import { Cover } from '../Cover';

/* render structured owl-message nodes as real, clickable React */
function renderNodes(nodes: OwlMessage, openSheet: (id: BookId) => void) {
  return nodes.map((n, i) => {
    if (n.t === 'text') return <Fragment key={i}>{n.v}</Fragment>;
    if (n.t === 'em')
      return (
        <span key={i} className="it">
          {n.v}
        </span>
      );
    if (n.t === 'rec') {
      // open-world book the live owl named — styled like a book, but not a
      // catalog entry, so it's a plain mention (the note rides on the tooltip)
      const tip = [n.author, n.note].filter(Boolean).join(' — ');
      return (
        <span key={i} className="bk flat" title={tip || undefined}>
          {n.title}
        </span>
      );
    }
    return (
      <span
        key={i}
        className="bk"
        role="button"
        tabIndex={0}
        onClick={() => openSheet(n.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openSheet(n.id);
          }
        }}
      >
        {n.v}
      </span>
    );
  });
}

/* ---------- shelf: every rec collected this session ---------- */
function Shelf({ onPick, activeId }: { onPick: (id: BookId) => void; activeId: BookId | null }) {
  const collected = useStore((s) => s.owl.collected);
  if (!collected.length) return null;
  return (
    <div className="strip" id="stripRow">
      <span className="strip-label">SHELF · {collected.length}</span>
      <div className="strip-row">
        {collected.map((id) => (
          <button
            key={id}
            className={`spinelet ${activeId === id ? 'sel' : ''}`}
            style={{ background: BOOKS[id].c }}
            aria-label={BOOKS[id].t}
            aria-pressed={activeId === id}
            title={BOOKS[id].t}
            onClick={() => onPick(id)}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- selected-book card, shown inline in the tray ---------- */
function TrayCard({ id, onClose }: { id: BookId; onClose: () => void }) {
  const b = BOOKS[id];
  const saved = useStore((s) => s.savedIds.includes(id));
  const toggleSave = useStore((s) => s.toggleSave);
  const openSheet = useStore((s) => s.openSheet);
  const openLetter = useStore((s) => s.openLetter);
  const openReader = useStore((s) => s.openReader);
  return (
    <div className="tray-card" role="dialog" aria-label={b.t}>
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
            {isGuide(id) ? (
              <button
                className="btn xs"
                onClick={() => {
                  onClose();
                  openLetter(id);
                }}
              >
                PREVIEW <Icon name="ti-mail" />
              </button>
            ) : (
              <button
                className="btn xs"
                onClick={() => {
                  onClose();
                  openReader(id);
                }}
              >
                OPEN <Icon name="ti-arrow-right" />
              </button>
            )}
          </div>
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
      {messages.map((m) => {
        if (m.kind === 'typing') {
          return (
            <div key={m.id} className="msg owl">
              <span className="tdots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span className="sr-only">the owl is typing…</span>
            </div>
          );
        }
        if (m.kind === 'letter') {
          return (
            <button key={m.id} className="lettercard" onClick={() => openLetter(m.book)}>
              <span className="stamp">
                <Icon name="ti-feather" />
              </span>
              <span>
                <span className="lc-t d">a reading letter has arrived</span>
                <br />
                <span className="lc-s">{BOOKS[m.book].t} — tap to open</span>
              </span>
            </button>
          );
        }
        return (
          <div key={m.id} className={`msg ${m.who}`}>
            {renderNodes(m.nodes, openSheet)}
          </div>
        );
      })}
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
  const [val, setVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
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
          placeholder="tell scout what’s going on…"
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
  const [popoverId, setPopoverId] = useState<BookId | null>(null);

  // close the popover when leaving discover
  useEffect(() => {
    if (!active) setPopoverId(null);
  }, [active]);

  return (
    <section className={`screen ${active ? 'on' : ''}`} id="screen-discover">
      <div className="pad-h" style={{ paddingBottom: 2 }}>
        <span className="ghost" aria-hidden="true">Scout</span>
        <h1 className="hl sm d">
          <span className="u" />
          <span className="t">
            discover<span className="gdot">.</span>
          </span>
        </h1>
        <svg className="owl mini" viewBox="0 0 120 130" aria-hidden="true">
          <use href="#owl-scout" />
        </svg>
      </div>

      <div className="tray" id="tray">
        {popoverId ? (
          <TrayCard id={popoverId} onClose={() => setPopoverId(null)} />
        ) : (
          <div className="tray-card tray-empty">scout's picks will perch here</div>
        )}
      </div>
      <Shelf onPick={(id) => setPopoverId((p) => (p === id ? null : id))} activeId={popoverId} />

      <Chat />
      <Chips />
      <Composer />
    </section>
  );
}
