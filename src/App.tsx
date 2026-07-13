import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useStore } from './store/useStore';
import { useAuth } from './store/useAuth';
import { useKeyboardInset } from './hooks/useKeyboardInset';
import { WX } from './content/weather';
import { StatusBar, BottomNav, Toast, BurstLayer, Backdrop } from './components/chrome';
import { TodayScreen } from './components/screens/TodayScreen';
import { DiscoverScreen } from './components/screens/DiscoverScreen';
import { LibraryScreen } from './components/screens/LibraryScreen';
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

/* the standing entrance: a brief curtain-rise on every app open (skipped on
   opening night, which plays the long one, and under reduced motion) */
let curtainDone = false;
function CurtainBrief() {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    curtainDone = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setGone(true);
      return;
    }
    const t = setTimeout(() => setGone(true), 1300);
    return () => clearTimeout(t);
  }, []);
  if (gone) return null;
  return (
    <div className="curtain-brief" aria-hidden="true">
      <div className="ob-velvet" />
      <div className="ob-fringe" />
    </div>
  );
}

export default function App() {
  const wxIndex = useStore((s) => s.wxIndex);
  const hydrated = useStore((s) => s.hydrated);
  const bootstrap = useStore((s) => s.bootstrap);
  const reduceMotion = useStore((s) => s.prefs.reduceMotion);
  const mode = useStore((s) => s.prefs.mode ?? 'night');
  const onboarded = useStore((s) => s.prefs.onboarded);
  const showOnboarding = useStore((s) => s.showOnboarding);
  const initAuth = useAuth((s) => s.init);
  const authStatus = useAuth((s) => s.status);
  const authUserId = useAuth((s) => s.user?.id ?? null);
  const adoptAccount = useStore((s) => s.adoptAccount);
  const revertToGuest = useStore((s) => s.revertToGuest);
  const syncOwner = useRef<string>('guest');
  const kb = useKeyboardInset();

  // route progress to the account (pull + merge + push) on sign-in, and back to
  // the local guest cache on sign-out — once the local bootstrap has hydrated.
  // This is the SINGLE owner of sync-adoption (useStore's own auth listener owns
  // only the chat side), so a login never adopts twice.
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
          data-wx={WX[wxIndex].k}
          data-mode={mode}
          data-kb={kb > 0 ? 'open' : 'closed'}
          style={appStyle}
        >
          {ready && (
            <>
              <StatusBar />
              <main className="screens">
                <TodayScreen />
                <DiscoverScreen />
                <LibraryScreen />
                <ProfileScreen />
              </main>
              <BottomNav />
              <Backdrop />
              <Sheet />
              <EbookReader />
              <UploadModal />
              <History />
              <Letter />
              <Settings />
              <Onboarding />
              <Auth />
              <IntroCard />
              {onboarded && !showOnboarding && !curtainDone && <CurtainBrief />}
              <Toast />
              <BurstLayer />
            </>
          )}
        </div>
      </div>
      <p className="caption">tap the sun for the matinée · swipe the post · ask scout · flip the profile tabs</p>
    </div>
  );
}
