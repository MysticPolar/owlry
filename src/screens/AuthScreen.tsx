import { useState, type FormEvent } from 'react';
import { IconBrandApple, IconBrandGoogle } from '@tabler/icons-react';
import { navigate } from '../app/router';
import { useStore } from '../store/useStore';
import { TopBar } from '../components/chrome';
import { Wordmark } from '../components/Wordmark';
import './AuthScreen.css';

/* mock sign-up / sign-in: no backend yet, the name becomes the profile */
export function AuthScreen({ mode }: { mode: 'signup' | 'signin' }) {
  const signIn = useStore((s) => s.signIn);
  const setOnboarded = useStore((s) => s.setOnboarded);
  const user = useStore((s) => s.user);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const finish = (n?: string) => {
    signIn(n ?? name, n ? n.toLowerCase().replace(/[^a-z0-9]+/g, '.') : undefined);
    setOnboarded(true);
    navigate(mode === 'signup' ? { name: 'interests' } : { name: 'council' }, { replace: true });
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    finish(mode === 'signup' ? name.trim() || user.name : user.name);
  };

  return (
    <div className="screen night auth">
      <TopBar backFallback={{ name: 'welcome' }} className="top-inset" />
      <form className="screen-scroll pad auth-form" onSubmit={submit}>
        <Wordmark size={24} />
        <h1 className="display auth-title">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
        <p className="muted">{mode === 'signup' ? 'Save councils, highlights and books across devices.' : 'Pick up where you left off.'}</p>
        <div className="auth-social">
          <button type="button" className="btn btn-dark" onClick={() => finish(user.name)}>
            <IconBrandApple /> Continue with Apple
          </button>
          <button type="button" className="btn btn-outline" onClick={() => finish(user.name)}>
            <IconBrandGoogle /> Continue with Google
          </button>
        </div>
        <div className="auth-or caps">or with email</div>
        {mode === 'signup' && (
          <div className="field">
            <label htmlFor="auth-name">Name</label>
            <input id="auth-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="What should we call you?" autoComplete="name" />
          </div>
        )}
        <div className="field">
          <label htmlFor="auth-email">Email</label>
          <input id="auth-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="auth-pass">Password</label>
          <input id="auth-pass" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
        </div>
        <button type="submit" className="btn btn-primary auth-submit">
          {mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
        <button type="button" className="linkbtn auth-guest" onClick={() => { setOnboarded(true); navigate({ name: 'interests' }, { replace: true }); }}>
          Continue as a guest
        </button>
        <p className="small muted auth-note">Prototype: accounts are stored on this device only.</p>
      </form>
    </div>
  );
}
