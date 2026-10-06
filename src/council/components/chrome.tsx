import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IconHome, IconBooks, IconUsers, IconUser, IconArrowLeft, IconSun, IconMoon } from '@tabler/icons-react';
import { navigate, goBack, type Route, type TabName } from '../app/router';
import { useStore } from '../store/useStore';
import { useRig } from '../app/rig';
import { useModalFocus } from '../hooks/useModalFocus';
import { usePresence } from '../hooks/usePresence';
import { useT, type Dict } from '../i18n/react';
import { Wordmark } from './Wordmark';

/* ============================================================
   The chrome: the status bar (desktop frame only), the app bar with the
   lighting toggle, the step bar of the three acts, the bottom nav, sheets
   and toasts. The nav, sheets and toasts are absolutely positioned inside
   .screen-clip so they compose the same in the phone frame and full-bleed.
   ============================================================ */
export function StatusBar() {
  const [time, setTime] = useState(clock);
  useEffect(() => {
    const t = setInterval(() => setTime(clock()), 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="statusbar" aria-hidden="true">
      <span>{time}</span>
      <svg viewBox="0 0 54 11">
        <rect x="0" y="6" width="3" height="5" rx="1" fill="currentColor" />
        <rect x="5" y="4" width="3" height="7" rx="1" fill="currentColor" />
        <rect x="10" y="2" width="3" height="9" rx="1" fill="currentColor" />
        <rect x="15" y="0" width="3" height="11" rx="1" fill="currentColor" />
        <rect x="28" y="0.5" width="22" height="10" rx="3" fill="none" stroke="currentColor" strokeOpacity="0.5" />
        <rect x="30" y="2.5" width="15" height="6" rx="1.5" fill="currentColor" />
        <rect x="51" y="3.5" width="2" height="4" rx="1" fill="currentColor" fillOpacity="0.5" />
      </svg>
    </div>
  );
}
function clock(): string {
  const d = new Date();
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** the sun/moon that switches the lighting rig */
export function RigButton() {
  const t = useT();
  const { rig, toggle } = useRig();
  return (
    <button type="button" className="iconbtn" aria-label={t.common.lighting} onClick={toggle}>
      {rig === 'evening' ? <IconSun stroke={1.8} /> : <IconMoon stroke={1.8} />}
    </button>
  );
}

/**
 * The app bar. The wordmark on the left, or a back arrow when `back` is
 * given (a route to fall back to, or a handler); a small label in the
 * middle; on the right whatever the screen adds, then the lighting toggle.
 */
export function AppBar({
  back,
  label,
  right,
  left,
  centre,
  rig = true,
  className = '',
}: {
  back?: Route | (() => void);
  label?: string;
  right?: ReactNode;
  left?: ReactNode;
  /** replaces the label with any node (the reader's two-line title) */
  centre?: ReactNode;
  rig?: boolean;
  className?: string;
}) {
  const t = useT();
  return (
    <div className={`appbar ${className}`}>
      {left ??
        (back ? (
          <button type="button" className="iconbtn ghost" aria-label={t.common.back} onClick={() => (typeof back === 'function' ? back() : goBack(back))}>
            <IconArrowLeft stroke={2.2} />
          </button>
        ) : (
          <Wordmark />
        ))}
      {centre ?? (label ? <span className="showlabel grow">{label}</span> : <span className="grow" />)}
      <div className="right">
        {right}
        {rig && <RigButton />}
      </div>
    </div>
  );
}

/** the three acts: Ask · Stands · Debate · Summary */
export type Act = 'stands' | 'debate' | 'summary';
export function Steps({ current }: { current: Act }) {
  const t = useT();
  const names: { id: Act | 'ask'; label: string }[] = [
    { id: 'ask', label: t.steps.ask },
    { id: 'stands', label: t.steps.stands },
    { id: 'debate', label: t.steps.debate },
    { id: 'summary', label: t.steps.summary },
  ];
  const idx = names.findIndex((n) => n.id === current);
  return (
    <>
      <div className="steps" aria-hidden="true">
        {names.map((n, j) => (
          <div key={n.id} className={`step ${j < idx ? 'done' : j === idx ? 'on' : ''}`} />
        ))}
      </div>
      <div className="steplabels">
        {names.map((n, j) => (
          <span key={n.id} className={j === idx ? 'on' : ''} aria-current={j === idx ? 'step' : undefined}>
            {n.label}
          </span>
        ))}
      </div>
    </>
  );
}

const TABS: { name: TabName; label: keyof Dict['nav']; icon: ReactNode; route: Route }[] = [
  { name: 'council', label: 'home', icon: <IconHome stroke={1.8} />, route: { name: 'council' } },
  { name: 'library', label: 'library', icon: <IconBooks stroke={1.8} />, route: { name: 'library' } },
  { name: 'social', label: 'social', icon: <IconUsers stroke={1.8} />, route: { name: 'social' } },
  { name: 'profile', label: 'profile', icon: <IconUser stroke={1.8} />, route: { name: 'profile' } },
];

export function Nav({ active }: { active: TabName }) {
  const t = useT();
  return (
    <nav className="nav" aria-label={t.nav.main}>
      {TABS.map((tab) => (
        <button key={tab.name} type="button" className={tab.name === active ? 'on' : ''} aria-current={tab.name === active ? 'page' : undefined} onClick={() => navigate(tab.route)}>
          {tab.icon}
          <span>{t.nav[tab.label]}</span>
        </button>
      ))}
    </nav>
  );
}

/** bottom sheet with focus trap + escape + backdrop tap; slides down again when it closes */
export function Sheet({
  open,
  onClose,
  children,
  label,
  tall = false,
  className = '',
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
  tall?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { mounted, closing } = usePresence(open, 240);
  // the sheet's element exists one render after `open`; the trap has to wait for it
  useModalFocus(open && mounted, onClose, ref);
  if (!mounted) return null;
  return (
    <>
      <div className={`backdrop ${closing ? 'closing' : ''}`} onClick={onClose} />
      <div
        className={`sheet ${closing ? 'closing' : ''} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-hidden={closing || undefined}
        ref={ref}
        tabIndex={-1}
        style={tall ? { maxHeight: '94%' } : undefined}
      >
        <div className="grabber" />
        <div className="sheet-body">{children}</div>
      </div>
    </>
  );
}

/** one toast at a time; it slides in, can be tapped away, and slides out when it goes */
export function ToastHost() {
  const toast = useStore((s) => s.toast);
  const dismiss = useStore((s) => s.dismissToast);
  const { mounted, closing } = usePresence(!!toast, 220);
  // keep the last toast's words on screen while it slides out
  const [shown, setShown] = useState(toast);
  useEffect(() => {
    if (toast) setShown(toast);
  }, [toast]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(dismiss, toast.action ? 7000 : 3200);
    return () => clearTimeout(t);
  }, [toast, dismiss]);
  if (!mounted || !shown) return null;
  return (
    <div key={shown.id} className={`toast ${closing ? 'closing' : ''}`} role="status" onClick={() => dismiss()}>
      <span>{shown.text}</span>
      {shown.action && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            shown.action?.onClick();
            dismiss();
          }}
        >
          {shown.action.label}
        </button>
      )}
    </div>
  );
}

/** the three dots: "Casting the council", "Lowering the curtain", a thinker still writing */
export function Thinking({ children }: { children: ReactNode }) {
  return (
    <div className="thinking" role="status">
      <span className="d" />
      <span className="d" />
      <span className="d" />
      {children}
    </div>
  );
}
