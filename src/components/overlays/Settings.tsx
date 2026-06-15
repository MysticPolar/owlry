import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { isBackendConfigured } from '../../lib/supabase';
import { Icon } from '../Icon';

const isEmail = (s: string) => /^\S+@\S+\.\S+$/.test(s.trim());

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '2px solid var(--ink)',
  borderRadius: 8,
  background: '#fff',
  padding: '11px 13px',
  font: "600 13.5px 'Inter Tight', sans-serif",
  color: 'var(--ink)',
  boxShadow: '3px 3px 0 var(--ink)',
  marginBottom: 10,
};

/**
 * Account settings — the "separate settings page". The profile card is
 * clickable and opens a log in / sign up page (email + password). The app keeps
 * running on a silent guest session until someone signs in, so there's no
 * locking screen.
 */
export function Settings() {
  const open = useStore((s) => s.settingsOpen);
  const close = useStore((s) => s.closeSettings);
  const account = useStore((s) => s.account);
  const username = useStore((s) => s.username);
  const busy = useStore((s) => s.authBusy);
  const notice = useStore((s) => s.authNotice);
  const signUp = useStore((s) => s.accountSignUp);
  const signIn = useStore((s) => s.accountSignIn);
  const signOut = useStore((s) => s.accountSignOut);

  const [view, setView] = useState<'home' | 'auth'>('home');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const configured = isBackendConfigured();
  const guest = !account || account.isGuest;
  const name = username || account?.email || 'Guest reader';
  const avatarChar = (username?.[0] || account?.email?.[0] || 'G').toUpperCase();
  const valid = isEmail(email) && password.length >= 6;

  const goAuth = () => {
    useStore.setState({ authNotice: null });
    setView('auth');
  };
  const goHome = () => {
    useStore.setState({ authNotice: null });
    setView('home');
  };

  const submit = async () => {
    if (!valid || busy) return;
    if (mode === 'login') await signIn(email, password);
    else await signUp(email, password);
    const st = useStore.getState();
    if (st.account && !st.account.isGuest && st.authNotice?.kind === 'ok') {
      setEmail('');
      setPassword('');
      setView('home');
    }
  };

  return (
    <div
      className={`letter ${open ? 'on' : ''}`}
      id="settings"
      role="dialog"
      aria-modal="true"
      aria-label="Account settings"
    >
      <div className="l-top">
        <button
          className="iconbtn lite"
          aria-label={view === 'auth' ? 'Back' : 'Close settings'}
          onClick={view === 'auth' ? goHome : close}
        >
          <Icon name="ti-arrow-left" />
        </button>
        <div className="d">{view === 'auth' ? (mode === 'login' ? 'LOG IN' : 'SIGN UP') : 'ACCOUNT'}</div>
        <span style={{ flex: '0 0 32px' }} aria-hidden="true" />
      </div>

      <div className="l-body">
        {view === 'home' ? (
          <>
            {/* clickable profile → log in / sign up page */}
            <button
              type="button"
              className="pcard"
              onClick={goAuth}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
              }}
              aria-label={guest ? 'Log in or sign up' : 'Manage account'}
            >
              <div className="avatar lg d">{avatarChar}</div>
              <div style={{ flex: 1 }}>
                <div className="pname d">{name}</div>
                <div className="psub">
                  {guest ? 'TAP TO LOG IN OR SIGN UP' : 'EMAIL ACCOUNT · SYNCED'}
                </div>
              </div>
              <Icon name="ti-chevron-right" style={{ color: 'var(--fade)' }} />
            </button>

            {!configured && (
              <>
                <div className="l-sec">SYNC IS OFF</div>
                <p className="l-p">
                  This build isn’t connected to the backend, so your reading lives on this device
                  only.
                </p>
              </>
            )}

            {!guest && (
              <div className="l-btnrow">
                <button className="btn ghost" disabled={busy} onClick={() => void signOut()}>
                  {busy ? 'SIGNING OUT…' : 'SIGN OUT'} <Icon name="ti-logout-2" />
                </button>
              </div>
            )}

            <div className="l-sign it">— the owl post office keeps your letters safe</div>
          </>
        ) : (
          <>
            {/* log in / sign up toggle */}
            <div className="seg" role="tablist" aria-label="Log in or sign up" style={{ marginTop: 4 }}>
              <button
                className={`chip grow ${mode === 'login' ? 'on' : ''}`}
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => {
                  useStore.setState({ authNotice: null });
                  setMode('login');
                }}
              >
                log in
              </button>
              <button
                className={`chip grow ${mode === 'signup' ? 'on' : ''}`}
                role="tab"
                aria-selected={mode === 'signup'}
                onClick={() => {
                  useStore.setState({ authNotice: null });
                  setMode('signup');
                }}
              >
                sign up
              </button>
            </div>

            <div className="l-sec">{mode === 'login' ? 'WELCOME BACK' : 'CREATE AN ACCOUNT'}</div>
            <p className="l-p">
              {mode === 'login'
                ? 'Log in to pick up your shelves, streak, and ink on any device.'
                : 'Sign up to save your reading across devices. Your email is your account.'}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@email.com"
                aria-label="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
              <input
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="password"
                aria-label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
              <div className="l-btnrow">
                <button className="btn" type="submit" disabled={busy || !valid}>
                  {busy ? 'PLEASE WAIT…' : mode === 'login' ? 'LOG IN' : 'SIGN UP'}{' '}
                  <Icon name={mode === 'login' ? 'ti-login-2' : 'ti-user-plus'} />
                </button>
              </div>
            </form>

            <p className="l-p" style={{ color: 'var(--fade)', fontSize: 12 }}>
              {mode === 'signup' ? 'Password needs at least 6 characters.' : ' '}
            </p>
          </>
        )}

        {notice && (
          <p
            className="l-p"
            role="status"
            aria-live="polite"
            style={{ color: notice.kind === 'error' ? '#b23' : 'var(--green)', fontWeight: 600 }}
          >
            {notice.text}
          </p>
        )}
      </div>
    </div>
  );
}
