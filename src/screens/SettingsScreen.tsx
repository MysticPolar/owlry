import { useState } from 'react';
import { navigate } from '../app/router';
import { useStore } from '../store/useStore';
import { useAuth } from '../store/useAuth';
import type { TextSize } from '../store/types';
import { TopBar } from '../components/chrome';
import { OwlRow } from '../components/Owl';
import { saveProfile } from '../lib/auth/api';
import { isBackendConfigured, isLiveCouncilConfigured } from '../lib/supabase';

/* profile details, reading preferences, account, and the honest notes about what this prototype is */
export function SettingsScreen() {
  const user = useStore((s) => s.user);
  const setProfile = useStore((s) => s.setProfile);
  const signOut = useStore((s) => s.signOut);
  const textSize = useStore((s) => s.textSize);
  const setTextSize = useStore((s) => s.setTextSize);
  const resetDemo = useStore((s) => s.resetDemo);
  const showToast = useStore((s) => s.showToast);
  const logout = useAuth((s) => s.logout);
  const backend = isBackendConfigured();
  const [name, setName] = useState(user.name);
  const [handle, setHandle] = useState(user.handle);
  const [bio, setBio] = useState(user.bio);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const next = { name: name.trim() || user.name, handle: handle.trim().toLowerCase().replace(/[^a-z0-9._]+/g, '.') || user.handle, bio: bio.trim() || user.bio };
    if (user.id) {
      // the account's public profile lives in the cloud — the handle has to be free
      setSaving(true);
      const res = await saveProfile(user.id, next);
      setSaving(false);
      if (res === 'handle-taken') {
        showToast('That handle is taken — try another.');
        return;
      }
      if (res === 'server') {
        showToast('Couldn’t save just now. Try again in a moment.');
        return;
      }
    }
    setProfile({ ...next, initial: next.name.charAt(0).toUpperCase() });
    showToast('Profile updated.');
    navigate({ name: 'profile' });
  };

  const doSignOut = async () => {
    if (backend) await logout();
    else signOut();
    showToast('Signed out.');
  };

  return (
    <div className="screen">
      <TopBar backFallback={{ name: 'profile' }} title="Settings" className="top-inset" />
      <div className="screen-scroll pad nav-space stack" style={{ paddingTop: 8, gap: 18 }}>
        <section className="stack">
          <h2 className="heading">Profile</h2>
          <div className="field">
            <label htmlFor="s-name">Name</label>
            <input id="s-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="s-handle">Handle</label>
            <input id="s-handle" className="input" value={handle} onChange={(e) => setHandle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="s-bio">Short bio</label>
            <input id="s-bio" className="input" value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <button type="button" className="btn btn-dark btn-sm" onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </section>
        <section className="stack">
          <h2 className="heading">Reading</h2>
          <div className="row">
            <span className="grow">Text size</span>
            <div className="seg">
              {(['S', 'M', 'L'] as TextSize[]).map((s) => (
                <button key={s} type="button" className={textSize === s ? 'on' : ''} onClick={() => setTextSize(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </section>
        <section className="stack">
          <h2 className="heading">Account</h2>
          <p className="small muted">
            {user.signedIn
              ? backend
                ? `Signed in as ${user.name}${user.email ? ` (${user.email})` : ''}. Your councils, library and highlights sync to this account.`
                : `Signed in as ${user.name}. Accounts live on this device only in the prototype.`
              : backend
                ? 'You’re exploring as a guest. Sign in and everything you’ve done here comes with you.'
                : 'You’re exploring as a guest.'}
          </p>
          {user.signedIn ? (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => void doSignOut()}>
              Sign out
            </button>
          ) : (
            <button type="button" className="btn btn-dark btn-sm" onClick={() => navigate({ name: 'signup' })}>
              Create an account
            </button>
          )}
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { resetDemo(); showToast('Demo data reset.'); navigate({ name: 'welcome' }); }}>
            Reset demo data
          </button>
        </section>
        <section className="stack">
          <h2 className="heading">About the council</h2>
          <p className="small muted">
            {isLiveCouncilConfigured()
              ? user.signedIn
                ? 'Your councils are written live for your question; if the live council can’t be reached, the scripted one answers instead.'
                : 'Sign in and the council answers your question live; as a guest you hear the scripted councils.'
              : 'This build runs the scripted councils: eight conversations written for the most common questions.'}
          </p>
          <p className="small muted">
            The thinkers in the council are AI interpretations grounded in their published work. Lines shown as quotations are verbatim from the named source;
            everything else is paraphrase, generated to show how each perspective might approach your question. Reading guides summarise a chapter and are not the book’s text; public-domain passages are labelled with their translator.
          </p>
          <p className="small muted">Portraits: Wikimedia Commons, credited in <code>public/portraits/CREDITS.md</code>. Cover art: Open Library.</p>
          <div className="row" style={{ justifyContent: 'center', paddingTop: 8 }}>
            <OwlRow size={30} />
          </div>
          <p className="caps muted" style={{ textAlign: 'center' }}>Five owls at your service</p>
        </section>
      </div>
    </div>
  );
}
