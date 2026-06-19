/* ============================================================
   owlry — public-domain source resolver.

   Looks up a free, legal EPUB by title+author via Gutendex (the Project
   Gutenberg API; CORS-enabled). Returns a ReadingSource or null. We never copy
   or host the file — we hand the reader the public URL. Results are cached and
   the request is time-boxed so the "Open" click stays fast.
   ============================================================ */
import type { ReadingSource } from './types';

const GUTENDEX = 'https://gutendex.com/books';
const TIMEOUT_MS = 3500;
const cache = new Map<string, ReadingSource | null>();

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/^(the|a|an)\s+/, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const surname = (author: string) => {
  const a = author.includes(',') ? author.split(',')[0] : author.split(' ').slice(-1)[0];
  return norm(a);
};

interface GutendexBook {
  title: string;
  authors: { name: string }[];
  formats: Record<string, string>;
}

function epubUrl(b: GutendexBook): string | null {
  for (const [mime, url] of Object.entries(b.formats)) {
    if (mime.startsWith('application/epub+zip')) return url;
  }
  return null;
}

function pickMatch(results: GutendexBook[], title: string, author: string): GutendexBook | null {
  const nt = norm(title);
  const sa = surname(author);
  for (const b of results) {
    if (!epubUrl(b)) continue;
    const bt = norm(b.title);
    const titleOk = bt === nt || bt.includes(nt) || nt.includes(bt);
    const authorOk = b.authors.some((a) => norm(a.name).includes(sa) && sa.length > 2);
    if (titleOk && authorOk) return b;
  }
  return null;
}

/** Resolve a public-domain EPUB for this title/author, or null if none exists. */
export async function resolvePublicDomain(title: string, author: string): Promise<ReadingSource | null> {
  const key = `${norm(title)}|${surname(author)}`;
  if (cache.has(key)) return cache.get(key)!;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${GUTENDEX}?search=${encodeURIComponent(`${title} ${author}`)}`, {
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`gutendex ${res.status}`);
    const data = (await res.json()) as { results?: GutendexBook[] };
    const match = pickMatch(data.results ?? [], title, author);
    const url = match ? epubUrl(match) : null;
    const source: ReadingSource | null = url
      ? { kind: 'remote-epub', format: 'epub', title, author, url, sourceLabel: 'Project Gutenberg' }
      : null;
    cache.set(key, source);
    return source;
  } catch {
    // network / CORS / timeout / no match → fall through to the upload flow
    cache.set(key, null);
    return null;
  } finally {
    clearTimeout(t);
  }
}
