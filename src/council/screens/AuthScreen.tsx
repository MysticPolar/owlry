import { useEffect, useState, type FormEvent } from 'react';
import { IconBrandApple, IconBrandGoogle } from '@tabler/icons-react';
import { navigate } from '../app/router';
import { useStore } from '../store/useStore';
import { useAuth } from '../store/useAuth';
import { AppBar } from '../components/chrome';
import { useT } from '../i18n/react';
import './AuthScreen.css';

/* ============================================================
   Sign-up / sign-in. With a backend (VITE_SUPABASE_*), this is a real
   account: council-signup creates it, Supabase Auth signs it in, and the
   sync module pulls the reader's library. Without one, the on-device mock
   from the prototype stays: the name becomes the profile.
   ============================================================ */
export function AuthScreen({ mode }: { mode: 'signup' | 'signin' }) {
  const signInLocal = useStore((s) => s.signIn);
  const setOnboarded = useStore((s) => s.setOnboarded);
  const user = useStore((s) => s.user);
  const available = useAuth((s) => s.available);
  const busy = useAuth((s) => s.busy);
  const error = useAuth((s) => s.error);
  const login = useAuth((s) => s.login);
  const register = useAuth((s) => s.register);
  const oauth = useAuth((s) => s.oauth);
  const clearError = useAuth((s) => s.clearError);
  const t = useT();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [invite, setInvite] = useState('');

  // an error belongs to the attempt that raised it: a stale one (Settings' sign-in form, the other mode) is
  // cleared on arrival, and this screen's own is cleared when it leaves
  useEffect(() => {
    clearError();
    return clearError;
  }, [mode, clearError]);

  const afterAuth = () => {
    setOnboarded(true);
    navigate(mode === 'signup' ? { name: 'interests' } : { name: 'council' }, { replace: true });
  };

  // the prototype path: no backend, the typed name becomes the profile
  const finishLocal = (n?: string) => {
    const typed = name.trim();
    signInLocal(n ?? typed, typed ? typed.toLowerCase().replace(/[^a-z0-9]+/g, '.') : undefined);
    afterAuth();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!available) {
      finishLocal(mode === 'signup' ? name.trim() || user.name : user.name);
      return;
    }
    const ok = mode === 'signup' ? await register({ name: name.trim(), email, password, inviteCode: invite }) : await login(email, password);
    if (ok) afterAuth();
  };

  const social = async (provider: 'apple' | 'google') => {
    if (!available) {
      finishLocal(user.name);
      return;
    }
    await oauth(provider);
  };

  const guest = () => {
    setOnboarded(true);
    navigate({ name: 'interests' }, { replace: true });
  };

  // the welcome only offers "Sign in", so each mode links to the other (replace: back still returns to where you came from)
  const switchMode = () => navigate(mode === 'signup' ? { name: 'signin' } : { name: 'signup' }, { replace: true });

  return (
    <div className="screen auth">
      <AppBar back={{ name: 'welcome' }} />
      <form className="content auth-form" onSubmit={(e) => void submit(e)}>
        <h1 className="lead auth-title rv">{mode === 'signup' ? t.auth.titleSignup : t.auth.titleSignin}</h1>
        <p className="sub auth-sub rv" style={{ animationDelay: '.06s' }}>
          {mode === 'signup' ? t.auth.subSignup : t.auth.subSignin}
        </p>
        <div className="auth-social rv" style={{ animationDelay: '.12s' }}>
          <button type="button" className="btn dark" disabled={busy} onClick={() => void social('apple')}>
            <IconBrandApple stroke={1.8} /> {t.auth.apple}
          </button>
          <button type="button" className="btn ghost" disabled={busy} onClick={() => void social('google')}>
            <IconBrandGoogle stroke={1.8} /> {t.auth.google}
          </button>
        </div>
        <div className="auth-or caps rv" style={{ animationDelay: '.18s' }}>
          {t.auth.or}
        </div>
        <div className="auth-fields rv" style={{ animationDelay: '.24s' }}>
          {mode === 'signup' && (
            <div className="field">
              <label htmlFor="auth-name">{t.auth.name}</label>
              <input id="auth-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.auth.namePh} autoComplete="name" />
            </div>
          )}
          <div className="field">
            <label htmlFor="auth-email">{t.auth.email}</label>
            <input id="auth-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.auth.emailPh} autoComplete="email" required={available} />
          </div>
          <div className="field">
            <label htmlFor="auth-pass">{t.auth.password}</label>
            <input
              id="auth-pass"
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={available ? 8 : undefined}
              required={available}
            />
          </div>
          {mode === 'signup' && available && (
            <div className="field">
              <label htmlFor="auth-invite">{t.auth.invite}</label>
              <input id="auth-invite" className="input" value={invite} onChange={(e) => setInvite(e.target.value.toUpperCase())} placeholder={t.auth.invitePh} autoComplete="off" autoCapitalize="characters" />
            </div>
          )}
          {error && (
            <p key={error} className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn gold auth-submit" disabled={busy}>
            {busy ? t.auth.busy : mode === 'signup' ? t.auth.submitSignup : t.auth.submitSignin}
          </button>
          <p className="small muted auth-switch">
            {mode === 'signup' ? t.auth.haveAccount : t.auth.noAccount}
            <button type="button" className="linkbtn" onClick={switchMode}>
              {mode === 'signup' ? t.auth.toSignin : t.auth.toSignup}
            </button>
          </p>
          <button type="button" className="btn text" onClick={guest}>
            {t.auth.guest}
          </button>
          <p className="small muted auth-note">{available ? t.auth.noteBackend : t.auth.noteProto}</p>
        </div>
      </form>
    </div>
  );
}
