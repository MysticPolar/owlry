import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/react';
import { Icon } from './Icon';

interface Anchor {
  x: number;
  y: number;
  /** flipped below the selection when it starts too close to the top */
  below: boolean;
  text: string;
}

/**
 * The selection action bar — select any text in the house (a title, an author,
 * a line of chat, a summary) and a small glass rail appears above it:
 * Copy · Save quote · Ask. One Playbill glass object, anchored to the words.
 */
export function SelectionBar() {
  const t = useT().today.chrome.selection;
  const showToast = useStore((s) => s.showToast);
  const saveQuote = useStore((s) => s.saveQuote);
  const askText = useStore((s) => s.askText);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const debounce = useRef<number>(0);

  useEffect(() => {
    const clear = () => setAnchor(null);

    const read = () => {
      const sel = window.getSelection();
      const app = document.getElementById('app');
      if (!sel || sel.isCollapsed || !app) return clear();
      const text = sel.toString().trim();
      if (text.length < 2) return clear();
      // native form fields manage their own selection UI
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable))
        return clear();
      // only selections that live inside the app surface
      const node = sel.anchorNode;
      const el = node && (node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement));
      if (!el || !app.contains(el)) return clear();

      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (!rect.width && !rect.height) return clear();
      const box = app.getBoundingClientRect();
      const below = rect.top - box.top < 56;
      setAnchor({
        x: Math.min(Math.max(rect.left - box.left + rect.width / 2, 124), box.width - 124),
        y: below ? rect.bottom - box.top + 10 : rect.top - box.top - 46,
        below,
        text,
      });
    };

    const onSelection = () => {
      window.clearTimeout(debounce.current);
      debounce.current = window.setTimeout(read, 180);
    };
    document.addEventListener('selectionchange', onSelection);
    // any scroll under the bar would strand it — stand down instead of chasing
    document.addEventListener('scroll', clear, { capture: true, passive: true });
    return () => {
      document.removeEventListener('selectionchange', onSelection);
      document.removeEventListener('scroll', clear, { capture: true });
      window.clearTimeout(debounce.current);
    };
  }, []);

  if (!anchor) return null;

  const dismiss = () => {
    window.getSelection()?.removeAllRanges();
    setAnchor(null);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(anchor.text);
      showToast('ti-copy', t.copied, 'scribe');
    } catch {
      /* clipboard denied — the selection stays for the native menu */
    }
    dismiss();
  };

  const keep = () => {
    saveQuote();
    dismiss();
  };

  const ask = () => {
    askText(anchor.text);
    dismiss();
  };

  return (
    <div
      ref={barRef}
      className="pb-selbar"
      role="toolbar"
      aria-label={t.aria}
      style={{ left: anchor.x, top: anchor.y }}
      // keep the selection alive while tapping the bar
      onMouseDown={(e) => e.preventDefault()}
    >
      <button type="button" onClick={copy}>
        <Icon name="ti-copy" />
        {t.copy}
      </button>
      <button type="button" onClick={keep}>
        <Icon name="ti-quote" />
        {t.saveQuote}
      </button>
      <button type="button" onClick={ask}>
        <Icon name="ti-feather" />
        {t.ask}
      </button>
    </div>
  );
}
