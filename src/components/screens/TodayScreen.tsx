import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useStore } from '../../store/useStore';
import { getBook } from '../../lib/bookRegistry';
import { FEED, FEED_GENRES, feedLikes } from '../../content/feed';
import { rankShelf } from '../../lib/shelfRank';
import { rowFromLevel } from '../../lib/economy/curve';
import { useLevelFlash } from '../StatFx';
import type { BookId, BookRef, Genre } from '../../content/types';
import { useLang, useT } from '../../i18n/react';
import { Icon } from '../Icon';
import { Cover } from '../Cover';
import { CurtainValance, CurtainHem } from '../stage';
import { Wordmark } from '../Wordmark';

/** 'shelf' is the reader's own saved books (ranked); 'all' is the stacks. */
type Filter = 'shelf' | 'all' | Genre;

/** the tag row, in display order — labels come from i18n (today.home.tags) */
const FILTERS: Filter[] = ['shelf', 'all', ...FEED_GENRES];

const SINK_MS = 420;

function sinkDelayMs(reduceMotion: boolean): number {
  if (reduceMotion) return 0;
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 0;
  }
  return SINK_MS;
}

const fmtCount = (n: number, zh: boolean): string => {
  if (n < 1000) return String(n);
  const v = (n / 1000).toFixed(1).replace(/\.0$/, '');
  return zh ? `${v}千` : `${v}k`;
};

/** push waved-off books to the end while preserving relative order among the rest */
function withDislikedLast(ids: BookId[], dislikedIds: BookRef[]): BookId[] {
  if (!dislikedIds.length) return ids;
  const waved = new Set(dislikedIds);
  const kept: BookId[] = [];
  const sunk: BookId[] = [];
  for (const id of ids) (waved.has(id) ? sunk : kept).push(id);
  return [...kept, ...sunk];
}

/* ---------- stat chips (candy in glyphs + numbers only) ---------- */
function StatChips() {
  const lv = useStore((s) => s.lv);
  const xp = useStore((s) => s.xp);
  const xpMax = useStore((s) => s.xpMax);
  const ink = useStore((s) => s.ink);
  const inkMax = useStore((s) => s.inkMax);
  const t = useT().today.home;
  const xpPct = Math.min(100, Math.max(0, (xp / Math.max(1, xpMax)) * 100));
  const row = rowFromLevel(lv);
  const popped = useLevelFlash();
  return (
    <div className="pb-chips" role="group" aria-label={t.statsAria}>
      {/* the seat, not the number: a level is a row, and this chip is also the
          anchor the level-up sparks fly to (chrome.tsx looks up #lvLab) */}
      <div className={`pb-chip pb-seat${popped ? ' pop' : ''}`} id="lvLab" aria-label={t.statSeat(row, lv)}>
        <Icon name="ti-armchair" className="crown" />
        {/* the unit matters: the scale is inverted (row = 14 − LV), so a bare
            "13" on a new reader's chip reads as a level, and counts DOWN */}
        <span className="pb-seat-k">{t.rowKicker}</span>
        <span className="n">{row}</span>
      </div>
      <div className="pb-chip" aria-label={t.statXp(xp, xpMax)}>
        <Icon name="ti-bolt" className="bolt" />
        <span className="pb-xpbar"><b style={{ width: `${xpPct}%` }} /></span>
        <span className="n">{xp}</span>
      </div>
      <div className="pb-chip" aria-label={t.statInk(ink)}>
        <Icon name="ti-inkdrop" className="drop" />
        <span className="n">{ink}<span className="pb-chip-max">/{inkMax}</span></span>
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
      <span className="wm"><Wordmark decorative /></span>
      <span className="sp" />
      <span className="pb-mini"><Icon name="ti-armchair" className="crown" />{rowFromLevel(lv)}</span>
      <span className="pb-mini"><Icon name="ti-bolt" className="bolt" />{xp}</span>
      <span className="pb-mini"><Icon name="ti-inkdrop" className="drop" />{ink}</span>
    </div>
  );
}

/* ---------- one book post ---------- */
function BookCard({ id }: { id: BookId }) {
  const b = getBook(id);
  const openSheet = useStore((s) => s.openSheet);
  const toggleSave = useStore((s) => s.toggleSave);
  const toggleDislike = useStore((s) => s.toggleDislike);
  const saved = useStore((s) => s.savedIds.includes(id));
  const disliked = useStore((s) => s.dislikedIds.includes(id));
  const reduceMotion = useStore((s) => !!s.prefs.reduceMotion);
  const t = useT().today.home;
  const zh = useLang() === 'zh';
  const [sinking, setSinking] = useState(false);
  const sinkTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (sinkTimer.current != null) window.clearTimeout(sinkTimer.current);
    },
    [],
  );

  if (!b) return null;

  const open = () => openSheet(id);

  const onDislike = () => {
    if (sinking) return;
    // cancel: lift the label and let the shelf re-rank immediately
    if (disliked) {
      toggleDislike(id);
      return;
    }
    // wave off: play the sink beat, THEN mark disliked so the card lands at the end
    setSinking(true);
    const delay = sinkDelayMs(reduceMotion);
    sinkTimer.current = window.setTimeout(() => {
      sinkTimer.current = null;
      toggleDislike(id);
      setSinking(false);
    }, delay);
  };

  // the heart IS the save; the down-arrow is "not for me" — sinks to the end,
  // stays labeled, and a second tap cancels
  return (
    <article className={`pb-card${sinking ? ' sinking' : ''}${disliked ? ' disliked' : ''}`}>
      <button type="button" className="pb-open" aria-label={t.openAria(b.t)} onClick={open}>
        <Cover id={id} cls="pb-cover" />
        <span className="body">
          <span className="pb-cap">{b.q}</span>
        </span>
      </button>
      <div className="pb-foot">
        <button
          type="button"
          className={`pb-iconbtn pb-like ${saved ? 'on' : ''}`}
          aria-label={t.saveAria(b.t)}
          aria-pressed={saved}
          onClick={() => toggleSave(id)}
        >
          <Icon name={saved ? 'ti-heart-filled' : 'ti-heart'} />
          <span>{fmtCount(feedLikes(id) + (saved ? 1 : 0), zh)}</span>
        </button>
        <span className="sp" />
        <button
          type="button"
          className={`pb-iconbtn pb-down ${disliked ? 'on' : ''}`}
          aria-label={t.dislikeAria(b.t)}
          aria-pressed={disliked}
          disabled={sinking}
          onClick={onDislike}
        >
          <Icon name={disliked ? 'ti-arrow-big-down-filled' : 'ti-arrow-big-down'} />
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
  const readingIds = useStore((s) => s.readingIds);
  const finishedIds = useStore((s) => s.finishedIds);
  const quotedIds = useStore((s) => s.quotedIds);
  const dislikedIds = useStore((s) => s.dislikedIds);
  const savedAt = useStore((s) => s.savedAt);
  const pagesRead = useStore((s) => s.pagesRead);
  const openedLetters = useStore((s) => s.openedLetters);
  const collected = useStore((s) => s.owl.collected);
  const t = useT().today.home;

  // home opens on the reader's own shelf; the stacks are one tap away
  const [filter, setFilter] = useState<Filter>('shelf');
  const [collapsed, setCollapsed] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

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
    // the shelf is the reader's own saves, warmest first; everything else is
    // the hand-tuned catalog order, optionally narrowed to one genre
    const base =
      filter === 'shelf'
        ? (rankShelf({
            savedIds,
            readingIds,
            finishedIds,
            quotedIds,
            dislikedIds,
            savedAt,
            pagesRead,
            peeked: openedLetters,
            fromScout: collected,
          }) as BookId[])
        : FEED.filter((id) => filter === 'all' || getBook(id)?.g === filter);
    // waved-off books always sit at the end (rankShelf already sinks them on
    // the shelf view; other filters need the same courtesy)
    const ids = withDislikedLast(base, dislikedIds);
    const cells: ReactNode[] = ids.map((id) => <BookCard key={id} id={id} />);
    if (filter === 'all' && latestSave) {
      cells.splice(Math.min(2, cells.length), 0, <KeeperCard key={`keeper-${latestSave}`} id={latestSave} />);
    }
    const L: ReactNode[] = [];
    const R: ReactNode[] = [];
    cells.forEach((node, i) => (i % 2 ? R : L).push(node));
    return [L, R];
  }, [
    filter,
    latestSave,
    savedIds,
    readingIds,
    finishedIds,
    quotedIds,
    dislikedIds,
    savedAt,
    pagesRead,
    openedLetters,
    collected,
  ]);

  const empty = colL.length === 0 && colR.length === 0;

  return (
    <section
      className={`screen pb-home ${active ? 'on' : ''} ${collapsed ? 'collapsed' : ''}`}
      id="screen-today"
    >
      <div className="pb-head">
        <CurtainValance />
        <CurtainHem />
        <h1 className="pb-marquee" aria-label={t.marqueeAria}>
          <Wordmark decorative />
        </h1>
        <StatChips />
        <CompactStrip />
        <div className="pb-tags" role="group" aria-label={t.filterAria}>
          {FILTERS.map((k) => (
            <button
              key={k}
              className="pb-tag"
              aria-pressed={filter === k}
              onClick={(e) => {
                setFilter(k);
                e.currentTarget.scrollIntoView({ inline: 'nearest', block: 'nearest' });
              }}
            >
              {t.tags[k]}
            </button>
          ))}
        </div>
        <div className="pb-rule" />
      </div>

      <div className="pb-feed" ref={feedRef} onScroll={onScroll}>
        {empty ? (
          <div className="pb-empty">
            <Icon name={filter === 'shelf' ? 'ti-heart' : 'ti-feather'} />
            <p>{filter === 'shelf' ? t.emptyShelfLine : t.emptyLine}</p>
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
