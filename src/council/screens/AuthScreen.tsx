import { useEffect, useState, type FormEvent } from 'react';
import { IconBrandApple, IconBrandGoogle } from '@tabler/icons-react';
import { navigate } from '../app/router';
import { useStore } from '../store/useStore';
import { useAuth } from '../store/useAuth';
import { TopBar } from '../components/chrome';
import { Wordmark } from '../components/Wordmark';
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

  useEffect(() => clearError, [mode, clearError]);

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

  return (
    <div className="screen night auth">
      <TopBar backFallback={{ name: 'welcome' }} className="top-inset" />
      <form className="screen-scroll pad auth-form" onSubmit={submit}>
        <Wordmark size={24} />
        <h1 className="display auth-title">{mode === 'signup' ? t.auth.titleSignup : t.auth.titleSignin}</h1>
        <p className="muted">{mode === 'signup' ? t.auth.subSignup : t.auth.subSignin}</p>
        <div className="auth-social">
          <button type="button" className="btn btn-dark" disabled={busy} onClick={() => social('apple')}>
            <IconBrandApple /> {t.auth.apple}
          </button>
          <button type="button" className="btn btn-outline" disabled={busy} onClick={() => social('google')}>
            <IconBrandGoogle /> {t.auth.google}
          </button>
        </div>
        <div className="auth-or caps">{t.auth.or}</div>
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
          <p className="small auth-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary auth-submit" disabled={busy}>
          {busy ? t.auth.busy : mode === 'signup' ? t.auth.submitSignup : t.auth.submitSignin}
        </button>
        <button type="button" className="linkbtn auth-guest" onClick={() => { setOnboarded(true); navigate({ name: 'interests' }, { replace: true }); }}>
          {t.auth.guest}
        </button>
        <p className="small muted auth-note">{available ? t.auth.noteBackend : t.auth.noteProto}</p>
      </form>
    </div>
  );
}
