/* ============================================================
   owlry — shared chat-item rendering.

   Extracted from DiscoverScreen so the SAME rendering — the
   clickable book/em/text nodes, the letter enclosure, the typing
   dots — is reused by both the live Discover chat and the
   read-only History transcript. Nothing here is Discover-specific;
   the streaming typewriter, autoscroll, and composer stay local to
   the Discover screen.
   ============================================================ */
import { Fragment } from 'react';
import type { ReactNode } from 'react';
import type { BookRef } from '../../content/types';
import type { OwlMessage } from '../../lib/owlBrain';
import type { ChatItem } from '../../store/types';
import { getBook, hasGuide } from '../../lib/bookRegistry';
import { isConfigured } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { Icon } from '../Icon';
import { Cover } from '../Cover';

/* render structured owl-message nodes as real, clickable React */
const renderText = (value: string, excerpts: boolean) => {
  if (!excerpts || !value.includes('“')) return value;
  return value.split(/(“[^”]+”)/g).map((part, index) =>
    part.startsWith('“') && part.endsWith('”')
      ? <span className="chat-excerpt" key={index}>{part}</span>
      : <Fragment key={index}>{part}</Fragment>,
  );
};

export function renderNodes(nodes: OwlMessage, openSheet: (id: BookRef) => void, excerpts = false) {
  return nodes.map((n, i) => {
    if (n.t === 'text') return <Fragment key={i}>{renderText(n.v, excerpts)}</Fragment>;
    if (n.t === 'em')
      return (
        <span key={i} className="it">
          {n.v}
        </span>
      );
    return (
      <button
        key={i}
        className="bk"
        type="button"
        onClick={() => openSheet(n.id)}
      >
        {n.v}
      </button>
    );
  });
}

/** total character count across an owl message (drives the typewriter) */
export function messageLength(nodes: OwlMessage): number {
  return nodes.reduce((sum, n) => sum + n.v.length, 0);
}

/** the char at flat index `i` across all nodes — used to pace the typewriter */
export function charAt(nodes: OwlMessage, i: number): string {
  let k = i;
  for (const n of nodes) {
    if (k < n.v.length) return n.v[k];
    k -= n.v.length;
  }
  return '';
}

/** render the first `n` characters of an owl message, preserving node
    boundaries so `.bk` links and `.it` italics stay whole as text fills them */
export function renderStreamedNodes(nodes: OwlMessage, n: number, openSheet: (id: BookRef) => void): ReactNode[] {
  const out: ReactNode[] = [];
  let remaining = n;
  for (let i = 0; i < nodes.length && remaining > 0; i++) {
    const nd = nodes[i];
    const partial = nd.v.slice(0, Math.min(remaining, nd.v.length));
    remaining -= partial.length;
    if (nd.t === 'text') out.push(<Fragment key={i}>{partial}</Fragment>);
    else if (nd.t === 'em')
      out.push(
        <span key={i} className="it">
          {partial}
        </span>,
      );
    else
      out.push(
        <button key={i} className="bk" type="button" onClick={() => openSheet(nd.id)}>
          {partial}
        </button>,
      );
  }
  return out;
}

/** assign each letter item a stable, 1-based session number (owl post · nº N) */
export function letterNumbers(messages: ChatItem[]): Map<number, number> {
  const map = new Map<number, number>();
  let n = 0;
  for (const m of messages) if (m.kind === 'letter') map.set(m.id, ++n);
  return map;
}

/* ---------- the letter (.gletter): the one paper object per turn ---------- */
export function GLetter({ id, no, mid }: { id: BookRef; no: number; mid?: number }) {
  const b = getBook(id);
  const saved = useStore((s) => s.savedIds.includes(id));
  const toggleSave = useStore((s) => s.toggleSave);
  const openSheet = useStore((s) => s.openSheet);
  const openLetter = useStore((s) => s.openLetter);
  const openBook = useStore((s) => s.openBook);
  if (!b) return null;

  // a peek is available for catalog guides (instant) and, with a backend, for
  // any recommended book (Peek writes it on tap); offline non-guides just open.
  const peekable = hasGuide(id) || isConfigured;
  const go = () => (peekable ? openLetter(id) : void openBook(id));
  const key = (fn: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn();
    }
  };

  return (
    <div
      className={`gletter${peekable ? '' : ' plain'}`}
      role="group"
      aria-label={`Reading letter: ${b.t}`}
      data-mid={mid}
      data-book={id}
      onClick={(e) => {
        // the whole card is the primary action, except its own controls
        if ((e.target as HTMLElement).closest('[data-save],[data-sheet],[data-letter],[data-open]')) return;
        go();
      }}
    >
      <div className="gl-top">
        <span className="gl-kick">owl post · nº {no}</span>
        <button
          className={`gl-heart save${saved ? ' on' : ''}`}
          data-save={id}
          aria-label="Save to library"
          aria-pressed={saved}
          onClick={() => toggleSave(id)}
        >
          <Icon name="ti-heart" />
        </button>
      </div>
      <div className="gl-body">
        <Cover id={id} cls="cover-xs" />
        <div className="gl-info">
          <div className="gl-t d">{b.t}</div>
          <div className="gl-a">
            {b.a} · {b.n} pages
          </div>
        </div>
      </div>
      <div className="gl-act">
        <span className="gl-about" data-sheet={id} role="button" tabIndex={0} onClick={() => openSheet(id)} onKeyDown={key(() => openSheet(id))}>
          about
        </span>
        <span
          className="gl-go"
          {...(peekable ? { 'data-letter': id } : { 'data-open': id })}
          role="button"
          tabIndex={0}
          onClick={go}
          onKeyDown={key(go)}
        >
          {peekable ? 'peek inside' : 'open the book'}
          <Icon name="ti-arrow-right" />
        </span>
      </div>
    </div>
  );
}

/** render one chat item (typing dots / letter / message) — the unit both
    Discover (static parts) and History share. `no` is the letter's session
    number; the live Discover stream renders owl lines itself (with the caret). */
export function renderChatItem(
  m: ChatItem,
  openSheet: (id: BookRef) => void,
  _openLetter: (id: BookRef) => void,
  no = 1,
) {
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
    return <GLetter key={m.id} id={m.book} no={no} mid={m.id} />;
  }
  return (
    <div key={m.id} className={`msg ${m.who}${m.tone === 'note' ? ' note' : ''}`}>
      {m.who === 'owl' && m.speaker && <span className="who">{m.speaker}</span>}
      {renderNodes(m.nodes, openSheet, m.who === 'me')}
    </div>
  );
}
