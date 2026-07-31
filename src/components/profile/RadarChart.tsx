import { DIMS, type RadarDim } from '../../content/profile';
import { useLang, useT } from '../../i18n/react';

const RCX = 176;
const RCY = 132;
const RR = 84;
const RLR = 104;

/** label text-anchor per spoke (n=5 pentagon, index 0 at top) */
const ANCH5: ('middle' | 'start' | 'end')[] = ['middle', 'start', 'start', 'end', 'end'];

function spokeAngle(i: number, n: number): number {
  return (Math.PI / 180) * (i * (360 / Math.max(1, n)) - 90);
}

const rpt = (i: number, f: number, n: number): [number, number] => {
  const a = spokeAngle(i, n);
  return [RCX + RR * f * Math.cos(a), RCY + RR * f * Math.sin(a)];
};

const ringPts = (f: number, n: number) =>
  Array.from({ length: n }, (_, i) => rpt(i, f, n).map((v) => v.toFixed(1)).join(',')).join(' ');

/**
 * The "reading balance" radar (mockup buildRadar). `replayKey` remounts
 * the data group so the CSS pop animation (.radar.go #rg) re-runs.
 * Pass `dims` for a signed-in snapshot; omit to keep the guest seed.
 * Geometry follows dims.length (five life pillars → pentagon).
 */
export function RadarChart({
  replayKey,
  dims: dimsProp,
}: {
  replayKey: number;
  dims?: RadarDim[];
}) {
  const t = useT();
  const dims = dimsProp ?? DIMS[useLang()];
  const n = Math.max(1, dims.length);
  const anch = n === 5 ? ANCH5 : dims.map((_, i) => {
    // fallback for unexpected lengths: top/bottom middle, right start, left end
    if (i === 0 || i === Math.floor(n / 2)) return 'middle' as const;
    return i < n / 2 ? 'start' as const : 'end' as const;
  });
  const dataPoints = dims.map(([, v], i) => rpt(i, v / 100, n).map((x) => x.toFixed(1)).join(',')).join(' ');
  const aria = t.profile.radarAria(dims.map(([name, v]) => `${name} ${v}`).join(', '));

  return (
    <svg className="radar-svg" id="radarSvg" viewBox="0 0 352 264" role="img" aria-label={aria}>
      <polygon points={ringPts(1, n)} fill="var(--pb-paper-dim)" stroke="var(--pb-paper-line)" strokeWidth={1.5} />
      {[0.75, 0.5, 0.25].map((f) => (
        <polygon key={f} points={ringPts(f, n)} fill="none" stroke="var(--pb-paper-line)" strokeWidth={1.5} />
      ))}
      {dims.map((_, i) => {
        const [x, y] = rpt(i, 1, n);
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
          const [x, y] = rpt(i, v / 100, n);
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
        const a = spokeAngle(i, n);
        const lx = RCX + RLR * Math.cos(a);
        const ly = RCY + RLR * Math.sin(a);
        let ny: number;
        let vy: number;
        if (i === 0) {
          ny = 20;
          vy = 34;
        } else if (n === 5 && i === 3) {
          // bottom-leftish happiness spoke
          ny = ly + 4;
          vy = ly + 18;
        } else if (n === 5 && i === 2) {
          ny = ly + 4;
          vy = ly + 18;
        } else {
          ny = ly - 3;
          vy = ly + 11;
        }
        return (
          <g key={i}>
            <text
              x={+lx.toFixed(1)}
              y={+ny.toFixed(1)}
              textAnchor={anch[i]}
              fill="var(--pb-ink-mute)"
              /* 13 viewBox units: the chart is capped at 300px against a 352
                 viewBox, so this renders at ~11px — the axis labels sit just
                 under the text floor because they are chart furniture, read
                 alongside the shape rather than as running text. */
              style={{ font: '600 13px var(--font-chrome)', letterSpacing: 'var(--track-label)', textTransform: 'uppercase' }}
            >
              {name.toUpperCase()}
            </text>
            <text
              x={+lx.toFixed(1)}
              y={+vy.toFixed(1)}
              textAnchor={anch[i]}
              fill="var(--pb-ink)"
              style={{ font: '600 17px var(--font-display)' }}
            >
              {v}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
