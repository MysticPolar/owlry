import { useLayoutEffect, useRef, useState } from 'react';

export type SegOption<T extends string> = { id: T; label: string; lang?: string };

/* ============================================================
   A segmented control whose active pill slides to the chosen option
   instead of jumping. Measures the active button, so the options can be
   any width (and change width when the language does).
   `tabs` renders it as a tablist; otherwise it is a group of toggles.
   ============================================================ */
export function Seg<T extends string>({
  options,
  value,
  onChange,
  label,
  tabs = false,
  className = '',
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
  tabs?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const measure = () => {
      const on = root.querySelector<HTMLElement>('button[data-on="true"]');
      setPill(on ? { x: on.offsetLeft, w: on.offsetWidth } : null);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [value, options]);

  return (
    <div ref={ref} className={`seg ${className}`} role={tabs ? 'tablist' : 'group'} aria-label={label}>
      {pill && <span className="seg-pill" aria-hidden="true" style={{ transform: `translateX(${pill.x}px)`, width: pill.w }} />}
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role={tabs ? 'tab' : undefined}
            aria-selected={tabs ? on : undefined}
            aria-pressed={tabs ? undefined : on}
            className={on ? 'on' : ''}
            data-on={on ? 'true' : 'false'}
            lang={o.lang}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
