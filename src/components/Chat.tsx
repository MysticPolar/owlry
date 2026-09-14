import { IconExternalLink, IconQuote } from '@tabler/icons-react';
import type { Message, Segment } from '../store/types';
import { figure } from '../content/figures';
import { maybeBook } from '../content/books';
import { Avatar } from './Avatar';

/* ============================================================
   Chat rendering. Verbatim quotes get a distinct block with a source
   link; everything else is the figure's paraphrase and looks like chat.
   ============================================================ */
export function SegmentsView({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((s, i) =>
        s.kind === 'quote' ? (
          <blockquote key={i} className="msg-quote">
            <IconQuote className="msg-quote-mark" aria-hidden="true" />
            <p>“{s.text}”</p>
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
                <span className="msg-source-tag">verbatim</span>
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
  const f = figure(m.figureId!);
  return (
    <div className={`msg msg-figure ${compact ? 'compact' : ''}`}>
      <button type="button" className="msg-avatar" onClick={() => onAvatar?.(f.id)} aria-label={`About ${f.name}`}>
        <Avatar figure={f} size={compact ? 28 : 34} />
      </button>
      <div className="msg-body">
        <div className="msg-name">
          {f.name}
          {m.slot === 'direct' && <span className="msg-tag">replying to you</span>}
          {m.slot === 'ctx' && <span className="msg-tag">on your context</span>}
          {m.slot === 'passage' && <span className="msg-tag">on your passage</span>}
        </div>
        <div className="msg-bubble">
          <SegmentsView segments={m.segments ?? []} />
        </div>
      </div>
    </div>
  );
}

export function UserMessage({ m }: { m: Message }) {
  const label =
    m.userKind === 'context'
      ? 'Context added'
      : m.userKind === 'passage'
        ? `From ${maybeBook(m.passage?.bookId)?.title ?? 'your reading'}`
        : m.target
          ? `To ${figure(m.target).short}`
          : m.userKind === 'question'
            ? 'You asked'
            : 'You';
  return (
    <div className={`msg msg-user ${m.userKind === 'question' ? 'question' : ''}`}>
      <span className="msg-user-label">{label}</span>
      <div className={`msg-user-bubble ${m.userKind === 'passage' ? 'passage' : ''}`}>{m.userKind === 'passage' ? `“${m.text}”` : m.text}</div>
    </div>
  );
}

export function SystemMessage({ m }: { m: Message }) {
  return (
    <div className="msg msg-system">
      <span>{m.text}</span>
    </div>
  );
}

export function Typing({ figureId, onSkip }: { figureId?: string; onSkip: () => void }) {
  const f = figureId ? figure(figureId) : null;
  return (
    <button type="button" className="msg msg-figure typing" onClick={onSkip} aria-label={f ? `${f.name} is writing — tap to show` : 'Loading'}>
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
