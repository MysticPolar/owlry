import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../../store/useAuth';
import { Icon } from '../Icon';
import { CastOwl } from '../CastOwl';

/* ============================================================
   The members' door — owlry's login / signup, staged as the
   Owlery box office at night. Keeper presides (accounts are the
   ledger). Sign up is by invitation code + email + password;
   after that it's email + password. "Peek in as a guest" keeps
   the local-first app for anyone without an account.
   ============================================================ */
export function Auth() {
  const open = useAuth((s) => s.authOpen);
  const mode = useAuth((s) => s.mode);
  const busy = useAuth((s) => s.busy);
  const error = useAuth((s) => s.error);
  const available = useAuth((s) => s.available);
  const setMode = useAuth((s) => s.setMode);
  const closeAuth = useAuth((s) => s.closeAuth);
  const login = useAuth((s) => s.login);
  const register = useAuth((s) => s.register);
  const continueAsGuest = useAuth((s) => s.continueAsGuest);

  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const firstRef = useRef<HTMLInputElement>(null);

  const signup = mode === 'signup';

  // clear the password (never the email) when the door closes, and focus the
  // top field each time it opens
  useEffect(() => {
    if (open) {
      setPassword('');
      const t = setTimeout(() => firstRef.current?.focus(), 260);
      return () => clearTimeout(t);
    }
  }, [open, mode]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (signup) void register(code, email, password);
    else void login(email, password);
  };

  return (
    <div
      className={`auth ${open ? 'on' : ''}`}
      id="auth"
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to owlry"
    >
      <div className="auth-glow" aria-hidden="true" />
      <button className="auth-close" aria-label="Close" onClick={closeAuth}>
        <Icon name="ti-x" />
      </button>

      <div className="auth-stage">
        <div className="auth-owl">
          <CastOwl owl="keeper" cls="hero" />
        </div>
        <div className="auth-head">
          <div className="auth-mark d">the owlery</div>
          <div className="auth-tag">members’ door · by invitation</div>
        </div>

        <div className="auth-card">
          <div className="auth-tabs" role="tablist" aria-label="Log in or sign up">
            <button
              role="tab"
              aria-selected={!signup}
              className={!signup ? 'on' : ''}
              onClick={() => setMode('login')}
            >
              log in
            </button>
            <button
              role="tab"
              aria-selected={signup}
              className={signup ? 'on' : ''}
              onClick={() => setMode('signup')}
            >
              sign up
            </button>
          </div>

          <form onSubmit={submit} noValidate>
            {signup && (
              <label className="auth-field">
                <span className="auth-lab">
                  <Icon name="ti-sparkles" /> invitation code
                </span>
                <input
                  ref={firstRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="OWLERY-2026"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Invitation code"
                />
              </label>
            )}
            <label className="auth-field">
              <span className="auth-lab">
                <Icon name="ti-mail" /> email
              </span>
              <input
                ref={signup ? undefined : firstRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@somewhere.com"
                autoCapitalize="none"
                autoComplete="email"
                spellCheck={false}
                enterKeyHint={signup ? 'next' : 'go'}
                aria-label="Email"
              />
            </label>
            <label className="auth-field">
              <span className="auth-lab">
                <Icon name="ti-lock" /> {signup ? 'set a password' : 'password'}
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={signup ? 'at least 8 characters' : '••••••••'}
                autoComplete={signup ? 'new-password' : 'current-password'}
                enterKeyHint="go"
                aria-label="Password"
              />
            </label>

            {error && (
              <div className="auth-err" role="alert">
                {error}
              </div>
            )}

            <button className="btn auth-submit" type="submit" disabled={busy}>
              {busy
                ? signup
                  ? 'CHECKING THE LEDGER…'
                  : 'SIGNING IN…'
                : signup
                  ? 'CREATE ACCOUNT'
                  : 'LOG IN'}
            </button>
          </form>

          <div className="auth-alt">
            {signup ? (
              <>
                already on the ledger?{' '}
                <button onClick={() => setMode('login')}>log in</button>
              </>
            ) : (
              <>
                no account yet?{' '}
                <button onClick={() => setMode('signup')}>sign up, by invitation</button>
              </>
            )}
          </div>
        </div>

        <button className="auth-guest" onClick={continueAsGuest}>
          peek in as a guest <Icon name="ti-arrow-right" />
        </button>
        {!available && (
          <div className="auth-note it">
            accounts need a backend — guest works fully offline.
          </div>
        )}
      </div>
    </div>
  );
}
