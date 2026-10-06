/* Stepped radar ceilings — early peaks must not hug the outer ring. */
import assert from 'node:assert/strict';
import { radarCeiling, radarFraction, RADAR_CEILINGS } from '../src/lib/pillars/radarScale';

assert.equal(radarCeiling(0), 5);
assert.equal(radarCeiling(1), 5);
assert.equal(radarCeiling(4), 5);
assert.equal(radarCeiling(5), 10); // exact step → next ceiling (headroom)
assert.equal(radarCeiling(9), 10);
assert.equal(radarCeiling(10), 20);
assert.equal(radarCeiling(34), 35);
assert.equal(radarCeiling(35), 50);
assert.equal(radarCeiling(74), 75);
assert.equal(radarCeiling(75), 100);
assert.equal(radarCeiling(99), 100);
assert.equal(radarCeiling(100), 100);

assert.equal(radarFraction(0, 10), 0);
assert.equal(radarFraction(5, 10), 0.5); // wonder=5 on a /10 scale → mid ring
assert.ok(radarFraction(5, 5) < 1.01);
assert.equal(radarFraction(100, 100), 1);

// never past the rim
for (const c of RADAR_CEILINGS) {
  assert.ok(radarFraction(c, c) <= 1);
}

console.log('radar-scale-smoke: ok');
