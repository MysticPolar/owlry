import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { isBackendConfigured } from '../../lib/supabase';
import { Icon } from '../Icon';

const isEmail = (s: string) => /^\S+@\S+\.\S+$/.test(s.trim());

/**
 * Account settings — the "separate settings page" for managing the account.
 * No locking screen: the app already runs on a silent guest session, and this
 * page lets the reader attach an email (keeping their progress) or sign into an
 * existing account. Reuses the full-screen `.letter` overlay shell.
 */
export function Settings() {
  const open = useStore((s) => s.settingsOpen);
  const close = useStore((s) => s.closeSettings);
  const account = useStore((s) => s.account);
  const busy = useStore((s) => s.authBusy);
  const notice = useStore((s) => s.authNotice);
  const linkEmail = useStore((s) => s.accountLinkEmail);
  const signIn = useStore((s) => s.accountSignIn);
  const signOut = useStore((s) => s.accountSignOut);

  const [email, setEmail] = useState('');
  const valid = isEmail(email);
  const configured = isBackendConfigured();
  const guest = !account || account.isGuest;

  return (
    <div
      className={`letter ${open ? 'on' : ''}`}
      id="settings"
      role="dialog"
      aria-modal="true"
      aria-label="Account settings"
    >
      <div className="l-top">
        <button className="iconbtn lite" aria-label="Close settings" onClick={close}>
          <Icon name="ti-arrow-left" />
        </button>
        <div className="d">ACCOUNT</div>
        <span style={{ flex: '0 0 32px' }} aria-hidden="true" />
      </div>

      <div className="l-body">
        <div className="pcard">
          <div className="prof">
            <div className="avatar lg d">
              <Icon name={guest ? 'ti-user' : 'ti-user-check'} />
            </div>
            <div>
              <div className="pname d">{guest ? 'Guest reader' : account?.email}</div>
              <div className="psub">
                {guest ? 'PROGRESS SAVED ON THIS DEVICE' : 'EMAIL ACCOUNT · SYNCED'}
              </div>
            </div>
          </div>
        </div>

        {!configured ? (
          <>
            <div className="l-sec">SYNC IS OFF</div>
            <p className="l-p">
              This build isn’t connected to the backend, so your reading lives on this device only.
              Set the Supabase keys to turn on accounts and cross-device sync.
            </p>
          </>
        ) : guest ? (
          <>
            <div className="l-sec">SAVE YOUR PROGRESS</div>
            <p className="l-p">
              Add your email to keep your shelves, streak, and ink across devices. We’ll send a
              confirmation link — everything you’ve read so far moves with you.
            </p>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@email.com"
              aria-label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border: '2px solid var(--ink)',
                borderRadius: 8,
                background: '#fff',
                padding: '11px 13px',
                font: "600 13.5px 'Inter Tight', sans-serif",
                color: 'var(--ink)',
                boxShadow: '3px 3px 0 var(--ink)',
              }}
            />
            <div className="l-btnrow">
              <button className="btn" disabled={busy || !valid} onClick={() => linkEmail(email)}>
                {busy ? 'SENDING…' : 'SAVE PROGRESS'} <Icon name="ti-mail" />
              </button>
              <button className="btn ghost" disabled={busy || !valid} onClick={() => signIn(email)}>
                I HAVE AN ACCOUNT <Icon name="ti-login-2" />
              </button>
            </div>
            <p className="l-p" style={{ color: 'var(--fade)', fontSize: 12 }}>
              “Save progress” links this guest to your email. “I have an account” emails a sign-in
              link instead (use it on a fresh device).
            </p>
          </>
        ) : (
          <>
            <div className="l-sec">SIGNED IN</div>
            <p className="l-p">
              You’re signed in as <strong>{account?.email}</strong>. Your reading syncs
              automatically — open Owlry anywhere and pick up where you left off.
            </p>
            <div className="l-btnrow">
              <button className="btn ghost" disabled={busy} onClick={() => void signOut()}>
                {busy ? 'SIGNING OUT…' : 'SIGN OUT'} <Icon name="ti-logout-2" />
              </button>
            </div>
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

        <div className="l-sign it">— the owl post office keeps your letters safe</div>
      </div>
    </div>
  );
}
