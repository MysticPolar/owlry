import { useEffect, useLayoutEffect, useRef } from 'react';
import { navigate, goBack } from '../app/router';
import { useStore, selectCouncil } from '../store/useStore';
import type { Message } from '../store/types';
import { figure } from '../content/figures';
import { maybeBook } from '../content/books';
import { threadFor, scriptFor, seatScript, typingDelay } from '../engine/council';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { AppBar, Thinking } from '../components/chrome';
import { Avatar } from '../components/Avatar';
import { LineView } from '../components/Line';
import { AskBar, type Addressee } from '../components/AskBar';
import { useT, useLang, fmt } from '../i18n/react';
import './OneScreen.css';

/** a line that carries its own verbatim source already shows "From <work>"; the seat's book is named only under the others */
const hasSource = (m: Message) => (m.segments ?? []).some((s) => s.kind === 'quote' && !!s.source);

/* ============================================================
   One on one — a thread with a single seat. The reader's questions on
   the right, the thinker's replies as lines of speech; while the live
   council is still writing a reply, the three dots hold its place. The
   ask bar underneath stays addressed to this seat; choosing the council
   goes back to the summary, choosing another seat opens their thread
   (in place of this one, so back still leads to the summary).
   ============================================================ */
export function OneScreen({ id, figureId }: { id: string; figureId: string }) {
  const session = useStore(selectCouncil(id));
  const sendFollowUp = useStore((s) => s.sendFollowUp);
  const revealAll = useStore((s) => s.revealAll);
  const ensureSeats = useStore((s) => s.ensureSeats);
  const ensureBook = useStore((s) => s.ensureBook);
  const reduceMotion = useReduceMotion();
  const kb = useKeyboardInset();
  const t = useT();
  const lang = useLang();
  // a recalled seat's card (and the book it argues from) lands in `minds` after the session: subscribe so the head fills in
  useStore((s) => s.minds);
  const contentRef = useRef<HTMLDivElement>(null);

  const seat = session ? session.seats.indexOf(figureId) : -1;
  const f = session && seat >= 0 ? figure(figureId) : null;
  const thread = session && seat >= 0 ? threadFor(session, figureId) : [];
  const bk = session && f ? maybeBook(seatScript(scriptFor(session), seat, f.id).bookId) : undefined;
  const revealed = session?.revealed ?? 0;
  const pending = session?.pending ?? [];
  // the newest reply: the store leaves it un-revealed until this screen has shown it
  const lastReply = thread.length && thread[thread.length - 1].kind === 'figure' ? thread[thread.length - 1] : null;
  const lastIdx = session && lastReply ? session.messages.indexOf(lastReply) : -1;
  const waiting = !!lastReply && pending.includes(lastReply.id);
  const unrevealed = lastIdx >= 0 && lastIdx >= revealed;

  // a cast seat's card (and its book's) is asked for here too — a finished council opens on the summary, not the acts —
  // and again in a new language; both return at once when the card is already here
  useEffect(() => {
    if (session?.cast) ensureSeats(session.id);
  }, [session?.id, session?.cast, lang, ensureSeats]);
  const recalledBook = bk?.recalled ? bk.id : '';
  useEffect(() => {
    if (recalledBook) void ensureBook(recalledBook);
  }, [recalledBook, lang, ensureBook]);

  // the dots hold the newest reply's place for at least its typing beat (the mockup's pause), however quickly the
  // words arrive; a reply the live council kept us waiting for lands the moment it comes. The reveal then brings the
  // session's revealed/stage up to date with what is on screen
  const heldSince = useRef<{ id: string; at: number } | null>(null);
  useEffect(() => {
    if (!session || !lastReply || !(waiting || unrevealed)) return;
    if (heldSince.current?.id !== lastReply.id) heldSince.current = { id: lastReply.id, at: Date.now() };
    if (waiting) return;
    const held = Date.now() - heldSince.current.at;
    const ms = reduceMotion ? 0 : Math.max(80, typingDelay(lastReply) - held);
    const timer = setTimeout(() => revealAll(session.id), ms);
    return () => clearTimeout(timer);
  }, [session?.id, lastReply?.id, waiting, unrevealed, reduceMotion, revealAll]); // eslint-disable-line react-hooks/exhaustive-deps

  // follow the thread: the newest line (or the dots holding its place) is always in view
  const sig = `${thread.length}:${waiting}:${unrevealed}:${kb}`;
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [sig]);

  if (!session || !f) {
    return (
      <div className="screen one">
        <AppBar back={session ? { name: 'summary', id: session.id } : { name: 'council' }} label={t.one.title} />
        <div className="content">
          <p className="sub">{t.one.missing}</p>
        </div>
      </div>
    );
  }

  const toSummary = () => goBack({ name: 'summary', id: session.id });
  const placeholder = fmt(t.summary.phMind, { name: f.short });
  // the council → back to the summary; another seat → their thread, in place of this one. Neither keeps the field focused
  const onSelect = (k: Addressee) => {
    if (k === 'C') {
      toSummary();
      return false;
    }
    if (k !== figureId && session.seats.includes(k)) {
      navigate({ name: 'one', id: session.id, figure: k }, { replace: true });
      return false;
    }
    return true;
  };
  const [fromPre, fromPost = ''] = t.one.from.split('{title}');

  return (
    <div className="screen one">
      <AppBar back={{ name: 'summary', id: session.id }} label={t.one.title} />
      <div className="content" ref={contentRef}>
        <div className="onehead rv">
          <Avatar figure={f} size={56} seat={seat} className="lg" />
          <div>
            <div className="nm">{f.name}</div>
            {bk && <div className="meta">{bk.title}</div>}
          </div>
        </div>
        {thread.length === 0 && <p className="sub empty rv">{fmt(t.one.empty, { name: f.short })}</p>}
        {thread.map((m, n) => {
          if (m.kind === 'user') {
            return (
              <div key={m.id} className="msg-me rv">
                {m.text}
              </div>
            );
          }
          const idx = session.messages.indexOf(m);
          if (pending.includes(m.id) || idx >= revealed) {
            return <Thinking key={`${m.id}-writing`}>{fmt(t.debate.writing, { name: f.short })}</Thinking>;
          }
          return (
            <LineView key={m.id} m={m} seats={session.seats} className="rv">
              {bk && !hasSource(m) && (
                <button type="button" className="src book-src" onClick={() => navigate({ name: 'book', id: bk.id, council: session.id })}>
                  {fromPre}
                  <b>{bk.title}</b>
                  {fromPost}
                </button>
              )}
              {n === thread.length - 1 && (
                <div className="sug">
                  <button type="button" onClick={toSummary}>
                    {t.one.bring}
                  </button>
                </div>
              )}
            </LineView>
          );
        })}
        <div className="tail" aria-hidden="true" />
      </div>
      <div className="footer">
        <AskBar session={session} selected={figureId} onSelect={onSelect} placeholder={placeholder} onSend={(text) => sendFollowUp(session.id, text, figureId)} autoFocus={thread.length === 0} />
      </div>
    </div>
  );
}
