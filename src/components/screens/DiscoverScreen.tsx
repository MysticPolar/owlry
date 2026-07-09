import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import { isConfigured } from '../../lib/supabase';
import { getBook, hasGuide } from '../../lib/bookRegistry';
import { renderChatItem } from '../chat/ChatItems';
import { Icon } from '../Icon';
import { Cover } from '../Cover';

/* ---------- tray: the latest pick ---------- */
function Tray() {
  const lastBatch = useStore((s) => s.owl.lastBatch);
  const saved = useStore((s) => (lastBatch ? s.savedIds.includes(lastBatch.main) : false));
  const toggleSave = useStore((s) => s.toggleSave);
  const openSheet = useStore((s) => s.openSheet);
  const openLetter = useStore((s) => s.openLetter);
  const openReader = useStore((s) => s.openReader);

  if (!lastBatch) {
    return (
      <div className="tray" id="tray">
        <div className="tray-card tray-empty">the owl's picks will perch here</div>
      </div>
    );
  }

  const id = lastBatch.main;
  const b = getBook(id);
  if (!b) {
    return (
      <div className="tray" id="tray">
        <div className="tray-card tray-empty">the owl's picks will perch here</div>
      </div>
    );
  }
  return (
    <div className="tray" id="tray">
      <div className="tray-card">
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
            <button className="btn xs ghost" onClick={() => openSheet(id)}>
              ABOUT
            </button>
            {hasGuide(id) ? (
              <button className="btn xs" onClick={() => openLetter(id)}>
                PREVIEW <Icon name="ti-mail" />
              </button>
            ) : (
              <button className="btn xs" onClick={() => openReader(id)}>
                OPEN <Icon name="ti-arrow-right" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- strip: every rec collected this session ---------- */
function Strip() {
  const collected = useStore((s) => s.owl.collected);
  const openSheet = useStore((s) => s.openSheet);
  if (!collected.length) return <div className="strip" id="stripRow" />;
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
              className="spinelet"
              style={{ background: b.c }}
              aria-label={b.t}
              title={b.t}
              onClick={() => openSheet(id)}
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
  const [val, setVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const submit = () => {
    const t = val.trim();
    if (!t || busy) return;
    send(t);
    setVal('');
    // keep the conversation going: don't let the send tap dismiss the keyboard
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
          placeholder="tell the owl what’s going on…"
          aria-label="Message the owl"
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
  const openHistory = useStore((s) => s.openHistory);
  return (
    <section className={`screen ${active ? 'on' : ''}`} id="screen-discover">
      <div className="pad-h disc-head" style={{ paddingBottom: 2 }}>
        <div className="hl sm d">
          <span className="u" />
          <span className="t">
            discover<span className="gdot">.</span>
          </span>
        </div>
        {isConfigured && (
          <button className="iconbtn lite" aria-label="Chat history" onClick={openHistory}>
            <Icon name="ti-history" />
          </button>
        )}
      </div>
      <Tray />
      <Strip />
      <Chat />
      <Chips />
      <Composer />
    </section>
  );
}
