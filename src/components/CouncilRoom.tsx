import type { CSSProperties } from 'react';
import type { Figure } from '../content/types';
import { Avatar } from './Avatar';
import { CouncilStageSet } from './CouncilStageSet';
import { useT, fmt } from '../i18n/react';

/* resolved against the deploy base so the app also works under a sub-path (e.g. /council/) */
const ROOM_BASE = `${import.meta.env.BASE_URL}room/council-room.webp`;
const ROOM_BEAMS = `${import.meta.env.BASE_URL}room/council-room-beams.webp`;

/* ============================================================
   The council room: three wing chairs around a low table, the arched
   window behind them. Two pixel-aligned paintings are stacked — the room
   at rest, and the same room with the lamps lifted and beams through the
   window — and the beams fade in when the seats fill, so convening a
   council literally lights the room. Each chair carries a seat: an empty
   slot that breathes until someone sits in it, then a portrait.
   ============================================================ */
export function CouncilRoom({
  seats,
  onSeatTap,
  labels = true,
  emptyAria,
  onEmptyTap,
  drawn = false,
  onArtFail,
}: {
  seats: (Figure | null)[];
  onSeatTap?: (index: number) => void;
  labels?: boolean;
  emptyAria?: string;
  onEmptyTap?: (index: number) => void;
  /** draw the room instead of painting it (the painting could not be fetched) */
  drawn?: boolean;
  onArtFail?: () => void;
}) {
  const filled = seats.some(Boolean);
  const t = useT();
  return (
    <div className={`table-wrap room ${drawn ? 'flat' : 'paint'} ${filled ? 'filled' : 'vacant'}`}>
      {drawn ? (
        <CouncilStageSet />
      ) : (
        <>
          <img className="room-img base" src={ROOM_BASE} alt="" draggable={false} decoding="async" onError={onArtFail} />
          <img className="room-img beams" src={ROOM_BEAMS} alt="" draggable={false} decoding="async" aria-hidden="true" />
        </>
      )}
      <div className="room-fade" aria-hidden="true" />
      {[0, 1, 2].map((i) => {
        const f = seats[i];
        return (
          <div key={i} className={`seat seat-${i} ${f ? 'on' : 'off'}`} style={{ animationDelay: `${180 + i * 380}ms` }}>
            {f ? (
              <button type="button" className="seat-btn" onClick={() => onSeatTap?.(i)} aria-label={fmt(t.figure.seatAria, { name: f.name, label: f.label })}>
                <Avatar figure={f} size={i === 1 ? 62 : 56} ring />
                {labels && <span className="seat-name">{f.short}</span>}
              </button>
            ) : (
              <SeatSlot index={i} aria={emptyAria} onTap={onEmptyTap} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* an unfilled seat: a ring with a plus, haloed so it reads as waiting */
function SeatSlot({ index, aria, onTap }: { index: number; aria?: string; onTap?: (index: number) => void }) {
  return (
    <button
      type="button"
      className="seat-slot"
      style={{ '--i': index } as CSSProperties}
      onClick={() => onTap?.(index)}
      aria-label={aria}
    >
      <svg className="slot-svg" viewBox="0 0 64 64" aria-hidden="true">
        <circle className="slot-halo" cx={32} cy={32} r={31} />
        <circle className="slot-disc" cx={32} cy={32} r={28} />
        <circle className="slot-ring" cx={32} cy={32} r={28} />
        <path className="slot-plus" d="M32 21.5v21M21.5 32h21" />
      </svg>
    </button>
  );
}
