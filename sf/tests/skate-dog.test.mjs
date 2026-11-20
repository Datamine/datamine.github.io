import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh } from '../geometry.js';
import { createSkateDog } from '../skate-dog.js';

const route = [
  { x: -1.2, z: 0 },
  { x: 1.2, z: 0 },
];
test('the dog greets a passerby once, and greets again after they leave and return', () => {
  const greetings = [],
    dog = createSkateDog(route, { onWoof: () => greetings.push('Woof!') });
  dog.update(0.1, 100, { x: 20, z: 20 });
  assert.equal(greetings.length, 0);
  dog.update(0.1, 200, { x: 0, z: 2 });
  assert.equal(greetings.length, 1);
  assert.ok(dog.state.speechUntil > 200);
  for (let i = 0; i < 200; i++) dog.update(0.1, 300 + i * 100, { x: 0, z: 2 });
  assert.equal(greetings.length, 1, 'rolling back past a stationary visitor must not bark again');
  dog.update(0.1, 21000, { x: 10, z: 10 });
  dog.update(0.1, 22000, { x: 0, z: 2 });
  assert.equal(greetings.length, 2);
});
test('menus and airborne visitors do not trigger a greeting, and rapid reentry is quiet', () => {
  const dog = createSkateDog(route);
  dog.update(1, 100, { x: 0, z: 1 }, { paused: true });
  assert.equal(dog.state.woofs, 0);
  assert.equal(dog.state.travel, 0);
  dog.update(0.1, 200, { x: 0, z: 1 }, { canGreet: false });
  assert.equal(dog.state.woofs, 0);
  dog.update(0.1, 300, { x: 0, z: 1 });
  dog.update(0.1, 400, { x: 10, z: 10 });
  dog.update(0.1, 500, { x: 0, z: 1 });
  assert.equal(dog.state.woofs, 1);
  dog.update(0.1, 6400, { x: 0, z: 1 });
  assert.equal(dog.state.woofs, 2);
});
test('patrol stays on the prevalidated route through repeated turns and uneven frame durations', () => {
  const dog = createSkateDog(route);
  for (let i = 0; i < 500; i++) {
    const before = { ...dog.state },
      dt = i % 3 === 0 ? 0.075 : 1 / 60;
    dog.update(dt, i * 100, { x: 20, z: 20 });
    assert.ok(dog.state.x >= -1.2 - 1e-7 && dog.state.x <= 1.2 + 1e-7);
    assert.equal(dog.state.z, 0);
    assert.ok(Math.hypot(dog.state.x - before.x, dog.state.z - before.z) < 0.08);
    assert.ok(Number.isFinite(dog.state.angle));
  }
  assert.ok(dog.state.travel > 10);
  assert.throws(
    () =>
      createSkateDog([
        { x: 0, z: 0 },
        { x: 0, z: 0 },
      ]),
    /nonzero route/,
  );
});
test('dog, kicking paw, skateboard and speech reaction keep finite inexpensive geometry on slopes', () => {
  const dog = createSkateDog(route);
  for (const reduced of [false, true])
    for (const t of [50, 150, 275, 550, 1200, 2800]) {
      dog.update(0.1, t, { x: 0, z: 2 });
      dog.state.elapsed = t / 1000;
      const mesh = new Mesh();
      dog.draw(mesh, t, (x, z) => 1.5 + x * 0.15 + z * 0.07, { reduced });
      assert.ok(mesh.data.every(Number.isFinite));
      assert.ok(mesh.data.length / 33 < 6000);
    }
});
