import type { Axis } from '../content/types';

/* ============================================================
   The reading-profile radar: six spokes for the six areas, a soft yellow
   fill. It describes what you read, not who you are.
   ============================================================ */
export const AXES: { id: Axis; label: string }[] = [
  { id: 'philosophy', label: 'Philosophy' },
  { id: 'career', label: 'Career' },
  { id: 'health', label: 'Health' },
  { id: 'investing', label: 'Investing' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'literature', label: 'Literature' },
];

const CX = 190;
const CY = 140;
const R = 92;
const LR = 116;

function pt(i: number, f: number): [number, number] {
  const a = (Math.PI / 180) * (i * 60 - 90);
  return [CX + R * f * Math.cos(a), CY + R * f * Math.sin(a)];
}
const ring = (f: number) => AXES.map((_, i) => pt(i, f).map((v) => v.toFixed(1)).join(',')).join(' ');

export function RadarChart({ values }: { values: Record<Axis, number> }) {
  const poly = AXES.map((a, i) => pt(i, Math.max(0.06, values[a.id])).map((v) => v.toFixed(1)).join(',')).join(' ');
  const aria = AXES.map((a) => `${a.label} ${Math.round(values[a.id] * 100)}%`).join(', ');
  return (
    <svg className="radar" viewBox="0 0 380 280" role="img" aria-label={`Reading profile: ${aria}`}>
      {[1, 0.75, 0.5, 0.25].map((f) => (
        <polygon key={f} points={ring(f)} fill={f === 1 ? 'var(--paper-2)' : 'none'} stroke="var(--line-2)" strokeWidth="1" />
      ))}
      {AXES.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="var(--line-2)" strokeWidth="1" />;
      })}
      <polygon points={poly} fill="rgba(255, 209, 0, 0.55)" stroke="var(--yellow-2)" strokeWidth="2" strokeLinejoin="round" className="radar-data" />
      {AXES.map((a, i) => {
        const [x, y] = pt(i, Math.max(0.06, values[a.id]));
        return <circle key={a.id} cx={x} cy={y} r="3.5" fill="var(--yellow-2)" stroke="#fff" strokeWidth="1.5" />;
      })}
      {AXES.map((a, i) => {
        const ang = (Math.PI / 180) * (i * 60 - 90);
        const x = CX + LR * Math.cos(ang);
        const y = CY + LR * Math.sin(ang);
        const anchor = i === 0 || i === 3 ? 'middle' : i < 3 ? 'start' : 'end';
        return (
          <text key={a.id} x={x} y={y + 4} textAnchor={anchor} fontSize="11.5" fontWeight="600" fill="var(--ink-2)" fontFamily="var(--font-ui)">
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}
