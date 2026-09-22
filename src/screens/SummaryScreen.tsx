import { IconBookmark, IconBookmarkFilled, IconShare, IconStar } from '@tabler/icons-react';
import { navigate } from '../app/router';
import { useStore, selectCouncil } from '../store/useStore';
import { figure } from '../content/figures';
import { book } from '../content/books';
import { takeawaysFor, readingFor } from '../engine/council';
import { TopBar } from '../components/chrome';
import { Avatar } from '../components/Avatar';
import { Cover } from '../components/Cover';
import { Owl } from '../components/Owl';
import { useBump } from '../hooks/useBump';
import { useT, fmt } from '../i18n/react';
import './SummaryScreen.css';

/* ============================================================
   Discussion summary — "Key insights. Real books."
   What they agree on, where they differ, what fits, one next step, and
   the three books behind the conversation.
   ============================================================ */
export function SummaryScreen({ id }: { id: string }) {
  const session = useStore(selectCouncil(id));
  const setCouncilSaved = useStore((s) => s.setCouncilSaved);
  const saved = useStore((s) => s.saved);
  const toggleSaved = useStore((s) => s.toggleSaved);
  const showToast = useStore((s) => s.showToast);
  const d = useT();
  const [saveBump, bumpSave] = useBump();

  if (!session) {
    return (
      <div className="screen">
        <TopBar backFallback={{ name: 'council' }} title={d.summary.title} className="top-inset" />
        <p className="pad muted" style={{ paddingTop: 24 }}>{d.summary.missing}</p>
      </div>
    );
  }
  const t = takeawaysFor(session);
  const recs = readingFor(session);

  const saveAll = () => {
    bumpSave();
    setCouncilSaved(session.id, true);
    for (const r of recs) if (!saved.includes(r.bookId)) toggleSaved(r.bookId);
    showToast(d.summary.saved, { label: d.common.open, onClick: () => navigate({ name: 'library' }) });
  };
  const share = async () => {
    const text = `${session.question}\n\n${t.commonGround}\n\n${d.summary.via}`;
    try {
      if (navigator.share) await navigator.share({ title: fmt(d.summary.shareTitle, { title: session.title }), text });
      else {
        await navigator.clipboard.writeText(text);
        showToast(d.summary.copied);
      }
    } catch {
      /* dismissed */
    }
  };

  return (
    <div className="screen summary">
      <TopBar
        backFallback={{ name: 'discussion', id: session.id }}
        className="top-inset"
        right={
          <>
            <button type="button" className={`iconbtn ${session.saved ? 'on' : ''} ${saveBump ? 'bump' : ''}`} aria-label={session.saved ? d.summary.ariaSaved : d.summary.ariaSave} onClick={() => (session.saved ? (bumpSave(), setCouncilSaved(session.id, false)) : saveAll())}>
              {session.saved ? <IconBookmarkFilled /> : <IconBookmark stroke={1.8} />}
            </button>
            <button type="button" className="iconbtn" aria-label={d.common.share} onClick={share}>
              <IconShare stroke={1.8} />
            </button>
          </>
        }
      />
      <Owl color="yellow" size={64} className="summary-owl" />
      <div className="screen-scroll pad summary-body">
        <p className="caps muted">{d.summary.kicker}</p>
        <h1 className="display summary-title">{d.summary.agree}</h1>
        <p className="summary-lead">{t.commonGround}</p>

        <h2 className="heading summary-h2">{d.summary.differ}</h2>
        <ul className="summary-diffs">
          {t.differences.map((d) => {
            const f = figure(d.figureId);
            return (
              <li key={d.figureId}>
                <Avatar figure={f} size={30} />
                <span>
                  <b>{f.name}</b>
                  <br />
                  {d.text}
                </span>
              </li>
            );
          })}
        </ul>

        <h2 className="heading summary-h2">{d.summary.fits}</h2>
        <p className="summary-p">{t.fits}</p>
        {t.context.length > 0 && (
          <ul className="tk-context summary-ctx">
            {t.context.map((c, i) => (
              <li key={i}>{fmt(d.cards.youAdded, { c })}</li>
            ))}
          </ul>
        )}

        <div className="summary-next">
          <span className="caps">{d.summary.next}</span>
          <p>{t.nextStep}</p>
        </div>

        <h2 className="heading summary-h2 books-h2">{d.summary.books}</h2>
        <ul className="summary-books">
          {recs.map((r) => {
            const b = book(r.bookId);
            return (
              <li key={r.bookId}>
                <button type="button" className="summary-book" onClick={() => navigate({ name: 'book', id: b.id, council: session.id })}>
                  <span className="summary-cover">
                    <Cover book={b} width={94} />
                    {r.bestStart && (
                      <span className="summary-best" title={d.summary.bestTitle}>
                        <IconStar /> {d.summary.startHere}
                      </span>
                    )}
                  </span>
                  <span className="summary-book-title">{b.title}</span>
                  <span className="summary-book-author">{b.authorName}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <ul className="summary-whys">
          {recs.map((r) => {
            const b = book(r.bookId);
            return (
              <li key={r.bookId}>
                <b>{b.title}</b> — {r.why} <span className="muted">{fmt(d.summary.startWith, { label: b.start.label, title: b.start.title })}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="summary-actions pad">
        <button type="button" className="btn btn-primary" onClick={saveAll}>
          {d.summary.save}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => navigate({ name: 'discussion', id: session.id })}>
          {d.summary.continue}
        </button>
      </div>
    </div>
  );
}
