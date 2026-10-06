import { useEffect, useState } from 'react';
import { IconChevronRight, IconExternalLink, IconArrowsLeftRight, IconMessage } from '@tabler/icons-react';
import type { CouncilSession } from '../store/types';
import { navigate } from '../app/router';
import { useStore, selectMindUnavailable } from '../store/useStore';
import { figure } from '../content/figures';
import { maybeBook } from '../content/books';
import { candidatesFor, seatScript, scriptFor } from '../engine/council';
import { Avatar } from './Avatar';
import { Cover } from './Cover';
import { Sheet } from './chrome';
import { useT, useLang, fmt } from '../i18n/react';

/* ============================================================
   The bio sheet — tap a portrait: who this is, the book their seat
   argues from, the works their voice is drawn from, and the two
   controls: ask them directly, or swap the seat for the next alternate.
   ============================================================ */
export function FigureSheet({
  session,
  figureId,
  onClose,
  onAsk,
  onReplace,
}: {
  session: CouncilSession;
  figureId: string | null;
  onClose: () => void;
  /** omit to hide "Ask directly" (the one-on-one screen is already that) */
  onAsk?: (figureId: string) => void;
  /** omit to hide the swap (the debate is under way) */
  onReplace?: (seat: number, to: string) => void;
}) {
  const t = useT();
  const lang = useLang();
  const ensureAlternates = useStore((s) => s.ensureAlternates);
  // the last figure stays on the sheet while it slides away (closing sets figureId to null)
  const [shownId, setShownId] = useState(figureId);
  useEffect(() => {
    if (figureId) setShownId(figureId);
  }, [figureId]);
  const f = shownId ? figure(shownId) : null;
  const seat = f ? session.seats.indexOf(f.id) : -1;
  const candidates = seat >= 0 ? candidatesFor(session, seat) : [];
  const next = candidates[0];
  const replacedIn = seat >= 0 && session.replaced.some((r) => r.seat === seat);
  // the book this seat argues from
  const bookId = seat >= 0 && f ? seatScript(scriptFor(session), seat, f.id).bookId : undefined;
  const bk = maybeBook(bookId);
  // a placeholder whose card was asked for and could not be had: the note says so instead of promising one
  const unavailable = useStore(selectMindUnavailable('figure', f?.id ?? ''));
  // a cast council has no alternates until the live council is asked for them, once, when a card is first opened
  const onCast = !!figureId && !!session.cast;
  useEffect(() => {
    if (onCast) void ensureAlternates(session.id);
  }, [onCast, session.id, lang, ensureAlternates]);
  return (
    <Sheet open={!!figureId && !!f} onClose={onClose} label={f ? fmt(t.figure.about, { name: f.name }) : t.figure.aboutPlain}>
      {f && (
        <div className="fig-sheet">
          <div className="act">{replacedIn ? t.figure.inSeat : t.figure.onCouncil}</div>
          <div className="bio">
            <Avatar figure={f} seat={seat >= 0 ? seat : undefined} />
            <div>
              <div className="nm">{f.name}</div>
              <div className="cred">
                {f.role}
                {f.label ? ` · ${f.label}` : ''}
              </div>
            </div>
          </div>
          {/* distinct keys, so the bio that replaces the note mounts afresh and gets its own entrance */}
          {f.pending ? (
            <p key="arriving" className="bio-text arriving">
              {unavailable ? t.figure.unavailable : t.figure.arriving}
            </p>
          ) : (
            <p key="bio" className="bio-text">
              {f.bio}
            </p>
          )}
          {bk ? (
            <button type="button" className="bio-book" onClick={() => { onClose(); navigate({ name: 'book', id: bk.id, council: session.id }); }}>
              <Cover book={bk} width={36} />
              <div>
                <div className="t">{bk.title}</div>
                <div className="a">{t.figure.bookOfSeat}</div>
              </div>
              <IconChevronRight className="chev" stroke={2} />
            </button>
          ) : null}
          {f.works.length > 0 && (
            <div className="fig-works">
              <span className="caps">{t.figure.sources}</span>
              <ul>
                {f.works.map((w) => (
                  <li key={w.title}>
                    {w.url ? (
                      <a href={w.url} target="_blank" rel="noreferrer">
                        <b>{w.title}</b> <span className="muted">({w.year})</span> <IconExternalLink stroke={2} />
                      </a>
                    ) : (
                      <span>
                        <b>{w.title}</b> <span className="muted">({w.year})</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="bio-note">
            {t.figure.note}
            {f.portrait && t.figure.portrait}
          </p>
          {f.recalled && !f.pending && <p className="bio-note fig-recalled">{t.figure.recalled}</p>}
          <div className="bio-actions">
            {onAsk && (
              <button type="button" className="btn dark" onClick={() => onAsk(f.id)}>
                <IconMessage stroke={2} /> {fmt(t.figure.ask, { name: f.short })}
              </button>
            )}
            {onReplace && next && (
              // on a cast session the button lands after the sheet, so it needs an entrance of its own
              <button type="button" className={`btn ghost ${session.cast ? 'fig-replace' : ''}`} onClick={() => onReplace(seat, next)}>
                <IconArrowsLeftRight stroke={2} /> {fmt(t.figure.replace, { name: figure(next).name })}
              </button>
            )}
            <button type="button" className="btn text" onClick={onClose}>
              {t.common.close}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
