/* ============================================================
   Sync orchestration — the bridge between the auth store, the main store
   and the cloud.

   On sign-in: attach the profile, pull the cloud state and merge it with
   whatever the reader did as a guest (nothing is lost by exploring
   first), pull the councils, load the feed, push the merged result.
   While signed in: every change is pushed after a short debounce — the
   state row through compare-and-swap, changed councils by upsert.
   On sign-out: the device goes back to the demo state.
   ============================================================ */
import { useStore, type StoreState } from '../../store/useStore';
import { useAuth } from '../../store/useAuth';
import type { AuthProfile } from '../auth/api';
import { supabase } from '../supabase';
import { cloudPull, cloudPush } from './cloud';
import { mergeState, sameState } from './merge';
import { pullSessions, pushSessions, mergeSessions } from './sessions';
import { fetchFeed } from '../social/api';
import type { CloudState } from './types';
import type { CouncilSession } from '../../store/types';
import { UI } from '../../i18n/ui';

const DEBOUNCE_MS = 1500;

let attachedUid: string | null = null;
let applying = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let stateDirty = false;
const dirtySessions = new Set<string>();
let pushing = false;

/* ---------- slices ---------- */

function toCloud(s: StoreState): CloudState {
  return {
    v: 1,
    prefsAt: s.prefsAt,
    user: { name: s.user.name, handle: s.user.handle, bio: s.user.bio },
    interests: s.interests,
    onboarded: s.onboarded,
    textSize: s.textSize,
    lang: s.lang,
    saved: s.saved,
    progress: s.progress,
    bookmarks: s.bookmarks,
    highlights: s.highlights,
    lastRead: s.lastRead,
    liked: s.liked,
    savedPosts: s.savedPosts,
    following: s.following,
  };
}

function applyCloud(c: CloudState) {
  applying = true;
  try {
    useStore.setState((s) => ({
      prefsAt: c.prefsAt,
      user: { ...s.user, name: c.user.name, handle: c.user.handle, bio: c.user.bio, initial: (c.user.name.trim().charAt(0) || 'R').toUpperCase() },
      interests: c.interests,
      onboarded: c.onboarded || s.onboarded,
      textSize: c.textSize,
      saved: c.saved,
      progress: c.progress,
      bookmarks: c.bookmarks,
      highlights: c.highlights,
      lastRead: c.lastRead,
      liked: c.liked,
      savedPosts: c.savedPosts,
      following: c.following,
    }));
    // the language travels with the account; switching rebuilds the scripted councils
    if (c.lang && c.lang !== useStore.getState().lang) useStore.getState().setLang(c.lang);
  } finally {
    applying = false;
  }
}

function applySessions(cloud: CouncilSession[]) {
  if (!cloud.length) return;
  applying = true;
  try {
    useStore.setState((s) => {
      const councils = mergeSessions(s.councils, cloud);
      const order = Object.values(councils)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((c) => c.id);
      return { councils, councilOrder: order };
    });
  } finally {
    applying = false;
  }
}

/* ---------- push ---------- */

function schedulePush() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void pushNow();
  }, DEBOUNCE_MS);
}

async function pushNow(): Promise<void> {
  const uid = attachedUid;
  if (!uid || pushing) {
    if (uid && pushing) schedulePush();
    return;
  }
  pushing = true;
  try {
    const s = useStore.getState();
    if (stateDirty) {
      stateDirty = false;
      const local = toCloud(s);
      const merged = await cloudPush(local, uid);
      if (merged && attachedUid === uid && !sameState(local, toCloud(useStore.getState()))) {
        // the reader kept going while we wrote — merge again on the next push
        stateDirty = true;
      } else if (merged && attachedUid === uid && !sameState(merged, local)) {
        applyCloud(mergeState(toCloud(useStore.getState()), merged));
      }
    }
    if (dirtySessions.size) {
      const ids = Array.from(dirtySessions);
      dirtySessions.clear();
      const sessions = ids.map((id) => useStore.getState().councils[id]).filter((c): c is CouncilSession => !!c);
      await pushSessions(sessions, uid);
    }
  } catch (err) {
    // keep the dirt; the next change (or the next sign-in) retries
    stateDirty = true;
    if (import.meta.env?.DEV) console.warn('[sync] push failed; will retry', err);
  } finally {
    pushing = false;
    if (attachedUid && (stateDirty || dirtySessions.size)) schedulePush();
  }
}

/* ---------- attach / detach ---------- */

const STATE_KEYS: (keyof StoreState)[] = ['prefsAt', 'user', 'interests', 'onboarded', 'textSize', 'lang', 'saved', 'progress', 'bookmarks', 'highlights', 'lastRead', 'liked', 'savedPosts', 'following'];

function watchStore() {
  useStore.subscribe((s, prev) => {
    if (!attachedUid || applying) return;
    if (STATE_KEYS.some((k) => s[k] !== prev[k])) stateDirty = true;
    if (s.councils !== prev.councils) {
      for (const id of Object.keys(s.councils)) if (s.councils[id] !== prev.councils[id]) dirtySessions.add(id);
    }
    if (stateDirty || dirtySessions.size) schedulePush();
  });
}

async function attach(profile: AuthProfile): Promise<void> {
  if (attachedUid === profile.id) return;
  attachedUid = profile.id;
  const store = useStore.getState();
  // the account's profile is the truth for name/handle; the guest's bio travels along if the account has none
  applying = true;
  useStore.setState({
    user: { ...store.user, id: profile.id, email: profile.email, name: profile.name, handle: profile.handle, bio: profile.bio || store.user.bio, initial: (profile.name.trim().charAt(0) || 'R').toUpperCase(), signedIn: true },
    onboarded: true,
  });
  applying = false;

  try {
    const [cloud, sessions, feed] = await Promise.all([cloudPull(profile.id), pullSessions(profile.id), fetchFeed().catch(() => null)]);
    if (attachedUid !== profile.id) return;
    const local = toCloud(useStore.getState());
    const merged = cloud ? mergeState(local, cloud) : local;
    // the account's name/handle always win over a guest's demo profile
    merged.user = { name: profile.name, handle: profile.handle, bio: merged.user.bio };
    applyCloud(merged);
    applySessions(sessions);
    if (feed) useStore.getState().applyFeed(feed);
    // push what the device knew and the cloud didn't
    stateDirty = true;
    const cloudIds = new Set(sessions.map((c) => c.id));
    for (const id of Object.keys(useStore.getState().councils)) if (!cloudIds.has(id)) dirtySessions.add(id);
    await pushNow();
  } catch (err) {
    if (import.meta.env?.DEV) console.warn('[sync] first pull failed', err);
    useStore.getState().showToast(UI[useStore.getState().lang].sync.unreachable);
    stateDirty = true;
    schedulePush();
  }
}

function detach() {
  if (!attachedUid) return;
  attachedUid = null;
  if (timer) clearTimeout(timer);
  timer = null;
  stateDirty = false;
  dirtySessions.clear();
  // a shared device shouldn't keep the reader's library after sign-out
  applying = true;
  useStore.getState().resetDemo();
  useStore.setState({ onboarded: true });
  applying = false;
}

/** wire everything up once, at boot. No-op without a backend. */
export function startSync(): void {
  if (!supabase) return;
  watchStore();
  useAuth.subscribe((a, prev) => {
    if (a.user && a.user.id !== prev.user?.id) void attach(a.user);
    else if (!a.user && prev.user) detach();
  });
  const a = useAuth.getState();
  if (a.user) void attach(a.user);
}

/** refresh the feed (pull-to-refresh, tab focus) */
export async function refreshFeed(): Promise<void> {
  if (!attachedUid) return;
  const feed = await fetchFeed().catch(() => null);
  if (feed && attachedUid) useStore.getState().applyFeed(feed);
}

export const syncedUserId = (): string | null => attachedUid;
