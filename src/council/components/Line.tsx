import { IconExternalLink } from '@tabler/icons-react';
import type { Message, Segment } from '../store/types';
import { figure } from '../content/figures';
import { Avatar } from './Avatar';
import { useT, fmt } from '../i18n/react';

/* ============================================================
   A line of speech, as the debate, the one-on-one and the transcript
   show it: who is speaking and to whom, the words with any verbatim
   quote set in italics inside quotation marks, and under it the source
   of that quote. A quote the live council recalled for a thinker outside
   the curated catalogue is tagged "attributed" — "verbatim" is reserved
   for lines the catalogue has checked. In another interface language the
   figure's gloss of a quote goes under the line, marked as a translation.
   ============================================================ */
export function Speech({ segments, figureId, className = '' }: { segments: Segment[]; figureId?: string; className?: string }) {
  const t = useT();
  const glossFor = (text: string) => (figureId ? figure(figureId).quotes.find((q) => q.text === text)?.gloss : undefined);
  const glosses = segments.filter((s) => s.kind === 'quote').map((s) => glossFor(s.text)).filter((g): g is string => !!g);
  return (
    <div className={`speech ${className}`}>
      {segments.map((s, i) => (
        <span key={i}>
          {i > 0 ? ' ' : ''}
          {s.kind === 'quote' ? <i>“{s.text}”</i> : s.text}
        </span>
      ))}
      {glosses.map((g, i) => (
        <span className="gloss" key={`g${i}`}>
          <span className="vtag">{t.common.translation}</span> {g}
        </span>
      ))}
    </div>
  );
}

/** "From <work> · <loc>" for the first verbatim quote in the line, linked when the source has a URL */
export function Source({ segments, className = '' }: { segments: Segment[]; className?: string }) {
  const t = useT();
  const q = segments.find((s) => s.kind === 'quote' && s.source);
  if (!q || !q.source) return null;
  const inner = (
    <>
      {t.line.from} <b>{q.source.work}</b>
      {q.source.loc ? ` · ${q.source.loc}` : ''}
      {q.attributed && <span className="vtag">{t.common.attributed}</span>}
      {q.source.url && <IconExternalLink stroke={2} />}
    </>
  );
  return q.source.url ? (
    <a className={`src ${className}`} href={q.source.url} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  ) : (
    <div className={`src ${className}`}>{inner}</div>
  );
}

/** who a figure line is addressed to, in words: the seats it names, else "you" when it answers the reader */
export function addresseeOf(m: Message, seats: readonly string[], t: ReturnType<typeof useT>): string | null {
  if (m.kind !== 'figure') return null;
  const named = (m.to ?? []).filter((i) => i >= 0 && i < seats.length && seats[i] !== m.figureId).map((i) => figure(seats[i]).short);
  if (named.length) return fmt(t.line.to, { names: named.join(t.line.and) });
  if (m.slot === 'direct' || m.slot === 'f1' || m.slot === 'f2' || m.slot === 'ctx' || m.slot === 'passage' || m.slot === 'generic') return t.line.toYou;
  return null;
}

/** one figure line in full: the who line, the speech, the source */
export function LineView({
  m,
  seats,
  onWho,
  compact = false,
  className = '',
  style,
  children,
}: {
  m: Message;
  seats: readonly string[];
  /** tap the name or the medallion */
  onWho?: (figureId: string) => void;
  compact?: boolean;
  className?: string;
  /** e.g. the mockup's per-line animation-delay */
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const t = useT();
  const f = figure(m.figureId!);
  const seat = m.seat ?? seats.indexOf(f.id);
  const to = addresseeOf(m, seats, t);
  const who = (
    <>
      <Avatar figure={f} size={26} seat={seat} className="sm" />
      <span className="nm">{f.short}</span>
      {to && <span className="to">{to}</span>}
    </>
  );
  return (
    <div className={`line ${compact ? 'compact' : ''} ${className}`} style={style}>
      {onWho ? (
        <button type="button" className="who" onClick={() => onWho(f.id)} aria-label={fmt(t.figure.about, { name: f.name })}>
          {who}
        </button>
      ) : (
        <div className="who">{who}</div>
      )}
      <Speech segments={m.segments ?? []} figureId={f.id} className={compact ? 'compact' : ''} />
      <Source segments={m.segments ?? []} />
      {children}
    </div>
  );
}
