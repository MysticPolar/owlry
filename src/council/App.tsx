import { useEffect, useLayoutEffect, useRef, useState, type AnimationEvent } from 'react';
import { useRoute, tabFor, navigate, parseRoute, routeHref, type Route } from './app/router';
import { useStore } from './store/useStore';
import { useReduceMotion } from './hooks/useReduceMotion';
import { Nav, StatusBar, ToastHost } from './components/chrome';
import { ROOM_ART } from './components/CouncilRoom';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { AuthScreen } from './screens/AuthScreen';
import { InterestsScreen } from './screens/InterestsScreen';
import { CouncilScreen } from './screens/CouncilScreen';
import { DiscussionScreen } from './screens/DiscussionScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { BookScreen } from './screens/BookScreen';
import { ReaderScreen } from './screens/ReaderScreen';
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

/* How deep each screen sits in the journey. Going deeper slides the new
   screen in from the right, coming back slides it in from the left, and a
   move between siblings (the tabs) just fades. */
const DEPTH: Record<Route['name'], number> = {
  welcome: 0,
  signup: 1,
  signin: 1,
  interests: 1,
  council: 2,
  library: 2,
  social: 2,
  profile: 2,
  settings: 3,
  discussion: 3,
  summary: 4,
  book: 5,
  read: 6,
};
type Dir = 'fwd' | 'back' | 'flat';
type Layer = { key: string; route: Route; dir: Dir; out: boolean };
const SCREEN_MS = 300;

function renderScreen(route: Route) {
  switch (route.name) {
    case 'welcome':
      return <WelcomeScreen />;
    case 'signup':
      return <AuthScreen mode="signup" />;
    case 'signin':
      return <AuthScreen mode="signin" />;
    case 'interests':
      return <InterestsScreen />;
    case 'council':
      return <CouncilScreen />;
    case 'discussion':
      return <DiscussionScreen id={route.id} />;
    case 'summary':
      return <SummaryScreen id={route.id} />;
    case 'book':
      return <BookScreen id={route.id} councilId={route.council} />;
    case 'read':
      return <ReaderScreen id={route.id} councilId={route.council} />;
    case 'library':
      return <LibraryScreen />;
    case 'social':
      return <SocialScreen />;
    case 'profile':
      return <ProfileScreen />;
    case 'settings':
      return <SettingsScreen />;
  }
}

/* screens that keep their own scroll position (the reader restores where you were; the chat follows the newest line) */
const OWN_SCROLL = new Set<Route['name']>(['read', 'discussion']);

export function App() {
  const route = useRoute();
  const framed = useFramed();
  const reduce = useReduceMotion();
  const onboarded = useStore((s) => s.onboarded);
  const lang = useStore((s) => s.lang);

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

  // the paintings of the council room, fetched quietly so the room is on the wall before anyone walks in
  useEffect(() => {
    const t = setTimeout(() => {
      for (const src of ROOM_ART) new Image().src = src;
    }, 800);
    return () => clearTimeout(t);
  }, []);

  /* ---- screen layers: the old screen stays underneath while the new one arrives ---- */
  const [layers, setLayers] = useState<Layer[]>(() => [{ key: `${routeHref(route)}#0`, route, dir: 'flat', out: false }]);
  const seq = useRef(0);
  const last = useRef(route);
  useEffect(() => {
    if (routeHref(route) === routeHref(last.current)) return;
    const from = last.current;
    last.current = route;
    const d = DEPTH[route.name] - DEPTH[from.name];
    const dir: Dir = d > 0 ? 'fwd' : d < 0 ? 'back' : 'flat';
    const key = `${routeHref(route)}#${++seq.current}`;
    if (reduce) {
      setLayers([{ key, route, dir: 'flat', out: false }]);
      return;
    }
    setLayers((ls) => [...ls.filter((l) => !l.out).map((l) => ({ ...l, out: true, dir })), { key, route, dir, out: false }]);
    // belt and braces: if the exit animation never reports back, the old layer still goes
    setTimeout(() => setLayers((ls) => ls.filter((l) => !l.out)), SCREEN_MS + 120);
  }, [route, reduce]);
  const dropLayer = (key: string) => setLayers((ls) => ls.filter((l) => l.key !== key));
  const inLayer = layers[layers.length - 1];

  /* ---- scroll memory: each screen comes back where you left it; a new one starts at the top ---- */
  const scrollMemo = useRef(new Map<string, number>());
  useEffect(() => {
    const onScroll = (e: Event) => {
      const el = e.target;
      if (!(el instanceof HTMLElement) || !el.classList.contains('screen-scroll') || el.closest('.screen-layer.out')) return;
      scrollMemo.current.set(location.hash, el.scrollTop);
    };
    document.addEventListener('scroll', onScroll, true);
    return () => document.removeEventListener('scroll', onScroll, true);
  }, []);
  useLayoutEffect(() => {
    if (OWN_SCROLL.has(inLayer.route.name)) return;
    const el = document.querySelector<HTMLElement>('.screen-layer.in .screen-scroll');
    if (el) el.scrollTop = scrollMemo.current.get(routeHref(inLayer.route)) ?? 0;
  }, [inLayer.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const tab = tabFor(route);
  const night = route.name === 'welcome' || route.name === 'council' || route.name === 'signup' || route.name === 'signin';

  return (
    // keyed by language: a switch remounts every screen, so memoised content re-reads the localised catalogue
    <div className="desk" key={lang}>
      <div className={`phone ${framed ? 'framed' : ''}`}>
        {framed && <div className="notch" aria-hidden="true" />}
        <div className={`screen-clip ${night ? 'night' : ''} ${tab ? '' : 'no-nav'}`}>
          {framed && <StatusBar />}
          {layers.map((l) => (
            <div
              key={l.key}
              className={`screen-layer ${l.out ? 'out' : 'in'} ${l.dir}`}
              aria-hidden={l.out || undefined}
              onAnimationEnd={(e: AnimationEvent<HTMLDivElement>) => {
                // only the screen's own exit, not an animation inside it
                if (l.out && (e.target as HTMLElement).parentElement === e.currentTarget) dropLayer(l.key);
              }}
            >
              {renderScreen(l.route)}
            </div>
          ))}
          {tab && <Nav active={tab} />}
          <ToastHost />
        </div>
      </div>
    </div>
  );
}
