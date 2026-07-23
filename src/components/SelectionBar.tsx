import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { useAuth } from '../store/useAuth';
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
 *
 * "Ask" hands the line to a small question panel (AskQuotePanel below) — the
 * reader writes what they want to know, and the quote + question go straight
 * to scout's desk.
 */
export function SelectionBar() {
  const t = useT().today.chrome.selection;
  const showToast = useStore((s) => s.showToast);
  const saveQuote = useStore((s) => s.saveQuote);
  const beginAskQuote = useStore((s) => s.beginAskQuote);
  // don't float the glass bar over a full-screen modal (Letter/History/Sheet keep
  // it — selecting a line there to Save quote is intended)
  const settingsOpen = useStore((s) => s.settingsOpen);
  const onboarding = useStore((s) => s.showOnboarding);
  const authOpen = useAuth((s) => s.authOpen);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const debounce = useRef<number>(0);
  const scrollTimer = useRef<number>(0);

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
      // on touch, the OS callout draws ABOVE the selection — put ours below to
      // avoid stacking on it; on desktop keep the flip-when-near-top behaviour
      const coarse = window.matchMedia('(pointer: coarse)').matches;
      const below = coarse || rect.top - box.top < 56;
      // clamp with the bar's real half-width (measured once shown) so longer
      // localized labels never overflow the screen edge
      const half = barRef.current ? barRef.current.offsetWidth / 2 + 10 : 130;
      setAnchor({
        x: Math.min(Math.max(rect.left - box.left + rect.width / 2, half), box.width - half),
        y: below ? rect.bottom - box.top + 10 : rect.top - box.top - 46,
        below,
        text,
      });
    };

    const onSelection = () => {
      window.clearTimeout(debounce.current);
      debounce.current = window.setTimeout(read, 180);
    };
    // a scroll would strand the bar — hide it, then re-anchor once scrolling
    // settles (the selection persists, so it returns at the new position)
    const onScroll = () => {
      clear();
      window.clearTimeout(scrollTimer.current);
      scrollTimer.current = window.setTimeout(read, 220);
    };
    document.addEventListener('selectionchange', onSelection);
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('selectionchange', onSelection);
      document.removeEventListener('scroll', onScroll, { capture: true });
      window.clearTimeout(scrollTimer.current);
      window.clearTimeout(debounce.current);
    };
  }, []);

  if (!anchor || settingsOpen || onboarding || authOpen) return <AskQuotePanel />;

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
    beginAskQuote(anchor.text);
    dismiss();
  };

  return (
    <>
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
          <svg className="owl pb-sel-owl" viewBox="0 0 120 130" aria-hidden="true">
            <use href="#owl-scribe" />
          </svg>
          {t.saveQuote}
        </button>
        <button type="button" onClick={ask}>
          <svg className="owl pb-sel-owl" viewBox="0 0 120 130" aria-hidden="true">
            <use href="#owl-scout" />
          </svg>
          {t.ask}
        </button>
      </div>
      <AskQuotePanel />
    </>
  );
}

/**
 * The question panel — raised once the reader taps "Ask" on a selected line.
 * The quote is shown as an excerpt; the reader writes their question; on send
 * the two compose into one line dispatched straight to scout (the store handles
 * switching to the Ask tab and streaming the reply).
 */
function AskQuotePanel() {
  const t = useT().today.chrome.selection;
  const quote = useStore((s) => s.askQuote);
  const cancel = useStore((s) => s.cancelAskQuote);
  const submit = useStore((s) => s.submitAskQuote);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // fresh field each time a new line is picked up; focus once it opens
  useEffect(() => {
    if (quote) {
      setQ('');
      const id = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(id);
    }
  }, [quote]);

  useEffect(() => {
    if (!quote) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [quote, cancel]);

  if (!quote) return null;

  const send = () => submit(q);
  const onKeyDown = (e: React.KeyboardEvent) => {
    // Enter sends; Shift+Enter keeps a newline for longer questions
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="pb-askq-scrim" onClick={cancel} role="presentation">
      <div
        className="pb-askq"
        role="dialog"
        aria-modal="true"
        aria-label={t.askAria}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pb-askq-top">
          <span className="pb-askq-kick">{t.askTitle}</span>
          <button type="button" className="pb-askq-x" aria-label={t.askCancelAria} onClick={cancel}>
            <Icon name="ti-x" />
          </button>
        </div>
        <blockquote className="pb-askq-quote">{quote}</blockquote>
        <textarea
          ref={inputRef}
          className="pb-askq-input"
          rows={2}
          placeholder={t.askPlaceholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button type="button" className="pb-askq-send" onClick={send}>
          <Icon name="ti-feather" />
          {t.askSend}
        </button>
      </div>
    </div>
  );
}
