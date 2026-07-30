import { strict as assert } from 'node:assert';
import { canAttemptLive, resolveOwlStatus, type OwlStatusInput } from '../src/lib/owlStatus';

const ready: OwlStatusInput = {
  liveAvailable: true,
  engine: 'live',
  authReady: true,
  authed: true,
  ink: 10,
  lastDelivery: 'none',
};

const cases: Array<[string, Partial<OwlStatusInput>, ReturnType<typeof resolveOwlStatus>]> = [
  ['ready account', {}, 'live'],
  ['successful last turn', { lastDelivery: 'live' }, 'live'],
  ['backend unavailable wins', { liveAvailable: false, lastDelivery: 'fallback' }, 'offline'],
  ['classic selection wins', { engine: 'mockup', authed: false }, 'classic'],
  ['auth still loading', { authReady: false, authed: false }, 'checking'],
  ['signed out', { authed: false }, 'sign-in'],
  ['expired live session', { lastDelivery: 'auth-required' }, 'sign-in'],
  ['ink dry', { ink: 0 }, 'ink-dry'],
  ['last live request fell back', { lastDelivery: 'fallback' }, 'fallback'],
];

for (const [label, patch, expected] of cases) {
  const input = { ...ready, ...patch };
  assert.equal(resolveOwlStatus(input), expected, label);
}

assert.equal(canAttemptLive(ready), true, 'ready account can call Live Scout');
assert.equal(canAttemptLive({ ...ready, authed: false }), false, 'guest cannot call the JWT-only desk');
assert.equal(canAttemptLive({ ...ready, ink: 0 }), false, 'dry ink uses the offline guide');
assert.equal(
  canAttemptLive({ ...ready, lastDelivery: 'fallback' }),
  true,
  'a temporary fallback retries Live Scout on the next turn',
);

console.log(`owl status smoke: ${cases.length + 4} passed`);
