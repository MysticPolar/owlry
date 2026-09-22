import { useState } from 'react';
import { navigate } from '../app/router';
import { useStore } from '../store/useStore';
import { useAuth } from '../store/useAuth';
import type { TextSize } from '../store/types';
import { TopBar } from '../components/chrome';
import { Seg } from '../components/Seg';
import { OwlRow } from '../components/Owl';
import { saveProfile } from '../lib/auth/api';
import { isBackendConfigured, isLiveCouncilConfigured } from '../lib/supabase';
import { useT, fmt } from '../i18n/react';
import { LANGS } from '../i18n';

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
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  const t = useT();
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
    navigate({ name: 'profile' });
  };

  const doSignOut = async () => {
    if (backend) await logout();
    else signOut();
    showToast(t.settings.signedOut);
  };

  return (
    <div className="screen">
      <TopBar backFallback={{ name: 'profile' }} title={t.settings.title} className="top-inset" />
      <div className="screen-scroll pad nav-space stack" style={{ paddingTop: 8, gap: 18 }}>
        <section className="stack">
          <h2 className="heading">{t.settings.language}</h2>
          <div className="row">
            <span className="grow small muted">{t.settings.languageSub}</span>
            <Seg label={t.settings.language} options={LANGS.map((l) => ({ id: l.id, label: l.native, lang: l.id === 'zh' ? 'zh-CN' : 'en' }))} value={lang} onChange={setLang} />
          </div>
        </section>
        <section className="stack">
          <h2 className="heading">{t.settings.profile}</h2>
          <div className="field">
            <label htmlFor="s-name">{t.settings.name}</label>
            <input id="s-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="s-handle">{t.settings.handle}</label>
            <input id="s-handle" className="input" value={handle} onChange={(e) => setHandle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="s-bio">{t.settings.bio}</label>
            <input id="s-bio" className="input" value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <button type="button" className="btn btn-dark btn-sm" onClick={() => void save()} disabled={saving}>
            {saving ? t.settings.saving : t.settings.save}
          </button>
        </section>
        <section className="stack">
          <h2 className="heading">{t.settings.reading}</h2>
          <div className="row">
            <span className="grow">{t.settings.textSize}</span>
            <Seg label={t.settings.textSize} options={(['S', 'M', 'L'] as TextSize[]).map((s) => ({ id: s, label: s }))} value={textSize} onChange={setTextSize} />
          </div>
        </section>
        <section className="stack">
          <h2 className="heading">{t.settings.account}</h2>
          <p className="small muted">
            {user.signedIn
              ? backend
                ? fmt(t.settings.signedInSync, { name: `${user.name}${user.email ? ` (${user.email})` : ''}` })
                : fmt(t.settings.signedInProto, { name: user.name })
              : backend
                ? t.settings.guestSync
                : t.settings.guest}
          </p>
          {user.signedIn ? (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => void doSignOut()}>
              {t.settings.signOut}
            </button>
          ) : (
            <button type="button" className="btn btn-dark btn-sm" onClick={() => navigate({ name: 'signup' })}>
              {t.settings.createAccount}
            </button>
          )}
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { resetDemo(); showToast(t.settings.resetDone); navigate({ name: 'welcome' }); }}>
            {t.settings.resetDemo}
          </button>
        </section>
        <section className="stack">
          <h2 className="heading">{t.settings.about}</h2>
          <p className="small muted">{isLiveCouncilConfigured() ? (user.signedIn ? t.settings.liveSigned : t.settings.liveGuest) : t.settings.scripted}</p>
          <p className="small muted">{t.settings.aboutBody}</p>
          <p className="small muted">
            {t.settings.credits}
            <code>public/portraits/CREDITS.md</code>
            {t.settings.creditsTail}
          </p>
          <div className="row" style={{ justifyContent: 'center', paddingTop: 8 }}>
            <OwlRow size={30} />
          </div>
          <p className="caps muted" style={{ textAlign: 'center' }}>{t.settings.fiveOwls}</p>
        </section>
      </div>
    </div>
  );
}
