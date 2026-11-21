import { requiredFixture } from '../../tests/helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createComponentTracker } from '../player-components.mts';
import { fixture, player, command } from './fixtures.mts';

test('components retain versions and immutable snapshots until their fields change', () => {
  const tracker = createComponentTracker(),
    state = { x: 1, positions: [{ z: 2 }] };
  let captures = 0;
  const a = tracker.publish('actor', [state.x], () => {
    captures++;
    return state;
  });
  state.positions[0].z = 99;
  const same = tracker.publish('actor', [state.x], () => state);
  assert.equal(a, same);
  assert.equal(a.value.positions[0].z, 2);
  assert.equal(captures, 1);
  state.x = 2;
  const b = tracker.publish('actor', [state.x], () => state);
  assert.ok(b.version > a.version);
  assert.equal(b.value.positions[0].z, 99);
});

test('stationary components remain stable while ordered actions and pursuits invalidate their own snapshots', async () => {
  const { game, advance } = await fixture(),
    a = await player(game, 49001);
  try {
    const before = game.personal.components(a.p),
      police = before.get('police'),
      vehicle = before.get('vehicle');
    advance(200);
    game.tick(0.2);
    const same = game.personal.components(a.p);
    assert.equal(same.get('police'), police);
    assert.equal(same.get('vehicle'), vehicle);
    game.personal.runtime(a.p).police.start();
    advance(200);
    game.tick(0.2);
    const next = game.personal.components(a.p);
    assert.ok(requiredFixture(next.get('police')).version > requiredFixture(police).version);
    assert.equal(next.get('vehicle'), vehicle);
    assert.equal(
      (requiredFixture(police).value as { wanted: boolean }).wanted,
      false,
      'older samples remain detached',
    );
    const revision = a.p.presentationRevision || 0;
    await command(game, a.p, 'stopAttack');
    assert.ok(requiredFixture(a.p.presentationRevision) > revision);
  } finally {
    await game.close();
  }
});
