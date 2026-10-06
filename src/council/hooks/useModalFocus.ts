import { useEffect, useRef, type RefObject } from 'react';

/* ============================================================
   Modal focus management: moves focus in, traps Tab, closes on Escape,
   restores focus on close. Give the container tabIndex={-1}.
   ============================================================ */
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function useModalFocus(open: boolean, onClose: (() => void) | null, ref: RefObject<HTMLElement | null>) {
  const restoreRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const el = ref.current;
    if (!el) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const visible = () =>
      Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetWidth > 0 || n.offsetHeight > 0 || n === document.activeElement,
      );
    const initial = el.querySelector<HTMLElement>('[data-autofocus]') ?? el;
    initial.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCloseRef.current) {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = visible();
      if (!items.length) {
        e.preventDefault();
        el.focus({ preventScroll: true });
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === el)) {
        e.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      const r = restoreRef.current;
      if (r && r.isConnected) r.focus({ preventScroll: true });
    };
  }, [open, ref]);
}
