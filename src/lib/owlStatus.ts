import type { OwlEngine } from '../store/types';

export type OwlDelivery = 'none' | 'live' | 'fallback' | 'auth-required';
export type OwlStatus =
  | 'checking'
  | 'live'
  | 'offline'
  | 'classic'
  | 'sign-in'
  | 'ink-dry'
  | 'fallback';

export interface OwlStatusInput {
  liveAvailable: boolean;
  engine: OwlEngine;
  authReady: boolean;
  authed: boolean;
  ink: number;
  lastDelivery: OwlDelivery;
}

/** One shared truth for Settings, Ask, and the per-turn routing gate. */
export function resolveOwlStatus(input: OwlStatusInput): OwlStatus {
  if (!input.liveAvailable) return 'offline';
  if (input.engine === 'mockup') return 'classic';
  if (!input.authReady) return 'checking';
  if (!input.authed) return 'sign-in';
  if (input.lastDelivery === 'auth-required') return 'sign-in';
  if (input.ink < 1) return 'ink-dry';
  if (input.lastDelivery === 'fallback') return 'fallback';
  return 'live';
}

export function canAttemptLive(input: OwlStatusInput): boolean {
  const status = resolveOwlStatus({ ...input, lastDelivery: 'none' });
  return status === 'live';
}
