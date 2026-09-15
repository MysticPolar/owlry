import { navigate } from '../app/router';
import { useStore } from '../store/useStore';
import { Wordmark } from '../components/Wordmark';
import { Owl } from '../components/Owl';
import './WelcomeScreen.css';

/* ============================================================
   1. Login / Welcome — "Step into a curious new chapter."
   A dark stage, one spotlight, the marquee line in condensed caps, and a
   small figure looking up at it.
   ============================================================ */
export function WelcomeScreen() {
  const setOnboarded = useStore((s) => s.setOnboarded);
  return (
    <div className="screen night welcome">
      <div className="welcome-spot" aria-hidden="true" />
      <div className="welcome-cone" aria-hidden="true" />
      <div className="welcome-head top-inset pad">
        <Wordmark size={28} />
        <Owl color="orange" size={54} className="welcome-owl" title="An owl, perched in the corner" />
      </div>
      <div className="welcome-hero pad">
        <h1 className="marquee">
          Walk
          <br />
          with
          <br />
          Great
          <br />
          Minds<span className="dot">.</span>
        </h1>
        <p className="welcome-sub">
          Better questions.
          <br />A richer you.
        </p>
        <Reader />
      </div>
      <div className="welcome-actions pad">
        <button type="button" className="btn btn-primary" onClick={() => navigate({ name: 'signup' })}>
          Create an account
        </button>
        <button type="button" className="btn btn-outline" onClick={() => navigate({ name: 'signin' })}>
          I already have an account
        </button>
        <button
          type="button"
          className="linkbtn welcome-explore"
          onClick={() => {
            setOnboarded(true);
            navigate({ name: 'interests' });
          }}
        >
          or explore without an account
        </button>
        <p className="caps welcome-foot">Same books. A brighter you.</p>
      </div>
    </div>
  );
}

/* a small reader with a backpack, looking up at the marquee */
function Reader() {
  return (
    <svg className="welcome-reader" viewBox="0 0 80 120" width="64" height="96" aria-hidden="true">
      <defs>
        <linearGradient id="wr-rim" x1="0" x2="1">
          <stop offset="0" stopColor="#2A2B31" />
          <stop offset="1" stopColor="#4A4C55" />
        </linearGradient>
      </defs>
      <ellipse cx="40" cy="114" rx="26" ry="4" fill="rgba(245,185,66,0.18)" />
      <circle cx="40" cy="22" r="11" fill="url(#wr-rim)" />
      <path d="M20 108 L22 60 Q22 42 40 40 Q58 42 58 60 L60 108 Z" fill="url(#wr-rim)" />
      <path d="M18 62 Q12 56 14 44 Q16 36 24 38 L26 62 Z" fill="#1E1F24" />
      <rect x="10" y="44" width="16" height="30" rx="7" fill="#3A3C45" />
      <path d="M30 108 L28 118 L38 118 L38 108 Z" fill="#1E1F24" />
      <path d="M50 108 L52 118 L42 118 L42 108 Z" fill="#1E1F24" />
      <path d="M34 20 Q40 12 48 18" stroke="#F5B942" strokeWidth="1.5" fill="none" opacity="0.7" />
    </svg>
  );
}
