import { OWL_PALETTE, type OwlColor } from './Owl';

/* ============================================================
   The drawn stage set — the council room in the owls' own language:
   navy curtains, three tufted wing chairs, a round table with books and a
   mug, one cone of lamplight. It stands in for the painting when the
   painting cannot be fetched (a cold cache on a bad connection), so the
   room is never an empty rectangle.
   ============================================================ */
const NAVY = '#0D111F';
const NAVY_3 = '#1B2136';
const CREAM = '#F1EBD8';
const MUSTARD = '#F6C347';

function Chair({ x, y, s, col }: { x: number; y: number; s: number; col: OwlColor }) {
  const k = OWL_PALETTE[col];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* shadow on the floor */}
      <ellipse cx={0} cy={100} rx={64} ry={9} fill="#000" opacity={0.35} />
      {/* wings and back */}
      <path d="M-60 -14 C-64 -62 -50 -78 -30 -78 L30 -78 C50 -78 64 -62 60 -14 L58 62 L-58 62 Z" fill={k.body} />
      <path d="M-60 -14 C-64 -62 -50 -78 -30 -78 L-22 -78 C-40 -74 -50 -58 -46 -14 L-46 62 L-58 62 Z" fill={k.dark} opacity={0.55} />
      <path d="M60 -14 C64 -62 50 -78 30 -78 L22 -78 C40 -74 50 -58 46 -14 L46 62 L58 62 Z" fill={k.dark} opacity={0.55} />
      {/* inner back panel and its buttons */}
      <rect x={-40} y={-62} width={80} height={104} rx={20} fill={k.light} opacity={0.42} />
      <g fill={k.dark} opacity={0.5}>
        <circle cx={-16} cy={-34} r={2.6} />
        <circle cx={16} cy={-34} r={2.6} />
        <circle cx={0} cy={-12} r={2.6} />
        <circle cx={-16} cy={10} r={2.6} />
        <circle cx={16} cy={10} r={2.6} />
      </g>
      {/* arms */}
      <rect x={-76} y={8} width={34} height={66} rx={15} fill={k.body} />
      <rect x={42} y={8} width={34} height={66} rx={15} fill={k.body} />
      <rect x={-76} y={8} width={34} height={66} rx={15} fill={k.light} opacity={0.28} />
      <rect x={42} y={8} width={34} height={66} rx={15} fill={k.dark} opacity={0.35} />
      {/* cushion and skirt */}
      <rect x={-48} y={44} width={96} height={32} rx={12} fill={k.light} opacity={0.9} />
      <rect x={-48} y={58} width={96} height={18} rx={9} fill={k.body} opacity={0.55} />
      <rect x={-62} y={72} width={124} height={22} rx={9} fill={k.dark} />
      {/* legs */}
      <rect x={-52} y={92} width={10} height={12} rx={3} fill="#8A6A3A" />
      <rect x={42} y={92} width={10} height={12} rx={3} fill="#8A6A3A" />
    </g>
  );
}

export function CouncilStageSet() {
  return (
    <svg className="stage-svg" viewBox="0 0 390 380" aria-hidden="true">
      <defs>
        <radialGradient id="cs-spot" cx="0.5" cy="0.32" r="0.55">
          <stop offset="0" stopColor={CREAM} stopOpacity="0.16" />
          <stop offset="0.55" stopColor={CREAM} stopOpacity="0.05" />
          <stop offset="1" stopColor={CREAM} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cs-cone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={MUSTARD} stopOpacity="0.22" />
          <stop offset="1" stopColor={MUSTARD} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="cs-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141A30" />
          <stop offset="1" stopColor={NAVY} />
        </linearGradient>
        <radialGradient id="cs-pool" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={MUSTARD} stopOpacity="0.2" />
          <stop offset="1" stopColor={MUSTARD} stopOpacity="0" />
        </radialGradient>
        {/* a hand-drawn wobble, so the set reads as drawn rather than plotted */}
        <filter id="cs-wobble" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={5} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={3.5} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="cs-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={3} seed={11} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 .55" />
          </feComponentTransfer>
        </filter>
      </defs>

      {/* backdrop and curtains */}
      <rect x={0} y={0} width={390} height={380} fill={NAVY} />
      <circle cx={195} cy={140} r={170} fill="url(#cs-spot)" />
      <path d="M0 0 L74 0 C62 70 56 140 48 262 L0 262 Z" fill={NAVY_3} />
      <path d="M390 0 L316 0 C328 70 334 140 342 262 L390 262 Z" fill={NAVY_3} />
      <g stroke="#232B47" strokeWidth={4} fill="none" strokeLinecap="round">
        <path d="M20 0 C16 80 14 150 12 252" />
        <path d="M44 0 C38 80 34 150 30 254" />
        <path d="M370 0 C374 80 376 150 378 252" />
        <path d="M346 0 C352 80 356 150 360 254" />
      </g>
      <path d="M0 168 C22 176 38 176 50 168 C38 186 22 186 0 178 Z" fill={MUSTARD} opacity={0.9} />
      <path d="M390 168 C368 176 352 176 340 168 C352 186 368 186 390 178 Z" fill={MUSTARD} opacity={0.9} />

      {/* floor and rug */}
      <rect x={0} y={262} width={390} height={118} fill="url(#cs-floor)" />
      <rect x={0} y={262} width={390} height={1.5} fill={CREAM} opacity={0.12} />
      <ellipse cx={195} cy={326} rx={176} ry={40} fill={NAVY_3} />
      <ellipse cx={195} cy={326} rx={154} ry={32} fill="none" stroke={MUSTARD} strokeWidth={1.4} strokeDasharray="3 6" opacity={0.55} />

      {/* the light */}
      <polygon points="168,-10 222,-10 356,330 34,330" fill="url(#cs-cone)" />
      <ellipse cx={195} cy={324} rx={180} ry={36} fill="url(#cs-pool)" />

      {/* chairs — the side pair closer, the centre chair further back */}
      <g filter="url(#cs-wobble)">
        <Chair x={195} y={190} s={0.82} col="green" />
        <Chair x={70} y={218} s={0.78} col="orange" />
        <Chair x={320} y={218} s={0.78} col="violet" />
      </g>

      {/* table and props */}
      <g filter="url(#cs-wobble)">
        <ellipse cx={195} cy={350} rx={70} ry={9} fill="#000" opacity={0.35} />
        <rect x={184} y={316} width={22} height={30} rx={4} fill="#8F6A3D" />
        <ellipse cx={195} cy={346} rx={34} ry={8} fill="#7A5A34" />
        <ellipse cx={195} cy={316} rx={92} ry={24} fill="#A6773F" />
        <ellipse cx={195} cy={310} rx={92} ry={24} fill="#C89B62" />
        <ellipse cx={180} cy={304} rx={46} ry={8} fill={CREAM} opacity={0.22} />
        {/* a small stack of books */}
        <rect x={142} y={294} width={46} height={9} rx={2} fill={OWL_PALETTE.teal.body} />
        <rect x={146} y={285} width={44} height={9} rx={2} fill={MUSTARD} />
        <rect x={144} y={276} width={42} height={9} rx={2} fill={OWL_PALETTE.orange.body} />
        <g fill={CREAM} opacity={0.7}>
          <rect x={150} y={297} width={30} height={1.4} />
          <rect x={154} y={288} width={28} height={1.4} />
          <rect x={152} y={279} width={26} height={1.4} />
        </g>
        {/* and someone's mug */}
        <rect x={222} y={284} width={17} height={17} rx={4} fill={CREAM} />
        <path d="M239 288 a5 5 0 0 1 0 10" fill="none" stroke={CREAM} strokeWidth={2.4} />
        <circle cx={230.5} cy={292.5} r={2.2} fill={MUSTARD} />
      </g>

      {/* paper grain over everything */}
      <rect x={0} y={0} width={390} height={380} filter="url(#cs-grain)" opacity={0.22} style={{ mixBlendMode: 'soft-light' }} />
    </svg>
  );
}
