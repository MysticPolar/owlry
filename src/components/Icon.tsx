import type { CSSProperties } from 'react';

interface IconProps {
  /** icon name in the mockup's `ti-*` vocabulary, e.g. "ti-coin" (→ sprite id "#i-coin") */
  name: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Renders a Tabler outline icon from the inline SVG sprite shipped in index.html
 * (the Owl Theatre mockup's self-contained icon set — no CDN, no webfont). Sized
 * at 1em so `.ti { font-size }` controls size and `currentColor` controls stroke.
 * Call sites keep the `ti-*` names; we map them to sprite ids (`ti-coin` → `#i-coin`).
 */
export function Icon({ name, className, style }: IconProps) {
  const id = name.startsWith('ti-') ? `i-${name.slice(3)}` : name.startsWith('i-') ? name : `i-${name}`;
  return (
    <svg className={`ti ${name}${className ? ' ' + className : ''}`} width="1em" height="1em" aria-hidden="true" style={style}>
      <use href={`#${id}`} />
    </svg>
  );
}
