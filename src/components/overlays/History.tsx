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
import { renderChatItem } from '../chat/ChatItems';
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

  // fetch the day list fresh every time the overlay opens; reset to the list view on close
  useEffect(() => {
    if (!open) {
      setSelected(null);
      setTranscript(null);
      setDays(null);
      return;
    }
    setLoading(true);
    void listDays(todayLocal()).then((d) => {
      setDays(d);
      setLoading(false);
    });
  }, [open]);

  const openDay = (day: HistoryDay) => {
    setSelected(day);
    setLoading(true);
    void loadDay(day.day).then((t) => {
      setTranscript(t);
      setLoading(false);
    });
  };

  if (!open) return null;

  return (
    <div className="history on" id="history" role="dialog" aria-modal="true" aria-label="Chat history">
      <div className="l-top">
        <button
          className="iconbtn lite"
          aria-label={selected ? 'Back to history' : 'Close history'}
          onClick={() => (selected ? setSelected(null) : closeHistory())}
        >
          <Icon name="ti-arrow-left" />
        </button>
        <div className="d">{selected ? selected.label.toUpperCase() : 'HISTORY'}</div>
        <span className="iconbtn" style={{ visibility: 'hidden' }} aria-hidden="true" />
      </div>

      <div className="l-body hist-body">
        {loading && <div className="hist-empty">the owl is fetching the ledger…</div>}

        {!loading && !selected && days?.length === 0 && (
          <div className="hist-empty">no earlier days yet — today's conversation lives in discover.</div>
        )}

        {!loading && !selected && days && days.length > 0 && (
          <div className="hist-list">
            {days.map((d) => (
              <button key={d.day} className="hist-row" onClick={() => openDay(d)}>
                <span className="hist-row-day d">{d.label}</span>
                <span className="hist-row-ask">{d.firstAsk || `${d.count} messages`}</span>
                <span className="hist-row-count">{d.count}</span>
              </button>
            ))}
          </div>
        )}

        {!loading && selected && transcript && (
          <div className="hist-thread" role="log">
            {transcript.messages.length === 0 ? (
              <div className="hist-empty">nothing was saved for this day.</div>
            ) : (
              transcript.messages.map((m) => renderChatItem(m, openSheet, openLetter))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
