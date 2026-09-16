import { IconExternalLink, IconQuote } from '@tabler/icons-react';
import type { Message, Segment } from '../store/types';
import { figure } from '../content/figures';
import { maybeBook } from '../content/books';
import { Avatar } from './Avatar';
import { useT, fmt } from '../i18n/react';

/* ============================================================
   Chat rendering. Verbatim quotes get a distinct block with a source
   link; everything else is the figure's paraphrase and looks like chat.
   ============================================================ */
export function SegmentsView({ segments, figureId }: { segments: Segment[]; figureId?: string }) {
  const t = useT();
  // a verbatim line keeps its original words; in another interface language the figure's gloss goes under it
  const glossFor = (text: string) => (figureId ? figure(figureId).quotes.find((q) => q.text === text)?.gloss : undefined);
  return (
    <>
      {segments.map((s, i) =>
        s.kind === 'quote' ? (
          <blockquote key={i} className="msg-quote">
            <IconQuote className="msg-quote-mark" aria-hidden="true" />
            <p>“{s.text}”</p>
            {glossFor(s.text) && (
              <p className="msg-gloss">
                <span className="msg-source-tag">{t.common.translation}</span> {glossFor(s.text)}
              </p>
            )}
            {s.source && (
              <span className="msg-source">
                {s.source.url ? (
                  <a href={s.source.url} target="_blank" rel="noreferrer">
                    {s.source.work}
                    {s.source.loc ? `, ${s.source.loc}` : ''} <IconExternalLink />
                  </a>
                ) : (
                  <>
                    {s.source.work}
                    {s.source.loc ? `, ${s.source.loc}` : ''}
                  </>
                )}
                <span className="msg-source-tag">{t.common.verbatim}</span>
              </span>
            )}
          </blockquote>
        ) : (
          <p key={i} className="msg-text">
            {s.text}
          </p>
        ),
      )}
    </>
  );
}

export function FigureMessage({ m, onAvatar, compact = false }: { m: Message; onAvatar?: (figureId: string) => void; compact?: boolean }) {
  const t = useT();
  const f = figure(m.figureId!);
  return (
    <div className={`msg msg-figure ${compact ? 'compact' : ''}`}>
      <button type="button" className="msg-avatar" onClick={() => onAvatar?.(f.id)} aria-label={fmt(t.chat.about, { name: f.name })}>
        <Avatar figure={f} size={compact ? 28 : 34} />
      </button>
      <div className="msg-body">
        <div className="msg-name">
          {f.name}
          {m.slot === 'direct' && <span className="msg-tag">{t.chat.replyingToYou}</span>}
          {m.slot === 'ctx' && <span className="msg-tag">{t.chat.onYourContext}</span>}
          {m.slot === 'passage' && <span className="msg-tag">{t.chat.onYourPassage}</span>}
        </div>
        <div className="msg-bubble">
          <SegmentsView segments={m.segments ?? []} figureId={f.id} />
        </div>
      </div>
    </div>
  );
}

export function UserMessage({ m }: { m: Message }) {
  const t = useT();
  const label =
    m.userKind === 'context'
      ? t.chat.contextAdded
      : m.userKind === 'passage'
        ? fmt(t.chat.fromBook, { title: maybeBook(m.passage?.bookId)?.title ?? t.chat.yourReading })
        : m.target
          ? fmt(t.chat.to, { name: figure(m.target).short })
          : m.userKind === 'question'
            ? t.chat.youAsked
            : t.chat.you;
  return (
    <div className={`msg msg-user ${m.userKind === 'question' ? 'question' : ''}`}>
      <span className="msg-user-label">{label}</span>
      <div className={`msg-user-bubble ${m.userKind === 'passage' ? 'passage' : ''}`}>{m.userKind === 'passage' ? `“${m.text}”` : m.text}</div>
    </div>
  );
}

export function SystemMessage({ m }: { m: Message }) {
  const t = useT();
  // a replace notice carries who left and who joined, so it follows the interface language
  const text = m.sys === 'replace' && m.figures ? fmt(t.chat.sysReplace, { to: figure(m.figures.to).name, from: figure(m.figures.from).name }) : m.text;
  return (
    <div className="msg msg-system">
      <span>{text}</span>
    </div>
  );
}

export function Typing({ figureId, onSkip }: { figureId?: string; onSkip: () => void }) {
  const t = useT();
  const f = figureId ? figure(figureId) : null;
  return (
    <button type="button" className="msg msg-figure typing" onClick={onSkip} aria-label={f ? fmt(t.chat.typing, { name: f.name }) : t.common.loading}>
      <span className="msg-avatar">{f && <Avatar figure={f} size={34} />}</span>
      <div className="msg-body">
        {f && <div className="msg-name">{f.name}</div>}
        <div className="msg-bubble dots" aria-hidden="true">
          <i /> <i /> <i />
        </div>
      </div>
    </button>
  );
}
