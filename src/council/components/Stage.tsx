import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { Figure } from '../content/types';
import { useReduceMotion } from '../hooks/useReduceMotion';
import './Stage.css';

/* ============================================================
   The stage. One drawn set — a floor, a round table, three seats — in
   three geometries: the ROOM (the ask and confirmation screens, three
   empty seats breathing), the BAND (Act I, a strip above the cast), and the FULL
   stage (Act II, with the spotlight on whoever is speaking and reply
   lines to whoever they address). A velvet curtain closes over the seats
   when a council is cast and opens again on Act I; it lowers at the end
   of the debate. Seat 0 is the centre chair, 1 the left, 2 the right.
   ============================================================ */
export type StageMode = 'mid' | 'band' | 'full';
export type Curtain = 'none' | 'open' | 'closed';

/** the three seats' colours (centre, left, right) — also tokens --seat-0/1/2 */
export const SEAT_HEX = ['#D2603C', '#4F6BD8', '#3C9A6E'] as const;

interface Geo {
  h: number;
  floor: number;
  table: [number, number, number, number];
  scale: number;
  pos: [number, number][];
  tags: boolean;
}
export const GEO: Record<StageMode, Geo> = {
  full: { h: 200, floor: 128, table: [179, 118, 110, 34], scale: 1, pos: [[179, 46], [72, 140], [286, 140]], tags: true },
  mid: { h: 150, floor: 98, table: [179, 92, 100, 26], scale: 0.85, pos: [[179, 40], [82, 108], [276, 108]], tags: false },
  band: { h: 120, floor: 78, table: [179, 72, 90, 20], scale: 0.72, pos: [[179, 32], [92, 86], [266, 86]], tags: false },
};
const W = 358;
const POS = GEO.full.pos;
const TABLE_CENTRE: [number, number] = [179, 118];

function off(f: [number, number], q: [number, number], d: number): [number, number] {
  const dx = q[0] - f[0];
  const dy = q[1] - f[1];
  const l = Math.hypot(dx, dy) || 1;
  return [f[0] + (dx / l) * d, f[1] + (dy / l) * d];
}
/** a reply line from seat a to seat b, bowed towards the table */
function linkPath(a: number, b: number) {
  const p = POS[a];
  const q = POS[b];
  const c: [number, number] = [((p[0] + q[0]) / 2) * 0.6 + TABLE_CENTRE[0] * 0.4, ((p[1] + q[1]) / 2) * 0.6 + TABLE_CENTRE[1] * 0.4];
  const s = off(p, c, 26);
  const e = off(q, c, 29);
  return { d: `M${s[0]} ${s[1]} Q${c[0]} ${c[1]} ${e[0]} ${e[1]}`, end: e };
}

export function Stage({
  mode,
  seats,
  show = true,
  curtain = 'none',
  reveal,
  marquee,
  speaker = null,
  addressing = [],
  dim = false,
  ready = false,
  onSeatTap,
  onEmptyTap,
  seatAria,
  emptyAria,
  animateSeats,
  className = '',
}: {
  mode: StageMode;
  /** the three chairs: a thinker, or null for an empty seat */
  seats: (Figure | null)[];
  /** false collapses the stage to nothing (its height animates) */
  show?: boolean;
  /** 'none' hides the curtain; 'open' parks it in the wings; 'closed' draws it over the seats */
  curtain?: Curtain;
  /** change this value to play the reveal: the curtain is found closed and opens, the seats take their places one by one */
  reveal?: string | number | null;
  /** the words on the curtain ("Tonight · …") */
  marquee?: string;
  /** full stage: the seat in the spotlight */
  speaker?: number | null;
  /** full stage: the seats the speaker addresses — reply lines run to them */
  addressing?: number[];
  /** full stage: dim the set so the spotlight reads */
  dim?: boolean;
  /** the room: the empty seats turn gold, listening, while there is a question to send */
  ready?: boolean;
  onSeatTap?: (seat: number) => void;
  onEmptyTap?: (seat: number) => void;
  seatAria?: (f: Figure) => string;
  emptyAria?: string;
  /** which seats play their entrance now: 'all' on a reveal, one index after a swap */
  animateSeats?: 'all' | number | null;
  className?: string;
}) {
  const g = GEO[mode];
  const uid = useId().replace(/:/g, '');
  const reduce = useReduceMotion();
  const T = (ms: number) => (reduce ? 10 : ms);

  // the reveal: curtain closed → opens after a beat → the seats are in; the flag lifts once the entrance is done
  const [revealing, setRevealing] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const seen = useRef<string | number | null | undefined>(undefined);
  // a layout effect: the curtain is drawn before the first paint, so the reveal never flashes the seats
  useLayoutEffect(() => {
    if (!reveal || seen.current === reveal) return;
    seen.current = reveal;
    setRevealing(true);
    setRevealOpen(false);
    const a = setTimeout(() => setRevealOpen(true), T(350));
    const b = setTimeout(() => setRevealing(false), T(2200));
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [reveal]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = revealing ? revealOpen : curtain !== 'closed';
  const nocurtain = !revealing && curtain === 'none';
  const sp = mode === 'full' && speaker !== null && speaker >= 0 ? speaker : null;
  const spotPos = sp !== null ? POS[sp] : null;

  const cls = ['stagewrap', show ? 'show' : '', open ? 'open' : '', nocurtain ? 'nocurtain' : '', revealing ? 'reveal' : '', dim && sp !== null ? 'dim' : '', ready ? 'ready' : '', `mode-${mode}`, className]
    .filter(Boolean)
    .join(' ');

  const roleOf = (i: number): 'sp' | 'ad' | 'by' | 'none' => {
    if (sp === null) return 'none';
    if (i === sp) return 'sp';
    if (addressing.length ? addressing.includes(i) : true) return 'ad';
    return 'by';
  };

  const onKey = (e: KeyboardEvent<SVGGElement>, fn?: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn?.();
    }
  };

  return (
    <div className={cls} style={{ height: show ? g.h : 0, marginTop: show ? 14 : 0 }} aria-hidden={!show || undefined}>
      <svg viewBox={`0 0 ${W} ${g.h}`} preserveAspectRatio="xMidYMin slice" role="presentation" focusable="false">
        <defs>
          {seats.map((_, i) => (
            <clipPath key={i} id={`clip-${uid}-${i}`}>
              <circle cx={0} cy={0} r={19} />
            </clipPath>
          ))}
        </defs>
        <rect className="st-bg" width={W} height={g.h} fill="#141A33" />
        <rect className="st-floor" y={g.floor} width={W} height={g.h - g.floor} fill="#1A2140" />
        <ellipse className="st-table" cx={g.table[0]} cy={g.table[1]} rx={g.table[2]} ry={g.table[3]} fill="#1F2850" stroke="#C9B37A" strokeWidth={1} />
        {/* the light: a cone from above and a pool on the table, both parked until someone speaks */}
        <polygon
          className="st-cone"
          fill="#F6E7C1"
          opacity={spotPos ? 0.07 : 0}
          points={spotPos ? `${spotPos[0] - 20},6 ${spotPos[0] + 20},6 ${spotPos[0] + 66},${spotPos[1] + 38} ${spotPos[0] - 66},${spotPos[1] + 38}` : '159,6 199,6 245,84 113,84'}
        />
        <ellipse className="st-pool" cx={0} cy={38} rx={62} ry={12} fill="#F6E7C1" opacity={spotPos ? 0.2 : 0} style={{ transform: `translate(${spotPos ? spotPos[0] : 179}px, ${spotPos ? spotPos[1] : 46}px)` }} />
        <g className="st-links">
          {sp !== null &&
            addressing
              .filter((b) => b !== sp && b >= 0 && b < 3)
              .map((b) => {
                const { d, end } = linkPath(sp, b);
                return (
                  <g className="lk" key={`${sp}-${b}`}>
                    <path d={d} fill="none" className="flow" stroke={SEAT_HEX[sp]} strokeWidth={2.2} />
                    <circle cx={end[0]} cy={end[1]} r={3.2} fill={SEAT_HEX[sp]} />
                  </g>
                );
              })}
        </g>
        <g className="st-figs">
          {[0, 1, 2].map((i) => {
            const f = seats[i] ?? null;
            const [x, y] = g.pos[i];
            const role = roleOf(i);
            const anim = animateSeats === 'all' || animateSeats === i ? 'seatin' : '';
            const scale = g.scale * (role === 'sp' ? 1.08 : 1);
            const opacity = role === 'sp' || role === 'none' ? 1 : role === 'ad' ? 0.78 : 0.3;
            return (
              <g className="figpos" key={i} style={{ transform: `translate(${x}px, ${y}px)` }}>
                <g className="figscl" style={{ transform: `scale(${scale})` }}>
                  {f ? (
                    <g
                      className={`fig stage-seat ${anim}`}
                      style={{ '--i': i, opacity } as CSSProperties}
                      tabIndex={onSeatTap ? 0 : -1}
                      role={onSeatTap ? 'button' : undefined}
                      aria-label={seatAria ? seatAria(f) : f.name}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeatTap?.(i);
                      }}
                      onKeyDown={(e) => onKey(e, () => onSeatTap?.(i))}
                    >
                      <circle className="ring" cx={0} cy={0} r={22} fill={SEAT_HEX[i]} stroke="#C9B37A" strokeWidth={role === 'sp' ? 2.5 : 1.5} />
                      {f.portrait ? (
                        <image
                          href={f.portrait}
                          x={-19}
                          y={-19}
                          width={38}
                          height={38}
                          clipPath={`url(#clip-${uid}-${i})`}
                          preserveAspectRatio="xMidYMid slice"
                          style={{ filter: 'grayscale(1) sepia(0.22) contrast(1.07) brightness(1.03)' }}
                        />
                      ) : (
                        <text x={0} y={1} textAnchor="middle" dominantBaseline="central" fontFamily="Fraunces, Georgia, serif" fontWeight={600} fontSize={17} fill="#F3EAD6">
                          {f.initials}
                        </text>
                      )}
                      {g.tags && (
                        <text className="tag" x={0} y={i === 0 ? -34 : 38} textAnchor="middle" dominantBaseline="central" fontFamily="'Inter Tight', sans-serif" fontSize={9.5} letterSpacing={1.6} fill="#F3EAD6" opacity={0.9}>
                          {f.short.toUpperCase()}
                        </text>
                      )}
                    </g>
                  ) : (
                    <g
                      className="fig stage-seat slot"
                      style={{ '--i': i } as CSSProperties}
                      tabIndex={onEmptyTap ? 0 : -1}
                      role={onEmptyTap ? 'button' : undefined}
                      aria-label={emptyAria}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEmptyTap?.(i);
                      }}
                      onKeyDown={(e) => onKey(e, () => onEmptyTap?.(i))}
                    >
                      <circle className="halo" cx={0} cy={0} r={30} fill="#C9B37A" opacity={0.14} />
                      <circle cx={0} cy={0} r={22} fill="#1F2850" stroke="#C9B37A" strokeWidth={1.5} strokeDasharray="4 4" />
                      <path d="M-7 0H7M0 -7V7" stroke="#C9B37A" strokeWidth={2.4} strokeLinecap="round" />
                    </g>
                  )}
                </g>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="curtain l" aria-hidden="true" />
      <div className="curtain r" aria-hidden="true" />
      {marquee && (
        <div className="marquee" aria-hidden="true">
          {marquee}
        </div>
      )}
    </div>
  );
}
