import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { IconArrowUp, IconRefresh } from '@tabler/icons-react';
import { navigate } from '../app/router';
import { useStore, selectCouncil } from '../store/useStore';
import { figure } from '../content/figures';
import { suggestionsFor } from '../content/councils';
import { introsFor } from '../engine/council';
import { Wordmark } from '../components/Wordmark';
import { CouncilTable } from '../components/CouncilTable';
import { Avatar } from '../components/Avatar';
import './CouncilScreen.css';

/* ============================================================
   Screen 0 — Life's Council Room. "Ask. Listen. Grow."
   Three empty seats, one lamp, a question. Once asked, the seats fill and
   each thinker is introduced with why their perspective fits.
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

  const convening = active && active.stage === 'convening' ? active : null;
  const seats = convening ? convening.seats.map((id) => figure(id)) : [null, null, null];

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

  const suggestions = suggestionsFor(interests);

  return (
    <div className="screen night council">
      <div className="council-head top-inset pad">
        <Wordmark size={24} />
        {convening ? (
          <button type="button" className="iconbtn" aria-label="Ask something else" onClick={() => setActive(null)}>
            <IconRefresh stroke={2} />
          </button>
        ) : (
          <span style={{ width: 40 }} />
        )}
      </div>
      <div className="screen-scroll council-body nav-space">
        <div className="pad council-titles">
          <h1 className="display council-title">The Council</h1>
          <p className="muted council-sub">{convening ? `Three minds on “${convening.question}”` : 'Three minds walk into a question.'}</p>
        </div>
        <div className="council-stage">
          <CouncilTable seats={seats} />
          {!convening && <span className="hand council-hand">Great conversations start here.</span>}
        </div>

        {convening ? (
          <div className={`pad intros ${showIntros ? 'show' : ''}`}>
            <p className="caps intros-label">Your council</p>
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
            <p className="micro-note">AI interpretations grounded in each thinker’s published work. Quotes are marked; the rest is paraphrase.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                join(convening.id);
                navigate({ name: 'discussion', id: convening.id });
              }}
            >
              Join the discussion
            </button>
          </div>
        ) : (
          <div className="pad council-ask">
            <p className="council-prompt">What’s on your mind?</p>
            <form className="askbar" onSubmit={onSubmit}>
              <textarea
                ref={inputRef}
                rows={1}
                placeholder="Ask anything…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKey}
                aria-label="Your question"
              />
              <button type="submit" className="sendbtn" aria-label="Ask the council" disabled={!text.trim()}>
                <IconArrowUp stroke={2.5} />
              </button>
            </form>
            <ul className="suggestions" role="list">
              {suggestions.map((s) => (
                <li key={s.text}>
                  <button type="button" className="suggestion" onClick={() => submit(s.text, s.councilId)}>
                    {s.text}
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
