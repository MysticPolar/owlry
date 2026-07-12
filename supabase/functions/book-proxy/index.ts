// ============================================================
// owlry — book-proxy edge function (Deno / Supabase).
//
// Public-domain ebook files (Project Gutenberg etc.) are served WITHOUT CORS
// headers, so a browser can't download them client-side — the reader's "open a
// free classic" path is dead in the browser. This proxy fetches the file
// SERVER-SIDE (no browser CORS there) from an ALLOWLISTED host and streams it
// back with CORS headers, so foliate-js can render it.
//
// Public (verify_jwt:false) so guests can read free classics too. SSRF-guarded:
// https-only + strict host allowlist + ebook-extension path check + manual
// redirect validation (every hop re-checked). Per-IP rate limited. Size-capped.
//
// We never host or store the file — it streams through. Only public-domain
// hosts are reachable.
//
// Deploy:  supabase functions deploy book-proxy --no-verify-jwt
// ============================================================
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

// Project Gutenberg + its official mirrors (gutendex hands out gutenberg.org URLs;
// files sometimes redirect to a mirror). Add mirrors here, never a wildcard.
const ALLOWED_HOSTS = new Set([
  'www.gutenberg.org',
  'gutenberg.org',
  'gutenberg.pglaf.org',
  'aleph.gutenberg.org',
  'gutenberg.readingroo.ms',
  'www.gutenberg.net.au',
]);
const EBOOK_PATH = /\.(epub|mobi|azw3|fb2|txt)$/i;
const MAX_BYTES = 30 * 1024 * 1024; // 30 MB hard cap
const FETCH_TIMEOUT_MS = 20_000;
const MAX_REDIRECTS = 4;

function hourStart(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours()));
}

/** an https URL whose host is allowlisted and whose path looks like an ebook file */
function isAllowed(u: URL): boolean {
  return u.protocol === 'https:' && ALLOWED_HOSTS.has(u.hostname) && EBOOK_PATH.test(u.pathname);
}

/** fetch, following redirects MANUALLY so every hop's host is re-validated (SSRF-safe) */
async function safeFetch(start: URL, signal: AbortSignal): Promise<Response> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(url.toString(), {
      redirect: 'manual',
      signal,
      headers: { 'user-agent': 'owlry-book-proxy', accept: '*/*' },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) return res;
      const next = new URL(loc, url); // resolve relative redirects
      if (!isAllowed(next)) throw new Error(`redirect to disallowed host: ${next.hostname}`);
      url = next;
      continue;
    }
    return res;
  }
  throw new Error('too many redirects');
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST' && req.method !== 'GET') return jsonResponse({ error: 'method not allowed' }, 405);

  // ── read the target url (POST {url} preferred; GET ?url= supported) ──
  let target = '';
  if (req.method === 'GET') {
    target = new URL(req.url).searchParams.get('url') ?? '';
  } else {
    try {
      target = String(((await req.json()) as { url?: unknown })?.url ?? '');
    } catch {
      return jsonResponse({ error: 'invalid body' }, 400);
    }
  }
  target = target.trim();

  let u: URL;
  try {
    u = new URL(target);
  } catch {
    return jsonResponse({ error: 'invalid url' }, 400);
  }
  if (u.protocol !== 'https:') return jsonResponse({ error: 'https only' }, 400);
  if (!ALLOWED_HOSTS.has(u.hostname)) return jsonResponse({ error: 'host not allowed' }, 403);
  if (!EBOOK_PATH.test(u.pathname)) return jsonResponse({ error: 'not an ebook path' }, 400);

  // ── per-IP rate limit (120/hour) — a light guard on egress abuse ──
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (SUPABASE_URL && SERVICE_KEY) {
      const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
      const admin = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data: ok } = await admin.rpc('owlry_rl_bump', {
        p_key: `book-proxy:${ip}`,
        p_window_start: hourStart().toISOString(),
        p_max: 120,
      });
      if (ok === false) return jsonResponse({ error: 'rate_limited' }, 429);
    }
  } catch {
    /* rate-limit best-effort — never block a read on a bookkeeping hiccup */
  }

  // ── fetch server-side (no browser CORS), validating redirects ──
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  let upstream: Response;
  try {
    upstream = await safeFetch(u, ctrl.signal);
  } catch (err) {
    clearTimeout(timer);
    console.error('[book-proxy] upstream fetch failed', String(err));
    return jsonResponse({ error: 'upstream fetch failed' }, 502);
  }
  clearTimeout(timer);

  if (!upstream.ok || !upstream.body) return jsonResponse({ error: `upstream ${upstream.status}` }, 502);
  const len = Number(upstream.headers.get('content-length') ?? '0');
  if (len && len > MAX_BYTES) return jsonResponse({ error: 'file too large' }, 413);

  // stream the bytes straight through with CORS + a day of CDN caching.
  // NB: always octet-stream — supabase-js functions.invoke() text-ifies any
  // content-type it doesn't special-case (json/octet-stream/…), which would
  // corrupt the binary. The client wraps the blob back into a named .epub File.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/octet-stream',
      'X-Owlry-Upstream-Type': upstream.headers.get('content-type') ?? '',
      'Cache-Control': 'public, max-age=86400',
    },
  });
});
