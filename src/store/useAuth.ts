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

export type AuthStatus = 'loading' | 'guest' | 'authed';

const VOICE: Record<AuthReason, string> = {
  ok: '',
  'bad-input': 'Fill in an email and a password.',
  'bad-email': 'That doesn’t look like an email address.',
  'weak-password': 'The password needs at least 8 characters.',
  'bad-code': 'That invite code isn’t in the ledger — the Council is in a closed beta.',
  'email-taken': 'That email already has an account — try signing in.',
  'bad-credentials': 'That email and password don’t match. Try again?',
  unconfirmed: 'This account still needs confirming — check your email.',
  'rate-limited': 'Too many attempts for now. Give it an hour.',
  server: 'The desk is quiet for a moment. Try again soon.',
  'no-backend': 'Accounts need a backend — you can still explore as a guest.',
};

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
      set({ busy: false, error: `${provider === 'apple' ? 'Apple' : 'Google'} sign-in isn’t switched on for this project yet. Use your email for now.` });
      return false;
    }
  },

  logout: async () => {
    await signOut();
    set({ user: null, status: 'guest', error: null });
  },
}));
