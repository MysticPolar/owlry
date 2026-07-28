import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useStore } from './store/useStore';
import { useT } from './i18n/react';
import { useAuth } from './store/useAuth';
import { useKeyboardInset } from './hooks/useKeyboardInset';
import { useModalFocus } from './hooks/useModalFocus';
import { BottomNav, Toast, BurstLayer, Backdrop, GuestLevelButton } from './components/chrome';
import { SelectionBar } from './components/SelectionBar';
import { TodayScreen } from './components/screens/TodayScreen';
import { DiscoverScreen } from './components/screens/DiscoverScreen';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { Sheet } from './components/overlays/Sheet';
import { EbookReader } from './components/overlays/EbookReader';
import { UploadModal } from './components/overlays/UploadModal';
import { History } from './components/overlays/History';
import { Letter } from './components/overlays/Letter';
import { Settings } from './components/overlays/Settings';
import { Onboarding } from './components/overlays/Onboarding';
import { Auth } from './components/overlays/Auth';
import { IntroCard } from './components/overlays/IntroCard';
import { MirrorRoom } from './components/overlays/MirrorRoom';

/* the standing entrance: a brief curtain-rise on every app open (skipped on
   opening night, which plays the long one, and under reduced motion) */
let curtainDone = false;
function PlaybillCurtain() {
  // start "gone" if the OS asks for reduced motion (no flash of frozen panels);
  // the app-level reduceMotion toggle is handled at the render site
  const [gone, setGone] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    curtainDone = true;
    if (gone) return;
    // panels part over ~1.57s (420ms hold + 1150ms slide); retire the nodes after
    const t = setTimeout(() => setGone(true), 1900);
    return () => clearTimeout(t);
  }, [gone]);
  if (gone) return null;
  return (
    <div className="pb-curtain" aria-hidden="true">
      <div className="pb-curtain-panel l" />
      <div className="pb-curtain-panel r" />
    </div>
  );
}

export default function App() {
  const t = useT();
  const hydrated = useStore((s) => s.hydrated);
  const bootstrap = useStore((s) => s.bootstrap);
  const reduceMotion = useStore((s) => s.prefs.reduceMotion);
  const activeTab = useStore((s) => s.activeTab);
  const onboarded = useStore((s) => s.prefs.onboarded);
  const showOnboarding = useStore((s) => s.showOnboarding);
  const initAuth = useAuth((s) => s.init);
  const authStatus = useAuth((s) => s.status);
  const authUserId = useAuth((s) => s.user?.id ?? null);
  const adoptAccount = useStore((s) => s.adoptAccount);
  const revertToGuest = useStore((s) => s.revertToGuest);
  const signOut = useStore((s) => s.signOut);
  const accountStorageBlocked = useStore((s) => s.accountStorageBlocked);
  const syncOwner = useRef<string>('guest');
  const storageGateRef = useRef<HTMLDivElement>(null);
  const kb = useKeyboardInset();
  useModalFocus(accountStorageBlocked, null, storageGateRef);

  // Route progress to the account (pull + merge + push) on sign-in, and back to
  // the local guest cache on sign-out once bootstrap has hydrated. The store's
  // raw-session listener may begin the same transition earlier for immediate
  // privacy revocation; its target/ready guards make this profile-backed call
  // idempotent.
  useEffect(() => {
    if (!hydrated) return;
    if (authStatus === 'authed' && authUserId) {
      if (syncOwner.current !== authUserId) {
        syncOwner.current = authUserId;
        void adoptAccount(authUserId);
      }
    } else if (authStatus === 'guest' && syncOwner.current !== 'guest') {
      syncOwner.current = 'guest';
      void revertToGuest();
    }
  }, [authStatus, authUserId, hydrated, adoptAccount, revertToGuest]);

  // opening night claims the entrance — the brief curtain stands down
  useEffect(() => {
    if (showOnboarding) curtainDone = true;
  }, [showOnboarding]);

  useEffect(() => {
    void bootstrap();
    void initAuth();
  }, [bootstrap, initAuth]);

  const appStyle = {
    ...(kb > 0 ? { paddingBottom: kb } : {}),
    // exposed so absolute-positioned overlays (ask panel, auth) can lift their
    // own inputs above the on-screen keyboard, which the .app padding can't reach
    '--kb': `${kb}px`,
  } as CSSProperties;

  // Guest-first: the app is always usable without an account (the offline owl
  // answers). Signing in — via the <Auth /> members-door overlay — turns on
  // cross-device sync, chat history, and the live memory owl (owl-chat is
  // JWT-gated, so a guest silently gets the offline brain).
  const ready = hydrated;

  return (
    <div className="page">
      <div className="phone">
        <div
          className={`app b${reduceMotion ? ' no-motion' : ''}`}
          id="app"
          data-mode="night"
          data-tab={activeTab}
          data-kb={kb > 0 ? 'open' : 'closed'}
          style={appStyle}
        >
          {ready && (
            <>
              <main className="screens">
                <TodayScreen />
                <DiscoverScreen />
                <ProfileScreen />
              </main>
              <BottomNav />
              <GuestLevelButton />
              <Backdrop />
              <Sheet />
              <EbookReader />
              <UploadModal />
              <History />
              <Letter />
              <Settings />
              <MirrorRoom />
              <Onboarding />
              <Auth />
              <IntroCard />
              {onboarded && !showOnboarding && !curtainDone && !reduceMotion && <PlaybillCurtain />}
              <SelectionBar />
              <Toast />
              <BurstLayer />
              {accountStorageBlocked && (
                <div
                  className="account-storage-gate"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="account-storage-title"
                  aria-describedby="account-storage-body"
                  tabIndex={-1}
                  ref={storageGateRef}
                >
                  <div className="account-storage-card">
                    <div className="account-storage-spinner" aria-hidden="true" />
                    <div id="account-storage-title" className="account-storage-title d">
                      {t.settings.settings.storageWaitTitle}
                    </div>
                    <p id="account-storage-body">{t.settings.settings.storageWaitBody}</p>
                    <div className="account-storage-actions">
                      <button
                        className="account-storage-primary"
                        onClick={() => {
                          if (authUserId) void adoptAccount(authUserId);
                        }}
                      >
                        {t.settings.settings.storageRetry}
                      </button>
                      <button onClick={() => void signOut()}>{t.settings.settings.signOut}</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <p className="caption">{t.today.chrome.caption}</p>
    </div>
  );
}
