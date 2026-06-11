import { useStore } from '../../store/useStore';
import { BOOKS } from '../../content/books';
import { getSpread } from '../../content/reader-text';
import { Icon } from '../Icon';

export function Reader() {
  const reader = useStore((s) => s.reader);
  const closeReader = useStore((s) => s.closeReader);
  const nextPage = useStore((s) => s.nextPage);
  const prevPage = useStore((s) => s.prevPage);
  const toggleSave = useStore((s) => s.toggleSave);
  const saved = useStore((s) => (s.reader.id ? s.savedIds.includes(s.reader.id) : false));

  const { id, p, open } = reader;
  const b = id ? BOOKS[id] : null;
  const n = b ? b.n : 0;
  const last = b ? p >= n : false;
  const spread = id ? getSpread(id, p) : [];
  const chapter = Math.ceil(p / 24);

  return (
    <div className={`reader ${open ? 'on' : ''}`} id="reader" role="dialog" aria-modal="true" aria-label="Reader">
      <div className="r-top">
        <button className="iconbtn lite" aria-label="Close reader" onClick={closeReader}>
          <Icon name="ti-arrow-left" />
        </button>
        <div className="r-mid">
          <div className="r-title d">{b?.t}</div>
          <div className="r-auth">{b?.a.toUpperCase()}</div>
        </div>
        <button
          className={`save ${saved ? 'on' : ''}`}
          style={{ position: 'static' }}
          aria-label="Save to library"
          aria-pressed={saved}
          onClick={() => id && toggleSave(id)}
        >
          <Icon name="ti-heart" />
        </button>
      </div>

      <div
        className="r-body swap"
        id="rBody"
        key={p}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - r.left;
          if (x < r.width * 0.3) prevPage();
          else if (x > r.width * 0.7) nextPage();
        }}
      >
        <div className="r-chap">CHAPTER {chapter}</div>
        {spread.map((t, i) => (
          <p key={i}>{t}</p>
        ))}
      </div>

      <div className="r-foot">
        <button className="iconbtn lite" aria-label="Previous page" disabled={p <= 1} onClick={prevPage}>
          <Icon name="ti-chevron-left" />
        </button>
        <div className="r-prog">
          <div className="r-page">
            p. {p} of {n}
          </div>
          <div className="track">
            <div className="fill xp" style={{ width: `${n ? (p / n) * 100 : 0}%` }} />
          </div>
        </div>
        <button className="iconbtn" aria-label={last ? 'Finish book' : 'Next page'} onClick={nextPage}>
          <Icon name={last ? 'ti-check' : 'ti-chevron-right'} />
        </button>
      </div>
    </div>
  );
}
