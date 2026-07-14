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
  const toggleSave = useStore((s) => s.toggleSave);
  const showToast = useStore((s) => s.showToast);
  const saved = useStore((s) => (s.sheetId ? s.savedIds.includes(s.sheetId) : false));
  const resuming = useStore((s) => (s.sheetId ? !!s.pagesRead[s.sheetId] : false));

  const id = sheetId;
  const b = id ? getBook(id) : null;
  const guide = id ? hasGuide(id) : false;
  const meta = useBookMeta(id);

  if (!id || !b) return null;

  // catalog page count wins; the live lookup fills the gap for open-world books
  const pageCount = b.n || meta?.pageCount;

  return (
    <div
      className="sheet on"
      id="sheet"
      role="dialog"
      aria-modal="true"
      aria-label={t.reader.sheetAria}
    >
      <>
          <button
            className={`save ${saved ? 'on' : ''}`}
            aria-label={t.reader.saveAria}
            aria-pressed={saved}
            onClick={() => toggleSave(id)}
          >
            <Icon name="ti-heart" />
          </button>
          <div className="sh-flex">
            <Cover id={id} cls="cover-md" />
            <div className="sh-info">
              <div className="ttl d">{b.t}</div>
              {(b.sub ?? meta?.subtitle) && <div className="sub it">{b.sub ?? meta?.subtitle}</div>}
              <div className="auth">
                {meta?.authors?.length ? meta.authors.join(', ') : b.a}
                {pageCount ? ` · ${t.reader.pages(pageCount)}` : ''}
              </div>
              {(b.pub ?? meta?.publisher) && <div className="pub">{b.pub ?? meta?.publisher}</div>}
              <div className="rate">
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
          <ClampText lines={5} className="bk-intro">
            {b.i ?? meta?.description ?? b.q}
          </ClampText>
          <div className="btnrow">
            {guide && (
              <button className="btn" onClick={() => hasGuide(id) && openLetter(id)}>
                {t.reader.peekBtn} <Icon name="ti-mail" />
              </button>
            )}
            <button className={`btn ${guide ? 'ghost' : ''}`} onClick={() => openBook(id)}>
              {resuming ? t.reader.resumeBtn : t.reader.openBtn} <Icon name="ti-arrow-right" />
            </button>
          </div>
          <div className="sh-sec">{t.reader.secAuthor}</div>
          <div className="auth-name d">{b.a}</div>
          <ClampText lines={3} className="bk-bio">
            {b.w ?? ''}
          </ClampText>
          <button className="link-row" onClick={() => showToast('ti-external-link', t.reader.linkToast)}>
            <Icon name="ti-microphone-2" />
            {t.reader.interviews}
            <Icon name="ti-external-link" className="ext" />
          </button>
          <button className="link-row" onClick={() => showToast('ti-external-link', t.reader.linkToast)}>
            <Icon name="ti-pencil" />
            {t.reader.essays}
            <Icon name="ti-external-link" className="ext" />
          </button>
          <div className="sh-sec">
            {t.reader.secSocial} <span className="soon">{t.reader.soonPill}</span>
          </div>
          <p className="sv-note">
            {t.reader.socialNote}
          </p>
      </>
    </div>
  );
}
