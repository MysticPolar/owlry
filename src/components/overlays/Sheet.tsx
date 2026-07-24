import { useRef } from 'react';
import { useStore } from '../../store/useStore';
import { useT } from '../../i18n/react';
import { getBook } from '../../lib/bookRegistry';
import { useBookMeta } from '../../hooks/useBookMeta';
import { useModalFocus } from '../../hooks/useModalFocus';
import { useOverlayPresence } from '../../hooks/useOverlayPresence';
import { Icon } from '../Icon';
import { Cover } from '../Cover';
import { ClampText } from '../ClampText';

export function Sheet() {
  const t = useT();
  const sheetId = useStore((s) => s.sheetId);
  const openLetter = useStore((s) => s.openLetter);
  const openBook = useStore((s) => s.openBook);
  const closeSheet = useStore((s) => s.closeSheet);
  const toggleSave = useStore((s) => s.toggleSave);
  const showToast = useStore((s) => s.showToast);
  const saved = useStore((s) => (s.sheetId ? s.savedIds.includes(s.sheetId) : false));
  const resuming = useStore((s) => (s.sheetId ? !!s.pagesRead[s.sheetId] : false));

  const dialogRef = useRef<HTMLDivElement>(null);
  // stays mounted while the slide-down plays; the id is latched so the sheet's
  // content doesn't blank the moment the store clears sheetId
  const { mounted, shown } = useOverlayPresence(Boolean(sheetId), { ref: dialogRef });
  const heldId = useRef(sheetId);
  if (sheetId) heldId.current = sheetId;
  const id = sheetId ?? (mounted ? heldId.current : null);
  const b = id ? getBook(id) : null;
  const meta = useBookMeta(id);

  // focus trap + Esc + focus restore (openBook clears sheetId, so Esc here never
  // conflicts with the reader's own handler)
  useModalFocus(Boolean(sheetId) && mounted, closeSheet, dialogRef);

  if (!mounted || !id || !b) return null;

  // catalog page count wins; the live lookup fills the gap for open-world books
  const pageCount = b.n || meta?.pageCount;

  return (
    <div
      className={`sheet pb-sheet${shown ? ' on' : ''}`}
      id="sheet"
      role="dialog"
      aria-modal="true"
      aria-label={t.reader.sheetAria}
      ref={dialogRef}
      tabIndex={-1}
    >
      <button className="pb-sh-close" aria-label={t.reader.closeAria} onClick={closeSheet}>
        <Icon name="ti-x" />
      </button>
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
        <button className="pb-cta" onClick={() => openLetter(id)}>
          <svg className="owl pb-cta-owl" viewBox="0 0 120 130" aria-hidden="true"><use href="#owl-peek" /></svg>
          <span className="pb-cta-t">{t.reader.peekBtn}</span>
        </button>
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
