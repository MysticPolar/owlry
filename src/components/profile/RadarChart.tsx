import { DIMS } from '../../content/profile';

const RCX = 176;
const RCY = 132;
const RR = 84;
const RLR = 104;

const rpt = (i: number, f: number): [number, number] => {
  const a = (Math.PI / 180) * (i * 60 - 90);
  return [RCX + RR * f * Math.cos(a), RCY + RR * f * Math.sin(a)];
};
const ringPts = (f: number) =>
  DIMS.map((_, i) => rpt(i, f).map((n) => n.toFixed(1)).join(',')).join(' ');

const ANCH: ('middle' | 'start' | 'end')[] = ['middle', 'start', 'start', 'middle', 'end', 'end'];

const ARIA = `Radar chart of reading balance: ${DIMS.map(([n, v]) => `${n} ${v}`).join(', ')}`;

/**
 * The "reading balance" radar (mockup buildRadar). `replayKey` remounts
 * the data group so the CSS pop animation (.radar.go #rg) re-runs.
 */
export function RadarChart({ replayKey }: { replayKey: number }) {
  const dataPoints = DIMS.map(([, v], i) => rpt(i, v / 100).map((n) => n.toFixed(1)).join(',')).join(' ');

  return (
    <svg className="radar-svg" id="radarSvg" viewBox="0 0 352 264" role="img" aria-label={ARIA}>
      <polygon points={ringPts(1)} fill="var(--cream)" stroke="var(--ink)" strokeWidth={2} />
      {[0.75, 0.5, 0.25].map((f) => (
        <polygon key={f} points={ringPts(f)} fill="none" stroke="var(--paper2)" strokeWidth={1.5} />
      ))}
      {DIMS.map((_, i) => {
        const [x, y] = rpt(i, 1);
        return (
          <line
            key={i}
            x1={RCX}
            y1={RCY}
            x2={+x.toFixed(1)}
            y2={+y.toFixed(1)}
            stroke="var(--paper2)"
            strokeWidth={1.5}
          />
        );
      })}
      <g id="rg" key={replayKey}>
        <polygon
          points={dataPoints}
          fill="rgba(21,109,68,.18)"
          stroke="var(--green)"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        {DIMS.map(([, v], i) => {
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
              fill="var(--yellow)"
              stroke="var(--ink)"
              strokeWidth={1.5}
            />
          );
        })}
      </g>
      {DIMS.map(([name, v], i) => {
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
              fill="var(--fade)"
              style={{ font: '800 10px "Inter Tight",sans-serif', letterSpacing: '1px', textTransform: 'uppercase' }}
            >
              {name.toUpperCase()}
            </text>
            <text
              x={+lx.toFixed(1)}
              y={+vy.toFixed(1)}
              textAnchor={ANCH[i]}
              fill="var(--ink)"
              style={{ font: '800 13px "Bricolage Grotesque",sans-serif' }}
            >
              {v}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
