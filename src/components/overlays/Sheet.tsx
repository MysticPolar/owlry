import { useStore } from '../../store/useStore';
import { useT } from '../../i18n/react';
import { getBook, hasGuide } from '../../lib/bookRegistry';
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

  if (!id || !b) return null;

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
              <div className="auth">
                {b.a} · {t.reader.pages(b.n)}
              </div>
              <div className="rate">
                <Icon name="ti-star" />
                {b.r ?? '4.0'}
                <small>&nbsp;{t.reader.goodreads}</small>
              </div>
            </div>
          </div>
          <ClampText lines={5} className="bk-intro">
            {b.i ?? b.q}
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
