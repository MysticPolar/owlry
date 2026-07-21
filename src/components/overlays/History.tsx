/* ============================================================
   owlry — chat history overlay.

   A separate, read-only history: past days are listed (newest
   first), and tapping one shows that day's transcript exactly as
   it happened — reusing the same chat-item renderer as the live
   Discover chat. Today's conversation lives in Discover, not here.
   No composer, no chips — this is a ledger, not a live conversation.
   Tapping a historical letter card opens the shared Letter overlay
   (cache-first via owl-peek, so it's instant if already generated).
   ============================================================ */
import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { listDays, loadDay } from '../../lib/history';
import type { HistoryDay } from '../../lib/history';
import type { HydratedChat } from '../../lib/chatHydrate';
import { renderChatItem, letterNumbers } from '../chat/ChatItems';
import { useT } from '../../i18n/react';
import { Icon } from '../Icon';

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function History() {
  const open = useStore((s) => s.historyOpen);
  const closeHistory = useStore((s) => s.closeHistory);
  const openSheet = useStore((s) => s.openSheet);
  const openLetter = useStore((s) => s.openLetter);

  const [days, setDays] = useState<HistoryDay[] | null>(null);
  const [selected, setSelected] = useState<HistoryDay | null>(null);
  const [transcript, setTranscript] = useState<HydratedChat | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const t = useT().settings.history;

  // fetch the day list fresh every time the overlay opens; reset to the list view on close
  useEffect(() => {
    if (!open) {
      setSelected(null);
      setTranscript(null);
      setDays(null);
      setFailed(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    void listDays(todayLocal())
      .then((d) => setDays(d))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [open]);

  const openDay = (day: HistoryDay) => {
    setSelected(day);
    setLoading(true);
    setFailed(false);
    void loadDay(day.day)
      .then((tr) => setTranscript(tr))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };

  if (!open) return null;

  return (
    <div className="history on" id="history" role="dialog" aria-modal="true" aria-label={t.ariaDialog}>
      <div className="l-top">
        <button
          className="iconbtn lite"
          aria-label={selected ? t.ariaBack : t.ariaClose}
          onClick={() => (selected ? setSelected(null) : closeHistory())}
        >
          <Icon name="ti-arrow-left" />
        </button>
        <div className="d">{selected ? selected.label.toUpperCase() : t.title}</div>
        <span className="iconbtn" style={{ visibility: 'hidden' }} aria-hidden="true" />
      </div>

      <div className="l-body hist-body">
        {loading && <div className="hist-empty">{t.loading}</div>}

        {!loading && failed && (
          <div className="hist-empty" role="alert">{t.error}</div>
        )}

        {!loading && !failed && !selected && days?.length === 0 && (
          <div className="hist-empty">{t.empty}</div>
        )}

        {!loading && !selected && days && days.length > 0 && (
          <div className="hist-list">
            {days.map((d) => (
              <button key={d.day} className="hist-row" onClick={() => openDay(d)}>
                <span className="hist-row-day d">{d.label}</span>
                <span className="hist-row-ask">{d.firstAsk || t.messages(d.count)}</span>
                <span className="hist-row-count">{d.count}</span>
              </button>
            ))}
          </div>
        )}

        {!loading && selected && transcript && (
          <div className="hist-thread" role="log">
            {transcript.messages.length === 0 ? (
              <div className="hist-empty">{t.emptyDay}</div>
            ) : (
              (() => {
                const nos = letterNumbers(transcript.messages);
                return transcript.messages.map((m) => renderChatItem(m, openSheet, openLetter, nos.get(m.id)));
              })()
            )}
          </div>
        )}
      </div>
    </div>
  );
}
