import { useEffect, useState } from 'react';

/* ============================================================
   A tiny hash router. Every screen is a URL so the whole journey is
   deep-linkable and the browser back button works like a phone's. It
   never reads location.pathname, so every deep link is /council/#/… and
   GitHub Pages needs no 404 fallback.

     #/welcome  #/signup  #/signin  #/interests
     #/council                       the room: ask a question
     #/confirm                       how the council reads it: three readings + Other, then cast
     #/stands/:id                    Act I   — three minds, one book each
     #/debate/:id                    Act II  — one line at a time
     #/summary/:id                   Act III — the verdict and the books
     #/one/:id/:figure               one on one with a seat
     #/book/:id?council=:id          book page
     #/read/:id?council=:id          the reader
     #/library  #/social  #/profile  #/settings
     (#/discussion/:id, the old chat, opens Act I; #/reading is the library)
   ============================================================ */
export type Route =
  | { name: 'welcome' }
  | { name: 'signup' }
  | { name: 'signin' }
  | { name: 'interests' }
  | { name: 'council' }
  | { name: 'confirm' }
  | { name: 'stands'; id: string }
  | { name: 'debate'; id: string }
  | { name: 'summary'; id: string }
  | { name: 'one'; id: string; figure: string }
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
  const seg = pathPart.split('/').filter(Boolean).map(decodeURIComponent);
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
    case 'confirm':
      return { name: 'confirm' };
    case 'stands':
    case 'discussion': // the old chat screen
      return seg[1] ? { name: 'stands', id: seg[1] } : { name: 'council' };
    case 'debate':
      return seg[1] ? { name: 'debate', id: seg[1] } : { name: 'council' };
    case 'summary':
      return seg[1] ? { name: 'summary', id: seg[1] } : { name: 'council' };
    case 'one':
      return seg[1] && seg[2] ? { name: 'one', id: seg[1], figure: seg[2] } : seg[1] ? { name: 'summary', id: seg[1] } : { name: 'council' };
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
    case 'stands':
      return `#/stands/${r.id}`;
    case 'debate':
      return `#/debate/${r.id}`;
    case 'summary':
      return `#/summary/${r.id}`;
    case 'one':
      return `#/one/${r.id}/${encodeURIComponent(r.figure)}`;
    case 'book':
      return `#/book/${r.id}${r.council ? `?council=${r.council}` : ''}`;
    case 'read':
      return `#/read/${r.id}${r.council ? `?council=${r.council}` : ''}`;
    default:
      return `#/${r.name}`;
  }
}

/* every entry the app pushes carries how deep into the app it is, so back never walks out of it */
type NavState = { councilDepth?: number } | null;
const depth = (): number => ((history.state as NavState)?.councilDepth ?? 0);

export function navigate(r: Route, opts: { replace?: boolean } = {}) {
  const href = routeHref(r);
  if (opts.replace) history.replaceState(history.state, '', href);
  else history.pushState({ councilDepth: depth() + 1 }, '', href);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/** Phone-style back: the previous screen when the app put one there, otherwise a sensible parent (never another site). */
export function goBack(fallback: Route = { name: 'council' }) {
  if (depth() > 0) history.back();
  else navigate(fallback, { replace: true });
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(location.hash));
  useEffect(() => {
    const on = () => setRoute((prev) => {
      const next = parseRoute(location.hash);
      return routeHref(next) === routeHref(prev) ? prev : next;
    });
    // back/forward between pushed entries fires popstate (and, in most browsers, hashchange too)
    window.addEventListener('hashchange', on);
    window.addEventListener('popstate', on);
    return () => {
      window.removeEventListener('hashchange', on);
      window.removeEventListener('popstate', on);
    };
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
