import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { IconBook, IconBriefcase, IconChartBar, IconCheck, IconChevronDown, IconHeart, IconHeartbeat, IconMessageCircle } from '@tabler/icons-react';
import { navigate } from '../app/router';
import { markReveal } from '../app/stage';
import { useStore } from '../store/useStore';
import type { Area, Figure } from '../content/types';
import { figure } from '../content/figures';
import { areasList, suggestionsFor } from '../content/councils';
import { AppBar, Sheet, Thinking } from '../components/chrome';
import { Stage, type Curtain } from '../components/Stage';
import { Owl } from '../components/Owl';
import { useT, fmt } from '../i18n/react';
import { useAutoGrow } from '../hooks/useAutoGrow';
import { useReduceMotion } from '../hooks/useReduceMotion';
import './CouncilScreen.css';

/* ============================================================
   The room — the Home tab. The stage sits under the app bar with the
   last council in its chairs (or three empty seats breathing), and the
   question under it: the ask box with the interest pill, four
   suggestions, "Cast the council" in the footer. Casting closes the
   velvet curtain over the seats; Act I finds it closed and opens it on
   the new cast (app/stage.ts carries the hand-off).
   ============================================================ */

/** the mockup's category glyphs, one per interest area */
const ICONS: Record<Area, ReactNode> = {
  health: <IconHeartbeat stroke={1.8} />,
  career: <IconBriefcase stroke={1.8} />,
  investing: <IconChartBar stroke={1.8} />,
  relationships: <IconHeart stroke={1.8} />,
  literature: <IconBook stroke={1.8} />,
  other: <IconMessageCircle stroke={1.8} />,
};

/** the curtain's beat: it closes over the seats before Act I opens */
const CAST_BEAT_MS = 1150;

/** a seat's thinker, or an empty chair when no card is in the registry yet (a cast session synced ahead of its cards) */
function seatFigure(id: string): Figure | null {
  try {
    return figure(id);
  } catch {
    return null;
  }
}

/** a council being cast from this room: the session id at once (scripted), or null until the live council seats it */
interface Cast {
  id: string | null;
  question: string;
}

export function CouncilScreen() {
  const t = useT();
  const reduce = useReduceMotion();
  const interests = useStore((s) => s.interests);
  const setInterests = useStore((s) => s.setInterests);
  const ask = useStore((s) => s.ask);
  const storeCasting = useStore((s) => s.casting);
  const activeCouncilId = useStore((s) => s.activeCouncilId);
  const councils = useStore((s) => s.councils);
  const order = useStore((s) => s.councilOrder);
  const showToast = useStore((s) => s.showToast);

  const [text, setText] = useState('');
  const [catsOpen, setCatsOpen] = useState(false);
  const [cast, setCast] = useState<Cast | null>(null);
  const [curtain, setCurtain] = useState<Curtain>('none');
  const [beat, setBeat] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useAutoGrow(inputRef, text);

  /* ---- the seats: the last council that has been seated (the seeded one counts), else three empty chairs ---- */
  const last = useMemo(() => order.map((id) => councils[id]).find((c) => c && c.stage !== 'convening') ?? null, [order, councils]);
  const seats: (Figure | null)[] = last ? last.seats.map(seatFigure) : [null, null, null];

  const casting = !!cast;
  // the curtain is only seen while a council is cast, so it announces tonight's council — the one being cast (its
  // names once the session is known), never the last one still sitting behind it — the same words Act I opens on
  const castSession = cast?.id ? councils[cast.id] : undefined;
  const billed = castSession ? castSession.seats.map(seatFigure) : casting ? [] : seats;
  const marquee = [t.council.marquee, ...billed.flatMap((f) => (f ? [f.short] : []))].join(' · ');
  const openLast = () => {
    if (!last || casting) return;
    navigate(last.stage === 'summarized' ? { name: 'summary', id: last.id } : { name: 'stands', id: last.id });
  };
  // an empty chair, tapped: the ask box takes the focus and a toast says what fills it
  const onEmptyTap = () => {
    if (casting) return;
    inputRef.current?.focus();
    showToast(t.council.seatHint);
  };

  /* ---- casting ---- */
  const submit = (q: string, councilId?: string) => {
    const question = q.trim();
    if (question.length < 3) {
      inputRef.current?.focus();
      return;
    }
    if (cast || storeCasting) return;
    inputRef.current?.blur();
    const id = ask(question, councilId);
    setCast({ id, question });
    // the curtain comes out of the wings on this render; the effect below draws it on the next frame
    setCurtain('open');
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit(text);
    }
  };

  // a cast the store is still seating when the room mounts again (the reader left mid-cast and came back)
  useEffect(() => {
    if (!cast && storeCasting) setCast({ id: null, question: storeCasting.question });
  }, [cast, storeCasting]);

  // the live council answered: the seats are in (activeCouncilId), or the cast was abandoned and the ask box comes back
  useEffect(() => {
    if (!cast || cast.id !== null || storeCasting) return;
    if (activeCouncilId) {
      setCast({ ...cast, id: activeCouncilId });
    } else {
      setCast(null);
      setText((v) => v || cast.question);
    }
  }, [cast, storeCasting, activeCouncilId]);

  // the curtain closes over the seats: parked in the wings on one frame, drawn on the next, so the transition plays;
  // the beat is how long the room keeps it closed before Act I opens it
  useEffect(() => {
    if (!casting) {
      // a cast abandoned with the curtain drawn: it slides back into the wings rather than vanishing;
      // and its beat is forgotten, so the next cast cannot find it already passed and skip the curtain
      setCurtain((c) => (c === 'closed' ? 'open' : 'none'));
      setBeat(false);
      return;
    }
    setCurtain('open');
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => setCurtain('closed'));
    });
    setBeat(false);
    const tm = window.setTimeout(() => setBeat(true), reduce ? 10 : CAST_BEAT_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(tm);
    };
  }, [casting, reduce]);

  // the beat has passed and the session is known: Act I takes the reveal
  const readyId = cast?.id ?? null;
  useEffect(() => {
    if (!readyId || !beat) return;
    markReveal(readyId);
    navigate({ name: 'stands', id: readyId });
  }, [readyId, beat]);

  /* ---- interests + suggestions ---- */
  const areas = areasList();
  const picked = areas.filter((a) => interests.includes(a.id));
  const pillLabel = picked.length ? picked.map((a) => a.title).join(' · ') : t.council.chooseInterest;
  const toggle = (a: Area) => setInterests(interests.includes(a) ? interests.filter((x) => x !== a) : [...interests, a]);
  const suggestions = suggestionsFor(interests);

  return (
    <div className="screen council-room">
      <AppBar />
      <Stage
        mode="mid"
        seats={seats}
        curtain={curtain}
        marquee={marquee}
        last={
          last
            ? { text: fmt(t.council.lastCouncil, { q: last.question }), action: t.council.open, onOpen: openLast, aria: t.council.lastAria }
            : undefined
        }
        onSeatTap={last && !casting ? openLast : undefined}
        onEmptyTap={!last && !casting ? onEmptyTap : undefined}
        seatAria={(f) => fmt(t.council.seatAria, { name: f.name })}
        emptyAria={t.council.seatEmptyAria}
      />
      <div className="content">
        <h1 className="lead rv">{t.council.lead}</h1>
        <div className="askbox rv" style={{ animationDelay: '.06s' }}>
          <textarea
            ref={inputRef}
            className="askq"
            rows={2}
            placeholder={t.council.ph}
            aria-label={t.council.ariaQ}
            autoComplete="off"
            autoCapitalize="sentences"
            enterKeyHint="send"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
          />
          <div className="askfoot">
            <button type="button" className={`pill ${picked.length ? 'on' : ''}`} aria-label={t.council.pickAria} onClick={() => setCatsOpen(true)}>
              <span className="pill-text">{pillLabel}</span>
              <IconChevronDown stroke={2} />
            </button>
          </div>
        </div>
        {/* keyed by its questions: a change of interests brings a fresh list in rather than swapping the words in place */}
        <ul key={suggestions.map((s) => s.text).join('|')} className="suggest rv" role="list" style={{ animationDelay: '.12s' }}>
          {suggestions.map((s, n) => (
            <li key={s.text}>
              <button type="button" onClick={() => submit(s.text, s.councilId)}>
                <span className="n" aria-hidden="true">
                  0{n + 1}
                </span>
                <span>{s.text}</span>
                <span className="arr" aria-hidden="true">
                  →
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="footer">
        {casting ? (
          <Thinking>{t.council.casting}</Thinking>
        ) : (
          <button type="button" className="btn gold" disabled={text.trim().length < 3} onClick={() => submit(text)}>
            {t.council.cast}
          </button>
        )}
      </div>

      {/* the categories, in a sheet: a tap toggles the interest at once; the suggestions follow */}
      <Sheet open={catsOpen} onClose={() => setCatsOpen(false)} label={t.interests.sheetAria} className="cats">
        <h2 className="display">
          {t.interests.title1}
          <br />
          {t.interests.title2}
        </h2>
        <ul className="tiles" role="list">
          {areas.map((a) => {
            const on = interests.includes(a.id);
            return (
              <li key={a.id}>
                <button type="button" className={`tile ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggle(a.id)}>
                  <span className="tile-icon">{ICONS[a.id]}</span>
                  <span className="tile-text">
                    <span className="tile-title">{a.title}</span>
                    <span className="tile-sub">{a.tagline}</span>
                  </span>
                  <span className="tile-check" aria-hidden="true">
                    <IconCheck stroke={3} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="catfoot">
          <button type="button" className="btn gold" onClick={() => setCatsOpen(false)}>
            {t.interests.done}
          </button>
        </div>
        <Owl color="teal" size={84} pose="peek" className="interests-owl" title={t.interests.owl} />
      </Sheet>
    </div>
  );
}
