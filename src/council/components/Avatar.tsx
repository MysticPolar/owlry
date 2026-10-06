import { useState, type CSSProperties } from 'react';
import type { Figure } from '../content/types';
import { SEAT_HEX } from './Stage';

/* ============================================================
   The medallion: a portrait (grayscale, a little sepia) on the seat's
   colour inside a brass rim, or the thinker's initials when we have no
   licensed portrait. `seat` paints it in that chair's colour (centre
   ember, left quill, right moss); without one it takes the thinker's own.
   ============================================================ */
export function Avatar({
  figure,
  size = 46,
  seat,
  ring = false,
  className = '',
}: {
  figure: Figure;
  size?: number;
  /** 0 | 1 | 2 — colours the medallion like the chair on the stage */
  seat?: number;
  ring?: boolean;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const showImg = figure.portrait && !broken;
  const bg = seat !== undefined && seat >= 0 && seat < 3 ? SEAT_HEX[seat] : figure.color;
  // the rim takes the seat's colour, as the mockup's med() paints it; the size of the initials is a variable, so a
  // sizing class (.med.sm, .chip .dot .med) still wins
  return (
    <span
      className={`med ${ring ? 'ring' : ''} ${className}`}
      style={{ width: size, height: size, background: bg, borderColor: bg, '--med-fs': `${Math.round(size * 0.37)}px` } as CSSProperties}
      title={figure.name}
    >
      {/* the initials show first; the portrait fades over them once it has arrived */}
      <span className="mono" aria-hidden="true">
        {figure.initials}
      </span>
      {showImg && (
        <img
          src={figure.portrait}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          className={loaded ? 'loaded' : ''}
          onLoad={() => setLoaded(true)}
          ref={(el) => {
            if (el?.complete && el.naturalWidth > 0) setLoaded(true);
          }}
          onError={() => setBroken(true)}
        />
      )}
    </span>
  );
}

/* a monogram medallion for people in the social feed and the reader's own profile */
export function PersonAvatar({ initial, color, size = 36, className = '' }: { initial: string; color: string; size?: number; className?: string }) {
  return (
    <span className={`med ${className}`} style={{ width: size, height: size, background: color, borderColor: color, '--med-fs': `${Math.round(size * 0.4)}px` } as CSSProperties}>
      <span className="mono" aria-hidden="true">
        {initial}
      </span>
    </span>
  );
}
