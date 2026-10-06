import { useId } from 'react';

/* ============================================================
   The owls — the poster's cast, with crayon edges (a turbulence filter
   roughens the fur). Only two of them appear in the Council: the teal one
   peeking over the categories, and the violet one, Mirror, who keeps the
   reading profile. `pose="peek"` crops the body at the bottom.
   ============================================================ */
export type OwlColor = 'teal' | 'orange' | 'green' | 'violet' | 'blue';

export const OWL_PALETTE: Record<OwlColor, { body: string; dark: string; light: string; seed: number }> = {
  teal: { body: '#66B9AB', dark: '#3E8A7D', light: '#8FD1C4', seed: 3 },
  orange: { body: '#EC7E55', dark: '#A9492A', light: '#F4A27F', seed: 7 },
  green: { body: '#7BB081', dark: '#3B6E4C', light: '#A2CAA5', seed: 11 },
  violet: { body: '#937CD9', dark: '#5C449C', light: '#B9A7EF', seed: 5 },
  blue: { body: '#7C8CDB', dark: '#4A58A8', light: '#AAB4E8', seed: 9 },
};

const BODY = 'M50 13 C73 13 88 34 88 62 C88 90 71 106 50 106 C29 106 12 90 12 62 C12 34 27 13 50 13 Z';

export function Owl({
  color = 'teal',
  size = 64,
  pose = 'sit',
  className = '',
  style,
  title,
}: {
  color?: OwlColor;
  size?: number;
  pose?: 'sit' | 'peek';
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  const id = useId().replace(/:/g, '');
  const s = OWL_PALETTE[color];
  const F = `owlf-${id}`;
  const C = `owlc-${id}`;
  const peek = pose === 'peek';
  const viewBox = peek ? '0 0 100 62' : '0 0 100 112';
  const h = Math.round(peek ? size * 0.62 : size * 1.12);
  const eyes: [number, number][] = [
    [36, 37.2],
    [64, 62.8],
  ];
  return (
    <svg
      className={`owl owl-${color} ${className}`}
      width={size}
      height={h}
      viewBox={viewBox}
      style={{ overflow: peek ? 'hidden' : 'visible', ...style }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <clipPath id={C}>
          <path d={BODY} />
        </clipPath>
        <filter id={F} x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={s.seed} result="w" />
          <feDisplacementMap in="SourceGraphic" in2="w" scale={3} xChannelSelector="R" yChannelSelector="G" result="r" />
          <feTurbulence type="fractalNoise" baseFrequency="1.1 0.42" numOctaves={2} seed={s.seed + 20} result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0 0 0 -0.58" result="sp" />
          <feComposite in="sp" in2="r" operator="in" result="spi" />
          <feBlend in="spi" in2="r" mode="multiply" />
        </filter>
        <filter id={`${F}b`} x="-12%" y="-12%" width="124%" height="124%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={s.seed + 2} result="w" />
          <feDisplacementMap in="SourceGraphic" in2="w" scale={2.4} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {peek && (
          <clipPath id={`${C}p`}>
            <rect x={-10} y={-10} width={120} height={72} />
          </clipPath>
        )}
      </defs>
      <g clipPath={peek ? `url(#${C}p)` : undefined}>
        {!peek && <ellipse cx={50} cy={107.5} rx={27} ry={3.6} fill="#000" opacity={0.16} />}
        <g filter={`url(#${F})`}>
          {color === 'orange' && (
            <>
              <path d="M25 31 C20 23 18 14 21 5 C27 12 33 16 40 19 C33 22 28 26 25 31 Z" fill={s.body} />
              <path d="M75 31 C80 23 82 14 79 5 C73 12 67 16 60 19 C67 22 72 26 75 31 Z" fill={s.body} />
            </>
          )}
          <path d={BODY} fill={s.body} />
          <g clipPath={`url(#${C})`}>
            <path d="M8 54 C19 55 27 66 29 80 C31 93 26 103 18 108 L4 108 Z" fill={s.dark} opacity={0.85} />
            <path d="M92 54 C81 55 73 66 71 80 C69 93 74 103 82 108 L96 108 Z" fill={s.dark} opacity={0.85} />
            <ellipse cx={41} cy={27} rx={25} ry={15} fill={s.light} opacity={0.32} />
          </g>
          {color === 'teal' && (
            <>
              <path d="M27 25 C30 14 43 9 56 10.5 C66 11.8 72 16.5 73 22 C63 18.5 45 18.5 27 25 Z" fill={s.dark} />
              <path d="M27 25 C24 23.5 21 24 18.5 26 C22 27.8 25 27.6 27 25 Z" fill={s.dark} />
            </>
          )}
        </g>
        <g filter={`url(#${F}b)`}>
          <path d="M50 55 C65 55 74 67 74 81 C74 96 64 104 50 104 C36 104 26 96 26 81 C26 67 35 55 50 55 Z" fill="#F5EACB" />
        </g>
        {eyes.map(([cx, px]) => (
          <g key={cx}>
            <circle cx={cx} cy={42} r={13.6} fill="#FBF3DC" />
            <circle cx={cx} cy={42} r={13.6} fill="none" stroke={s.dark} strokeOpacity={0.28} strokeWidth={1.2} />
            <circle cx={px} cy={43} r={7.4} fill="#EDB23C" />
            <circle cx={px} cy={43.2} r={4} fill="#1C1611" />
            <circle cx={px + 2.5} cy={40.3} r={1.9} fill="#fff" />
          </g>
        ))}
        {color === 'violet' && (
          <>
            {[36, 64].map((cx) => (
              <g key={cx}>
                <path d={`M${cx - 14.4} 42.5 A14.4 14.4 0 0 1 ${cx + 14.4} 42.5 Z`} fill={s.light} />
                <path d={`M${cx - 14.4} 42.5 L${cx + 14.4} 42.5`} stroke={s.dark} strokeWidth={1.6} strokeLinecap="round" />
              </g>
            ))}
            <path d="M55.5 88.5 A10 10 0 1 1 47 73 A7.6 7.6 0 1 0 55.5 88.5 Z" fill={s.body} />
          </>
        )}
        <path d="M45.6 52.6 Q50 51.4 54.4 52.6 L50.7 59.8 Q50 60.9 49.3 59.8 Z" fill="#E7A94A" />
        {!peek && (
          <g stroke="#E7A94A" strokeWidth={2.7} strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M33.5 103.6 q2.2 4.2 4.4 0 q2.2 4.2 4.4 0" />
            <path d="M57.7 103.6 q2.2 4.2 4.4 0 q2.2 4.2 4.4 0" />
          </g>
        )}
      </g>
    </svg>
  );
}
