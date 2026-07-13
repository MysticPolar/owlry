import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../store/useAuth';
import type { OwlEngine } from '../../store/types';
import { isBackendConfigured } from '../../lib/supabase';
import { Icon } from '../Icon';
import { owlLine, type CastOwlName } from '../CastOwl';

/* the playbill, in order of finding (docs/story-bible.md) */
const CAST: [CastOwlName, string, string, string][] = [
  ['scout', 'scout', 'postmaster', 'ember'],
  ['keeper', 'keeper', 'the shelves', 'moss'],
  ['scribe', 'scribe', 'the archive', 'quill'],
  ['peek', 'peek', 'first chapters', 'teal'],
  ['mirror', 'mirror', 'the radar', 'violet'],
];

const SYNC_LABEL: Record<'off' | 'syncing' | 'synced' | 'error', string> = {
  off: 'ON',
  syncing: 'SYNCING…',
  synced: 'SYNCED',
  error: 'RETRY',
};

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

  const liveOn = (prefs.owlEngine ?? 'live') === 'live';
  const toggleEngine = () => {
    const next: OwlEngine = liveOn ? 'mockup' : 'live';
    setPref('owlEngine', next);
    restartChat();
    showToast('ti-feather', next === 'live' ? 'the live owl is at the desk' : 'classic owl — the original mockup');
  };

  if (!open) return null;

  return (
    <div className="settings on" id="settings" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="l-top">
        <button className="iconbtn lite" aria-label="Close settings" onClick={close}>
          <Icon name="ti-arrow-left" />
        </button>
        <div className="d">SETTINGS</div>
        <span style={{ flex: '0 0 32px' }} aria-hidden="true" />
      </div>

      <div className="set-body">
        <h1 className="hl sm d" style={{ marginTop: 4 }}>
          <span className="u" />
          <span className="t">
            settings<span className="gdot">.</span>
          </span>
        </h1>

        {/* reading */}
        <div className="sh-sec">READING</div>
        <div className="set-row">
          <div className="set-info">
            <div className="set-lab d">reading page</div>
            <div className="set-sub">font, size, candle and flow live inside every open book</div>
          </div>
          <Icon name="ti-book-2" />
        </div>
        <div className="set-row">
          <div className="set-info">
            <div className="set-lab d">reduce motion</div>
            <div className="set-sub">calm the swipes and pops</div>
          </div>
          <Toggle on={prefs.reduceMotion} onToggle={() => setPref('reduceMotion', !prefs.reduceMotion)} label="Reduce motion" />
        </div>

        {/* the owl */}
        <div className="sh-sec">THE OWL</div>
        <div className="set-row">
          <div className="set-info">
            <div className="set-lab d">live owl</div>
            <div className="set-sub">
              {isBackendConfigured()
                ? 'reads your real sky & the whole world of books; off is the classic mockup'
                : 'needs a backend configured — classic mockup until then'}
            </div>
          </div>
          <Toggle on={liveOn} onToggle={toggleEngine} label="Live owl" />
        </div>

        {/* reminders */}
        <div className="sh-sec">REMINDERS</div>
        <div className="set-row">
          <div className="set-info">
            <div className="set-lab d">
              daily reading nudge <span className="soon">SOON</span>
            </div>
            <div className="set-sub">a gentle owl at your reading hour</div>
          </div>
          <Toggle on={prefs.dailyReminder} onToggle={() => setPref('dailyReminder', !prefs.dailyReminder)} label="Daily reading nudge" />
        </div>
        <div className="set-row">
          <div className="set-info">
            <div className="set-lab d">
              page-turn sounds <span className="soon">SOON</span>
            </div>
            <div className="set-sub">a soft paper whisper as you read</div>
          </div>
          <Toggle on={prefs.sounds} onToggle={() => setPref('sounds', !prefs.sounds)} label="Page-turn sounds" />
        </div>

        {/* account */}
        <div className="sh-sec">ACCOUNT</div>
        <div className="set-card">
          <div className="prof">
            <div className="avatar lg d">{authed && authUser ? authUser.avatar : 'M'}</div>
            <div>
              <div className="pname d">{authed && authUser ? authUser.name : 'Mira'}</div>
              <div className="psub">
                {authed && authUser ? authUser.email : `LV ${lv} BIBLIOPHILE · ${coins} COINS`}
              </div>
            </div>
          </div>
        </div>
        {authed ? (
          <>
            <button
              className="link-row"
              onClick={() => authUser && void adoptAccount(authUser.id)}
              aria-label="Sync progress across devices now"
            >
              <Icon name="ti-cloud" />
              sync across devices
              <span
                className="soon"
                style={{
                  marginLeft: 'auto',
                  color: syncStatus === 'error' ? 'var(--ember)' : undefined,
                }}
              >
                {SYNC_LABEL[syncStatus]}
              </span>
            </button>
            <button
              className="link-row"
              onClick={() => {
                void logout();
                showToast('ti-arrow-left', 'signed out. keeper closed the ledger.', 'keeper');
              }}
            >
              <Icon name="ti-arrow-left" />
              sign out
              <Icon name="ti-chevron-right" className="ext" />
            </button>
          </>
        ) : (
          <button className="link-row" onClick={() => openAuth('login')}>
            <Icon name="ti-user" />
            sign in or create account
            <Icon name="ti-chevron-right" className="ext" />
          </button>
        )}

        {/* guest preview — a shortcut to feel the level ladder + its unlocks
            (office hours at 3, the mirror's room at 5) without a backend */}
        {!authed && (
          <>
            <div className="sh-sec">GUEST PREVIEW</div>
            <button
              className="link-row"
              onClick={() => addXP(xpMax)}
              aria-label="Gain a level to preview the unlocks"
            >
              <Icon name="ti-sparkles" />
              gain a level
              <span className="soon" style={{ marginLeft: 'auto' }}>
                LV {lv}
              </span>
            </button>
          </>
        )}

        {/* data */}
        <div className="sh-sec">DATA</div>
        {!confirmReset ? (
          <button className="link-row danger" onClick={() => setConfirmReset(true)}>
            <Icon name="ti-refresh" />
            reset reading progress
            <Icon name="ti-chevron-right" className="ext" />
          </button>
        ) : (
          <div className="reset-confirm">
            <span className="it">
              this clears everything — xp, ink, coins, shelves &amp; reading progress — and starts opening night
              over from the very beginning.
            </span>
            <div className="reset-btns">
              <button className="btn ghost xs" onClick={() => setConfirmReset(false)}>
                CANCEL
              </button>
              <button
                className="btn xs danger"
                onClick={() => {
                  setConfirmReset(false);
                  close();
                  resetProgress(); // wipes progress + raises the full opening night
                }}
              >
                RESET
              </button>
            </div>
          </div>
        )}

        {/* the company — a playbill (tap an owl for a word) */}
        <div className="sh-sec">THE COMPANY</div>
        <div className="cast-row">
          {CAST.map(([owl, name, job, color]) => (
            <button
              key={owl}
              className="cast-cell"
              aria-label={`${name} — ${job}`}
              onClick={() => showToast('ti-feather', owlLine(owl))}
            >
              <svg className="owl cast" viewBox="0 0 120 130" aria-hidden="true">
                <use href={`#owl-${owl}`} />
              </svg>
              <span className="cast-name d" style={{ color: `var(--${color})` }}>
                {name}
              </span>
              <span className="cast-job">{job}</span>
            </button>
          ))}
        </div>
        <div className="set-sub cast-sub it">the owlery's company — found by scout, in this order.</div>

        {/* about */}
        <div className="sh-sec">ABOUT</div>
        <button className="link-row" onClick={openOnboarding}>
          <Icon name="ti-player-play" />
          watch opening night again
          <Icon name="ti-chevron-right" className="ext" />
        </button>
        <button className="link-row" onClick={() => showToast('ti-external-link', 'opens outside owlry')}>
          <Icon name="ti-shield-lock" />
          privacy
          <Icon name="ti-external-link" className="ext" />
        </button>
        <button className="link-row" onClick={() => showToast('ti-external-link', 'opens outside owlry')}>
          <Icon name="ti-file-text" />
          terms
          <Icon name="ti-external-link" className="ext" />
        </button>
        <div className="set-foot it">
          owlry v0.1.0 — sorted with care, the owl post office<span className="gdot">.</span>
        </div>
      </div>
    </div>
  );
}
