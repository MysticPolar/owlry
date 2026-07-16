import { useStore } from '../../store/useStore';
import { getBook } from '../../lib/bookRegistry';
import type { LibTab } from '../../store/types';
import { pct } from '../../lib/format';
import { useT } from '../../i18n/react';
import { Icon } from '../Icon';
import { Cover } from '../Cover';
import { CastOwl } from '../CastOwl';

function ReadingList() {
  const readingIds = useStore((s) => s.readingIds);
  const pagesRead = useStore((s) => s.pagesRead);
  const openBook = useStore((s) => s.openBook);
  const t = useT().today.library;
  return (
    <div className="list">
      {readingIds.map((id) => {
        const b = getBook(id);
        if (!b) return null;
        const p = pct(pagesRead[id] ?? 0, b.n);
        return (
          <div key={id} className="rowc">
            <Cover id={id} cls="cover-xs" />
            <div className="rinfo">
              <div className="rtitle d">{b.t}</div>
              <div className="rauth">{b.a}</div>
              <div className="rbar">
                <div className="mini-track">
                  <div className="mini-fill" style={{ width: `${p}%` }} />
                </div>
                <span className="mini-pct">{p}%</span>
              </div>
            </div>
            <button className="iconbtn" aria-label={t.resumeAria(b.t)} onClick={() => openBook(id)}>
              <Icon name="ti-player-play" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function SavedGrid() {
  const savedIds = useStore((s) => s.savedIds);
  const openSheet = useStore((s) => s.openSheet);
  const t = useT().today.library;
  if (!savedIds.length) {
    return (
      <div className="empty">
        <Icon name="ti-heart" />
        <div className="d">{t.emptySavedTitle}</div>
        <p>{t.emptySavedBody}</p>
      </div>
    );
  }
  return (
    <div className="grid">
      {savedIds.map((id) => {
        const b = getBook(id);
        if (!b) return null;
        return (
          <button key={id} className="g-item" onClick={() => openSheet(id)}>
            <span className="g-heart">
              <Icon name="ti-heart" />
            </span>
            <Cover id={id} cls="cover-g" />
            <div className="g-title d">{b.t}</div>
            <div className="g-auth">{b.a.toUpperCase()}</div>
          </button>
        );
      })}
    </div>
  );
}

function FinishedList() {
  const finishedIds = useStore((s) => s.finishedIds);
  const openBook = useStore((s) => s.openBook);
  const t = useT().today.library;
  return (
    <div className="list">
      {finishedIds.map((id) => {
        const b = getBook(id);
        if (!b) return null;
        return (
          <div key={id} className="rowc">
            <Cover id={id} cls="cover-xs" />
            <div className="rinfo">
              <div className="rtitle d">{b.t}</div>
              <div className="rauth">{b.a}</div>
              <div className="fin">
                <span className="done-badge">
                  <Icon name="ti-check" />
                </span>
                {t.finished}
              </div>
            </div>
            <button
              className="iconbtn lite"
              aria-label={t.readAgainAria(b.t)}
              onClick={() => openBook(id)}
            >
              <Icon name="ti-refresh" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function LibraryScreen() {
  const active = useStore((s) => s.activeTab === 'library');
  const libTab = useStore((s) => s.libTab);
  const setLibTab = useStore((s) => s.setLibTab);
  const readingCount = useStore((s) => s.readingIds.length);
  const savedCount = useStore((s) => s.savedIds.length);
  const finishedCount = useStore((s) => s.finishedIds.length);
  const t = useT().today.library;

  const segs: [LibTab, string][] = [
    ['reading', t.segReading(readingCount)],
    ['saved', t.segSaved(savedCount)],
    ['finished', t.segFinished(finishedCount)],
  ];

  return (
    <section className={`screen ${active ? 'on' : ''}`} id="screen-library">
      <div className="pad-h">
        <span className="ghost" aria-hidden="true">
          Keeper
        </span>
        <h1 className="hl sm d">
          <span className="u" />
          <span className="t">
            {t.title}<span className="gdot">.</span>
          </span>
        </h1>
        <CastOwl owl="keeper" cls="mini" />
      </div>
      <div className="seg" id="segRow">
        {segs.map(([k, l]) => (
          <button key={k} className={`chip grow ${libTab === k ? 'on' : ''}`} onClick={() => setLibTab(k)}>
            {l}
          </button>
        ))}
      </div>
      <div id="libBody">
        {libTab === 'reading' && <ReadingList />}
        {libTab === 'saved' && <SavedGrid />}
        {libTab === 'finished' && <FinishedList />}
      </div>
    </section>
  );
}
