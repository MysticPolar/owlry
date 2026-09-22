import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { IconArrowUp, IconRefresh } from '@tabler/icons-react';
import { navigate } from '../app/router';
import { useStore, selectCouncil } from '../store/useStore';
import { figure } from '../content/figures';
import { suggestionsFor } from '../content/councils';
import { introsFor } from '../engine/council';
import { Wordmark } from '../components/Wordmark';
import { CouncilRoom } from '../components/CouncilRoom';
import { Ticker } from '../components/Ticker';
import { Owl } from '../components/Owl';
import { Avatar } from '../components/Avatar';
import { useT, fmt } from '../i18n/react';
import './CouncilScreen.css';

/* ============================================================
   Screen 0 — Life's Council Room. The room fills the top of the screen
   with the title over it and the ticker under it; three empty chairs wait
   for a question. Once asked, the beams come up, the seats fill, and each
   thinker is introduced with why their perspective fits.
   ============================================================ */
export function CouncilScreen() {
  const interests = useStore((s) => s.interests);
  const ask = useStore((s) => s.ask);
  const activeId = useStore((s) => s.activeCouncilId);
  const active = useStore(selectCouncil(activeId));
  const setActive = useStore((s) => s.setActiveCouncil);
  const join = useStore((s) => s.joinDiscussion);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const t = useT();

  const convening = active && active.stage === 'convening' ? active : null;
  const seats = convening ? convening.seats.map((id) => figure(id)) : [null, null, null];

  // if the painting cannot be fetched, the room is drawn instead
  const [drawn, setDrawn] = useState(false);

  // the intro cards arrive after the seats have filled
  const [showIntros, setShowIntros] = useState(false);
  useEffect(() => {
    if (!convening) {
      setShowIntros(false);
      return;
    }
    const t = setTimeout(() => setShowIntros(true), 1350);
    return () => clearTimeout(t);
  }, [convening?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (q: string, councilId?: string) => {
    const question = q.trim();
    if (!question) return;
    ask(question, councilId);
    setText('');
    inputRef.current?.blur();
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(text);
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(text);
    }
  };
  const focusAsk = () => inputRef.current?.focus();

  const suggestions = suggestionsFor(interests);

  return (
    <div className={`screen night council ${drawn ? 'council-flat' : 'council-paint'}`}>
      <div className="council-head top-inset pad">
        <Wordmark size={26} />
        <button
          type="button"
          className="iconbtn"
          aria-label={convening ? t.council.askElse : t.council.startOver}
          onClick={() => {
            setActive(null);
            setText('');
            inputRef.current?.focus();
          }}
        >
          <IconRefresh stroke={2} />
        </button>
      </div>
      <div className="screen-scroll council-body nav-space">
        <div className="council-stage">
          <CouncilRoom
            seats={seats}
            emptyAria={t.council.seatEmptyAria}
            onEmptyTap={convening ? undefined : focusAsk}
            drawn={drawn}
            onArtFail={() => setDrawn(true)}
          />
          <div className="council-titles">
            {!convening && <p className="council-kicker">{t.council.sub}</p>}
            <h1 className="council-marquee">
              {t.council.title}
              <span className="dot">.</span>
            </h1>
            {convening && <p className="council-kicker asked">{fmt(t.council.subAsked, { q: convening.question })}</p>}
          </div>
          {!convening && <Owl color="teal" pose="peek" size={76} className="council-owl" title={t.council.owl} />}
          {!convening && drawn && <span className="hand council-hand2">{t.council.hand}</span>}
        </div>
        <Ticker items={t.council.ticker} />

        {convening ? (
          <div className={`pad intros ${showIntros ? 'show' : ''}`}>
            <p className="caps intros-label">{t.council.yourCouncil}</p>
            {introsFor(convening).map(({ figureId, why }, i) => {
              const f = figure(figureId);
              return (
                <div key={figureId} className="card intro-card" style={{ animationDelay: `${i * 120}ms` }}>
                  <Avatar figure={f} size={44} />
                  <div className="grow">
                    <div className="intro-name">
                      {f.name} <span className="intro-label">· {f.label}</span>
                    </div>
                    <p className="small intro-why">{why}</p>
                  </div>
                </div>
              );
            })}
            <p className="micro-note">{t.council.note}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                join(convening.id);
                navigate({ name: 'discussion', id: convening.id });
              }}
            >
              {t.council.join}
            </button>
          </div>
        ) : (
          <div className="pad council-ask">
            <p className="council-prompt">{t.council.prompt}</p>
            <form className="askbar" onSubmit={onSubmit}>
              <textarea
                ref={inputRef}
                rows={1}
                placeholder={t.council.ph}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKey}
                aria-label={t.council.ariaQ}
              />
              <button type="submit" className="sendbtn" aria-label={t.council.ariaAsk} disabled={!text.trim()}>
                <IconArrowUp stroke={2.5} />
              </button>
            </form>
            <ul className="suggestions" role="list">
              {suggestions.map((s) => (
                <li key={s.text}>
                  <button type="button" className="suggestion" onClick={() => submit(s.text, s.councilId)}>
                    <span className="suggestion-text">{s.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
