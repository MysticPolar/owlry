import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../../store/useAuth';
import { useT } from '../../i18n/react';
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
  const t = useT().settings.auth;

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
      aria-label={t.ariaDialog}
    >
      <div className="auth-glow" aria-hidden="true" />
      <button className="auth-close" aria-label={t.ariaClose} onClick={closeAuth}>
        <Icon name="ti-x" />
      </button>

      <div className="auth-stage">
        <div className="auth-owl">
          <CastOwl owl="keeper" cls="hero" />
        </div>
        <div className="auth-head">
          <div className="auth-mark d">{t.mark}</div>
          <div className="auth-tag">{t.tag}</div>
        </div>

        <div className="auth-card">
          <div className="auth-tabs" role="tablist" aria-label={t.ariaTabs}>
            <button
              role="tab"
              aria-selected={!signup}
              className={!signup ? 'on' : ''}
              onClick={() => setMode('login')}
            >
              {t.tabLogin}
            </button>
            <button
              role="tab"
              aria-selected={signup}
              className={signup ? 'on' : ''}
              onClick={() => setMode('signup')}
            >
              {t.tabSignup}
            </button>
          </div>

          <form onSubmit={submit} noValidate>
            {signup && (
              <label className="auth-field">
                <span className="auth-lab">
                  <Icon name="ti-sparkles" /> {t.inviteLabel}
                </span>
                <input
                  ref={firstRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t.invitePlaceholder}
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label={t.ariaInvite}
                />
              </label>
            )}
            <label className="auth-field">
              <span className="auth-lab">
                <Icon name="ti-mail" /> {t.emailLabel}
              </span>
              <input
                ref={signup ? undefined : firstRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                autoCapitalize="none"
                autoComplete="email"
                spellCheck={false}
                enterKeyHint={signup ? 'next' : 'go'}
                aria-label={t.ariaEmail}
              />
            </label>
            <label className="auth-field">
              <span className="auth-lab">
                <Icon name="ti-lock" /> {signup ? t.passwordSetLabel : t.passwordLabel}
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={signup ? t.passwordNewPlaceholder : t.passwordPlaceholder}
                autoComplete={signup ? 'new-password' : 'current-password'}
                enterKeyHint="go"
                aria-label={t.ariaPassword}
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
                  ? t.busySignup
                  : t.busyLogin
                : signup
                  ? t.submitSignup
                  : t.submitLogin}
            </button>
          </form>

          <div className="auth-alt">
            {signup ? (
              <>
                {t.altHaveAccount}{' '}
                <button onClick={() => setMode('login')}>{t.altLogin}</button>
              </>
            ) : (
              <>
                {t.altNoAccount}{' '}
                <button onClick={() => setMode('signup')}>{t.altSignup}</button>
              </>
            )}
          </div>
        </div>

        <button className="auth-guest" onClick={continueAsGuest}>
          {t.guest} <Icon name="ti-arrow-right" />
        </button>
        {!available && (
          <div className="auth-note it">
            {t.backendNote}
          </div>
        )}
      </div>
    </div>
  );
}
