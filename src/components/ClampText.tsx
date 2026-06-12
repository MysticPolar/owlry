import { useEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * Renders text clamped to `lines`, with a MORE + / LESS − toggle that only
 * appears when the text actually overflows the clamp.
 */
export function ClampText({
  lines,
  className,
  children,
}: {
  lines: number;
  className?: string;
  children: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      // only meaningful while collapsed (clamp applied)
      if (!expanded) setOverflowing(el.scrollHeight - el.clientHeight > 1);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [children, lines, expanded]);

  const style: CSSProperties = expanded
    ? {}
    : { display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical', overflow: 'hidden' };

  return (
    <>
      <p ref={ref} className={className} style={style}>
        {children}
      </p>
      {overflowing && (
        <button className="more-btn" aria-expanded={expanded} onClick={() => setExpanded((e) => !e)}>
          {expanded ? 'LESS −' : 'MORE +'}
        </button>
      )}
    </>
  );
}
