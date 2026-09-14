import { useEffect, useState } from 'react';

function editableHasFocus(): boolean {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return false;
  if (active.isContentEditable) return true;
  return active.matches('input:not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, select');
}

/**
 * Height (px) of the on-screen keyboard overlapping the layout viewport,
 * via visualViewport. 0 on desktop and on platforms that resize the layout
 * viewport themselves; on iOS Safari it keeps the chat composer sitting
 * right above the keyboard.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!editableHasFocus()) {
          setInset(0);
          return;
        }
        const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        setInset(kb > 80 ? Math.round(kb) : 0);
      });
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, []);
  return inset;
}
