import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { navigate } from '../app/router';
import { useRig, type Rig } from '../app/rig';
import { useStore } from '../store/useStore';
import { useAuth } from '../store/useAuth';
import type { TextSize } from '../store/types';
import { AppBar } from '../components/chrome';
import { Seg } from '../components/Seg';
import { saveProfile } from '../lib/auth/api';
import { SignInForm } from '../components/SignInForm';
import { isBackendConfigured, isLiveCouncilConfigured } from '../../lib/supabase';
import { useT, fmt } from '../i18n/react';
import { LANGS } from '../i18n';
import './SettingsScreen.css';

/* ============================================================
   Settings, under the profile tab. The lighting (the app bar drops its
   toggle here, because this row is the setting), the profile details,
   reading preferences (text size, language), the account, and the honest
   notes about what the council is.
   ============================================================ */

/** the .rv stagger: the sections arrive top to bottom */
const delay = (n: number): CSSProperties => ({ animationDelay: `${n * 60}ms` });

export function SettingsScreen() {
  const user = useStore((s) => s.user);
  const setProfile = useStore((s) => s.setProfile);
  const signOut = useStore((s) => s.signOut);
  const textSize = useStore((s) => s.textSize);
  const setTextSize = useStore((s) => s.setTextSize);
  const resetDemo = useStore((s) => s.resetDemo);
  const showToast = useStore((s) => s.showToast);
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  const logout = useAuth((s) => s.logout);
  const { rig, set: setRig } = useRig();
  const t = useT();
  const backend = isBackendConfigured();
  const [name, setName] = useState(user.name);
  const [handle, setHandle] = useState(user.handle);
  const [bio, setBio] = useState(user.bio);
  const [saving, setSaving] = useState(false);

  // a sign-in (or a save) brings the account's own profile: the fields follow it, so a later Save never writes the guest's back
  useEffect(() => {
    setName(user.name);
    setHandle(user.handle);
    setBio(user.bio);
  }, [user.id, user.name, user.handle, user.bio]);

  const save = async () => {
    const next = { name: name.trim() || user.name, handle: handle.trim().toLowerCase().replace(/[^a-z0-9._]+/g, '.') || user.handle, bio: bio.trim() || user.bio };
    if (user.id) {
      // the account's public profile lives in the cloud — the handle has to be free
      setSaving(true);
      const res = await saveProfile(user.id, next);
      setSaving(false);
      if (res === 'handle-taken') {
        showToast(t.settings.handleTaken);
        return;
      }
      if (res === 'server') {
        showToast(t.settings.saveFail);
        return;
      }
    }
    setProfile({ ...next, initial: next.name.charAt(0).toUpperCase() });
    showToast(t.settings.updated);
  };

  const doSignOut = async () => {
    if (backend) await logout();
    else signOut();
    showToast(t.settings.signedOut);
  };

  const reset = () => {
    resetDemo();
    showToast(t.settings.resetDone);
    navigate({ name: 'welcome' });
  };

  const rigs: { id: Rig; label: string; icon: ReactNode }[] = [
    { id: 'evening', label: t.common.evening, icon: <IconMoon stroke={1.8} /> },
    { id: 'matinee', label: t.common.matinee, icon: <IconSun stroke={1.8} /> },
  ];

  const accountNote = user.signedIn
    ? backend
      ? fmt(t.settings.signedInSync, { name: `${user.name}${user.email ? ` (${user.email})` : ''}` })
      : fmt(t.settings.signedInProto, { name: user.name })
    : backend
      ? t.settings.guestSync
      : t.settings.guest;

  return (
    <div className="screen settings-screen">
      <AppBar back={{ name: 'profile' }} label={t.settings.title} rig={false} />
      <div className="content">
        <section className="set-section rv" style={delay(0)}>
          <h2 className="act">{t.settings.appearance}</h2>
          <div className="set-row">
            <span>{t.settings.lighting}</span>
            <span className="rigrow" role="group" aria-label={t.settings.lighting}>
              {rigs.map((r) => (
                <button key={r.id} type="button" className={rig === r.id ? 'on' : ''} aria-pressed={rig === r.id} onClick={() => setRig(r.id)}>
                  {r.icon}
                  {r.label}
                </button>
              ))}
            </span>
          </div>
        </section>

        <section className="set-section rv" style={delay(1)}>
          <h2 className="act">{t.settings.profile}</h2>
          <div className="field">
            <label htmlFor="s-name">{t.settings.name}</label>
            <input id="s-name" className="input" value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="s-handle">{t.settings.handle}</label>
            <input
              id="s-handle"
              className="input"
              value={handle}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setHandle(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="s-bio">{t.settings.bio}</label>
            <input id="s-bio" className="input" value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <button type="button" className="btn ghost sm set-save" onClick={() => void save()} disabled={saving}>
            {saving ? t.settings.saving : t.settings.save}
          </button>
        </section>

        <section className="set-section rv" style={delay(2)}>
          <h2 className="act">{t.settings.reading}</h2>
          <div className="set-row">
            <span>{t.settings.textSize}</span>
            <Seg label={t.settings.textSize} options={(['S', 'M', 'L'] as TextSize[]).map((s) => ({ id: s, label: s, aria: t.common.sizes[s] }))} value={textSize} onChange={setTextSize} />
          </div>
          <div className="set-row">
            <span>{t.settings.language}</span>
            <Seg
              label={t.settings.language}
              options={LANGS.map((l) => ({ id: l.id, label: l.native, lang: l.id === 'zh' ? 'zh-CN' : 'en' }))}
              value={lang}
              onChange={setLang}
            />
          </div>
        </section>

        <section className="set-section rv" style={delay(3)}>
          <h2 className="act">{t.settings.account}</h2>
          <p className="set-note">{accountNote}</p>
          {user.signedIn ? (
            <button type="button" className="btn ghost" onClick={() => void doSignOut()}>
              {t.settings.signOut}
            </button>
          ) : backend ? (
            // a guest who already has an account signs in right here: a gold Sign in over a ghost Create
            <SignInForm onDone={() => showToast(t.settings.signedInNow)} />
          ) : (
            // the prototype path (no backend): the auth screens keep the account on this device
            <>
              <button type="button" className="btn gold" onClick={() => navigate({ name: 'signin' })}>
                {t.settings.signIn}
              </button>
              <button type="button" className="btn ghost" onClick={() => navigate({ name: 'signup' })}>
                {t.settings.createAccount}
              </button>
            </>
          )}
          <button type="button" className="btn text" onClick={reset}>
            {t.settings.resetDemo}
          </button>
        </section>

        <section className="set-section rv" style={delay(4)}>
          <h2 className="act">{t.settings.about}</h2>
          <p className="set-note">{isLiveCouncilConfigured() ? (user.signedIn ? t.settings.liveSigned : t.settings.liveGuest) : t.settings.scripted}</p>
          <p className="set-fine">{t.settings.aboutBody}</p>
          <p className="set-fine">
            {t.settings.credits}
            <code>public/portraits/CREDITS.md</code>
            {t.settings.creditsTail}
          </p>
        </section>
        <div className="set-end" />
      </div>
    </div>
  );
}
