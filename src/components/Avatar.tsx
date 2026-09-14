import { useState } from 'react';
import type { Figure } from '../content/types';

/* portrait if we have a licensed one, else a monogram on the figure's colour */
export function Avatar({
  figure,
  size = 40,
  ring = false,
  className = '',
}: {
  figure: Figure;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const showImg = figure.portrait && !broken;
  return (
    <span
      className={`avatar ${ring ? 'ring' : ''} ${className}`}
      style={{ width: size, height: size, background: figure.color }}
      title={figure.name}
    >
      {showImg ? (
        <img src={figure.portrait} alt="" width={size} height={size} loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <span className="mono" style={{ fontSize: Math.round(size * 0.42) }} aria-hidden="true">
          {figure.initials}
        </span>
      )}
    </span>
  );
}

/* a monogram avatar for people in the social feed */
export function PersonAvatar({ initial, color, size = 36 }: { initial: string; color: string; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, background: color }}>
      <span className="mono" style={{ fontSize: Math.round(size * 0.44) }} aria-hidden="true">
        {initial}
      </span>
    </span>
  );
}
