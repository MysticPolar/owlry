import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { WX } from './content/weather';
import { StatusBar, BottomNav, Toast, BurstLayer, Backdrop } from './components/chrome';
import { TodayScreen } from './components/screens/TodayScreen';
import { DiscoverScreen } from './components/screens/DiscoverScreen';
import { LibraryScreen } from './components/screens/LibraryScreen';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { Sheet } from './components/overlays/Sheet';
import { Reader } from './components/overlays/Reader';
import { Letter } from './components/overlays/Letter';

export default function App() {
  const wxIndex = useStore((s) => s.wxIndex);
  const hydrated = useStore((s) => s.hydrated);
  const bootstrap = useStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <div className="page">
      <div className="phone">
        <div className="app b" id="app" data-wx={WX[wxIndex].k}>
          {hydrated && (
            <>
              <StatusBar />
              <div className="screens">
                <TodayScreen />
                <DiscoverScreen />
                <LibraryScreen />
                <ProfileScreen />
              </div>
              <BottomNav />
              <Backdrop />
              <Sheet />
              <Reader />
              <Letter />
              <Toast />
              <BurstLayer />
            </>
          )}
        </div>
      </div>
      <p className="caption">tap the weather glyph · swipe today's pick · ask the owl · switch the profile tabs</p>
    </div>
  );
}
