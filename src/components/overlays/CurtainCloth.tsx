import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

/* ============================================================
   THE CURTAIN — a canvas cloth simulation, ported 1:1 from the
   "complete onboarding" mockup (acts II & III share this engine).

   Three stacked canvases:
     · back  — the spotlight cone, floor pool, and drifting dust
     · front — the two velvet halves (spring physics, fold lighting),
               the soft centre seam, and the glowing eyes that watch
               through the slit and follow your finger
     · spark — the ember burst on "seal" / "enter"

   The halves gather on a damped spring (S.a: 0 closed → 1 open). While
   closed the cloth breathes, the hem sways, and five pairs of eyes blink
   on their own clocks and chase the pointer. When it parts, a gold
   leading edge lights up, the beam ramps, dust streams, and the eyes
   fade — revealing whatever the host has placed behind the front canvas.
   ============================================================ */

export interface CurtainHandle {
  raise: () => void;
  burst: (x: number, y: number, n?: number) => void;
}

const RM = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const VELVET: [number, number, number] = [148, 26, 38];
const CFG = {
  spring: { k: 26, damp: 7.5 }, // cloth momentum (higher damp = less swing)
  foldsPerHalf: 9, // velvet pleats at rest
  breathe: 1.6, // idle fold drift, px
  hemSway: 5, // extra sway at the hem, px
  beamAlpha: 0.14, // spotlight strength
  flicker: 0.07, // candle flicker depth
  eyeFollow: 0.1, // how eagerly the eyes chase the finger (0–1)
};

interface Eye {
  y: number;
  s: number;
  blink: number;
  nextBlink: number;
  jx: number;
  ph: number;
}
interface Mote {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  tw: number;
  life: number;
}
interface Spark {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  life: number;
  c: string;
}

interface Props {
  /** if set, the curtain waits this long, then rises on its own */
  autoRaiseMs?: number;
  /** how many dust motes ride the beam (act II 60, act III 88) */
  motes?: number;
  /** fired the moment the curtain commits to opening (tap or auto) */
  onRaise?: () => void;
  /** fired once the spring has fully settled open */
  onOpen?: () => void;
}

export const CurtainCloth = forwardRef<CurtainHandle, Props>(function CurtainCloth(
  { autoRaiseMs, motes = 88, onRaise, onOpen },
  ref,
) {
  const backRef = useRef<HTMLCanvasElement>(null);
  const frontRef = useRef<HTMLCanvasElement>(null);
  const sparkRef = useRef<HTMLCanvasElement>(null);
  const api = useRef<CurtainHandle>({ raise: () => {}, burst: () => {} });

  // keep the callbacks/props current without re-initialising the engine
  const cb = useRef({ onRaise, onOpen, autoRaiseMs, motes });
  cb.current = { onRaise, onOpen, autoRaiseMs, motes };

  useImperativeHandle(
    ref,
    () => ({
      raise: () => api.current.raise(),
      burst: (x, y, n) => api.current.burst(x, y, n),
    }),
    [],
  );

  useEffect(() => {
    const back = backRef.current;
    const front = frontRef.current;
    const spk = sparkRef.current;
    if (!back || !front || !spk) return;
    const bctx = back.getContext('2d')!;
    const fctx = front.getContext('2d')!;
    const sctx = spk.getContext('2d')!;
    const reduced = RM();
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;

    function measure() {
      W = front!.clientWidth;
      H = front!.clientHeight;
      for (const [c, x] of [
        [back!, bctx],
        [front!, fctx],
        [spk!, sctx],
      ] as const) {
        c.width = W * DPR;
        c.height = H * DPR;
        x.setTransform(DPR, 0, 0, DPR, 0, 0);
      }
    }
    measure();

    /* ---------- state ---------- */
    const S = {
      a: 0,
      av: 0,
      target: 0,
      phase: 'closed' as 'closed' | 'opening' | 'open',
      t: 0,
      last: performance.now(),
      gaze: { x: 0.5, y: 0.5 },
      gazeTarget: { x: 0.5, y: 0.45 },
      pointerAt: -9,
      wanderAt: 0,
      beam: 0,
      clearedOnce: false,
      eyes: [] as Eye[],
      motes: [] as Mote[],
      sparks: [] as Spark[],
    };
    const EYE_Y = [0.45, 0.53, 0.61, 0.68, 0.75];
    const EYE_S = [0.85, 1.1, 0.95, 1.18, 1.0];
    const EYE_JX = [-5, 4, -3, 5, -4];
    EYE_Y.forEach((y, i) =>
      S.eyes.push({ y, s: EYE_S[i], blink: 1, nextBlink: 1 + Math.random() * 3, jx: EYE_JX[i], ph: Math.random() * 6.28 }),
    );
    const newMote = (anywhere: boolean): Mote => ({
      x: W * 0.5 + (Math.random() - 0.5) * W * 0.7,
      y: anywhere ? Math.random() * H : H * (0.55 + Math.random() * 0.45),
      r: 0.8 + Math.random() * 1.7,
      vx: (Math.random() - 0.5) * 3,
      vy: -(4 + Math.random() * 9),
      tw: Math.random() * 6.28,
      life: 0.4 + Math.random() * 0.6,
    });
    for (let i = 0; i < cb.current.motes; i++) S.motes.push(newMote(true));

    /* ---------- the cloth ---------- */
    const shade = (base: [number, number, number], f: number) => {
      const l = 0.62 + 0.38 * f;
      return `rgb(${Math.round(base[0] * l)},${Math.round(base[1] * l)},${Math.round(base[2] * l)})`;
    };
    function drawHalf(side: number) {
      const n = 46;
      const half = W / 2;
      const gather = Math.min(S.a, 1.12);
      const overlap = 10 * Math.max(0, 1 - S.a * 5); // closed panels overlap like real curtains
      const inner = half * (1 - 0.94 * gather) + overlap;
      const swing = Math.sin(S.t * 2.6) * 6 * Math.max(0, S.av);
      const pts: { xT: number; xB: number; fold: number }[] = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n; // 0 outer → 1 inner
        const pin = Math.min(1, u / 0.14); // outer edge is pinned — no stage leak
        const fold = Math.cos(u * CFG.foldsPerHalf * 6.283 + (side > 0 ? 2.1 : 0.4));
        const wob = CFG.breathe * Math.sin(u * 7 + S.t * 1.3) * (1 - 0.5 * gather) * pin;
        const xf = u * inner + wob + u * swing;
        const hem = (CFG.hemSway + 4 * (1 - gather)) * Math.sin(u * 9 + S.t * 1.7 + side) * pin;
        pts.push({ xT: side < 0 ? xf : W - xf, xB: side < 0 ? xf + hem : W - xf - hem, fold });
      }
      for (let i = 0; i < n; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        fctx.beginPath();
        fctx.moveTo(a.xT, -2);
        fctx.lineTo(b.xT, -2);
        fctx.lineTo(b.xB, H + 8);
        fctx.lineTo(a.xB, H + 8);
        fctx.closePath();
        fctx.fillStyle = shade(VELVET, (a.fold + b.fold) / 2);
        fctx.fill();
      }
      // gold leading edge — only while the curtain is parting
      const trimA = Math.min(0.9, Math.max(0, (S.a - 0.04) * 7));
      if (trimA > 0.01) {
        const e = pts[n];
        fctx.strokeStyle = `rgba(232,180,58,${trimA.toFixed(3)})`;
        fctx.lineWidth = 3;
        fctx.beginPath();
        fctx.moveTo(e.xT, -2);
        fctx.lineTo(e.xB, H + 8);
        fctx.stroke();
      }
    }
    function drawSeam() {
      const a = Math.max(0, 1 - S.a * 4);
      if (a <= 0.01) return;
      const cx = W / 2;
      const g = fctx.createLinearGradient(cx - 14, 0, cx + 14, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, `rgba(0,0,0,${(0.34 * a).toFixed(3)})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      fctx.fillStyle = g;
      fctx.fillRect(cx - 14, 0, 28, H);
    }
    function drawEyes(alpha: number) {
      const cx = W / 2;
      fctx.save();
      fctx.globalAlpha = alpha;
      const gx = (S.gaze.x - 0.5) * 3.4;
      const gy = (S.gaze.y - 0.5) * 3.0;
      for (const e of S.eyes) {
        const s = e.s;
        const y = e.y * H + Math.sin(S.t * 0.9 + e.ph) * 2.2;
        const x = cx + e.jx;
        const hole = fctx.createRadialGradient(x, y, 1, x, y, 26 * s);
        hole.addColorStop(0, 'rgba(4,2,0,.96)');
        hole.addColorStop(0.55, 'rgba(8,3,1,.8)');
        hole.addColorStop(1, 'rgba(0,0,0,0)');
        fctx.fillStyle = hole;
        fctx.beginPath();
        fctx.ellipse(x, y, 15 * s, 25 * s, 0, 0, 6.283);
        fctx.fill();
        for (const dx of [-6.5 * s, 6.5 * s]) {
          const ex = x + dx;
          const glow = fctx.createRadialGradient(ex, y, 0, ex, y, 10 * s);
          glow.addColorStop(0, 'rgba(255,214,102,.95)');
          glow.addColorStop(0.45, 'rgba(255,192,23,.5)');
          glow.addColorStop(1, 'rgba(255,192,23,0)');
          fctx.fillStyle = glow;
          fctx.beginPath();
          fctx.ellipse(ex, y, 9.5 * s, 9.5 * s * e.blink, 0, 0, 6.283);
          fctx.fill();
          fctx.fillStyle = '#FFE9A8';
          fctx.beginPath();
          fctx.ellipse(ex, y, 3.7 * s, 3.7 * s * e.blink, 0, 0, 6.283);
          fctx.fill();
          fctx.fillStyle = '#170F05';
          fctx.beginPath();
          fctx.ellipse(ex + gx, y + gy * 0.8, 1.9 * s, 1.9 * s * e.blink, 0, 0, 6.283);
          fctx.fill();
        }
      }
      fctx.restore();
    }

    /* ---------- light & dust (back canvas) ---------- */
    function drawLight(dt: number) {
      bctx.clearRect(0, 0, W, H);
      if (S.beam <= 0.01) return;
      const fl = 1 - CFG.flicker + CFG.flicker * (Math.sin(S.t * 9.3) * 0.5 + Math.sin(S.t * 23.7) * 0.3 + 0.5);
      const I = S.beam * fl;
      bctx.save();
      bctx.globalCompositeOperation = 'lighter';
      const g = bctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, `rgba(255,216,106,${(CFG.beamAlpha * I).toFixed(3)})`);
      g.addColorStop(0.7, `rgba(255,192,23,${(CFG.beamAlpha * 0.4 * I).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,192,23,0)');
      bctx.fillStyle = g;
      bctx.beginPath();
      bctx.moveTo(W / 2, -30);
      bctx.lineTo(W * 0.06, H);
      bctx.lineTo(W * 0.94, H);
      bctx.closePath();
      bctx.fill();
      const fg = bctx.createRadialGradient(W / 2, H * 1.02, 10, W / 2, H * 1.02, W * 0.62);
      fg.addColorStop(0, `rgba(255,192,23,${(0.2 * I).toFixed(3)})`);
      fg.addColorStop(1, 'rgba(255,192,23,0)');
      bctx.fillStyle = fg;
      bctx.fillRect(0, H * 0.55, W, H * 0.45);
      for (const m of S.motes) {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.tw += dt * 2.2;
        m.x += Math.sin(m.tw) * 0.18;
        if (m.y < -6 || m.x < -6 || m.x > W + 6) Object.assign(m, newMote(false));
        const inCone = Math.abs(m.x - W / 2) < (m.y / H) * W * 0.44 + 12;
        const a = (inCone ? 0.5 : 0.12) * m.life * I * (0.6 + 0.4 * Math.sin(m.tw * 1.7));
        if (a <= 0) continue;
        bctx.fillStyle = `rgba(255,224,140,${Math.max(0, a).toFixed(3)})`;
        bctx.beginPath();
        bctx.arc(m.x, m.y, m.r, 0, 6.283);
        bctx.fill();
      }
      bctx.restore();
    }

    /* ---------- sparks (their own top canvas) ---------- */
    function burst(x: number, y: number, n = 30) {
      if (reduced) return;
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
        const sp = 130 + Math.random() * 210;
        S.sparks.push({
          x,
          y,
          px: x,
          py: y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          life: 0.65 + Math.random() * 0.45,
          c: Math.random() < 0.6 ? '255,192,23' : '255,122,64',
        });
      }
    }
    function drawSparks(dt: number) {
      sctx.clearRect(0, 0, W, H);
      if (!S.sparks.length) return;
      sctx.save();
      sctx.globalCompositeOperation = 'lighter';
      sctx.lineCap = 'round';
      for (const s of S.sparks) {
        s.px = s.x;
        s.py = s.y;
        s.vy += 340 * dt;
        s.vx *= 1 - 1.6 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt;
        sctx.strokeStyle = `rgba(${s.c},${Math.max(0, s.life * 1.3).toFixed(3)})`;
        sctx.lineWidth = 2.1;
        sctx.beginPath();
        sctx.moveTo(s.px, s.py);
        sctx.lineTo(s.x, s.y);
        sctx.stroke();
      }
      sctx.restore();
      S.sparks = S.sparks.filter((s) => s.life > 0 && s.y < H + 20);
    }

    /* ---------- the loop ---------- */
    let raf = 0;
    let opened = false;
    function frame(now: number) {
      const dt = Math.min((now - S.last) / 1000, 0.05);
      S.last = now;
      S.t += dt;
      // spring the curtain
      const acc = CFG.spring.k * (S.target - S.a) - CFG.spring.damp * S.av;
      S.av += acc * dt;
      S.a += S.av * dt;
      if (S.phase === 'opening' && Math.abs(S.target - S.a) < 0.004 && Math.abs(S.av) < 0.01) {
        S.a = S.target;
        S.av = 0;
        S.phase = 'open';
        if (!opened) {
          opened = true;
          cb.current.onOpen?.();
        }
      }
      // eyes wander, then chase the finger
      if (S.phase === 'closed') {
        if (S.t - S.pointerAt > 2.2 && S.t > S.wanderAt) {
          S.gazeTarget = { x: 0.3 + Math.random() * 0.4, y: 0.35 + Math.random() * 0.3 };
          S.wanderAt = S.t + 1.4 + Math.random() * 2.2;
        }
        const f = S.t - S.pointerAt < 2.2 ? CFG.eyeFollow : 0.035;
        S.gaze.x += (S.gazeTarget.x - S.gaze.x) * f;
        S.gaze.y += (S.gazeTarget.y - S.gaze.y) * f;
        for (const e of S.eyes) {
          e.nextBlink -= dt;
          e.blink = e.nextBlink < 0.1 ? Math.max(0.06, e.blink - dt * 14) : Math.min(1, e.blink + dt * 10);
          if (e.nextBlink < -0.12) e.nextBlink = 1.6 + Math.random() * 3.4;
        }
      }
      // beam ramps once the curtain commits
      const beamTarget = S.phase === 'opening' || S.phase === 'open' ? 1 : 0;
      S.beam += (beamTarget - S.beam) * Math.min(1, dt * 1.4);
      drawLight(dt);
      // front canvas: cloth + eyes
      const clothNeeded = S.a < 1.005 || Math.abs(S.av) > 0.003 || S.phase !== 'open';
      if (clothNeeded) {
        fctx.clearRect(0, 0, W, H);
        if (S.a < 1.06) {
          drawHalf(1);
          drawHalf(-1);
          drawSeam();
          // vertical stage-light shading, on the fabric only
          fctx.save();
          fctx.globalCompositeOperation = 'source-atop';
          const sg = fctx.createLinearGradient(0, 0, 0, H);
          sg.addColorStop(0, 'rgba(0,0,0,.42)');
          sg.addColorStop(0.24, 'rgba(0,0,0,.04)');
          sg.addColorStop(0.6, 'rgba(0,0,0,.12)');
          sg.addColorStop(1, 'rgba(0,0,0,.5)');
          fctx.fillStyle = sg;
          fctx.fillRect(0, 0, W, H);
          fctx.restore();
          if (S.a < 0.42) drawEyes(Math.max(0, 1 - S.a * 2.6));
        }
      } else if (S.phase === 'open' && !S.clearedOnce) {
        fctx.clearRect(0, 0, W, H);
        S.clearedOnce = true;
      }
      drawSparks(dt);
      raf = requestAnimationFrame(frame);
    }

    /* ---------- direction ---------- */
    let autoTimer: ReturnType<typeof setTimeout> | undefined;
    let raised = false;
    function raise() {
      if (raised) return;
      raised = true;
      clearTimeout(autoTimer);
      cb.current.onRaise?.();
      if (reduced) {
        S.a = 1;
        S.beam = 1;
        S.phase = 'open';
        fctx.clearRect(0, 0, W, H);
        drawLight(0);
        cb.current.onOpen?.();
        return;
      }
      S.target = 1;
      S.phase = 'opening';
    }
    api.current = { raise, burst };

    /* ---------- pointer → the eyes follow ---------- */
    const host = front.parentElement;
    const onMove = (e: PointerEvent) => {
      const r = front.getBoundingClientRect();
      S.gazeTarget.x = (e.clientX - r.left) / r.width;
      S.gazeTarget.y = (e.clientY - r.top) / r.height;
      S.pointerAt = S.t;
    };
    host?.addEventListener('pointermove', onMove, { passive: true });

    /* ---------- resize ---------- */
    const ro = new ResizeObserver(() => {
      measure();
      if (reduced) {
        fctx.clearRect(0, 0, W, H);
        drawHalf(-1);
        drawHalf(1);
        drawSeam();
        drawEyes(1);
      }
    });
    ro.observe(front);

    /* ---------- boot ---------- */
    if (reduced) {
      fctx.clearRect(0, 0, W, H);
      drawHalf(-1);
      drawHalf(1);
      drawSeam();
      drawEyes(1);
    } else {
      S.last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    if (cb.current.autoRaiseMs != null) {
      autoTimer = setTimeout(raise, cb.current.autoRaiseMs);
    }
    const onVis = () => {
      S.last = performance.now();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(autoTimer);
      ro.disconnect();
      host?.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <canvas ref={backRef} className="ob-cv ob-cv-back" aria-hidden="true" />
      <canvas ref={frontRef} className="ob-cv ob-cv-front" aria-hidden="true" />
      <canvas ref={sparkRef} className="ob-cv ob-cv-spk" aria-hidden="true" />
    </>
  );
});
