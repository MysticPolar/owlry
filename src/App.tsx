import { useEffect, useState, type CSSProperties } from 'react';
import { useStore } from './store/useStore';
import { useAuth } from './store/useAuth';
import { useKeyboardInset } from './hooks/useKeyboardInset';
import { WX } from './content/weather';
import type { ReaderScale } from './store/types';
import { StatusBar, BottomNav, Toast, BurstLayer, Backdrop } from './components/chrome';
import { TodayScreen } from './components/screens/TodayScreen';
import { DiscoverScreen } from './components/screens/DiscoverScreen';
import { LibraryScreen } from './components/screens/LibraryScreen';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { Sheet } from './components/overlays/Sheet';
import { Reader } from './components/overlays/Reader';
import { Letter } from './components/overlays/Letter';
import { Settings } from './components/overlays/Settings';
import { Onboarding } from './components/overlays/Onboarding';
import { Auth } from './components/overlays/Auth';

const READER_SCALE: Record<ReaderScale, number> = { sm: 0.9, md: 1, lg: 1.15 };

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
  const readerScale = useStore((s) => s.prefs.readerScale);
  const reduceMotion = useStore((s) => s.prefs.reduceMotion);
  const mode = useStore((s) => s.prefs.mode ?? 'night');
  const onboarded = useStore((s) => s.prefs.onboarded);
  const showOnboarding = useStore((s) => s.showOnboarding);
  const initAuth = useAuth((s) => s.init);
  const kb = useKeyboardInset();

  // opening night claims the entrance — the brief curtain stands down
  useEffect(() => {
    if (showOnboarding) curtainDone = true;
  }, [showOnboarding]);

  useEffect(() => {
    void bootstrap();
    void initAuth();
  }, [bootstrap, initAuth]);

  const appStyle = {
    '--reader-scale': String(READER_SCALE[readerScale]),
    ...(kb > 0 ? { paddingBottom: kb } : {}),
  } as CSSProperties;

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
          {hydrated && (
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
              <Reader />
              <Letter />
              <Settings />
              <Onboarding />
              <Auth />
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
