import type { CSSProperties } from 'react';
import { navigate } from '../app/router';
import { AppBar } from '../components/chrome';
import { useT } from '../i18n/react';
import './WelcomeScreen.css';

/* ============================================================
   Welcome — the poster. A cone of light from the top-right corner, the
   marquee "Walk / with / Great / Minds." rising a line at a time (the
   period gold, like the wordmark's), one line of what the Council does,
   and two ways in: ask a first question, or sign in. The interests
   screen marks the reader onboarded once they continue from it.
   ============================================================ */
export function WelcomeScreen() {
  const t = useT();
  const lines = t.welcome.marquee;
  return (
    <div className="screen welcome">
      <AppBar rig={false} />
      <div className="content flush">
        <div className="welcome-cone" aria-hidden="true" />
        <div className="welcome-body">
          <div className="welcome-hero">
            <h1 className="marquee-title">
              {lines.map((line, i) => (
                <span key={i} className="marquee-line" style={{ '--i': i } as CSSProperties}>
                  {line}
                  {i === lines.length - 1 && <span className="dot">.</span>}
                </span>
              ))}
            </h1>
            <p className="welcome-sub">{t.welcome.sub}</p>
          </div>
          <div className="welcome-actions">
            <button type="button" className="btn gold" onClick={() => navigate({ name: 'interests' })}>
              {t.welcome.ask}
            </button>
            <button type="button" className="btn text welcome-signin" onClick={() => navigate({ name: 'signin' })}>
              {t.welcome.signIn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
