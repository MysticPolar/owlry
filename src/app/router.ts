import { useEffect, useState } from 'react';

/* ============================================================
   A tiny hash router. Every screen is a URL so the whole journey is
   deep-linkable and the browser back button works like a phone's.

     #/welcome  #/signup  #/signin  #/interests
     #/council                       Screen 0 — Life's Council Room
     #/discussion/:id                Screen 1 — the group chat
     #/summary/:id                   the takeaways + reading screen
     #/book/:id?council=:id          book detail modal (full screen)
     #/read/:id?council=:id          Screen 2 — the reader
     #/library  #/social  #/profile  #/settings   (#/reading is the library)
   ============================================================ */
export type Route =
  | { name: 'welcome' }
  | { name: 'signup' }
  | { name: 'signin' }
  | { name: 'interests' }
  | { name: 'council' }
  | { name: 'discussion'; id: string }
  | { name: 'summary'; id: string }
  | { name: 'book'; id: string; council?: string }
  | { name: 'read'; id: string; council?: string }
  | { name: 'library' }
  | { name: 'social' }
  | { name: 'profile' }
  | { name: 'settings' };

export type TabName = 'council' | 'library' | 'social' | 'profile';

export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const [pathPart, queryPart] = raw.split('?');
  const seg = pathPart.split('/').filter(Boolean);
  const q = new URLSearchParams(queryPart ?? '');
  const council = q.get('council') ?? undefined;
  switch (seg[0]) {
    case undefined:
    case '':
    case 'welcome':
      return { name: 'welcome' };
    case 'signup':
      return { name: 'signup' };
    case 'signin':
      return { name: 'signin' };
    case 'interests':
      return { name: 'interests' };
    case 'council':
      return { name: 'council' };
    case 'discussion':
      return seg[1] ? { name: 'discussion', id: seg[1] } : { name: 'council' };
    case 'summary':
      return seg[1] ? { name: 'summary', id: seg[1] } : { name: 'council' };
    case 'book':
      return seg[1] ? { name: 'book', id: seg[1], council } : { name: 'library' };
    case 'read':
      return seg[1] ? { name: 'read', id: seg[1], council } : { name: 'library' };
    case 'reading': // the old Reading tab lives in the library now
      return { name: 'library' };
    case 'library':
      return { name: 'library' };
    case 'social':
      return { name: 'social' };
    case 'profile':
      return { name: 'profile' };
    case 'settings':
      return { name: 'settings' };
    default:
      return { name: 'council' };
  }
}

export function routeHref(r: Route): string {
  switch (r.name) {
    case 'discussion':
      return `#/discussion/${r.id}`;
    case 'summary':
      return `#/summary/${r.id}`;
    case 'book':
      return `#/book/${r.id}${r.council ? `?council=${r.council}` : ''}`;
    case 'read':
      return `#/read/${r.id}${r.council ? `?council=${r.council}` : ''}`;
    default:
      return `#/${r.name}`;
  }
}

export function navigate(r: Route, opts: { replace?: boolean } = {}) {
  const href = routeHref(r);
  if (opts.replace) {
    history.replaceState(null, '', href);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = href;
  }
}

/** Phone-style back: real history when we have it, otherwise a sensible parent. */
export function goBack(fallback: Route = { name: 'council' }) {
  if (history.length > 1 && document.referrer !== '' || history.state?.owlry) {
    history.back();
  } else if (history.length > 1) {
    history.back();
  } else {
    navigate(fallback, { replace: true });
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseRoute(location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

/** which bottom-nav tab a route belongs to (undefined = no nav on that screen) */
export function tabFor(r: Route): TabName | undefined {
  switch (r.name) {
    case 'council':
      return 'council';
    case 'library':
      return 'library';
    case 'social':
      return 'social';
    case 'profile':
    case 'settings':
      return 'profile';
    default:
      return undefined;
  }
}
