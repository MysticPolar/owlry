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

  if (!session) {
    return (
      <div className="screen">
        <TopBar backFallback={{ name: 'council' }} title="Summary" className="top-inset" />
        <p className="pad muted" style={{ paddingTop: 24 }}>This conversation isn’t on this device.</p>
      </div>
    );
  }
  const t = takeawaysFor(session);
  const recs = readingFor(session);

  const saveAll = () => {
    setCouncilSaved(session.id, true);
    for (const r of recs) if (!saved.includes(r.bookId)) toggleSaved(r.bookId);
    showToast('Saved to your library — the council and its three books.', { label: 'Open', onClick: () => navigate({ name: 'library' }) });
  };
  const share = async () => {
    const text = `${session.question}\n\n${t.commonGround}\n\nvia owlry — Walk with Great Minds.`;
    try {
      if (navigator.share) await navigator.share({ title: `A Conversation on ${session.title}`, text });
      else {
        await navigator.clipboard.writeText(text);
        showToast('Summary copied to the clipboard.');
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
            <button type="button" className={`iconbtn ${session.saved ? 'on' : ''}`} aria-label={session.saved ? 'Saved' : 'Save this council'} onClick={() => (session.saved ? setCouncilSaved(session.id, false) : saveAll())}>
              {session.saved ? <IconBookmarkFilled /> : <IconBookmark stroke={1.8} />}
            </button>
            <button type="button" className="iconbtn" aria-label="Share" onClick={share}>
              <IconShare stroke={1.8} />
            </button>
          </>
        }
      />
      <Owl color="yellow" size={64} className="summary-owl" />
      <div className="screen-scroll pad summary-body">
        <p className="caps muted">Your council’s takeaways</p>
        <h1 className="display summary-title">What They Agree On</h1>
        <p className="summary-lead">{t.commonGround}</p>

        <h2 className="heading summary-h2">Where They Differ</h2>
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

        <h2 className="heading summary-h2">What Fits Your Situation</h2>
        <p className="summary-p">{t.fits}</p>
        {t.context.length > 0 && (
          <ul className="tk-context summary-ctx">
            {t.context.map((c, i) => (
              <li key={i}>You added: “{c}”</li>
            ))}
          </ul>
        )}

        <div className="summary-next">
          <span className="caps">One next step</span>
          <p>{t.nextStep}</p>
        </div>

        <h2 className="heading summary-h2 books-h2">The Books Behind the Conversation</h2>
        <ul className="summary-books">
          {recs.map((r) => {
            const b = book(r.bookId);
            return (
              <li key={r.bookId}>
                <button type="button" className="summary-book" onClick={() => navigate({ name: 'book', id: b.id, council: session.id })}>
                  <span className="summary-cover">
                    <Cover book={b} width={94} />
                    {r.bestStart && (
                      <span className="summary-best" title="Best starting point">
                        <IconStar /> Start here
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
                <b>{b.title}</b> — {r.why} <span className="muted">Start with {b.start.label}: {b.start.title}.</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="summary-actions pad">
        <button type="button" className="btn btn-primary" onClick={saveAll}>
          Save to Library
        </button>
        <button type="button" className="btn btn-outline" onClick={() => navigate({ name: 'discussion', id: session.id })}>
          Continue the Conversation
        </button>
      </div>
    </div>
  );
}
