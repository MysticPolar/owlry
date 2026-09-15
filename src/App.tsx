import { useEffect, useState } from 'react';
import { useRoute, tabFor, navigate, parseRoute } from './app/router';
import { useStore } from './store/useStore';
import { Nav, StatusBar, ToastHost } from './components/chrome';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { AuthScreen } from './screens/AuthScreen';
import { InterestsScreen } from './screens/InterestsScreen';
import { CouncilScreen } from './screens/CouncilScreen';
import { DiscussionScreen } from './screens/DiscussionScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { BookScreen } from './screens/BookScreen';
import { ReaderScreen } from './screens/ReaderScreen';
import { ReadingScreen } from './screens/ReadingScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { SocialScreen } from './screens/SocialScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SettingsScreen } from './screens/SettingsScreen';

/* the desk + the phone; on a real phone the frame collapses to full-bleed (see base.css) */
function useFramed(): boolean {
  const [framed, setFramed] = useState(() => !window.matchMedia('(max-width: 560px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 560px)');
    const on = () => setFramed(!mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return framed;
}

export function App() {
  const route = useRoute();
  const framed = useFramed();
  const onboarded = useStore((s) => s.onboarded);

  // Every visit starts by choosing a path: a plain open (or a tab URL) lands on the
  // interest screen — the welcome screen only on the very first visit. Deep links
  // into a discussion, summary, book or reader still open directly.
  useEffect(() => {
    const first = parseRoute(location.hash);
    const isTab = !location.hash || tabFor(first) !== undefined;
    if (!onboarded) navigate({ name: 'welcome' }, { replace: true });
    else if (isTab) navigate({ name: 'interests' }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // scroll-to-top per route
  useEffect(() => {
    document.querySelector('.screen-scroll')?.scrollTo({ top: 0 });
  }, [route.name]);

  const tab = tabFor(route);
  const night = route.name === 'welcome' || route.name === 'council' || route.name === 'signup' || route.name === 'signin';

  let screen: React.ReactNode;
  switch (route.name) {
    case 'welcome':
      screen = <WelcomeScreen />;
      break;
    case 'signup':
      screen = <AuthScreen mode="signup" />;
      break;
    case 'signin':
      screen = <AuthScreen mode="signin" />;
      break;
    case 'interests':
      screen = <InterestsScreen />;
      break;
    case 'council':
      screen = <CouncilScreen />;
      break;
    case 'discussion':
      screen = <DiscussionScreen id={route.id} />;
      break;
    case 'summary':
      screen = <SummaryScreen id={route.id} />;
      break;
    case 'book':
      screen = <BookScreen id={route.id} councilId={route.council} />;
      break;
    case 'read':
      screen = <ReaderScreen id={route.id} councilId={route.council} />;
      break;
    case 'reading':
      screen = <ReadingScreen />;
      break;
    case 'library':
      screen = <LibraryScreen />;
      break;
    case 'social':
      screen = <SocialScreen />;
      break;
    case 'profile':
      screen = <ProfileScreen />;
      break;
    case 'settings':
      screen = <SettingsScreen />;
      break;
  }

  return (
    <div className="desk">
      <div className={`phone ${framed ? 'framed' : ''}`}>
        {framed && <div className="notch" aria-hidden="true" />}
        <div className={`screen-clip ${night ? 'night' : ''} ${tab ? '' : 'no-nav'}`}>
          {framed && <StatusBar />}
          {screen}
          {tab && <Nav active={tab} />}
          <ToastHost />
        </div>
      </div>
    </div>
  );
}
