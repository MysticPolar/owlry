/* ============================================================
   owlry — auth store (separate from the game loop).

   Kept out of useStore so a session never lands in the IndexedDB
   game-state blob and vice-versa. Optional by design: with no
   backend, status settles on 'guest' and the app runs local-first,
   exactly as it always has. All guests share the one local demo
   profile ("Mira"); signing in swaps in a real account.
   ============================================================ */
import { create } from 'zustand';
import {
  authAvailable,
  currentProfile,
  onAuthChange,
  signIn,
  signUp,
  type AuthProfile,
  type SignupReason,
} from '../lib/auth/api';
import { getActiveLang } from '../i18n';
import { useStore } from './useStore';

export type AuthStatus = 'loading' | 'guest' | 'authed';
export type AuthMode = 'login' | 'signup';

/** map raw sign-in errors + function reasons to the owl's voice (lowercase, kind) */
const SIGNUP_VOICES: Record<'en' | 'zh', Record<SignupReason, string>> = {
  en: {
    ok: '',
    'bad-input': 'fill in the code, an email, and a password.',
    'bad-email': "that doesn't look like an email.",
    'weak-password': 'the password needs at least 8 characters.',
    'bad-code': "keeper here — that code isn't in the ledger.",
    'email-taken': "that email's already in the book — try logging in.",
    server: 'the ledger is quiet for a moment. try again soon.',
    'no-backend': 'accounts need a backend — you can still come in as a guest.',
  },
  zh: {
    ok: '',
    'bad-input': '请把邀请码、邮箱和密码都填上。',
    'bad-email': '这个看起来不太像邮箱地址。',
    'weak-password': '密码至少需要 8 个字符。',
    'bad-code': 'Keeper 说 — 台账里没有这个邀请码。',
    'email-taken': '这个邮箱已经登记在册了 — 试试直接登录。',
    server: '台账暂时没有回应。稍后再试试。',
    'no-backend': '账户需要先配置后端 — 你仍然可以以游客身份进来。',
  },
};
const SIGNUP_VOICE = () => SIGNUP_VOICES[getActiveLang()];

function signInVoice(err: unknown): string {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  const zh = getActiveLang() === 'zh';
  if (msg === 'no-backend') return SIGNUP_VOICE()['no-backend'];
  if (msg.includes('invalid') || msg.includes('credentials'))
    return zh ? '这对邮箱和密码在台账里对不上。再试一次？' : "that email and password don't match the ledger. try again?";
  if (msg.includes('confirm')) return zh ? '这个账户还需要确认 — 去邮箱里看看。' : 'this account still needs confirming — check your email.';
  return zh ? '前台这会儿没能让你登录。再试一次？' : 'the desk couldn’t sign you in just now. try again?';
}

interface AuthStore {
  status: AuthStatus;
  user: AuthProfile | null;
  available: boolean;
  authOpen: boolean;
  mode: AuthMode;
  busy: boolean;
  error: string | null;

  init: () => Promise<void>;
  openAuth: (mode?: AuthMode) => void;
  closeAuth: () => void;
  setMode: (mode: AuthMode) => void;
  clearError: () => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (code: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;
}

let subscribed = false;

export const useAuth = create<AuthStore>((set, get) => ({
  status: 'loading',
  user: null,
  available: authAvailable(),
  authOpen: false,
  mode: 'login',
  busy: false,
  error: null,

  init: async () => {
    if (!authAvailable()) {
      set({ status: 'guest', available: false });
      return;
    }
    // keep in sync with logins/logouts in other tabs + token refreshes
    if (!subscribed) {
      subscribed = true;
      onAuthChange((profile) => {
        set({ user: profile, status: profile ? 'authed' : 'guest' });
      });
    }
    try {
      const profile = await currentProfile();
      set({ user: profile, status: profile ? 'authed' : 'guest' });
    } catch {
      set({ status: 'guest' });
    }
  },

  openAuth: (mode) => set({ authOpen: true, error: null, ...(mode ? { mode } : {}) }),
  closeAuth: () => set({ authOpen: false, busy: false, error: null }),
  setMode: (mode) => set({ mode, error: null }),
  clearError: () => set({ error: null }),

  login: async (email, password) => {
    if (get().busy) return false;
    if (!email.trim() || !password) {
      set({ error: 'enter your email and password.' });
      return false;
    }
    set({ busy: true, error: null });
    try {
      const user = await signIn(email, password);
      set({ user, status: 'authed', busy: false, authOpen: false });
      return true;
    } catch (err) {
      set({ busy: false, error: signInVoice(err) });
      return false;
    }
  },

  register: async (code, email, password) => {
    if (get().busy) return false;
    set({ busy: true, error: null });
    const { ok, reason } = await signUp(code, email, password);
    if (!ok) {
      set({ busy: false, error: SIGNUP_VOICE()[reason] ?? SIGNUP_VOICE().server });
      return false;
    }
    // account created — sign straight in with the same credentials
    try {
      const user = await signIn(email, password);
      set({ user, status: 'authed', busy: false, authOpen: false });
      return true;
    } catch (err) {
      // the account exists; just surface the login hiccup
      set({ busy: false, mode: 'login', error: signInVoice(err) });
      return false;
    }
  },

  logout: async () => {
    await useStore.getState().signOut();
    set({ user: null, status: 'guest' });
  },

  continueAsGuest: () => set({ authOpen: false, error: null }),
}));
