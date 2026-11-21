import { requiredFixture } from '../../tests/helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../game.mts';
import { createMemoryStore } from '../store.mts';
import { fixtureGeometry, player, command, requiredResult } from './fixtures.mts';
import { SUTRO_SITE } from '../../sutro.ts';

// The real landmark has a general visitor entry 4.85 tiles from the actual
// north-side ladder. A server check against that entry rejected valid climbs.
const ladder = { x: 41.625, y: 59.125 },
  visitor = { x: 44.375, y: 63.125 };
async function setup(t: test.TestContext) {
  const geometry = fixtureGeometry();
  geometry.characterGround = () => 8.130574465327458;
  geometry.objects = [
    {
      x: 40.85,
      y: 60.55,
      w: 2.6,
      d: 2.6,
      base: 9.476183002316182,
      sight: {
        x: 40.85,
        z: 60.55,
        label: 'Sutro Tower',
        kind: 'sutro',
        id: 'sutro',
        entry: visitor,
      },
    },
  ];
  geometry.approaches = {
    sutro: () => ({ ...ladder }),
    bunny: () => null,
    merchant: () => null,
    combat: () => null,
  };
  const game = await createGame({ geometry, store: createMemoryStore(), allowDebug: true });
  t.after(() => game.close());
  const a = await player(game, 510);
  Object.assign(a.p, {
    x: ladder.x + 0.5,
    z: ladder.y + 0.5,
    y: geometry.characterGround(ladder.x + 0.5, ladder.y + 0.5),
  });
  return { game, geometry, a };
}

test('the real ladder approach permits a server-authored climb, summit dance and full descent', async (t) => {
  const { game, geometry, a } = await setup(t),
    start = { x: a.p.x, y: a.p.y, z: a.p.z };
  assert.ok(Math.hypot(ladder.x - visitor.x, ladder.y - visitor.y) > 3);
  await command(game, a.p, 'travel', { kind: 'sutro' });
  assert.equal(requiredResult(a.messages).ok, true);
  const climb = game.movement.state(a.p).sutro;
  for (let i = 0; i < 70; i++) game.tick(0.05);
  assert.equal(climb.state.phase, 'climbing');
  assert.ok(a.p.y > start.y);
  assert.ok(a.p.motion > 0);
  assert.ok(a.p.phase > 0);
  assert.equal(a.p.mode, 'climb');
  await command(game, a.p, 'moveTo', { x: a.p.x + 10, z: a.p.z });
  assert.equal(requiredResult(a.messages).ok, false, 'walking cannot escape the ladder');
  for (let i = 0; i < 80; i++) game.tick(0.05);
  assert.equal(climb.state.phase, 'top');
  assert.equal(
    a.p.y,
    requiredFixture(requiredFixture(geometry.objects)[0].base) + SUTRO_SITE.platformHeight,
  );
  assert.equal(a.p.moving, false);
  await command(game, a.p, 'activity', { mode: 'dance' });
  assert.equal(requiredResult(a.messages).ok, true);
  game.tick(0.05);
  assert.equal(a.p.mode, 'dance');
  const saved = game.movement.savePosition(a.p, { x: 0, y: 0, z: 0 });
  assert.equal(saved.x, start.x);
  assert.equal(saved.y, start.y);
  assert.equal(saved.z, start.z, 'reconnect saves the ground approach');
  await command(game, a.p, 'travel', { kind: 'descend' });
  assert.equal(requiredResult(a.messages).ok, true);
  for (let i = 0; i < 150; i++) game.tick(0.05);
  assert.equal(climb.state.active, false);
  assert.equal(a.p.mode, 'walk');
  assert.equal(a.p.y, start.y);
  assert.equal(a.p.x, start.x);
  assert.equal(a.p.z, start.z);
  await command(game, a.p, 'moveTo', { x: a.p.x + 1, z: a.p.z });
  assert.equal(requiredResult(a.messages).ok, true);
  game.tick(0.5);
  assert.ok(a.p.x > start.x);
});

test('mid-climb reversal returns to the original approach and starting a climb cancels following', async (t) => {
  const { game, a } = await setup(t),
    b = await player(game, 511),
    start = { x: a.p.x, y: a.p.y, z: a.p.z };
  Object.assign(b.p, start);
  await command(game, a.p, 'followPlayer', { id: b.p.id });
  assert.equal(requiredResult(a.messages).ok, true);
  assert.equal(game.following.owns(a.p), true);
  await command(game, a.p, 'travel', { kind: 'sutro' });
  assert.equal(requiredResult(a.messages).ok, true);
  assert.equal(game.following.owns(a.p), false);
  for (let i = 0; i < 70; i++) game.tick(0.05);
  const height = a.p.y;
  await command(game, a.p, 'travel', { kind: 'descend' });
  assert.equal(requiredResult(a.messages).ok, true);
  game.tick(0.05);
  assert.ok(a.p.y < height);
  for (let i = 0; i < 80; i++) game.tick(0.05);
  assert.equal(a.p.y, start.y);
  assert.equal(game.movement.state(a.p).sutro.state.active, false);
});

test('the visitor entry, wrong elevation and blocked ladder routes are rejected without starting a climb', async (t) => {
  const { game, geometry, a } = await setup(t);
  Object.assign(a.p, { x: visitor.x + 0.5, z: visitor.y + 0.5 });
  await command(game, a.p, 'travel', { kind: 'sutro' });
  assert.equal(requiredResult(a.messages).ok, false);
  Object.assign(a.p, { x: ladder.x + 0.5, z: ladder.y + 0.5, y: 30 });
  await command(game, a.p, 'travel', { kind: 'sutro' });
  assert.equal(requiredResult(a.messages).ok, false);
  a.p.y = geometry.characterGround(ladder.x + 0.5, ladder.y + 0.5);
  geometry.canTravel = () => false;
  await command(game, a.p, 'travel', { kind: 'sutro' });
  assert.equal(requiredResult(a.messages).ok, false);
  geometry.canTravel = () => true;
  requiredFixture(geometry.approaches).sutro = () => null;
  await command(game, a.p, 'travel', { kind: 'sutro' });
  assert.equal(requiredResult(a.messages).ok, false);
  assert.equal(game.movement.state(a.p).sutro.state.active, false);
  await command(game, a.p, 'travel', { kind: 'descend' });
  assert.equal(requiredResult(a.messages).ok, false);
});
