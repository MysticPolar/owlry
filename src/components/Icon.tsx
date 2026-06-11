import type { CSSProperties } from 'react';

interface IconProps {
  /** tabler icon class, e.g. "ti-coin" */
  name: string;
  className?: string;
  style?: CSSProperties;
}

/** Tabler webfont glyph. Decorative by default (aria-hidden). */
export function Icon({ name, className, style }: IconProps) {
  return <i className={`ti ${name}${className ? ' ' + className : ''}`} style={style} aria-hidden="true" />;
}
