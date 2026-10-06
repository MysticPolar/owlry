import { useState, type FormEvent } from 'react';
import { navigate } from '../app/router';
import { useAuth } from '../store/useAuth';
import { useT } from '../i18n/react';

/* ============================================================
   A sign-in form small enough to sit inside another screen (Settings),
   for a reader who already has an account and is not on the welcome
   screen any more. The full auth screen keeps the social buttons and the
   invite field; this is email, password, and a way to create an account.
   ============================================================ */
export function SignInForm({ onDone }: { onDone?: () => void }) {
  const t = useT();
  const busy = useAuth((s) => s.busy);
  const error = useAuth((s) => s.error);
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) {
      setPassword('');
      onDone?.();
    }
  };

  return (
    <form className="stack signin-form" onSubmit={(e) => void submit(e)}>
      <div className="field">
        <label htmlFor="si-email">{t.settings.email}</label>
        <input id="si-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="si-pass">{t.settings.password}</label>
        <input id="si-pass" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </div>
      {error && (
        <p key={error} className="small auth-error signin-error" role="alert">
          {error}
        </p>
      )}
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <button type="submit" className="btn btn-dark btn-sm" disabled={busy}>
          {busy ? t.settings.signingIn : t.settings.signIn}
        </button>
        <button type="button" className="linkbtn" onClick={() => navigate({ name: 'signup' })}>
          {t.settings.noAccount} {t.settings.createAccount}
        </button>
      </div>
    </form>
  );
}
