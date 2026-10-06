import { Fragment, useEffect, useState } from 'react';
import { IconBookmark, IconBookmarkFilled, IconShare } from '@tabler/icons-react';
import { navigate } from '../app/router';
import { useStore, selectCouncil } from '../store/useStore';
import { figure } from '../content/figures';
import { maybeBook } from '../content/books';
import { takeawaysFor, readingFor, cyclesFor, liveFor } from '../engine/council';
import { AppBar, Steps, Thinking } from '../components/chrome';
import { Avatar } from '../components/Avatar';
import { Cover } from '../components/Cover';
import { LineView } from '../components/Line';
import { AskBar, type Addressee } from '../components/AskBar';
import { useBump } from '../hooks/useBump';
import { usePresence } from '../hooks/usePresence';
import { useT, useLang, fmt } from '../i18n/react';
import './SummaryScreen.css';

/* ============================================================
   Act III — the programme: the verdict, then the books. The question
   that was put, what the three agree on and what fits, one book per
   seat to read next, where they differ, one next step to keep, and the
   whole transcript on request. Under it the ask bar: a follow-up to the
   council plays as a new cycle (back to Act I); a question to one seat
   opens the one-on-one.
   ============================================================ */
export function SummaryScreen({ id }: { id: string }) {
  const session = useStore(selectCouncil(id));
  const setCouncilSaved = useStore((s) => s.setCouncilSaved);
  const saved = useStore((s) => s.saved);
  const toggleSaved = useStore((s) => s.toggleSaved);
  const saveStep = useStore((s) => s.saveStep);
  const stepSaved = useStore((s) => s.steps.some((x) => x.councilId === id));
  const sendFollowUp = useStore((s) => s.sendFollowUp);
  const showToast = useStore((s) => s.showToast);
  const ensureSeats = useStore((s) => s.ensureSeats);
  const ensureBook = useStore((s) => s.ensureBook);
  const t = useT();
  const lang = useLang();
  const [saveBump, bumpSave] = useBump();
  const [sel, setSel] = useState<Addressee>('C');
  const [transcript, setTranscript] = useState(false);
  const tr = usePresence(transcript, 220);
  // a recalled book's card lands in `minds`, not in the session: subscribing fills in its row when it does
  useStore((s) => s.minds);
  const recs = session ? readingFor(session) : [];

  // a finished council opens here, not on the acts: a cast session's seats get their cards here too (and again in a
  // new language), and the recalled books on the list are asked for now that their rows are on screen — in the
  // language the rows read in; both return at once when the card is already here
  useEffect(() => {
    if (session?.cast) ensureSeats(session.id);
  }, [session?.id, session?.cast, lang, ensureSeats]);
  const recalledIds = recs
    .filter((r) => maybeBook(r.bookId)?.recalled)
    .map((r) => r.bookId)
    .join(' ');
  useEffect(() => {
    for (const b of recalledIds.split(' ')) if (b) void ensureBook(b);
  }, [recalledIds, lang, ensureBook]);

  if (!session) {
    return (
      <div className="screen summary">
        <AppBar back={{ name: 'council' }} label={t.steps.summary} />
        <div className="content">
          <p className="sub">{t.summary.missing}</p>
        </div>
      </div>
    );
  }

  const seats = session.seats;
  const tk = takeawaysFor(session);
  const cycles = cyclesFor(session);
  const latest = cycles[cycles.length - 1];
  const latestQ = latest?.prompt.text ?? session.question;
  const isFollowUp = !!latest && latest.prompt.userKind !== 'question';
  // the live council is still writing the opening (not a later follow-up): the scripted verdict stands until it answers
  const pending = session.pending ?? [];
  const liveWriting = pending.length > 0 && !liveFor(session) && !!cycles[0]?.lines.some((m) => pending.includes(m.id));
  // a seat chosen before it was replaced falls back to the whole council
  const who = sel !== 'C' && seats.includes(sel) ? figure(sel) : null;
  const placeholder = who ? fmt(t.summary.phMind, { name: who.short }) : t.summary.phCouncil;

  const saveAll = () => {
    bumpSave();
    setCouncilSaved(session.id, true);
    for (const r of recs) if (!saved.includes(r.bookId)) toggleSaved(r.bookId);
    showToast(t.summary.saved, { label: t.common.open, onClick: () => navigate({ name: 'library' }) });
  };
  const unsave = () => {
    bumpSave();
    setCouncilSaved(session.id, false);
    showToast(t.summary.removed);
  };
  const share = async () => {
    const text = `${session.question}\n\n${tk.commonGround}\n\n${t.summary.via}`;
    try {
      if (navigator.share) await navigator.share({ title: fmt(t.summary.shareTitle, { title: session.title }), text });
      else {
        await navigator.clipboard.writeText(text);
        showToast(t.summary.copied);
      }
    } catch {
      /* dismissed */
    }
  };
  const keepStep = () => {
    if (saveStep(session.id)) showToast(t.summary.stepSaved);
  };
  const send = (text: string) => {
    // both ways leave this screen: let the keyboard go now, not when the field unmounts behind the next screen
    (document.activeElement as HTMLElement | null)?.blur();
    if (who) {
      sendFollowUp(session.id, text, who.id);
      navigate({ name: 'one', id: session.id, figure: who.id });
    } else {
      // the follow-up plays as a new cycle: Act I, then the new lines in Act II
      sendFollowUp(session.id, text);
      navigate({ name: 'stands', id: session.id });
    }
  };

  return (
    <div className="screen summary">
      <AppBar
        right={
          <>
            <button
              type="button"
              className={`iconbtn ${session.saved ? 'on' : ''} ${saveBump ? 'bump' : ''}`}
              aria-label={session.saved ? t.summary.ariaSaved : t.summary.ariaSave}
              aria-pressed={session.saved}
              onClick={session.saved ? unsave : saveAll}
            >
              {session.saved ? <IconBookmarkFilled /> : <IconBookmark stroke={1.8} />}
            </button>
            <button type="button" className="iconbtn" aria-label={t.common.share} onClick={share}>
              <IconShare stroke={1.8} />
            </button>
          </>
        }
      />
      <Steps current="summary" />
      <div className="content">
        <p className="sub summary-q rv">
          {isFollowUp ? t.summary.followUp : ''}“{latestQ}”
        </p>

        <div className="sec lead-sec rv" style={{ animationDelay: '.1s' }}>
          <div className="k">{t.summary.verdict}</div>
          <div className="v">
            {tk.commonGround} {tk.fits}
          </div>
          {tk.context.length > 0 && (
            <ul className="added">
              {tk.context.map((c, i) => (
                <li key={i}>{fmt(t.summary.youAdded, { c })}</li>
              ))}
            </ul>
          )}
          {liveWriting && <p className="sub casting">{t.summary.casting}</p>}
        </div>

        <h2 className="lead read-next rv" style={{ animationDelay: '.2s' }}>
          {t.summary.readNext}
        </h2>
        <div className="rv" style={{ animationDelay: '.26s' }}>
          {recs.map((r) => {
            const b = maybeBook(r.bookId);
            if (!b) return null;
            const f = figure(r.figureId);
            return (
              // a recalled book still on its way opens its page too: the page shows the arriving note
              <button key={`${r.figureId}:${r.bookId}`} type="button" className="rn" onClick={() => navigate({ name: 'book', id: b.id, council: session.id })}>
                <Cover book={b} width={46} height={64} />
                <div className="grow">
                  {r.bestStart && <div className="pk">{t.summary.pick}</div>}
                  <div className="t">{b.title}</div>
                  <div className="a">{b.start.label ? fmt(t.summary.startWith, { name: f.short, label: b.start.label }) : fmt(t.summary.bySeat, { name: f.short })}</div>
                  <div className="w">{r.why}</div>
                </div>
                <span className={`readbtn ${r.bestStart ? '' : 'outline'}`}>{t.summary.read}</span>
              </button>
            );
          })}
        </div>

        <div className="sec differ rv" style={{ animationDelay: '.34s' }}>
          <div className="k">{t.summary.differ}</div>
          <div className="v">
            {tk.differences.map((d, i) => {
              const f = figure(d.figureId);
              return (
                <div key={d.figureId} className="diff">
                  <Avatar figure={f} size={26} seat={i} className="sm" />
                  <span>
                    <b>{f.short}:</b> {d.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sec next rv" style={{ animationDelay: '.42s' }}>
          <div className="k">{t.summary.nextStep}</div>
          <div className="v">{tk.nextStep}</div>
          <div className="act2">
            <span className="caps lands">{t.summary.lands}</span>
            <button type="button" className="btn ghost sm" disabled={stepSaved} onClick={keepStep}>
              {stepSaved ? t.summary.savedStep : t.summary.saveStep}
            </button>
          </div>
        </div>

        <button type="button" className="btn text tr rv" style={{ animationDelay: '.5s' }} aria-expanded={transcript} onClick={() => setTranscript((v) => !v)}>
          {transcript ? t.summary.hideTranscript : t.summary.showTranscript}
        </button>
        {tr.mounted && (
          <div className={`transcript ${tr.closing ? 'closing' : 'rv'}`}>
            {cycles.map((c) => (
              <Fragment key={c.prompt.id}>
                <div className="msg-me">{c.prompt.text}</div>
                {c.lines.map((m) =>
                  session.pending?.includes(m.id) ? (
                    <Thinking key={m.id}>{fmt(t.debate.writing, { name: figure(m.figureId!).short })}</Thinking>
                  ) : (
                    <LineView key={m.id} m={m} seats={seats} compact />
                  ),
                )}
              </Fragment>
            ))}
          </div>
        )}
        <div className="tail" aria-hidden="true" />
      </div>
      <div className="footer">
        <AskBar session={session} selected={who ? who.id : 'C'} onSelect={setSel} placeholder={placeholder} onSend={send} />
      </div>
    </div>
  );
}
