import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

/* ============================================================
   The celebration confetti — a 1:1 port of the mockup's act-IV
   `#cel` canvas. burst() throws particles up in a spread; each
   falls under gravity, fading. In confetti mode they come in four
   colours (ember/flame/violet/teal) as spinning rects and ribbon
   lines; otherwise two-colour ribbons. Runs a RAF only while
   particles are alive, then stops and clears itself.
   ============================================================ */

export interface ConfettiHandle {
  burst: (x: number, y: number, n: number, confetti?: boolean) => void;
}

const RM = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const COLORS = ['255,192,23', '255,122,64', '166,138,240', '63,191,173'];

interface Part {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  life: number;
  rot: number;
  vr: number;
  shape: 'r' | 'l';
  c: string;
}

export const Confetti = forwardRef<ConfettiHandle, { className?: string }>(function Confetti({ className }, ref) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const api = useRef<ConfettiHandle>({ burst: () => {} });

  useImperativeHandle(ref, () => ({ burst: (x, y, n, c) => api.current.burst(x, y, n, c) }), []);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    const reduced = RM();
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;
    const measure = () => {
      W = cv.clientWidth;
      H = cv.clientHeight;
      cv.width = W * DPR;
      cv.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    measure();

    let parts: Part[] = [];
    let raf = 0;
    let rafOn = false;
    let last = 0;

    function loop(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (const p of parts) {
        p.px = p.x;
        p.py = p.y;
        p.vy += 300 * dt;
        p.vx *= 1 - 1.3 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        p.rot += p.vr * dt;
        const a = Math.max(0, Math.min(1, p.life * 1.2)).toFixed(3);
        if (p.shape === 'r') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = `rgba(${p.c},${a})`;
          ctx.fillRect(-3, -2, 6, 4);
          ctx.restore();
        } else {
          ctx.strokeStyle = `rgba(${p.c},${a})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(p.px, p.py);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      }
      ctx.restore();
      parts = parts.filter((p) => p.life > 0 && p.y < H + 30);
      if (parts.length) {
        raf = requestAnimationFrame(loop);
      } else {
        rafOn = false;
        ctx.clearRect(0, 0, W, H);
      }
    }

    function burst(x: number, y: number, n: number, confetti = false) {
      if (reduced) return;
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + (Math.random() - 0.5) * (confetti ? 3.4 : 2.6);
        const sp = 130 + Math.random() * 230;
        parts.push({
          x,
          y,
          px: x,
          py: y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          life: 0.7 + Math.random() * 0.6,
          rot: Math.random() * 6.28,
          vr: (Math.random() - 0.5) * 10,
          shape: confetti && Math.random() < 0.5 ? 'r' : 'l',
          c: COLORS[Math.floor(Math.random() * (confetti ? 4 : 2))],
        });
      }
      if (!rafOn) {
        rafOn = true;
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    }
    api.current = { burst };

    const ro = new ResizeObserver(measure);
    ro.observe(cv);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={cvRef} className={`ob-cel${className ? ' ' + className : ''}`} aria-hidden="true" />;
});
