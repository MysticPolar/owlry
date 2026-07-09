/* ============================================================
   owlry — the login gate.

   Rendered instead of the whole app tree whenever a backend is
   configured (src/lib/supabase.ts) but no session exists. Sign-in
   calls Supabase Auth directly; the store's auth listener
   (useStore.ts) picks up the resulting session and the gate simply
   stops rendering — there's nothing else to wire here.
   ============================================================ */
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Icon } from '../Icon';

type Mode = 'signin' | 'signup';

export function LoginGate() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || pending) return;
    setPending(true);
    setError(null);
    setNotice(null);

    try {
      if (mode === 'signin') {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInErr) setError("that didn't match — check your email and password.");
        // on success, the store's onAuthStateChange listener takes it from here
      } else {
        const { data, error: fnErr } = await supabase.functions.invoke('signup-with-invite', {
          body: {
            email: email.trim(),
            password,
            invite_code: inviteCode.trim(),
            display_name: displayName.trim() || undefined,
            method: 'password',
          },
        });
        if (fnErr || !data?.ok) {
          setError(data?.error ?? "that invite code didn't work — check it and try again.");
        } else {
          // Password signups are auto-confirmed (the invite code is the gate),
          // so sign straight in — the store's auth listener drops the gate.
          const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
          if (signInErr) {
            setNotice("you're in — sign in below with the email and password you just chose.");
            switchMode('signin');
          }
        }
      }
    } catch {
      setError('the post desk is quiet for a moment — try again shortly.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="gate">
      <div className="gate-mark d">
        owlry<span className="gdot">.</span>
      </div>
      <p className="gate-tag it">
        {mode === 'signin' ? 'the post desk remembers you, if you’d like it to.' : 'invite-only, for now — a code gets you in.'}
      </p>

      <form onSubmit={submit}>
        <div className="gate-field">
          <label className="gate-label" htmlFor="gateEmail">
            email
          </label>
          <input
            id="gateEmail"
            className="gate-input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@somewhere.com"
          />
        </div>

        {mode === 'signup' && (
          <div className="gate-field">
            <label className="gate-label" htmlFor="gateInvite">
              invite code
            </label>
            <input
              id="gateInvite"
              className="gate-input"
              type="text"
              autoCapitalize="characters"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="e.g. OWLRY2026"
            />
          </div>
        )}

        <div className="gate-field">
          <label className="gate-label" htmlFor="gatePassword">
            password
          </label>
          <input
            id="gatePassword"
            className="gate-input"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            minLength={mode === 'signup' ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {mode === 'signup' && (
          <div className="gate-field">
            <label className="gate-label" htmlFor="gateName">
              what should the owl call you? (optional)
            </label>
            <input
              id="gateName"
              className="gate-input"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="a first name is plenty"
            />
          </div>
        )}

        {error && <p className="gate-err">{error}</p>}
        {notice && <p className="gate-err" style={{ color: 'var(--green)' }}>{notice}</p>}

        <button className="btn" type="submit" disabled={pending}>
          {pending ? '…' : mode === 'signin' ? 'sign in' : 'create account'} <Icon name="ti-arrow-right" />
        </button>
      </form>

      <button className="gate-switch" onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}>
        {mode === 'signin' ? 'i have an invite' : 'back to sign in'}
      </button>

      <p className="gate-note">
        your conversations and what the owl learns about you stay private to your account — you can view or forget any
        of it later from your profile.
      </p>
    </div>
  );
}
