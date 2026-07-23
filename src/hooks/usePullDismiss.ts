import { useEffect, type RefObject } from 'react';

/* ============================================================
   Swipe-down-to-dismiss for a slide-up overlay.

   Drag from the header (`grabRef`) and the card (`cardRef`) follows your finger
   with a little resistance; past ~90px it calls `onClose`, otherwise it springs
   back via the card's own CSS transform-transition. Only engages when the scroll
   body (`scrollRef`) is at the top, so it never fights content scrolling, and it
   drives the card's *inline* transform only while dragging (the overlay's normal
   open/close animation owns it the rest of the time). No-op under reduced motion.

   Touch-only by design — pointer/mouse users have the button + Esc.
   ============================================================ */
export function usePullDismiss(opts: {
  enabled: boolean;
  onClose: () => void;
  cardRef: RefObject<HTMLElement | null>;
  grabRef: RefObject<HTMLElement | null>;
  scrollRef?: RefObject<HTMLElement | null>;
  reduce?: boolean;
}) {
  const { enabled, onClose, cardRef, grabRef, scrollRef, reduce } = opts;

  useEffect(() => {
    if (!enabled || reduce) return;
    const grab = grabRef.current;
    const card = cardRef.current;
    if (!grab || !card) return;

    const THRESHOLD = 90;
    let startY = 0;
    let dy = 0;
    let dragging = false;
    let closeTimer = 0;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const sc = scrollRef?.current;
      if (sc && sc.scrollTop > 2) return; // let the body scroll first
      startY = e.touches[0].clientY;
      dy = 0;
      dragging = true;
      card.style.transition = 'none';
    };
    const onMove = (e: TouchEvent) => {
      if (!dragging) return;
      dy = e.touches[0].clientY - startY;
      if (dy <= 0) {
        dy = 0;
        card.style.transform = '';
        return;
      }
      // 1:1 for the first ~130px, then resistance
      const damped = dy < 130 ? dy : 130 + (dy - 130) * 0.4;
      card.style.transform = `translateY(${damped}px)`;
    };
    const finish = () => {
      if (!dragging) return;
      dragging = false;
      // clearing the inline transition restores the card's CSS transform-transition
      card.style.transition = '';
      if (dy > THRESHOLD) {
        // continue the dismiss the rest of the way down, then unmount — no bounce
        card.style.transform = 'translateY(100%)';
        closeTimer = window.setTimeout(() => {
          card.style.transform = '';
          onClose();
        }, 260);
      } else {
        card.style.transform = ''; // spring back to the open position
      }
    };

    grab.addEventListener('touchstart', onStart, { passive: true });
    grab.addEventListener('touchmove', onMove, { passive: true });
    grab.addEventListener('touchend', finish);
    grab.addEventListener('touchcancel', finish);
    return () => {
      grab.removeEventListener('touchstart', onStart);
      grab.removeEventListener('touchmove', onMove);
      grab.removeEventListener('touchend', finish);
      grab.removeEventListener('touchcancel', finish);
      window.clearTimeout(closeTimer);
      card.style.transform = '';
      card.style.transition = '';
    };
  }, [enabled, onClose, cardRef, grabRef, scrollRef, reduce]);
}
