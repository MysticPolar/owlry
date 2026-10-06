/* ============================================================
   The Council's door: one shared access code, checked in the browser.

   The build carries only the SHA-256 of the code (VITE_COUNCIL_ACCESS_HASH,
   a repository variable); a reader who enters the code — or opens a link
   with ?key=<code> — has the hash stored in localStorage and is let in
   from then on. Rotating the code changes the hash and closes the door
   on every stored grant.

   A production build with no hash fails CLOSED; `npm run dev:council` is
   open. This keeps the page out of casual reach only: the bundle itself
   is public (static hosting) and the data is protected by RLS, as before.

   Removing the gate: delete src/council/gate/, restore the plain boot in
   main.tsx, and drop VITE_COUNCIL_ACCESS_HASH from deploy.yml and
   .env.example. Nothing else refers to it.
   ============================================================ */
const KEY = 'owlry-council-access';
const HASH = ((import.meta.env.VITE_COUNCIL_ACCESS_HASH as string | undefined) ?? '').trim().toLowerCase();
const configured = /^[0-9a-f]{64}$/.test(HASH);

/** may this browser open the Council? */
export function hasCouncilAccess(): boolean {
  if (!configured) return import.meta.env.DEV;
  try {
    return localStorage.getItem(KEY) === HASH;
  } catch {
    return false;
  }
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** check a code (case and surrounding spaces ignored); remember it when it matches */
export async function grantCouncilAccess(code: string): Promise<boolean> {
  // crypto.subtle exists only on https and localhost
  if (!configured || !code.trim() || !globalThis.crypto?.subtle) return false;
  if ((await sha256(code.trim().toUpperCase())) !== HASH) return false;
  try {
    localStorage.setItem(KEY, HASH);
  } catch {
    /* private mode without storage: in for this visit only */
  }
  return true;
}

/** a shared link carries the code as ?key= (never ?code= — supabase-js reads that one); use it, then take it out of the address bar */
export async function grantFromUrl(): Promise<boolean> {
  const params = new URLSearchParams(location.search);
  const code = params.get('key');
  if (code === null) return false;
  const ok = await grantCouncilAccess(code);
  params.delete('key');
  const query = params.toString();
  history.replaceState(history.state, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
  return ok;
}
