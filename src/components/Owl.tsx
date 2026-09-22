import { useId } from 'react';

/* ============================================================
   The owls — five colours, one drawing. Round body, big eyes, small
   tufts, a yellow beak; the poster's mascots reduced to flat shapes with
   one radial highlight so they still read as little rounded characters.
   `pose="peek"` is the owl looking over an edge (welcome, summary).
   ============================================================ */
export type OwlColor = 'teal' | 'violet' | 'yellow' | 'orange' | 'green' | 'blue';

/* also used by the drawn stage set in CouncilStageSet.tsx, so the chairs match the owls */
export const OWL_PALETTE: Record<OwlColor, { body: string; dark: string; light: string; belly: string }> = {
  teal: { body: '#2FB8A6', dark: '#1B8B7C', light: '#8CE0D4', belly: '#D9F5EF' },
  violet: { body: '#8A5CE0', dark: '#6440B4', light: '#C0A6F2', belly: '#EDE4FB' },
  yellow: { body: '#FFC93C', dark: '#D99E14', light: '#FFE38F', belly: '#FFF4CF' },
  orange: { body: '#F5883A', dark: '#CB6218', light: '#FFB980', belly: '#FFE7D2' },
  green: { body: '#4DB36B', dark: '#2F8A4E', light: '#95DBA8', belly: '#DDF5E3' },
  blue: { body: '#4C86F5', dark: '#2C5FC4', light: '#9DBEFF', belly: '#E0EAFF' },
};

export function Owl({
  color = 'yellow',
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
  const p = OWL_PALETTE[color];
  const gid = `owl-g-${id}`;
  // in the peek pose the bottom of the body is hidden by whatever the owl sits behind
  const viewBox = pose === 'peek' ? '0 0 100 62' : '0 0 100 112';
  const h = pose === 'peek' ? Math.round(size * 0.62) : Math.round(size * 1.12);
  return (
    <svg
      className={`owl owl-${color} ${className}`}
      width={size}
      height={h}
      viewBox={viewBox}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <radialGradient id={gid} cx="0.38" cy="0.25" r="0.9">
          <stop offset="0" stopColor={p.light} />
          <stop offset="0.55" stopColor={p.body} />
          <stop offset="1" stopColor={p.dark} />
        </radialGradient>
      </defs>
      {/* ear tufts */}
      <path d="M26 30 L19 8 L41 22 Z" fill={p.dark} />
      <path d="M74 30 L81 8 L59 22 Z" fill={p.dark} />
      {/* wings */}
      <ellipse cx="15" cy="70" rx="9" ry="22" fill={p.dark} transform="rotate(12 15 70)" />
      <ellipse cx="85" cy="70" rx="9" ry="22" fill={p.dark} transform="rotate(-12 85 70)" />
      {/* body */}
      <ellipse cx="50" cy="62" rx="36" ry="41" fill={`url(#${gid})`} />
      {/* belly scallops */}
      <g fill={p.belly} opacity="0.95">
        <ellipse cx="50" cy="84" rx="21" ry="17" />
        <circle cx="42" cy="76" r="5" fill={p.light} opacity="0.8" />
        <circle cx="58" cy="76" r="5" fill={p.light} opacity="0.8" />
        <circle cx="50" cy="84" r="5" fill={p.light} opacity="0.8" />
      </g>
      {/* eyes */}
      <circle cx="36" cy="46" r="15.5" fill={p.dark} opacity="0.35" />
      <circle cx="64" cy="46" r="15.5" fill={p.dark} opacity="0.35" />
      <circle cx="36" cy="46" r="14" fill="#fff" />
      <circle cx="64" cy="46" r="14" fill="#fff" />
      <circle cx="37.5" cy="47.5" r="7.5" fill="#15151A" />
      <circle cx="65.5" cy="47.5" r="7.5" fill="#15151A" />
      <circle cx="40.5" cy="44" r="2.6" fill="#fff" />
      <circle cx="68.5" cy="44" r="2.6" fill="#fff" />
      {/* beak */}
      <path d="M44.5 57 L55.5 57 L50 67 Z" fill="#F7A82A" />
      {/* feet */}
      {pose === 'sit' && (
        <g fill="#F7A82A">
          <ellipse cx="38" cy="104" rx="8" ry="4.5" />
          <ellipse cx="62" cy="104" rx="8" ry="4.5" />
        </g>
      )}
    </svg>
  );
}

/** the five owls in a row — "five owls at your service" */
export function OwlRow({ size = 34 }: { size?: number }) {
  const colors: OwlColor[] = ['green', 'orange', 'yellow', 'violet', 'teal'];
  return (
    <span className="owlrow" aria-hidden="true">
      {colors.map((c) => (
        <Owl key={c} color={c} size={size} />
      ))}
    </span>
  );
}
