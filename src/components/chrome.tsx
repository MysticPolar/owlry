import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { useAuth } from '../store/useAuth';
import type { Tab } from '../store/types';
import { useClock } from '../hooks/useClock';
import { Icon } from './Icon';
import { chainsInner } from '../lib/chains';

/* guest-only shortcut to walk the level ladder (and trip its unlocks) from
   the main screens — the desk, the shelves, today. Hidden on the profile tab
   and for signed-in accounts (whose xp is server-authoritative). */
export function GuestLevelButton() {
  const authed = useAuth((s) => s.status === 'authed');
  const tab = useStore((s) => s.activeTab);
  const roomOpen = useStore((s) => s.mirrorRoomOpen);
  const lv = useStore((s) => s.lv);
  const addXP = useStore((s) => s.addXP);
  const xpMax = useStore((s) => s.xpMax);
  if (authed) return null;
  // the locked profile (mirror's room) leaves activeTab where it was, so guard
  // on it too — that page gets its own settings gear, not this pill
  if (roomOpen) return null;
  if (tab !== 'today' && tab !== 'discover' && tab !== 'library') return null;
  return (
    <button
      className="guest-lvl"
      data-tab={tab}
      onClick={() => addXP(xpMax)}
      aria-label={`Gain a level — guest preview (level ${lv})`}
    >
      <Icon name="ti-sparkles" />
      <span>gain a level</span>
      <b className="d">LV {lv}</b>
    </button>
  );
}

/* the profile pill, bound in chains until level 5: it wiggles for attention
   (4s after mount, then every 30s), and the chains fall when 5 arrives */
function ProfilePill({ icon }: { icon: string }) {
  const lv = useStore((s) => s.lv);
  const locked = lv < 5;
  const [wiggle, setWiggle] = useState(false);
  const [falling, setFalling] = useState(false);
  const [gone, setGone] = useState(!locked);
  const prevLocked = useRef(locked);

  // wiggle the button for attention while locked
  useEffect(() => {
    if (!locked || gone) return;
    const bump = () => {
      setWiggle(false);
      requestAnimationFrame(() => setWiggle(true));
      setTimeout(() => setWiggle(false), 850);
    };
    const first = setTimeout(bump, 4000);
    const iv = setInterval(bump, 30000);
    return () => {
      clearTimeout(first);
      clearInterval(iv);
    };
  }, [locked, gone]);

  // the chains fall when level 5 lands — and snap back if the level ever drops
  // below 5 again (e.g. a progress reset), so a re-locked profile is re-chained
  useEffect(() => {
    const was = prevLocked.current;
    prevLocked.current = locked;
    if (was && !locked) {
      // just unlocked → the chains fall away, then vanish
      setFalling(true);
      const t = setTimeout(() => setGone(true), 900);
      return () => clearTimeout(t);
    }
    if (!was && locked) {
      // re-locked → the chains are back, whole
      setFalling(false);
      setGone(false);
    }
  }, [locked]);

  return (
    <span className={`pill${wiggle ? ' nv-wiggle' : ''}`}>
      <Icon name={icon} />
      {!gone && (
        <svg
          className={`nv-chains${falling ? ' broken' : ''}`}
          viewBox="0 0 56 42"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: chainsInner(56, 42, 3, 13, 18, 26) }}
        />
      )}
    </span>
  );
}

/* ---------- status bar ---------- */
export function StatusBar() {
  const { time } = useClock();
  return (
    <div className="status">
      <span id="stime">{time}</span>
      <span className="icons">
        <Icon name="ti-wifi" style={{ fontSize: 15 }} />
        <Icon name="ti-battery-3" style={{ fontSize: 17 }} />
      </span>
    </div>
  );
}

/* ---------- bottom nav ---------- */
const NAV: { tab: Tab; icon: string; lab: string }[] = [
  { tab: 'today', icon: 'ti-book-2', lab: 'today' },
  { tab: 'discover', icon: 'ti-compass', lab: 'discover' },
  { tab: 'library', icon: 'ti-books', lab: 'library' },
  { tab: 'profile', icon: 'ti-user', lab: 'profile' },
];

export function BottomNav() {
  const activeTab = useStore((s) => s.activeTab);
  const setTab = useStore((s) => s.setTab);
  const lv = useStore((s) => s.lv);
  return (
    <nav className="nav" aria-label="Primary">
      {NAV.map((n) => {
        const on = activeTab === n.tab;
        const chained = n.tab === 'profile' && lv < 5;
        return (
          <button
            key={n.tab}
            className={`nv ${on ? 'on' : ''}`}
            data-tab={n.tab}
            aria-current={on ? 'page' : undefined}
            aria-label={chained ? 'Profile — chained until level 5' : undefined}
            onClick={() => setTab(n.tab)}
          >
            {n.tab === 'profile' ? (
              <ProfilePill icon={n.icon} />
            ) : (
              <span className="pill">
                <Icon name={n.icon} />
              </span>
            )}
            <span className="lab">{n.lab}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ---------- toast ---------- */
export function Toast() {
  const toast = useStore((s) => s.toast);
  const [shown, setShown] = useState(toast);
  useEffect(() => {
    if (toast) setShown(toast);
  }, [toast]);
  return (
    <div className={`toast ${toast ? 'on' : ''}`} id="toast" role="status" aria-live="polite">
      {shown && (
        <>
          {shown.owl ? (
            <svg className="owl toasty" viewBox="0 0 120 130" aria-hidden="true" key={shown.key}>
              <use href={`#owl-${shown.owl}`} />
            </svg>
          ) : (
            <Icon name={shown.icon} />
          )}
          <span>{shown.msg}</span>
        </>
      )}
    </div>
  );
}

/* ---------- spark burst (ported from the mockup's burst()) ---------- */
export function BurstLayer() {
  const burstNonce = useStore((s) => s.burstNonce);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (burstNonce === 0) return;
    const layer = layerRef.current;
    const app = document.getElementById('app');
    if (!layer || !app) return;
    const a = app.getBoundingClientRect();
    const r = document.getElementById('lvLab')?.getBoundingClientRect();
    const cx = r && r.width ? r.left - a.left + r.width / 2 : a.width / 2;
    const cy = r && r.width ? r.top - a.top + r.height / 2 : a.height * 0.4;
    for (let i = 0; i < 10; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      s.style.left = cx + 'px';
      s.style.top = cy + 'px';
      s.style.background = i % 2 ? 'var(--green)' : 'var(--yellow)';
      s.style.setProperty('--dx', (Math.random() * 68 - 34).toFixed(0) + 'px');
      s.style.setProperty('--dy', (-10 - Math.random() * 34).toFixed(0) + 'px');
      layer.appendChild(s);
      setTimeout(() => s.remove(), 750);
    }
  }, [burstNonce]);

  return <div className="burst-layer" id="burst" ref={layerRef} />;
}

/* ---------- sheet backdrop ---------- */
export function Backdrop() {
  const sheetId = useStore((s) => s.sheetId);
  const closeSheet = useStore((s) => s.closeSheet);
  return <div className={`backdrop ${sheetId ? 'on' : ''}`} id="backdrop" onClick={closeSheet} />;
}
