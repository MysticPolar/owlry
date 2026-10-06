/* ============================================================
   Auth store — kept apart from the persisted game state, as in the
   classic app, so a session never lands in the localStorage blob and a
   blob never carries a session. Optional by design: with no backend the
   status settles on 'guest' and the AuthScreen keeps its on-device mock.

   Attaching / detaching the account to the main store (profile, cloud
   pull + merge, the feed) is the sync module's job: src/lib/sync/index.ts
   listens to this store.
   ============================================================ */
import { create } from 'zustand';
import { authAvailable, currentProfile, onAuthChange, signIn, signInReason, signInWithProvider, signOut, signUp, type AuthProfile, type AuthReason } from '../lib/auth/api';
import { fmt, getActiveLang } from '../i18n';
import { UI } from '../i18n/ui';

export type AuthStatus = 'loading' | 'guest' | 'authed';

/** the reasons in the reader's language, read at the moment they are shown */
const VOICE = new Proxy({} as Record<AuthReason, string>, { get: (_, k: string) => UI[getActiveLang()].auth.reasons[k as AuthReason] ?? UI[getActiveLang()].auth.reasons.server });

interface AuthStore {
  status: AuthStatus;
  user: AuthProfile | null;
  available: boolean;
  busy: boolean;
  error: string | null;

  init: () => Promise<void>;
  clearError: () => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (input: { name: string; email: string; password: string; inviteCode?: string; handle?: string }) => Promise<boolean>;
  oauth: (provider: 'apple' | 'google') => Promise<boolean>;
  logout: () => Promise<void>;
}

let subscribed = false;

export const useAuth = create<AuthStore>((set, get) => ({
  status: authAvailable() ? 'loading' : 'guest',
  user: null,
  available: authAvailable(),
  busy: false,
  error: null,

  init: async () => {
    if (!authAvailable()) {
      set({ status: 'guest', available: false });
      return;
    }
    if (!subscribed) {
      subscribed = true;
      onAuthChange((profile) => set({ user: profile, status: profile ? 'authed' : 'guest' }));
    }
    try {
      const profile = await currentProfile();
      set({ user: profile, status: profile ? 'authed' : 'guest' });
    } catch {
      set({ status: 'guest' });
    }
  },

  clearError: () => set({ error: null }),

  login: async (email, password) => {
    if (get().busy) return false;
    if (!email.trim() || !password) {
      set({ error: VOICE['bad-input'] });
      return false;
    }
    set({ busy: true, error: null });
    try {
      const user = await signIn(email, password);
      set({ user, status: 'authed', busy: false });
      return true;
    } catch (err) {
      set({ busy: false, error: VOICE[signInReason(err)] });
      return false;
    }
  },

  register: async (input) => {
    if (get().busy) return false;
    if (!input.email.trim() || !input.password) {
      set({ error: VOICE['bad-input'] });
      return false;
    }
    set({ busy: true, error: null });
    const { ok, reason } = await signUp(input);
    if (!ok) {
      set({ busy: false, error: VOICE[reason] ?? VOICE.server });
      return false;
    }
    // the account exists and is confirmed — sign straight in
    try {
      const user = await signIn(input.email, input.password);
      set({ user, status: 'authed', busy: false });
      return true;
    } catch (err) {
      set({ busy: false, error: VOICE[signInReason(err)] });
      return false;
    }
  },

  oauth: async (provider) => {
    if (get().busy) return false;
    set({ busy: true, error: null });
    try {
      await signInWithProvider(provider);
      return true; // the page redirects; onAuthChange picks the session up on return
    } catch {
      set({ busy: false, error: fmt(UI[getActiveLang()].auth.oauthOff, { provider: provider === 'apple' ? 'Apple' : 'Google' }) });
      return false;
    }
  },

  logout: async () => {
    await signOut();
    set({ user: null, status: 'guest', error: null });
  },
}));
