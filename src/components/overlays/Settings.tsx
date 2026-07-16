import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../store/useAuth';
import type { OwlEngine } from '../../store/types';
import { isBackendConfigured } from '../../lib/supabase';
import { useLang, useT } from '../../i18n/react';
import { Icon } from '../Icon';
import { owlLine, type CastOwlName } from '../CastOwl';

/* the playbill, in order of finding (docs/story-bible.md) —
   names stay english on every stage; jobs come from the dict */
const CAST: [CastOwlName, string, string][] = [
  ['scout', 'scout', 'ember'],
  ['keeper', 'keeper', 'moss'],
  ['scribe', 'scribe', 'quill'],
  ['peek', 'peek', 'teal'],
  ['mirror', 'mirror', 'violet'],
];

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      className={`tgl ${on ? 'on' : ''}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
    >
      <span className="tgl-knob" />
    </button>
  );
}

export function Settings() {
  const open = useStore((s) => s.settingsOpen);
  const close = useStore((s) => s.closeSettings);
  const prefs = useStore((s) => s.prefs);
  const setPref = useStore((s) => s.setPref);
  const resetProgress = useStore((s) => s.resetProgress);
  const restartChat = useStore((s) => s.restartChat);
  const openOnboarding = useStore((s) => s.openOnboarding);
  const showToast = useStore((s) => s.showToast);
  const lv = useStore((s) => s.lv);
  const coins = useStore((s) => s.coins);
  const addXP = useStore((s) => s.addXP);
  const xpMax = useStore((s) => s.xpMax);
  const authed = useAuth((s) => s.status === 'authed');
  const authUser = useAuth((s) => s.user);
  const openAuth = useAuth((s) => s.openAuth);
  const logout = useAuth((s) => s.logout);
  const syncStatus = useStore((s) => s.syncStatus);
  const adoptAccount = useStore((s) => s.adoptAccount);
  const [confirmReset, setConfirmReset] = useState(false);
  const lang = useLang();
  const t = useT().settings.settings;

  const liveOn = (prefs.owlEngine ?? 'live') === 'live';
  const toggleEngine = () => {
    const next: OwlEngine = liveOn ? 'mockup' : 'live';
    setPref('owlEngine', next);
    restartChat();
    showToast('ti-feather', next === 'live' ? t.toastLiveOwl : t.toastClassicOwl);
  };

  if (!open) return null;

  return (
    <div className="settings on" id="settings" role="dialog" aria-modal="true" aria-label={t.ariaDialog}>
      <div className="l-top">
        <button className="iconbtn lite" aria-label={t.ariaClose} onClick={close}>
          <Icon name="ti-arrow-left" />
        </button>
        <div className="d">{t.top}</div>
        <span style={{ flex: '0 0 32px' }} aria-hidden="true" />
      </div>

      <div className="set-body">
        <h1 className="hl sm d" style={{ marginTop: 4 }}>
          <span className="u" />
          <span className="t">
            {t.headline}<span className="gdot">.</span>
          </span>
        </h1>

        {/* language */}
        <div className="sh-sec">{t.secLanguage}</div>
        <div className="set-row">
          <div className="set-info">
            <div className="set-lab d">{t.langLabel}</div>
            <div className="set-sub">{t.langSub}</div>
          </div>
          <select
            className="langsel"
            value={lang}
            onChange={(e) => setPref('lang', e.target.value as 'en' | 'zh')}
            aria-label={t.langAria}
          >
            <option value="en">English</option>
            <option value="zh">简体中文</option>
          </select>
        </div>

        {/* reading */}
        <div className="sh-sec">{t.secReading}</div>
        <div className="set-row">
          <div className="set-info">
            <div className="set-lab d">{t.readingPage}</div>
            <div className="set-sub">{t.readingPageSub}</div>
          </div>
          <Icon name="ti-book-2" />
        </div>
        <div className="set-row">
          <div className="set-info">
            <div className="set-lab d">{t.reduceMotion}</div>
            <div className="set-sub">{t.reduceMotionSub}</div>
          </div>
          <Toggle on={prefs.reduceMotion} onToggle={() => setPref('reduceMotion', !prefs.reduceMotion)} label={t.ariaReduceMotion} />
        </div>

        {/* the owl */}
        <div className="sh-sec">{t.secOwl}</div>
        <div className="set-row">
          <div className="set-info">
            <div className="set-lab d">{t.liveOwl}</div>
            <div className="set-sub">
              {isBackendConfigured() ? t.liveOwlSubOn : t.liveOwlSubOff}
            </div>
          </div>
          <Toggle on={liveOn} onToggle={toggleEngine} label={t.ariaLiveOwl} />
        </div>

        {/* reminders */}
        <div className="sh-sec">{t.secReminders}</div>
        <div className="set-row">
          <div className="set-info">
            <div className="set-lab d">
              {t.dailyNudge} <span className="soon">{t.soon}</span>
            </div>
            <div className="set-sub">{t.dailyNudgeSub}</div>
          </div>
          <Toggle on={prefs.dailyReminder} onToggle={() => setPref('dailyReminder', !prefs.dailyReminder)} label={t.ariaDailyNudge} />
        </div>
        <div className="set-row">
          <div className="set-info">
            <div className="set-lab d">
              {t.pageSounds} <span className="soon">{t.soon}</span>
            </div>
            <div className="set-sub">{t.pageSoundsSub}</div>
          </div>
          <Toggle on={prefs.sounds} onToggle={() => setPref('sounds', !prefs.sounds)} label={t.ariaPageSounds} />
        </div>

        {/* account */}
        <div className="sh-sec">{t.secAccount}</div>
        <div className="set-card">
          <div className="prof">
            <div className="avatar lg d">{authed && authUser ? authUser.avatar : 'M'}</div>
            <div>
              <div className="pname d">{authed && authUser ? authUser.name : 'Mira'}</div>
              <div className="psub">
                {authed && authUser ? authUser.email : t.guestSub(lv, coins)}
              </div>
            </div>
          </div>
        </div>
        {authed ? (
          <>
            <button
              className="link-row"
              onClick={() => authUser && void adoptAccount(authUser.id)}
              aria-label={t.ariaSyncNow}
            >
              <Icon name="ti-cloud" />
              {t.syncRow}
              <span
                className="soon"
                style={{
                  marginLeft: 'auto',
                  color: syncStatus === 'error' ? 'var(--ember)' : undefined,
                }}
              >
                {t.syncLabel[syncStatus]}
              </span>
            </button>
            <button
              className="link-row"
              onClick={() => {
                void logout();
                showToast('ti-arrow-left', t.toastSignedOut, 'keeper');
              }}
            >
              <Icon name="ti-arrow-left" />
              {t.signOut}
              <Icon name="ti-chevron-right" className="ext" />
            </button>
          </>
        ) : (
          <button className="link-row" onClick={() => openAuth('login')}>
            <Icon name="ti-user" />
            {t.signIn}
            <Icon name="ti-chevron-right" className="ext" />
          </button>
        )}

        {/* guest preview — a shortcut to feel the level ladder + its unlocks
            (office hours at 3, the mirror's room at 5) without a backend */}
        {!authed && (
          <>
            <div className="sh-sec">{t.secGuest}</div>
            <button
              className="link-row"
              onClick={() => addXP(xpMax)}
              aria-label={t.ariaGainLevel}
            >
              <Icon name="ti-sparkles" />
              {t.gainLevel}
              <span className="soon" style={{ marginLeft: 'auto' }}>
                {t.lvPill(lv)}
              </span>
            </button>
          </>
        )}

        {/* data */}
        <div className="sh-sec">{t.secData}</div>
        {!confirmReset ? (
          <button className="link-row danger" onClick={() => setConfirmReset(true)}>
            <Icon name="ti-refresh" />
            {t.resetRow}
            <Icon name="ti-chevron-right" className="ext" />
          </button>
        ) : (
          <div className="reset-confirm">
            <span className="it">{t.resetConfirm}</span>
            <div className="reset-btns">
              <button className="btn ghost xs" onClick={() => setConfirmReset(false)}>
                {t.cancel}
              </button>
              <button
                className="btn xs danger"
                onClick={() => {
                  setConfirmReset(false);
                  close();
                  resetProgress(); // wipes progress + raises the full opening night
                }}
              >
                {t.reset}
              </button>
            </div>
          </div>
        )}

        {/* the company — a playbill (tap an owl for a word) */}
        <div className="sh-sec">{t.secCompany}</div>
        <div className="cast-row">
          {CAST.map(([owl, name, color]) => (
            <button
              key={owl}
              className="cast-cell"
              aria-label={t.castAria(name, t.castJobs[owl])}
              onClick={() => showToast('ti-feather', owlLine(owl))}
            >
              <svg className="owl cast" viewBox="0 0 120 130" aria-hidden="true">
                <use href={`#owl-${owl}`} />
              </svg>
              <span className="cast-name d" style={{ color: `var(--${color})` }}>
                {name}
              </span>
              <span className="cast-job">{t.castJobs[owl]}</span>
            </button>
          ))}
        </div>
        <div className="set-sub cast-sub it">{t.castSub}</div>

        {/* about */}
        <div className="sh-sec">{t.secAbout}</div>
        <button className="link-row" onClick={openOnboarding}>
          <Icon name="ti-player-play" />
          {t.watchOpening}
          <Icon name="ti-chevron-right" className="ext" />
        </button>
        <button className="link-row" onClick={() => showToast('ti-external-link', t.toastExternal)}>
          <Icon name="ti-shield-lock" />
          {t.privacy}
          <Icon name="ti-external-link" className="ext" />
        </button>
        <button className="link-row" onClick={() => showToast('ti-external-link', t.toastExternal)}>
          <Icon name="ti-file-text" />
          {t.terms}
          <Icon name="ti-external-link" className="ext" />
        </button>
        <div className="set-foot it">
          {t.foot}<span className="gdot">.</span>
        </div>
      </div>
    </div>
  );
}
