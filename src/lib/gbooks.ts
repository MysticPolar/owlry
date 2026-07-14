/* ============================================================
   owlry — book metadata resolver (Google Books → Open Library fallback).

   Resolves a book by title+author to real metadata: cover, subtitle,
   publisher, page count, rating + ratings count, description.

   Two sources, tried in order:
   • Google Books — richer (incl. descriptions), but its JSON API no longer
     serves keyless requests (anonymous quota is 0/day), so it's used only
     when a PUBLIC, referrer-restricted key is configured (VITE_GOOGLE_BOOKS_
     API_KEY — safe to ship to the browser, like VITE_SUPABASE_ANON_KEY).
   • Open Library — free, keyless, CORS-enabled. The fallback that makes
     covers work for everyone with zero setup (and offline when no key match).

   So: with a key we prefer Google and fall back to Open Library on a miss;
   without a key we go straight to Open Library. Either way covers light up.

   Pure helpers (buildQueryUrl / pickMatch / mapVolume, + the Open Library
   ones) are exported so the build-time pre-bake script reuses the query +
   match logic in Node without the browser cache layer.

   Cache discipline mirrors resolve.ts: an in-memory Map + IndexedDB, and
   we cache ONLY definitive answers (a found match, or a genuine no-match
   from every source attempted). Network / CORS / timeout / quota failures
   are transient and never cached, so one slow response can't poison a book.
   ============================================================ */
import { get, set } from 'idb-keyval';
import { norm, surname } from './textMatch';
import { buildOpenLibUrl, pickOpenLibMatch, mapOpenLibDoc, type OLDoc } from './openlibrary';

const ENDPOINT = 'https://www.googleapis.com/books/v1/volumes';
const TIMEOUT_MS = 6000;
const CACHE_VERSION = 'v1';

// A PUBLIC, HTTP-referrer-restricted key (safe in the browser). With it UNSET
// the resolver simply skips Google and uses Open Library — covers still work.
const ENV = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {});
const API_KEY = ENV.VITE_GOOGLE_BOOKS_API_KEY?.trim() || undefined;

/** resolved book metadata, from whichever source answered */
export interface BookMeta {
  volumeId: string;
  title: string;
  subtitle?: string;
  authors: string[];
  publisher?: string;
  pageCount?: number;
  /** averageRating, 1–5 */
  rating?: number;
  ratingsCount?: number;
  description?: string;
  /** https cover image URL, only set when the volume actually has cover art */
  img?: string;
  source: 'google' | 'openlibrary';
}

interface GVolumeInfo {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  pageCount?: number;
  averageRating?: number;
  ratingsCount?: number;
  description?: string;
  imageLinks?: { thumbnail?: string; smallThumbnail?: string };
}
export interface GVolume {
  id: string;
  volumeInfo: GVolumeInfo;
}

/* ---------- pure helpers (browser + Node) ---------- */

/** the scoped volumes query — intitle:/inauthor: cut wrong-book noise; country=US
 *  is required (requests without it frequently 403); fields= trims payload. An
 *  API key is appended when provided (required for the JSON API). */
export function buildQueryUrl(title: string, author: string, key?: string): string {
  const params = new URLSearchParams({
    q: `intitle:${title} inauthor:${surname(author)}`,
    printType: 'books',
    maxResults: '5',
    orderBy: 'relevance',
    country: 'US',
    langRestrict: 'en',
    fields:
      'items(id,volumeInfo(title,subtitle,authors,publisher,pageCount,averageRating,ratingsCount,description,imageLinks/thumbnail,imageLinks/smallThumbnail))',
  });
  if (key) params.set('key', key);
  return `${ENDPOINT}?${params.toString()}`;
}

/** force https (mixed-content) and drop the page-curl overlay from cover URLs */
const cleanImg = (u?: string): string | undefined =>
  u ? u.replace(/^http:/, 'https:').replace(/&edge=curl/, '') : undefined;

/** strip HTML tags/entities so descriptions render as clean text in ClampText */
const stripHtml = (s: string): string =>
  s
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

/** map a raw volume to our lean metadata shape */
export function mapVolume(item: GVolume): BookMeta {
  const vi = item.volumeInfo ?? {};
  return {
    volumeId: item.id,
    title: vi.title ?? '',
    subtitle: vi.subtitle || undefined,
    authors: vi.authors ?? [],
    publisher: vi.publisher || undefined,
    pageCount: typeof vi.pageCount === 'number' && vi.pageCount > 0 ? vi.pageCount : undefined,
    rating: typeof vi.averageRating === 'number' ? vi.averageRating : undefined,
    ratingsCount: typeof vi.ratingsCount === 'number' ? vi.ratingsCount : undefined,
    description: vi.description ? stripHtml(vi.description) : undefined,
    img: cleanImg(vi.imageLinks?.thumbnail ?? vi.imageLinks?.smallThumbnail),
    source: 'google',
  };
}

/** pick the best title+author match — prefer an edition that has cover art */
export function pickMatch(items: GVolume[], title: string, author: string): GVolume | null {
  const nt = norm(title);
  const sa = surname(author);
  const matches = items.filter((it) => {
    const vi = it.volumeInfo;
    if (!vi?.title) return false;
    const bt = norm(vi.title);
    const titleOk = bt === nt || bt.includes(nt) || nt.includes(bt);
    const authorOk = (vi.authors ?? []).some((a) => norm(a).includes(sa) && sa.length > 2);
    return titleOk && authorOk;
  });
  if (!matches.length) return null;
  return matches.find((it) => !!it.volumeInfo.imageLinks?.thumbnail) ?? matches[0];
}

/** the cache key — same normalized title|surname convention as resolve.ts */
export const metaKey = (title: string, author: string): string => `${norm(title)}|${surname(author)}`;

/* ---------- per-source fetch (used by the resolver) ---------- */

/** one source attempt: `ok` is whether the request completed (a genuine
 *  no-match is `{meta:null, ok:true}`; a network/timeout/HTTP error is ok:false
 *  so the resolver knows not to cache a no-match built on a failed request) */
type Attempt = { meta: BookMeta | null; ok: boolean };

/** timed fetch → parsed JSON, or null on any failure */
async function timedJson<T>(url: string): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGoogle(title: string, author: string): Promise<Attempt> {
  if (!API_KEY) return { meta: null, ok: true }; // not attempted — settled, not a failure
  const data = await timedJson<{ items?: GVolume[] }>(buildQueryUrl(title, author, API_KEY));
  if (!data) return { meta: null, ok: false };
  const match = pickMatch(data.items ?? [], title, author);
  return { meta: match ? mapVolume(match) : null, ok: true };
}

async function fetchOpenLibrary(title: string, author: string): Promise<Attempt> {
  const data = await timedJson<{ docs?: OLDoc[] }>(buildOpenLibUrl(title, author));
  if (!data) return { meta: null, ok: false };
  const match = pickOpenLibMatch(data.docs ?? [], title, author);
  return { meta: match ? mapOpenLibDoc(match) : null, ok: true };
}

/* ---------- browser resolver (mem + IndexedDB cache) ---------- */

const mem = new Map<string, BookMeta | null>();
const inflight = new Map<string, Promise<BookMeta | null>>();
const idbKey = (k: string) => `owlry/gbooks/${CACHE_VERSION}/${k}`;

/** synchronous peek at the in-memory cache — lets a re-render paint instantly
 *  for a book already resolved this session (no cover flash on revisit) */
export function peekMeta(title: string, author: string): BookMeta | null | undefined {
  return mem.get(metaKey(title, author));
}

/**
 * Resolve book metadata for a title/author, or null if no source has a
 * confident match. Tries Google Books first (when a key is configured), then
 * Open Library. Reads mem → IndexedDB → network; caches only definitive answers
 * (a match, or a genuine no-match from every source that actually responded);
 * dedupes concurrent calls for the same book.
 */
export async function resolveBookMeta(title: string, author: string): Promise<BookMeta | null> {
  const key = metaKey(title, author);
  if (mem.has(key)) return mem.get(key)!;
  const pending = inflight.get(key);
  if (pending) return pending;

  const run = (async (): Promise<BookMeta | null> => {
    // persistent cache (survives reloads / offline)
    try {
      const cached = (await get(idbKey(key))) as BookMeta | null | undefined;
      if (cached !== undefined) {
        mem.set(key, cached);
        return cached;
      }
    } catch {
      /* IndexedDB unavailable (private mode / SSR) — fall through to network */
    }

    let meta: BookMeta | null = null;
    let transient = false; // did any attempted source fail (vs. genuinely miss)?

    const g = await fetchGoogle(title, author);
    if (g.meta) meta = g.meta;
    else if (!g.ok) transient = true;

    if (!meta) {
      const o = await fetchOpenLibrary(title, author);
      if (o.meta) meta = o.meta;
      else if (!o.ok) transient = true;
    }

    if (meta || !transient) {
      // a match, or a genuine no-match from responding sources → safe to remember
      mem.set(key, meta);
      try {
        await set(idbKey(key), meta);
      } catch {
        /* best-effort persist */
      }
    }
    // else: a source failed transiently and nothing matched — return null WITHOUT
    // caching, so a later mount can retry (caching null would poison the book).
    return meta;
  })().finally(() => inflight.delete(key));

  inflight.set(key, run);
  return run;
}
