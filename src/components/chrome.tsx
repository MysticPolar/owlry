import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { useAuth } from '../store/useAuth';
import type { Tab } from '../store/types';
import { useT } from '../i18n/react';
import { Icon } from './Icon';
import { chainsInner } from '../lib/chains';
import { useReduceMotion } from '../hooks/useReduceMotion';

/* guest-only shortcut to walk the level ladder (and trip its unlocks) from
   the main screens — today and the shelves. Discover docks its own copy in the
   desk header (a floating pill would sit on the chat stream); the profile tab
   and signed-in accounts (server-authoritative xp) get none. */
export function GuestLevelButton() {
  const authed = useAuth((s) => s.status === 'authed');
  const tab = useStore((s) => s.activeTab);
  const roomOpen = useStore((s) => s.mirrorRoomOpen);
  const lv = useStore((s) => s.lv);
  // the seat moves, nothing is minted — a preview level can't launder brass
  // into a real account through adoptAccount
  const debugLevelUp = useStore((s) => s.debugLevelUp);
  const t = useT().today.chrome;
  if (authed) return null;
  // the locked profile (mirror's room) leaves activeTab where it was, so guard
  // on it too — that page gets its own settings gear, not this pill
  if (roomOpen) return null;
  // library folded into profile, so the home stage is the only guest-preview surface
  if (tab !== 'today') return null;
  return (
    <button
      className="guest-lvl"
      data-tab={tab}
      onClick={debugLevelUp}
      aria-label={t.gainLevelAria(lv)}
    >
      <Icon name="ti-sparkles" />
      <span>{t.gainLevel}</span>
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
    <span className={`pb-nvpill${wiggle ? ' nv-wiggle' : ''}`}>
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

/* ---------- glass nav — Home / Ask / Profile (the one glass object) ---------- */
const NAV: { tab: Tab; icon: string }[] = [
  { tab: 'today', icon: 'ti-home' },
  { tab: 'discover', icon: 'ti-message-circle' },
  { tab: 'profile', icon: 'ti-user' },
];

export function BottomNav() {
  const activeTab = useStore((s) => s.activeTab);
  const setTab = useStore((s) => s.setTab);
  const lv = useStore((s) => s.lv);
  const t = useT().today.chrome;
  return (
    <nav className="pb-nav" aria-label={t.navAria}>
      {NAV.map((n) => {
        const on = activeTab === n.tab;
        const chained = n.tab === 'profile' && lv < 5;
        return (
          <button
            key={n.tab}
            className={`pb-nv ${on ? 'on' : ''}`}
            data-tab={n.tab}
            aria-current={on ? 'page' : undefined}
            aria-label={chained ? t.profileChainedAria : undefined}
            onClick={() => setTab(n.tab)}
          >
            {n.tab === 'profile' ? (
              <ProfilePill icon={n.icon} />
            ) : (
              <span className="pb-nvpill">
                <Icon name={n.icon} />
              </span>
            )}
            <span className="lab">{t.nav[n.tab]}</span>
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

/** the seat element the sparks converge on, only if it is actually visible —
    sparks aimed at a clipped or off-screen chip read as a random mid-air pop */
function burstAnchor(): DOMRect | null {
  for (const el of [document.getElementById('lvLab'), document.querySelector('.pb-plvl-row')]) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.offsetParent === null) continue; // a display:none screen
    if (el.closest('.pb-home.collapsed')) continue; // clipped by the collapsed header
    const r = el.getBoundingClientRect();
    if (r.width > 0) return r;
  }
  return null;
}

export function BurstLayer() {
  const burstNonce = useStore((s) => s.burstNonce);
  const reduce = useReduceMotion();
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (burstNonce === 0 || reduce) return;
    const layer = layerRef.current;
    const app = document.getElementById('app');
    if (!layer || !app) return;
    const r = burstAnchor();
    if (!r) return; // no visible seat on this screen — no sparks
    const a = app.getBoundingClientRect();
    const cx = r.left - a.left + r.width / 2;
    const cy = r.top - a.top + r.height / 2;
    for (let i = 0; i < 10; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      s.style.left = cx + 'px';
      s.style.top = cy + 'px';
      s.style.background = i % 2 ? 'var(--pb-brass)' : 'var(--pb-cream)';
      s.style.setProperty('--dx', (Math.random() * 68 - 34).toFixed(0) + 'px');
      s.style.setProperty('--dy', (-10 - Math.random() * 34).toFixed(0) + 'px');
      layer.appendChild(s);
      setTimeout(() => s.remove(), 750);
    }
  }, [burstNonce, reduce]);

  return <div className="burst-layer" id="burst" ref={layerRef} />;
}

/* ---------- sheet backdrop ---------- */
export function Backdrop() {
  const sheetId = useStore((s) => s.sheetId);
  const closeSheet = useStore((s) => s.closeSheet);
  return <div className={`backdrop ${sheetId ? 'on' : ''}`} id="backdrop" onClick={closeSheet} />;
}
