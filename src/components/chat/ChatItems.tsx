/* ============================================================
   owlry — shared chat-item rendering.

   Extracted from DiscoverScreen so the SAME rendering — the
   clickable book/em/text nodes, the letter card, the typing dots —
   is reused by both the live Discover chat and the read-only
   History transcript. Nothing here is Discover-specific; scrolling
   and the composer stay local to each screen.
   ============================================================ */
import { Fragment } from 'react';
import type { BookRef } from '../../content/types';
import type { OwlMessage } from '../../lib/owlBrain';
import type { ChatItem } from '../../store/types';
import { getBook } from '../../lib/bookRegistry';
import { Icon } from '../Icon';

/* render structured owl-message nodes as real, clickable React */
export function renderNodes(nodes: OwlMessage, openSheet: (id: BookRef) => void) {
  return nodes.map((n, i) => {
    if (n.t === 'text') return <Fragment key={i}>{n.v}</Fragment>;
    if (n.t === 'em')
      return (
        <span key={i} className="it">
          {n.v}
        </span>
      );
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

/** render one chat item (typing dots / letter card / message bubble) — the unit both Discover and History share */
export function renderChatItem(m: ChatItem, openSheet: (id: BookRef) => void, openLetter: (id: BookRef) => void) {
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
          <span className="lc-s">{getBook(m.book)?.t} — tap to open</span>
        </span>
      </button>
    );
  }
  return (
    <div key={m.id} className={`msg ${m.who}${m.tone === 'note' ? ' note' : ''}`}>
      {renderNodes(m.nodes, openSheet)}
    </div>
  );
}
