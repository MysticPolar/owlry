import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { IconArrowUp, IconPlus, IconX } from '@tabler/icons-react';
import { navigate } from '../app/router';
import { useStore, selectCouncil } from '../store/useStore';
import { figure } from '../content/figures';
import { typingDelay, readingFor } from '../engine/council';
import { book } from '../content/books';
import { useKeyboardInset } from '../hooks/useKeyboardInset';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { useAutoGrow } from '../hooks/useAutoGrow';
import { TopBar } from '../components/chrome';
import { Avatar } from '../components/Avatar';
import { FigureMessage, UserMessage, SystemMessage, Typing } from '../components/Chat';
import { TakeawaysCard, ReadingCard } from '../components/CouncilCards';
import { FigureSheet } from '../components/FigureSheet';
import { Owl } from '../components/Owl';
import { useT, fmt } from '../i18n/react';
import './DiscussionScreen.css';

/* ============================================================
   Screen 1 — The Discussion. "Real perspectives. Not just answers."
   A group chat of three thinkers. Messages arrive one by one with a short
   typing pause (tap to skip); the two cards land after round two.
   ============================================================ */
export function DiscussionScreen({ id }: { id: string }) {
  const session = useStore(selectCouncil(id));
  const reveal = useStore((s) => s.reveal);
  const revealAll = useStore((s) => s.revealAll);
  const join = useStore((s) => s.joinDiscussion);
  const sendFollowUp = useStore((s) => s.sendFollowUp);
  const addContext = useStore((s) => s.addContext);
  const replaceSeat = useStore((s) => s.replaceSeat);
  const undoReplace = useStore((s) => s.undoReplace);
  const showToast = useStore((s) => s.showToast);
  const reduceMotion = useReduceMotion();
  const kb = useKeyboardInset();
  const t = useT();

  const [text, setText] = useState('');
  const [target, setTarget] = useState<string | null>(null);
  const [contextMode, setContextMode] = useState(false);
  const [sheetFigure, setSheetFigure] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useAutoGrow(inputRef, text);

  // a convening council is seated as this screen opens (the council screen leaves that to us)
  useEffect(() => {
    if (session?.stage === 'convening') join(session.id);
  }, [session?.id, session?.stage, join]);

  // playback: reveal the next message after a short "typing" pause
  const revealed = session?.revealed ?? 0;
  const total = session?.messages.length ?? 0;
  useEffect(() => {
    if (!session || revealed >= total) return;
    const next = session.messages[revealed];
    // the live council is still writing this line — the typing indicator stays up until it lands
    if (session.pending?.includes(next.id)) return;
    const delay = reduceMotion ? 120 : typingDelay(next);
    const t = setTimeout(() => reveal(session.id), delay);
    return () => clearTimeout(t);
  }, [session?.id, revealed, total, reveal, reduceMotion, session?.pending]); // eslint-disable-line react-hooks/exhaustive-deps

  // keep the newest line in view
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [revealed, kb, reduceMotion]);

  if (!session) {
    return (
      <div className="screen">
        <TopBar backFallback={{ name: 'council' }} title={t.discussion.title} className="top-inset" />
        <div className="pad" style={{ paddingTop: 24 }}>
          <p className="muted">{t.discussion.missing}</p>
        </div>
      </div>
    );
  }

  const seats = session.seats.map((fid) => figure(fid));
  const visible = session.messages.slice(0, revealed);
  const nextMsg = revealed < total ? session.messages[revealed] : null;
  // the chat's two calls to action, once the cards are in and nothing is still typing
  const settled = revealed >= total && session.messages.some((m) => m.kind === 'reading');
  const best = settled ? (readingFor(session).find((r) => r.bestStart) ?? readingFor(session)[0]) : undefined;

  const submit = () => {
    const v = text.trim();
    if (!v) return;
    if (contextMode) addContext(session.id, v);
    else sendFollowUp(session.id, v, target ?? undefined);
    setText('');
    setContextMode(false);
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };
  const doReplace = (seat: number) => {
    const from = figure(session.seats[seat]);
    replaceSeat(session.id, seat);
    setSheetFigure(null);
    setTarget(null);
    showToast(fmt(t.discussion.replaced, { name: from.name }), { label: t.common.undo, onClick: () => undoReplace(session.id) });
  };

  const placeholder = contextMode ? t.discussion.phContext : target ? fmt(t.discussion.phAsk, { name: figure(target).short }) : t.discussion.phShare;

  return (
    <div className="screen discussion" style={kb ? { paddingBottom: kb } : undefined}>
      <TopBar
        backFallback={{ name: 'council' }}
        title={
          <span className="disc-title">
            <span className="disc-title-kicker">{t.discussion.kicker}</span>
            <span className="disc-title-topic">{session.title.replace(/^(a|the) /i, '')}</span>
          </span>
        }
        className="top-inset"
        right={
          <button
            type="button"
            className="btn btn-xs btn-dark"
            onClick={() => {
              revealAll(session.id);
              navigate({ name: 'summary', id: session.id });
            }}
          >
            {t.discussion.summary}
          </button>
        }
      />
      <div className="seats-strip" role="list" aria-label={t.discussion.councilAria}>
        {seats.map((f, i) => (
          <button key={f.id} type="button" className="seat-chip" role="listitem" onClick={() => setSheetFigure(f.id)}>
            <Avatar figure={f} size={56} ring={target === f.id} />
            <span className="seat-chip-name">{f.name}</span>
            <span className="seat-chip-label">{f.label}</span>
            {session.replaced.some((r) => r.seat === i && r.to === f.id) && <span className="seat-chip-new">{t.discussion.newTag}</span>}
          </button>
        ))}
      </div>
      <p className="ai-note">
        {t.discussion.aiNote1}
        <span className="ai-note-q">“ ”</span>
        {t.discussion.aiNote2}
      </p>

      <div className="screen-scroll chat" ref={scrollRef}>
        {visible.map((m) => {
          switch (m.kind) {
            case 'figure':
              return <FigureMessage key={m.id} m={m} onAvatar={setSheetFigure} />;
            case 'user':
              return <UserMessage key={m.id} m={m} />;
            case 'system':
              return <SystemMessage key={m.id} m={m} />;
            case 'takeaways':
              return <TakeawaysCard key={m.id} session={session} />;
            case 'reading':
              return <ReadingCard key={m.id} session={session} />;
          }
        })}
        {nextMsg && (nextMsg.kind === 'figure' || nextMsg.kind === 'system') && (
          <Typing figureId={nextMsg.kind === 'figure' ? nextMsg.figureId : undefined} onSkip={() => reveal(session.id)} />
        )}
        {nextMsg && nextMsg.kind !== 'figure' && nextMsg.kind !== 'system' && <div className="chat-pause" aria-hidden="true" />}
        {best && (
          <div className="chat-cta">
            <p className="caps muted">{t.discussion.ctaKicker}</p>
            <button type="button" className="btn btn-outline" onClick={() => navigate({ name: 'read', id: best.bookId, council: session.id })}>
              {fmt(t.discussion.ctaRead, { title: book(best.bookId).title })}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                revealAll(session.id);
                navigate({ name: 'summary', id: session.id });
              }}
            >
              {t.discussion.ctaSummary}
            </button>
          </div>
        )}
        <div className="chat-end" />
      </div>

      <div className="composer">
        <div className="composer-targets chiprow">
          <button type="button" className={`chip ${!target && !contextMode ? 'on' : ''}`} onClick={() => { setTarget(null); setContextMode(false); }}>
            {t.discussion.everyone}
          </button>
          {seats.map((f) => (
            <button key={f.id} type="button" className={`chip ${target === f.id && !contextMode ? 'on' : ''}`} onClick={() => { setTarget(f.id); setContextMode(false); inputRef.current?.focus(); }}>
              {f.short}
            </button>
          ))}
          <button type="button" className={`chip ${contextMode ? 'on' : ''}`} onClick={() => { setContextMode((v) => !v); inputRef.current?.focus(); }}>
            {contextMode ? <IconX /> : <IconPlus />} {t.discussion.addContext}
          </button>
        </div>
        <form className="askbar composer-bar" onSubmit={onSubmit}>
          <textarea ref={inputRef} rows={1} placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} aria-label={placeholder} />
          <button type="submit" className="sendbtn" aria-label={t.common.send} disabled={!text.trim()}>
            <IconArrowUp stroke={2.5} />
          </button>
        </form>
        <span className="hand discussion-hand" aria-hidden="true">
          {t.discussion.hand}
        </span>
        <Owl color="violet" size={54} className="discussion-owl" />
      </div>

      <FigureSheet
        session={session}
        figureId={sheetFigure}
        onClose={() => setSheetFigure(null)}
        onAsk={(fid) => {
          setTarget(fid);
          setContextMode(false);
          setSheetFigure(null);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        onReplace={doReplace}
      />
    </div>
  );
}
