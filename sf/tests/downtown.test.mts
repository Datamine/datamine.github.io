import test from 'node:test';
import assert from 'node:assert/strict';
import { DOWNTOWN, marketSide } from '../downtown.ts';
import { marinElevation } from '../geography.ts';
import { routePhase } from '../life.ts';

test('Ferry entrance is the continuation of Market, with Salesforce on its south side', () => {
  const [end, west] = DOWNTOWN.market,
    entrance = DOWNTOWN.ferry.entrance,
    a = [end[0] - west[0], end[1] - west[1]] satisfies [number, number],
    b = [entrance[0] - end[0], entrance[1] - end[1]] satisfies [number, number];
  assert.ok(Math.abs(a[0] * b[1] - a[1] * b[0]) < 1e-8);
  assert.ok(a[0] * b[0] + a[1] * b[1] > 0);
  assert.ok(marketSide(...DOWNTOWN.salesforce.center) > 3);
  assert.ok(marketSide(...DOWNTOWN.salesforce.center) > DOWNTOWN.salesforce.width / 1.5);
});

test('the bridge begins at the exact end of its connecting city street', () => {
  assert.deepEqual(DOWNTOWN.firstStreet.at(-1), DOWNTOWN.bridge.rampStart);
  assert.ok(Math.abs(marketSide(...DOWNTOWN.firstStreet[0])) < 1e-8);
  assert.ok(DOWNTOWN.bridge.end[0] > DOWNTOWN.bridge.abutment[0]);
});

test('Marin has distinct valleys and a low bridge landing', () => {
  assert.ok(marinElevation(14, -4.6) > 7);
  assert.ok(marinElevation(22, -3.4) > 6);
  assert.ok(marinElevation(14, -4.6) > marinElevation(7.2, -6.5) + 1);
  assert.ok(marinElevation(18.8, 1) < 1.8);
  assert.ok(marinElevation(6.9, -6.5) < 1.04);
  assert.ok(marinElevation(14.2, 1.9) < marinElevation(14.2, -0.2));
  assert.ok(marinElevation(15, -32) > 5);
  for (let x = -8; x < 46; x += 0.5)
    for (let z = -22; z < 3; z += 0.5)
      assert.ok(Number.isFinite(marinElevation(x, z)) && marinElevation(x, z) < 10);
});

test('background walkers stop at route ends and return without a position jump', () => {
  const length = 6,
    speed = 1,
    pause = 1.5,
    cycle = (length / speed) * 2 + pause * 2;
  assert.equal(routePhase(6.5, length, speed, 0, pause).fraction, 1);
  assert.equal(routePhase(6.5, length, speed, 0, pause).moving, false);
  for (let t = 0; t < cycle * 2; t += 0.01) {
    const a = routePhase(t, length, speed, 0, pause),
      b = routePhase(t + 0.01, length, speed, 0, pause);
    assert.ok(a.fraction >= 0 && a.fraction <= 1);
    assert.ok(Math.abs(a.fraction - b.fraction) < 0.002);
  }
});
