import { DIMS } from '../../content/profile';
import { useLang, useT } from '../../i18n/react';

const RCX = 176;
const RCY = 132;
const RR = 84;
const RLR = 104;

const rpt = (i: number, f: number): [number, number] => {
  const a = (Math.PI / 180) * (i * 60 - 90);
  return [RCX + RR * f * Math.cos(a), RCY + RR * f * Math.sin(a)];
};
/* geometry only depends on the (shared) values — computed off the en list */
const ringPts = (f: number) =>
  DIMS.en.map((_, i) => rpt(i, f).map((n) => n.toFixed(1)).join(',')).join(' ');

const ANCH: ('middle' | 'start' | 'end')[] = ['middle', 'start', 'start', 'middle', 'end', 'end'];

/**
 * The "reading balance" radar (mockup buildRadar). `replayKey` remounts
 * the data group so the CSS pop animation (.radar.go #rg) re-runs.
 */
export function RadarChart({ replayKey }: { replayKey: number }) {
  const t = useT();
  const dims = DIMS[useLang()];
  const dataPoints = dims.map(([, v], i) => rpt(i, v / 100).map((n) => n.toFixed(1)).join(',')).join(' ');
  const aria = t.profile.radarAria(dims.map(([n, v]) => `${n} ${v}`).join(', '));

  return (
    <svg className="radar-svg" id="radarSvg" viewBox="0 0 352 264" role="img" aria-label={aria}>
      <polygon points={ringPts(1)} fill="var(--pb-paper-dim)" stroke="var(--pb-paper-line)" strokeWidth={1.5} />
      {[0.75, 0.5, 0.25].map((f) => (
        <polygon key={f} points={ringPts(f)} fill="none" stroke="var(--pb-paper-line)" strokeWidth={1.5} />
      ))}
      {dims.map((_, i) => {
        const [x, y] = rpt(i, 1);
        return (
          <line
            key={i}
            x1={RCX}
            y1={RCY}
            x2={+x.toFixed(1)}
            y2={+y.toFixed(1)}
            stroke="var(--pb-paper-line)"
            strokeWidth={1.5}
          />
        );
      })}
      <g id="rg" key={replayKey}>
        <polygon
          points={dataPoints}
          fill="var(--pb-radar-fill)"
          stroke="var(--pb-owl-violet)"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        {dims.map(([, v], i) => {
          const [x, y] = rpt(i, v / 100);
          return (
            <rect
              key={i}
              x={-4}
              y={-4}
              width={8}
              height={8}
              rx={1.5}
              transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(45)`}
              fill="var(--pb-brass)"
              stroke="var(--pb-ink)"
              strokeWidth={1.5}
            />
          );
        })}
      </g>
      {dims.map(([name, v], i) => {
        const a = (Math.PI / 180) * (i * 60 - 90);
        const lx = RCX + RLR * Math.cos(a);
        const ly = RCY + RLR * Math.sin(a);
        let ny: number;
        let vy: number;
        if (i === 0) {
          ny = 20;
          vy = 34;
        } else if (i === 3) {
          ny = ly + 2;
          vy = ly + 16;
        } else {
          ny = ly - 3;
          vy = ly + 11;
        }
        return (
          <g key={i}>
            <text
              x={+lx.toFixed(1)}
              y={+ny.toFixed(1)}
              textAnchor={ANCH[i]}
              fill="var(--pb-ink-mute)"
              style={{ font: '800 8.5px "Inter Tight",sans-serif', letterSpacing: '1px', textTransform: 'uppercase' }}
            >
              {name.toUpperCase()}
            </text>
            <text
              x={+lx.toFixed(1)}
              y={+vy.toFixed(1)}
              textAnchor={ANCH[i]}
              fill="var(--pb-ink)"
              style={{ font: '400 14px "Anton",sans-serif' }}
            >
              {v}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
