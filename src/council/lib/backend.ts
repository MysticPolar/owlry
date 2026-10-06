/* ============================================================
   Boot the backend seams. Called once from main.tsx; every piece is a
   no-op until VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set.
   ============================================================ */
import { useAuth } from '../store/useAuth';
import { startSync } from './sync';

export function bootBackend(): void {
  startSync();
  void useAuth.getState().init();
}
