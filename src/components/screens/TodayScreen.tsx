import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { useStore } from '../../store/useStore';
import { getBook } from '../../lib/bookRegistry';
import { FEED, FEED_GENRES, feedLikes } from '../../content/feed';
import type { BookId, Genre } from '../../content/types';
import { useT } from '../../i18n/react';
import { Icon } from '../Icon';
import { Cover } from '../Cover';
import { CastOwl } from '../CastOwl';
import { CurtainValance, CurtainHem } from '../stage';

type Filter = 'all' | Genre;

const fmtCount = (n: number): string =>
  n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);

/* ---------- stat chips (candy in glyphs + numbers only) ---------- */
function StatChips() {
  const lv = useStore((s) => s.lv);
  const xp = useStore((s) => s.xp);
  const xpMax = useStore((s) => s.xpMax);
  const ink = useStore((s) => s.ink);
  const t = useT().today.home;
  const xpPct = Math.min(100, Math.max(0, (xp / Math.max(1, xpMax)) * 100));
  return (
    <div className="pb-chips" role="group" aria-label={t.statsAria}>
      <div className="pb-chip" aria-label={t.statLevel(lv)}>
        <Icon name="ti-crown" className="crown" />
        <span className="n">{lv}</span>
      </div>
      <div className="pb-chip" aria-label={t.statXp(xp, xpMax)}>
        <Icon name="ti-bolt" className="bolt" />
        <span className="pb-xpbar"><b style={{ width: `${xpPct}%` }} /></span>
        <span className="n">{xp}</span>
      </div>
      <div className="pb-chip" aria-label={t.statInk(ink)}>
        <Icon name="ti-inkdrop" className="drop" />
        <span className="n">{ink}</span>
      </div>
    </div>
  );
}

function CompactStrip() {
  const lv = useStore((s) => s.lv);
  const xp = useStore((s) => s.xp);
  const ink = useStore((s) => s.ink);
  return (
    <div className="pb-compact" aria-hidden="true">
      <span className="wm">owlry<span className="dot">.</span></span>
      <span className="sp" />
      <span className="pb-mini"><Icon name="ti-crown" className="crown" />{lv}</span>
      <span className="pb-mini"><Icon name="ti-bolt" className="bolt" />{xp}</span>
      <span className="pb-mini"><Icon name="ti-inkdrop" className="drop" />{ink}</span>
    </div>
  );
}

/* ---------- one book post ---------- */
function BookCard({ id, liked, onLike }: { id: BookId; liked: boolean; onLike: (id: BookId) => void }) {
  const b = getBook(id);
  const openSheet = useStore((s) => s.openSheet);
  const toggleSave = useStore((s) => s.toggleSave);
  const saved = useStore((s) => s.savedIds.includes(id));
  const t = useT().today.home;
  if (!b) return null;

  const open = () => openSheet(id);
  return (
    <article className="pb-card">
      <button type="button" className="pb-open" aria-label={t.openAria(b.t)} onClick={open}>
        <Cover id={id} cls="pb-cover" />
        <span className="body">
          <span className="pb-cap">{b.q}</span>
        </span>
      </button>
      <div className="pb-foot">
        <button
          type="button"
          className={`pb-iconbtn pb-like ${liked ? 'on' : ''}`}
          aria-label={t.likeAria(b.t)}
          aria-pressed={liked}
          onClick={() => onLike(id)}
        >
          <Icon name={liked ? 'ti-heart-filled' : 'ti-heart'} />
          <span>{fmtCount(feedLikes(id) + (liked ? 1 : 0))}</span>
        </button>
        <span className="sp" />
        <button
          type="button"
          className={`pb-iconbtn pb-mark ${saved ? 'on' : ''}`}
          aria-label={t.saveAria(b.t)}
          aria-pressed={saved}
          onClick={() => toggleSave(id)}
        >
          <Icon name={saved ? 'ti-bookmark-filled' : 'ti-bookmark'} />
        </button>
      </div>
    </article>
  );
}

/* ---------- Keeper card: the reader's most recent save resurfaced ---------- */
function KeeperCard({ id }: { id: BookId }) {
  const b = getBook(id);
  const openSheet = useStore((s) => s.openSheet);
  const t = useT().today.home;
  if (!b) return null;
  const open = () => openSheet(id);
  return (
    <button type="button" className="pb-keeper" aria-label={t.keeperAria(b.t)} onClick={open}>
      <span className="pb-klbl">
        <span className="pb-kdot pb-kdot-owl" aria-hidden="true">
          <svg className="owl" viewBox="0 0 120 130"><use href="#owl-keeper" /></svg>
        </span>
        {t.keeperLabel}
      </span>
      <span className="pb-krow">
        <span className="pb-kthumb"><Cover id={id} cls="pb-cover-xs" /></span>
        <span>
          <span className="pb-kt">{b.t}</span>
          <span className="pb-kq">{t.keeperLine}</span>
        </span>
      </span>
    </button>
  );
}

export function TodayScreen() {
  const active = useStore((s) => s.activeTab === 'today');
  const savedIds = useStore((s) => s.savedIds);
  const t = useT().today.home;

  const [filter, setFilter] = useState<Filter>('all');
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const toggleLike = useCallback((id: BookId) => setLiked((m) => ({ ...m, [id]: !m[id] })), []);

  // scroll collapse with hysteresis: collapse past 42, expand back under 8
  const onScroll = () => {
    const y = feedRef.current?.scrollTop ?? 0;
    if (y > 42) setCollapsed(true);
    else if (y < 8) setCollapsed(false);
  };

  const latestSave = savedIds.length ? (savedIds[savedIds.length - 1] as BookId) : null;

  // build the cell list, splice in the Keeper card (For you + non-empty shelf),
  // then split even→left / odd→right for the waterfall
  const [colL, colR] = useMemo(() => {
    const ids = FEED.filter((id) => filter === 'all' || getBook(id)?.g === filter);
    const cells: ReactNode[] = ids.map((id) => (
      <BookCard key={id} id={id} liked={!!liked[id]} onLike={toggleLike} />
    ));
    if (filter === 'all' && latestSave) {
      cells.splice(Math.min(2, cells.length), 0, <KeeperCard key={`keeper-${latestSave}`} id={latestSave} />);
    }
    const L: ReactNode[] = [];
    const R: ReactNode[] = [];
    cells.forEach((node, i) => (i % 2 ? R : L).push(node));
    return [L, R];
  }, [filter, liked, latestSave, toggleLike]);

  const empty = colL.length === 0 && colR.length === 0;

  return (
    <section
      className={`screen pb-home ${active ? 'on' : ''} ${collapsed ? 'collapsed' : ''}`}
      id="screen-today"
    >
      <div className="pb-head">
        <CurtainValance />
        <CurtainHem />
        <div className="pb-perch">
          <CastOwl owl="keeper" cls="mini" />
        </div>
        <h1 className="pb-marquee" aria-label={t.marqueeAria}>
          owlry<span className="dot">.</span>
        </h1>
        <StatChips />
        <CompactStrip />
        <div className="pb-tags" role="group" aria-label={t.filterAria}>
          <button
            className="pb-tag"
            aria-pressed={filter === 'all'}
            onClick={(e) => {
              setFilter('all');
              e.currentTarget.scrollIntoView({ inline: 'nearest', block: 'nearest' });
            }}
          >
            {t.tags.all}
          </button>
          {FEED_GENRES.map((g) => (
            <button
              key={g}
              className="pb-tag"
              aria-pressed={filter === g}
              onClick={(e) => {
                setFilter(g);
                e.currentTarget.scrollIntoView({ inline: 'nearest', block: 'nearest' });
              }}
            >
              {t.tags[g]}
            </button>
          ))}
        </div>
        <div className="pb-rule" />
      </div>

      <div className="pb-feed" ref={feedRef} onScroll={onScroll}>
        {empty ? (
          <div className="pb-empty">
            <Icon name="ti-feather" />
            <p>{t.emptyLine}</p>
          </div>
        ) : (
          <div className="pb-cols">
            <div className="pb-col">{colL}</div>
            <div className="pb-col r">{colR}</div>
          </div>
        )}
      </div>
    </section>
  );
}
