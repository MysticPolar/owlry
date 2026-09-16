import { useEffect, useRef, type ReactNode } from 'react';
import { IconHome, IconBook, IconBooks, IconUsers, IconUser, IconArrowLeft } from '@tabler/icons-react';
import { navigate, goBack, type Route, type TabName } from '../app/router';
import { useStore } from '../store/useStore';
import { useModalFocus } from '../hooks/useModalFocus';
import { useT, type Dict } from '../i18n/react';

/* ============================================================
   The chrome: fake status bar (desktop frame only), bottom nav, top bar,
   sheets and toasts. Everything is absolutely positioned inside .screen-clip
   so it composes the same in the phone frame and full-bleed on a phone.
   ============================================================ */
export function StatusBar() {
  return (
    <div className="statusbar" aria-hidden="true">
      <span>9:41</span>
      <span className="sb-right">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="0.8" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" />
          <rect x="10" y="3" width="3" height="9" rx="0.8" />
          <rect x="15" y="0" width="3" height="12" rx="0.8" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
          <path d="M8 9.6a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4zM8 6c1.6 0 3 .6 4.1 1.6l-1.3 1.3A4.1 4.1 0 0 0 8 7.8c-1.1 0-2 .4-2.8 1.1L3.9 7.6C5 6.6 6.4 6 8 6zm0-3.4c2.5 0 4.8 1 6.5 2.6l-1.3 1.3A7.3 7.3 0 0 0 8 4.4c-2 0-3.8.8-5.2 2.1L1.5 5.2A9.2 9.2 0 0 1 8 2.6z" />
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none" stroke="currentColor">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3" opacity="0.4" />
          <rect x="2" y="2" width="17" height="8" rx="1.6" fill="currentColor" stroke="none" />
          <path d="M23 4v4a2 2 0 0 0 0-4z" fill="currentColor" stroke="none" opacity="0.4" />
        </svg>
      </span>
    </div>
  );
}

const TABS: { name: TabName; label: keyof Dict['nav']; icon: ReactNode; route: Route }[] = [
  { name: 'council', label: 'home', icon: <IconHome stroke={1.9} />, route: { name: 'council' } },
  { name: 'reading', label: 'reading', icon: <IconBook stroke={1.9} />, route: { name: 'reading' } },
  { name: 'library', label: 'library', icon: <IconBooks stroke={1.9} />, route: { name: 'library' } },
  { name: 'social', label: 'social', icon: <IconUsers stroke={1.9} />, route: { name: 'social' } },
  { name: 'profile', label: 'profile', icon: <IconUser stroke={1.9} />, route: { name: 'profile' } },
];

export function Nav({ active }: { active: TabName }) {
  const t = useT();
  return (
    <nav className="nav" aria-label={t.nav.main}>
      {TABS.map((tab) => (
        <button
          key={tab.name}
          type="button"
          className={tab.name === active ? 'on' : ''}
          aria-current={tab.name === active ? 'page' : undefined}
          onClick={() => navigate(tab.route)}
        >
          {tab.icon}
          <span>{t.nav[tab.label]}</span>
        </button>
      ))}
    </nav>
  );
}

export function TopBar({
  title,
  onBack,
  backFallback,
  right,
  left,
  className = '',
}: {
  title?: ReactNode;
  onBack?: () => void;
  backFallback?: Route;
  right?: ReactNode;
  left?: ReactNode;
  className?: string;
}) {
  const t = useT();
  const showBack = onBack !== undefined || backFallback !== undefined;
  return (
    <div className={`topbar ${className}`}>
      {left ??
        (showBack ? (
          <button type="button" className="iconbtn" aria-label={t.common.back} onClick={() => (onBack ? onBack() : goBack(backFallback))}>
            <IconArrowLeft stroke={2} />
          </button>
        ) : (
          <span style={{ width: 40 }} />
        ))}
      <div className="grow title">{title}</div>
      <div className="row" style={{ gap: 0, minWidth: 40, justifyContent: 'flex-end' }}>
        {right}
      </div>
    </div>
  );
}

/** bottom sheet with focus trap + escape + backdrop tap */
export function Sheet({
  open,
  onClose,
  children,
  label,
  tall = false,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
  tall?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useModalFocus(open, onClose, ref);
  if (!open) return null;
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={label}
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

export function ToastHost() {
  const toast = useStore((s) => s.toast);
  const dismiss = useStore((s) => s.dismissToast);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(dismiss, toast.action ? 7000 : 3200);
    return () => clearTimeout(t);
  }, [toast, dismiss]);
  if (!toast) return null;
  return (
    <div className="toast" role="status">
      <span className="grow">{toast.text}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            dismiss();
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
