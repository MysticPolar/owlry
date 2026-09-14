import type { Figure } from '../content/types';
import { Avatar } from './Avatar';

/* ============================================================
   The round table with three seats, under one hanging lamp. Seats are
   empty until a question is asked; then the avatars pop in one by one.
   ============================================================ */
export function CouncilTable({
  seats,
  onSeatTap,
  labels = true,
}: {
  seats: (Figure | null)[];
  onSeatTap?: (index: number) => void;
  labels?: boolean;
}) {
  const filled = seats.some(Boolean);
  return (
    <div className={`table-wrap ${filled ? 'filled' : ''}`}>
      <svg className="table-svg" viewBox="0 0 360 300" aria-hidden="true">
        <defs>
          <linearGradient id="ct-cone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(255,209,0,0.30)" />
            <stop offset="1" stopColor="rgba(255,209,0,0)" />
          </linearGradient>
          <radialGradient id="ct-wood" cx="0.42" cy="0.32" r="0.75">
            <stop offset="0" stopColor="#B7793C" />
            <stop offset="0.55" stopColor="#8A5628" />
            <stop offset="1" stopColor="#5A361A" />
          </radialGradient>
          <linearGradient id="ct-rim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5C3A1E" />
            <stop offset="1" stopColor="#3B2411" />
          </linearGradient>
          <filter id="ct-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        {/* lamp */}
        <line x1="180" y1="6" x2="180" y2="38" stroke="#4A4B52" strokeWidth="2" />
        <path d="M148 38 L212 38 L232 66 L128 66 Z" fill="#26272D" stroke="#3B3C44" strokeWidth="1" />
        <circle cx="180" cy="70" r="12" fill="#FFD100" opacity="0.55" filter="url(#ct-glow)" />
        <circle cx="180" cy="68" r="5" fill="#FFE68A" />
        <polygon points="132,66 228,66 340,236 20,236" fill="url(#ct-cone)" />
        {/* floor shadow */}
        <ellipse cx="180" cy="262" rx="150" ry="16" fill="rgba(0,0,0,0.45)" />
        {/* back chair */}
        <g className="chair chair-back">
          <rect x="158" y="118" width="44" height="30" rx="6" fill="#3E2816" />
          <rect x="156" y="146" width="48" height="10" rx="3" fill="#2D1C10" />
        </g>
        {/* table */}
        <ellipse cx="180" cy="200" rx="118" ry="42" fill="url(#ct-rim)" />
        <ellipse cx="180" cy="192" rx="118" ry="42" fill="url(#ct-wood)" />
        <ellipse cx="164" cy="180" rx="60" ry="16" fill="rgba(255,255,255,0.08)" />
        <rect x="166" y="228" width="28" height="30" rx="4" fill="#3B2411" />
        <ellipse cx="180" cy="258" rx="42" ry="9" fill="#2D1C10" />
        {/* side chairs */}
        <g className="chair chair-left">
          <rect x="30" y="186" width="40" height="52" rx="8" fill="#3E2816" transform="rotate(8 50 212)" />
          <rect x="34" y="236" width="52" height="12" rx="4" fill="#2D1C10" transform="rotate(8 60 242)" />
          <rect x="40" y="248" width="6" height="16" fill="#2D1C10" />
          <rect x="76" y="246" width="6" height="16" fill="#2D1C10" />
        </g>
        <g className="chair chair-right">
          <rect x="290" y="186" width="40" height="52" rx="8" fill="#3E2816" transform="rotate(-8 310 212)" />
          <rect x="274" y="236" width="52" height="12" rx="4" fill="#2D1C10" transform="rotate(-8 300 242)" />
          <rect x="278" y="246" width="6" height="16" fill="#2D1C10" />
          <rect x="314" y="248" width="6" height="16" fill="#2D1C10" />
        </g>
      </svg>
      {[0, 1, 2].map((i) => {
        const f = seats[i];
        return (
          <div key={i} className={`seat seat-${i} ${f ? 'on' : ''}`} style={{ animationDelay: `${180 + i * 380}ms` }}>
            {f ? (
              <button type="button" className="seat-btn" onClick={() => onSeatTap?.(i)} aria-label={`${f.name}, ${f.label}`}>
                <Avatar figure={f} size={i === 1 ? 62 : 56} ring />
                {labels && <span className="seat-name">{f.short}</span>}
              </button>
            ) : (
              <span className="seat-empty" aria-hidden="true" />
            )}
          </div>
        );
      })}
    </div>
  );
}
