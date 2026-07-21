import { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { useT } from '../../i18n/react';
import { getBook, hasGuide } from '../../lib/bookRegistry';
import { useBookMeta } from '../../hooks/useBookMeta';
import { Icon } from '../Icon';
import { Cover } from '../Cover';
import { ClampText } from '../ClampText';

export function Sheet() {
  const t = useT();
  const sheetId = useStore((s) => s.sheetId);
  const openLetter = useStore((s) => s.openLetter);
  const openBook = useStore((s) => s.openBook);
  const startAsk = useStore((s) => s.startAsk);
  const closeSheet = useStore((s) => s.closeSheet);
  const toggleSave = useStore((s) => s.toggleSave);
  const showToast = useStore((s) => s.showToast);
  const saved = useStore((s) => (s.sheetId ? s.savedIds.includes(s.sheetId) : false));
  const resuming = useStore((s) => (s.sheetId ? !!s.pagesRead[s.sheetId] : false));

  const id = sheetId;
  const b = id ? getBook(id) : null;
  const guide = id ? hasGuide(id) : false;
  const meta = useBookMeta(id);

  // Esc closes the sheet (listener lives only while the sheet is open). openBook
  // clears sheetId, so this never conflicts with the reader's own Esc handler.
  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSheet();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, closeSheet]);

  if (!id || !b) return null;

  // catalog page count wins; the live lookup fills the gap for open-world books
  const pageCount = b.n || meta?.pageCount;

  return (
    <div
      className="sheet pb-sheet on"
      id="sheet"
      role="dialog"
      aria-modal="true"
      aria-label={t.reader.sheetAria}
    >
      <button
        className={`pb-sh-save ${saved ? 'on' : ''}`}
        aria-label={t.reader.saveAria}
        aria-pressed={saved}
        onClick={() => toggleSave(id)}
      >
        <Icon name={saved ? 'ti-heart-filled' : 'ti-heart'} />
      </button>
      <div className="pb-sh-flex">
        <Cover id={id} cls="cover-md" />
        <div className="pb-sh-info">
          <div className="pb-sh-ttl">{b.t}</div>
          {(b.sub ?? meta?.subtitle) && <div className="pb-sh-sub">{b.sub ?? meta?.subtitle}</div>}
          <div className="pb-sh-auth">
            {meta?.authors?.length ? meta.authors.join(', ') : b.a}
            {pageCount ? ` · ${t.reader.pages(pageCount)}` : ''}
          </div>
          {(b.pub ?? meta?.publisher) && <div className="pb-sh-pub">{b.pub ?? meta?.publisher}</div>}
          <div className="pb-sh-rate">
            <Icon name="ti-star" />
            {(() => {
              // pre-baked numeric rating (b.rn + b.rsrc), else live (meta), else catalog string
              const rn = b.rn ?? meta?.rating;
              const rc = b.rn != null ? b.rc : meta?.ratingsCount;
              const src = b.rn != null ? b.rsrc : meta?.source;
              if (rn != null) {
                // source names are brands — untranslated, same as goodreads is in both dicts
                const label = src === 'openlibrary' ? 'OPEN LIBRARY' : 'GOOGLE BOOKS';
                return (
                  <>
                    {rn.toFixed(1)}
                    {rc != null && <span className="rcount">&nbsp;({rc.toLocaleString()})</span>}
                    <small>&nbsp;{label}</small>
                  </>
                );
              }
              return (
                <>
                  {b.r ?? '4.0'}
                  <small>&nbsp;{t.reader.goodreads}</small>
                </>
              );
            })()}
          </div>
        </div>
      </div>
      <ClampText lines={5} className="pb-sh-intro">
        {b.i ?? meta?.description ?? b.q}
      </ClampText>
      <div className="pb-cta-row">
        <button className="pb-cta" onClick={() => { closeSheet(); startAsk(id); }}>
          <Icon name="ti-message-circle" /><span className="pb-cta-t">{t.reader.askBtn}</span>
        </button>
        {guide && (
          <button className="pb-cta" onClick={() => hasGuide(id) && openLetter(id)}>
            <Icon name="ti-eye" /><span className="pb-cta-t">{t.reader.peekBtn}</span>
          </button>
        )}
        <button className="pb-cta fill" onClick={() => openBook(id)}>
          <Icon name="ti-mail" /><span className="pb-cta-t">{resuming ? t.reader.resumeBtn : t.reader.openBtn}</span>
        </button>
      </div>
      <div className="pb-sh-sec">{t.reader.secAuthor}</div>
      <div className="pb-sh-authname">{b.a}</div>
      <ClampText lines={3} className="pb-sh-bio">
        {b.w ?? ''}
      </ClampText>
      <button className="pb-sh-link" onClick={() => showToast('ti-external-link', t.reader.linkToast)}>
        <Icon name="ti-microphone-2" />
        {t.reader.interviews}
        <Icon name="ti-external-link" className="ext" />
      </button>
      <button className="pb-sh-link" onClick={() => showToast('ti-external-link', t.reader.linkToast)}>
        <Icon name="ti-pencil" />
        {t.reader.essays}
        <Icon name="ti-external-link" className="ext" />
      </button>
      <div className="pb-sh-sec">
        {t.reader.secSocial} <span className="pb-sh-soon">{t.reader.soonPill}</span>
      </div>
      <p className="pb-sh-note">{t.reader.socialNote}</p>
    </div>
  );
}
