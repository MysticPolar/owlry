import { useEffect, type CSSProperties } from 'react';
import { useStore } from './store/useStore';
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

const READER_SCALE: Record<ReaderScale, number> = { sm: 0.9, md: 1, lg: 1.15 };

export default function App() {
  const wxIndex = useStore((s) => s.wxIndex);
  const hydrated = useStore((s) => s.hydrated);
  const bootstrap = useStore((s) => s.bootstrap);
  const readerScale = useStore((s) => s.prefs.readerScale);
  const reduceMotion = useStore((s) => s.prefs.reduceMotion);
  const kb = useKeyboardInset();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

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
              <Toast />
              <BurstLayer />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
