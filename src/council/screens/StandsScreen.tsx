import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IconArrowsLeftRight } from '@tabler/icons-react';
import { navigate } from '../app/router';
import { takeReveal, markJoin } from '../app/stage';
import { useStore, selectCouncil } from '../store/useStore';
import type { CouncilSession } from '../store/types';
import { figure } from '../content/figures';
import { maybeBook } from '../content/books';
import { candidatesFor, cyclesFor, introsFor, readingFor, scriptFor, seatScript } from '../engine/council';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { AppBar, Steps, Thinking } from '../components/chrome';
import { Stage, type Curtain } from '../components/Stage';
import { Avatar } from '../components/Avatar';
import { FigureSheet } from '../components/FigureSheet';
import { useT, useLang, fmt } from '../i18n/react';
import './StandsScreen.css';

/* ============================================================
   Act I — the Stands. "Three minds. One book each."
   The band of the stage above (the curtain opens on a fresh cast, the
   seats take their places one by one), then one card per seat: who they
   are, the line they open with, the book their seat argues from. A
   portrait opens the bio sheet; the arrows swap the seat for the next
   alternate (Undo in the toast); the footer joins the debate.
   ============================================================ */

/** how long the seats' entrance takes at most (the reveal's: 0.7s + 2 × 0.24s + 0.6s), after which the flag is lifted */
const SEAT_ENTRANCE_MS = 2600;
/** on a reveal, how long the screen keeps the curtain drawn before parking it open — past the Stage's own 350ms cue, so the Stage is driving by then */
const CURTAIN_HOLD_MS = 700;
/** how long a swap on a cast council waits for the live council's alternates before saying there are none yet (they still land later) */
const ALTERNATES_WAIT_MS = 20_000;

/** the book each seat argues from: the reading card's pick for that thinker, else the seat's script (a cast seat may have none) */
function seatBookIds(session: CouncilSession): (string | undefined)[] {
  const reading = readingFor(session);
  const script = scriptFor(session);
  return session.seats.map((fid, i) => reading.find((r) => r.figureId === fid)?.bookId ?? (seatScript(script, i, fid).bookId || undefined));
}

export function StandsScreen({ id }: { id: string }) {
  const session = useStore(selectCouncil(id));
  const casting = useStore((s) => s.casting);
  const joinDiscussion = useStore((s) => s.joinDiscussion);
  const replaceSeat = useStore((s) => s.replaceSeat);
  const undoReplace = useStore((s) => s.undoReplace);
  const showToast = useStore((s) => s.showToast);
  const ensureSeats = useStore((s) => s.ensureSeats);
  const ensureAlternates = useStore((s) => s.ensureAlternates);
  const ensureBook = useStore((s) => s.ensureBook);
  const reduce = useReduceMotion();
  const t = useT();
  const lang = useLang();

  const [bioFigure, setBioFigure] = useState<string | null>(null);
  // a cast council's swap that is waiting on the live council for its alternates: that seat's arrows pulse
  const [asking, setAsking] = useState<number | null>(null);
  // a swap can land after an await, and an Undo can be tapped from the toast after this screen has gone
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // the reveal: the ask screen marked this session when it cast it — taken once, before the first paint
  // (a deep link or a return plays nothing)
  const [revealToken, setRevealToken] = useState<string | null>(null);
  useLayoutEffect(() => {
    if (takeReveal(id)) setRevealToken(id);
  }, [id]);
  // the curtain has to be found closed on the first paint of a reveal. The Stage only draws it closed from its own
  // effect, which can land a frame late (the curtain would be seen sliding shut first), so this screen draws it
  // closed itself — in the same pre-paint render as the token — and parks it open once the Stage has the reveal under way
  const [curtain, setCurtain] = useState<Curtain>('none');
  useLayoutEffect(() => {
    if (!revealToken) return;
    setCurtain('closed');
    const tm = window.setTimeout(() => setCurtain('open'), reduce ? 30 : CURTAIN_HOLD_MS);
    return () => clearTimeout(tm);
  }, [revealToken, reduce]);

  // which seats play their entrance: all of them on arrival, then only a seat that was just swapped.
  // The flag is cleared once the entrance is over so a later swap can put the class back fresh
  const [animateSeats, setAnimateSeats] = useState<'all' | number | null>('all');
  const [swappedSeat, setSwappedSeat] = useState<number | null>(null);
  const seatTimer = useRef<number | null>(null);
  const seatFrame = useRef<number | null>(null);
  useEffect(() => {
    seatTimer.current = window.setTimeout(() => setAnimateSeats(null), SEAT_ENTRANCE_MS);
    return () => {
      if (seatTimer.current) clearTimeout(seatTimer.current);
      if (seatFrame.current) cancelAnimationFrame(seatFrame.current);
    };
  }, []);
  /**
   * Plays a seat's entrance afresh. The class has to leave the element for a frame before it comes back, or the
   * browser will not restart the animation — so `then` (the change of who sits there) runs on that next frame,
   * together with the class: the old face holds the frame in between and the new one arrives with its pop-in.
   * `then` returns false when nothing changed, and the seat is left as it is
   */
  const playSeat = (seat: number, then?: () => boolean | void) => {
    if (seatTimer.current) clearTimeout(seatTimer.current);
    if (seatFrame.current) cancelAnimationFrame(seatFrame.current);
    setAnimateSeats(null);
    seatFrame.current = requestAnimationFrame(() => {
      seatFrame.current = null;
      if (then?.() === false) return;
      setAnimateSeats(seat);
      seatTimer.current = window.setTimeout(() => setAnimateSeats(null), SEAT_ENTRANCE_MS);
    });
  };

  // a cast session's seats get their cards now that they are on screen (and again in a new language)
  useEffect(() => {
    if (session?.cast) ensureSeats(session.id);
  }, [session?.id, session?.cast, lang, ensureSeats]);
  // the seats' books: a recalled one's card lands in `minds`, not in the session — subscribing fills in its title when it
  // does — and it is asked for here, in the language the page reads in (ensureBook returns at once when it is already here)
  useStore((s) => s.minds);
  const recalledBooks = session ? seatBookIds(session).filter((b) => maybeBook(b)?.recalled).join(' ') : '';
  useEffect(() => {
    for (const b of recalledBooks.split(' ')) if (b) void ensureBook(b);
  }, [recalledBooks, lang, ensureBook]);

  if (!session) {
    // the live council is still seating this one: the acts are on their way
    if (casting) {
      return (
        <div className="screen stands">
          <AppBar back={{ name: 'council' }} />
          <Steps current="stands" />
          <div className="content" />
          <div className="footer">
            <Thinking>{t.stands.casting}</Thinking>
          </div>
        </div>
      );
    }
    return (
      <div className="screen stands">
        <AppBar back={{ name: 'council' }} />
        <div className="content">
          <p className="muted">{t.stands.missing}</p>
        </div>
      </div>
    );
  }

  const seats = session.seats.map((fid) => figure(fid));
  const intros = introsFor(session);
  const bookIds = seatBookIds(session);
  const followUp = cyclesFor(session).length > 1;
  const marquee = `${t.council.marquee} · ${seats.map((f) => f.short).join(' · ')}`;

  /**
   * The swap: `to` takes the seat; the card and the chair arrive afresh; Undo in the toast. It reads the session from
   * the store, not this render — it can run after an await (a cast council's alternates) or from a toast
   */
  const swap = (seat: number, to: string) => {
    setBioFigure(null);
    const cur = useStore.getState().councils[id];
    if (!cur) return;
    const joined = figure(to);
    const book = maybeBook(seatScript(scriptFor(cur), seat, to).bookId)?.title;
    // a live or cast council re-plans the debate around the newcomer's book; a scripted one has every line ready
    const sep = lang === 'zh' ? '' : ' ';
    const replanned = (cur.cast || cur.source === 'live') && book ? sep + fmt(t.stands.replanned, { book }) : '';
    const undo = () => {
      // the toast outlives the screen: away from it, the seat simply goes back
      if (!mounted.current) return undoReplace(id);
      playSeat(seat, () => {
        undoReplace(id);
        setSwappedSeat(seat);
      });
    };
    playSeat(seat, () => {
      replaceSeat(id, seat, to);
      // the store refuses a swap it cannot make (a cast alternate that has since gone): no toast for what did not happen
      if (useStore.getState().councils[id]?.seats[seat] !== to) return false;
      setSwappedSeat(seat);
      showToast(fmt(t.stands.tookSeat, { name: joined.short }) + replanned, { label: t.common.undo, onClick: undo });
    });
  };
  /** the arrows: the next candidate. A cast council knows no alternates until the live council is asked for them (once) */
  const swapNext = async (seat: number) => {
    if (asking !== null) return;
    const cur = useStore.getState().councils[id];
    if (!cur) return;
    const next = candidatesFor(cur, seat)[0];
    if (next) return swap(seat, next);
    if (!cur.cast) return;
    setAsking(seat);
    let cap = 0;
    try {
      await Promise.race([ensureAlternates(id), new Promise<void>((resolve) => (cap = window.setTimeout(resolve, ALTERNATES_WAIT_MS)))]);
    } catch {
      /* the toast below says so */
    } finally {
      clearTimeout(cap);
    }
    if (!mounted.current) return;
    setAsking(null);
    const now = useStore.getState().councils[id];
    // the seat changed hands meanwhile (the bio sheet's Replace, once the alternates landed): that was the swap
    if (!now || now.seats[seat] !== cur.seats[seat]) return;
    const later = candidatesFor(now, seat)[0];
    if (later) swap(seat, later);
    else showToast(t.stands.noSwap);
  };

  const join = () => {
    joinDiscussion(session.id);
    markJoin(session.id);
    navigate({ name: 'debate', id: session.id });
  };

  return (
    <div className="screen stands">
      <AppBar />
      <Steps current="stands" />
      <Stage
        mode="band"
        seats={seats}
        curtain={revealToken ? curtain : 'none'}
        reveal={revealToken}
        animateSeats={animateSeats}
        marquee={marquee}
        onSeatTap={(i) => setBioFigure(session.seats[i])}
      />
      <div className="content">
        <h1 className="lead rv">
          {t.stands.title}
          {followUp && <span className="muted">{t.stands.followUp}</span>}
        </h1>
        {seats.map((f, i) => {
          // a cast council whose alternates are not known yet keeps its arrows: a tap asks the live council for them
          const canSwap = candidatesFor(session, i).length > 0 || (!!session.cast && !session.cast.alternates.length);
          const waiting = asking === i;
          const bookTitle = maybeBook(bookIds[i])?.title;
          const swapped = swappedSeat === i;
          return (
            // keyed by who sits there: a swap (or its undo) mounts the card afresh, so it arrives — at once, not on the stagger
            <div key={`${i}-${f.id}`} className={`cast rv ${swapped ? 'swapped' : ''}`} style={{ animationDelay: swapped ? '0s' : `${(0.12 + i * 0.08).toFixed(2)}s` }}>
              <button type="button" className="who-btn" aria-label={fmt(t.stands.about, { name: f.name })} onClick={() => setBioFigure(f.id)}>
                <Avatar figure={f} size={40} seat={i} />
              </button>
              <div className="grow">
                <div className="head">
                  <button type="button" className="nm" onClick={() => setBioFigure(f.id)}>
                    {f.short}
                  </button>
                  <span className="cred">{f.label}</span>
                  <button
                    type="button"
                    className={`swapbtn ${waiting ? 'wait' : ''}`}
                    aria-label={fmt(t.stands.swap, { name: f.short })}
                    aria-busy={waiting || undefined}
                    title={fmt(t.stands.swap, { name: f.short })}
                    disabled={!canSwap}
                    onClick={() => void swapNext(i)}
                  >
                    <IconArrowsLeftRight stroke={1.8} />
                  </button>
                </div>
                <div className="stance">{intros[i]?.why}</div>
                {bookTitle && <div className="bk">{bookTitle}</div>}
              </div>
            </div>
          );
        })}
        <p className="rv stands-note" style={{ animationDelay: '0.4s' }}>
          {t.stands.note}
        </p>
      </div>
      <div className="footer">
        <button type="button" className="btn gold" onClick={join}>
          {t.stands.join}
        </button>
      </div>

      {/* the bio sheet: no "Ask directly" on the stands (the mockup's sheet here has none) */}
      <FigureSheet session={session} figureId={bioFigure} onClose={() => setBioFigure(null)} onReplace={swap} />
    </div>
  );
}
