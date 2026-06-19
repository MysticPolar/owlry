import { useStore } from '../../store/useStore';
import { BOOKS } from '../../content/books';
import type { LibTab } from '../../store/types';
import { pct } from '../../lib/format';
import { Icon } from '../Icon';
import { Cover } from '../Cover';

function ReadingList() {
  const readingIds = useStore((s) => s.readingIds);
  const pagesRead = useStore((s) => s.pagesRead);
  const openBook = useStore((s) => s.openBook);
  return (
    <div className="list">
      {readingIds.map((id) => {
        const b = BOOKS[id];
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
            <button className="iconbtn" aria-label={`Resume ${b.t}`} onClick={() => openBook(id)}>
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
  if (!savedIds.length) {
    return (
      <div className="empty">
        <Icon name="ti-heart" />
        <div className="d">nothing saved yet</div>
        <p>tap the ♥ on any book to keep it here.</p>
      </div>
    );
  }
  return (
    <div className="grid">
      {savedIds.map((id) => {
        const b = BOOKS[id];
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
  return (
    <div className="list">
      {finishedIds.map((id) => {
        const b = BOOKS[id];
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
                FINISHED
              </div>
            </div>
            <button
              className="iconbtn lite"
              aria-label={`Read ${b.t} again`}
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

  const segs: [LibTab, string][] = [
    ['reading', `READING · ${readingCount}`],
    ['saved', `SAVED · ${savedCount}`],
    ['finished', `FINISHED · ${finishedCount}`],
  ];

  return (
    <section className={`screen ${active ? 'on' : ''}`} id="screen-library">
      <div className="pad-h">
        <div className="hl sm d">
          <span className="u" />
          <span className="t">
            library<span className="gdot">.</span>
          </span>
        </div>
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
