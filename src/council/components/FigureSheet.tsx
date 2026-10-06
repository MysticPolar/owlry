import { useEffect } from 'react';
import { IconExternalLink, IconMessage, IconSwitchHorizontal } from '@tabler/icons-react';
import type { CouncilSession } from '../store/types';
import { useStore, selectMindUnavailable } from '../store/useStore';
import { figure } from '../content/figures';
import { candidatesFor } from '../engine/council';
import { Avatar } from './Avatar';
import { Sheet } from './chrome';
import { useT, useLang, fmt } from '../i18n/react';

/* ============================================================
   Tap an avatar: who this is, the works their voice is drawn from, and
   the two controls — ask them directly, or replace them (with undo).
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
  onAsk: (figureId: string) => void;
  onReplace: (seat: number) => void;
}) {
  const t = useT();
  const lang = useLang();
  const ensureAlternates = useStore((s) => s.ensureAlternates);
  const f = figureId ? figure(figureId) : null;
  const seat = f ? session.seats.indexOf(f.id) : -1;
  const next = seat >= 0 ? candidatesFor(session, seat)[0] : undefined;
  // a placeholder whose card was asked for and could not be had: the note says so instead of promising one
  const unavailable = useStore(selectMindUnavailable('figure', f?.id ?? ''));
  // a cast council has no alternates until the live council is asked for them, once, when a card is first opened; the Replace
  // button arrives with the answer (and stays away if there is none). The alternates' own cards are asked for here too, lazily
  const onCast = !!figureId && !!session.cast;
  useEffect(() => {
    if (onCast) void ensureAlternates(session.id);
  }, [onCast, session.id, lang, ensureAlternates]);
  return (
    <Sheet open={!!f} onClose={onClose} label={f ? fmt(t.figure.about, { name: f.name }) : t.figure.aboutPlain}>
      {f && (
        <div className="fig-sheet">
          <div className="fig-head">
            <Avatar figure={f} size={64} />
            <div className="grow">
              <div className="title">{f.name}</div>
              <div className="small muted">{f.role}</div>
              <span className="tag fig-label">{f.label}</span>
            </div>
          </div>
          {/* distinct keys, so the bio that replaces the note mounts afresh and gets its own entrance */}
          {f.pending ? (
            <p key="arriving" className="fig-bio fig-arriving">{unavailable ? t.figure.unavailable : t.figure.arriving}</p>
          ) : (
            <p key="bio" className={`fig-bio ${f.recalled ? 'fig-bio-landed' : ''}`}>{f.bio}</p>
          )}
          <div className="fig-works">
            <span className="caps muted">{t.figure.sources}</span>
            {f.works.length > 0 && (
            <ul>
              {f.works.map((w) => (
                <li key={w.title}>
                  {w.url ? (
                    <a href={w.url} target="_blank" rel="noreferrer">
                      <b>{w.title}</b> <span className="muted">({w.year})</span> <IconExternalLink />
                    </a>
                  ) : (
                    <span>
                      <b>{w.title}</b> <span className="muted">({w.year})</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
            )}
            <p className="micro muted">
              {t.figure.note}
              {f.portrait && t.figure.portrait}
            </p>
            {f.recalled && !f.pending && <p className="micro muted fig-recalled">{t.figure.recalled}</p>}
          </div>
          <div className="fig-actions">
            <button type="button" className="btn btn-dark" onClick={() => onAsk(f.id)}>
              <IconMessage /> {fmt(t.figure.ask, { name: f.short })}
            </button>
            {next && (
              // on a cast session the button lands after the sheet, so it needs an entrance of its own
              <button type="button" className={`btn btn-outline ${session.cast ? 'fig-replace' : ''}`} onClick={() => onReplace(seat)}>
                <IconSwitchHorizontal /> {fmt(t.figure.replace, { name: figure(next).name })}
              </button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
