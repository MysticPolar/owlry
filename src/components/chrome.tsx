import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import type { Tab } from '../store/types';
import { useClock } from '../hooks/useClock';
import { Icon } from './Icon';

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
  return (
    <nav className="nav" aria-label="Primary">
      {NAV.map((n) => {
        const on = activeTab === n.tab;
        return (
          <button
            key={n.tab}
            className={`nv ${on ? 'on' : ''}`}
            data-tab={n.tab}
            aria-current={on ? 'page' : undefined}
            onClick={() => setTab(n.tab)}
          >
            <span className="pill">
              <Icon name={n.icon} />
            </span>
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
