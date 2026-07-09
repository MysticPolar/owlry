import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { useKeyboardInset } from './hooks/useKeyboardInset';
import { isConfigured } from './lib/supabase';
import { WX } from './content/weather';
import { StatusBar, BottomNav, Toast, BurstLayer, Backdrop } from './components/chrome';
import { TodayScreen } from './components/screens/TodayScreen';
import { DiscoverScreen } from './components/screens/DiscoverScreen';
import { LibraryScreen } from './components/screens/LibraryScreen';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { Sheet } from './components/overlays/Sheet';
import { Reader } from './components/overlays/Reader';
import { History } from './components/overlays/History';
import { Letter } from './components/overlays/Letter';
import { LoginGate } from './components/auth/LoginGate';

export default function App() {
  const wxIndex = useStore((s) => s.wxIndex);
  const hydrated = useStore((s) => s.hydrated);
  const authReady = useStore((s) => s.authReady);
  const authUser = useStore((s) => s.authUser);
  const bootstrap = useStore((s) => s.bootstrap);
  const kb = useKeyboardInset();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // no backend configured → isConfigured is false and this is always the app tree,
  // byte-identical to the pre-auth app. Configured + no session → the login gate.
  const ready = hydrated && authReady;
  const needsAuth = isConfigured && !authUser;

  return (
    <div className="page">
      <div className="phone">
        <div
          className="app b"
          id="app"
          data-wx={WX[wxIndex].k}
          data-kb={kb > 0 ? 'open' : 'closed'}
          style={kb > 0 ? { paddingBottom: kb } : undefined}
        >
          {ready && needsAuth && <LoginGate />}
          {ready && !needsAuth && (
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
              <History />
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
