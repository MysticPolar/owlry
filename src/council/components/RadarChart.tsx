import type { Axis } from '../content/types';
import { useT, fmt } from '../i18n/react';

/* ============================================================
   The reading-profile radar (the v14 mockup's radarSVG): six spokes for
   the six areas, three rings, a soft gold area with a dot on each spoke,
   the area names outside the rim. It describes what you read, not who
   you are. Every stroke and fill is a class read from the rig's tokens
   (ProfileScreen.css: .radar .grid / .area / .pt / text), so it reads
   under both lighting rigs.
   ============================================================ */
export const AXES: { id: Axis; label: string }[] = [
  { id: 'philosophy', label: 'Philosophy' },
  { id: 'career', label: 'Career' },
  { id: 'health', label: 'Health' },
  { id: 'investing', label: 'Investing' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'literature', label: 'Literature' },
];

const CX = 165;
const CY = 150;
const R = 100;
/** the labels sit this far outside the rim */
const LABEL_R = R + 26;
const RINGS = [0.33, 0.66, 1];
/** an empty spoke still shows a dot just off the centre, so the shape never collapses to a point */
const FLOOR = 0.06;

function pt(i: number, r: number): [number, number] {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / AXES.length;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}
const pts = (r: (i: number) => number) => AXES.map((_, i) => pt(i, r(i)).map((v) => v.toFixed(1)).join(',')).join(' ');

export function RadarChart({ values }: { values: Record<Axis, number> }) {
  const t = useT();
  const label = (id: Axis) => t.profile.axes[id];
  const v = (i: number) => Math.max(FLOOR, Math.min(1, values[AXES[i].id] || 0));
  const aria = AXES.map((a) => `${label(a.id)} ${Math.round((values[a.id] || 0) * 100)}%`).join(', ');
  return (
    <svg className="radar" viewBox="0 0 330 300" role="img" aria-label={fmt(t.profile.radarAria, { values: aria })}>
      {RINGS.map((f) => (
        <polygon key={f} className="grid" points={pts(() => R * f)} />
      ))}
      {AXES.map((a, i) => {
        const [x, y] = pt(i, R);
        return <line key={a.id} className="grid" x1={CX} y1={CY} x2={x.toFixed(1)} y2={y.toFixed(1)} />;
      })}
      <g className="radar-data">
        <polygon className="area" points={pts((i) => R * v(i))} />
        {AXES.map((a, i) => {
          const [x, y] = pt(i, R * v(i));
          return <circle key={a.id} className="pt" cx={x.toFixed(1)} cy={y.toFixed(1)} r="4" />;
        })}
      </g>
      {AXES.map((a, i) => {
        const [x, y] = pt(i, LABEL_R);
        return (
          <text key={a.id} x={x.toFixed(1)} y={y.toFixed(1)} textAnchor="middle" dominantBaseline="middle">
            {label(a.id)}
          </text>
        );
      })}
    </svg>
  );
}
