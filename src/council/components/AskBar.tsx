import { useRef, useState, type KeyboardEvent } from 'react';
import { IconArrowUp } from '@tabler/icons-react';
import type { CouncilSession } from '../store/types';
import { figure } from '../content/figures';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import { Avatar } from './Avatar';
import { useT } from '../i18n/react';

/* ============================================================
   The ask bar under the summary and the one-on-one: a row of chips for
   who to address (the whole council, or one seat), then one field with
   the addressee's medallion inside it and a send button that lights up
   gold once there is something to send. Enter sends (not while an input
   method is still composing — Chinese is typed that way). The bar rides
   up with the on-screen keyboard (iOS lays the keyboard over the page).
   ============================================================ */
/** 'C' = the whole council, otherwise a seated figure's id */
export type Addressee = 'C' | string;

export function AskBar({
  session,
  selected,
  onSelect,
  placeholder,
  onSend,
  autoFocus = false,
}: {
  session: CouncilSession;
  selected: Addressee;
  /** return false when the choice leaves the screen, so the field is not focused (and the keyboard not raised) on the way out */
  onSelect: (who: Addressee) => boolean | void;
  placeholder: string;
  onSend: (text: string) => void;
  autoFocus?: boolean;
}) {
  const t = useT();
  const kb = useKeyboardInset();
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const seats = session.seats.map((id) => figure(id));
  const seatIdx = selected === 'C' ? -1 : session.seats.indexOf(selected);
  const who = seatIdx >= 0 ? seats[seatIdx] : null;
  // an addressee who has left the council (a replaced seat) falls back to the whole council
  const current: Addressee = who ? who.id : 'C';
  const ready = text.trim().length > 0;

  const send = () => {
    const v = text.trim();
    if (!v) return;
    setText('');
    onSend(v);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    // Enter that confirms an IME candidate is not a send
    if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    send();
  };
  const pick = (k: Addressee) => {
    if (onSelect(k) !== false) inputRef.current?.focus();
  };
  // the brass ⁂ stands for the whole council, in the chip's dot and in the field
  const brass = { background: 'var(--brass)', borderColor: 'var(--brass)', color: 'var(--gold-ink)' } as const;

  return (
    <div className="askbar" style={kb ? { marginBottom: kb } : undefined}>
      <div className="chips who" role="radiogroup" aria-label={t.summary.whoAria}>
        <button type="button" role="radio" aria-checked={current === 'C'} className={`chip ${current === 'C' ? 'on' : ''}`} onClick={() => pick('C')}>
          <span className="dot" style={brass} aria-hidden="true">
            ⁂
          </span>
          {t.summary.theCouncil}
        </button>
        {seats.map((f, i) => (
          <button key={f.id} type="button" role="radio" aria-checked={current === f.id} className={`chip ${current === f.id ? 'on' : ''}`} onClick={() => pick(f.id)}>
            <span className="dot" aria-hidden="true">
              <Avatar figure={f} size={18} seat={i} />
            </span>
            {f.short}
          </button>
        ))}
      </div>
      <div className="chatbar">
        <span className="addr" aria-hidden="true">
          {who ? (
            <Avatar figure={who} size={32} seat={seatIdx} />
          ) : (
            <span className="med" style={brass}>
              ⁂
            </span>
          )}
        </span>
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          enterKeyHint="send"
          placeholder={placeholder}
          aria-label={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          autoFocus={autoFocus}
        />
        <button type="button" className={`send ${ready ? 'ready' : ''}`} aria-label={t.common.send} aria-disabled={!ready} onClick={send}>
          <IconArrowUp stroke={2.4} />
        </button>
      </div>
    </div>
  );
}
