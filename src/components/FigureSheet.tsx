import { IconExternalLink, IconMessage, IconSwitchHorizontal } from '@tabler/icons-react';
import type { CouncilSession } from '../store/types';
import { figure } from '../content/figures';
import { candidatesFor } from '../engine/council';
import { Avatar } from './Avatar';
import { Sheet } from './chrome';

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
  const f = figureId ? figure(figureId) : null;
  const seat = f ? session.seats.indexOf(f.id) : -1;
  const next = seat >= 0 ? candidatesFor(session, seat)[0] : undefined;
  return (
    <Sheet open={!!f} onClose={onClose} label={f ? `About ${f.name}` : 'About'}>
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
          <p className="fig-bio">{f.bio}</p>
          <div className="fig-works">
            <span className="caps muted">Source works</span>
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
            <p className="micro muted">
              An AI interpretation grounded in the works above. Lines shown as quotations are verbatim; everything else is paraphrase.
              {f.portrait && ' Portrait via Wikimedia Commons — see credits.'}
            </p>
          </div>
          <div className="fig-actions">
            <button type="button" className="btn btn-dark" onClick={() => onAsk(f.id)}>
              <IconMessage /> Ask {f.short} directly
            </button>
            {next && (
              <button type="button" className="btn btn-outline" onClick={() => onReplace(seat)}>
                <IconSwitchHorizontal /> Replace with {figure(next).name}
              </button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
