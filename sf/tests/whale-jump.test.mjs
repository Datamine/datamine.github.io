import test from 'node:test';
import assert from 'node:assert/strict';
import { createWindsurfing, drawWindsurfer } from '../windsurfing.js';
import { createWhales } from '../wildlife.js';
import { Mesh } from '../geometry.js';

test('all humpbacks support a continuous jump that clears their backs and lands across them', () => {
  const whales = createWhales();
  for (let i = 0; i < whales.count; i++)
    for (const time of [0, 30000, 120000]) {
      const surf = createWindsurfing({ scale: 1, isSea: (x) => x < 0 }),
        whale = whales.sample(time, i),
        from = { x: whale.x - 10.5, y: whale.z - 0.5 };
      surf.state.riding = true;
      const takeoff = surf.jumpApproach(from, whale);
      assert.ok(takeoff);
      assert.ok(surf.path(from, takeoff));
      assert.ok(surf.jumpOver(takeoff, whale));
      const jump = surf.state.jump,
        duration = jump.duration;
      surf.updateJump(duration / 2);
      assert.ok(Math.abs(jump.x + 0.5 - whale.x) < 1e-8 && Math.abs(jump.y + 0.5 - whale.z) < 1e-8);
      assert.ok(jump.height > 3);
      let previous = { ...jump };
      while (surf.state.jump) {
        const landed = surf.updateJump(1 / 120);
        assert.ok(
          Math.hypot(jump.x - previous.x, jump.y - previous.y, jump.height - previous.height) <
            0.13,
        );
        assert.ok(surf.water(jump.x + 0.5, jump.y + 0.5));
        previous = { ...jump };
        if (landed) assert.equal(jump.height, 0);
      }
      const dot =
        (takeoff.x + 0.5 - whale.x) * (jump.x + 0.5 - whale.x) +
        (takeoff.y + 0.5 - whale.z) * (jump.y + 0.5 - whale.z);
      assert.ok(dot < 0, 'land on the opposite side of the whale');
      assert.equal(surf.updateJump(1), false);
    }
});

test('jumps require a board, a nearby whale, and a completely clear water crossing', () => {
  const surf = createWindsurfing({ scale: 1 }),
    from = { x: -5, y: -0.5 },
    whale = { x: 0, z: 0, angle: 0 };
  assert.equal(surf.jumpOver(from, whale), false);
  surf.state.riding = true;
  assert.equal(surf.jumpOver({ x: -20, y: -0.5 }, whale), false);
  assert.equal(surf.jumpOver({ x: -1, y: -0.5 }, whale), false);
  const blocked = createWindsurfing({
    scale: 1,
    obstacles: [
      [
        [-1, -0.5],
        [1, -0.5],
        [1, 0.5],
        [-1, 0.5],
      ],
    ],
  });
  blocked.state.riding = true;
  assert.equal(blocked.jumpOver(from, whale), false);
  assert.equal(blocked.jumpApproach(from, whale), null);
  assert.equal(surf.jumpOver(from, { x: NaN, z: 0 }), false);
  assert.equal(surf.state.jump, null);
});

test('a jump cannot be restarted midair, and cancellation clears its animation', () => {
  const surf = createWindsurfing({ scale: 1 }),
    from = { x: -5, y: -0.5 },
    whale = { x: 0, z: 0 };
  surf.state.riding = true;
  assert.ok(surf.jumpOver(from, whale));
  const jump = surf.state.jump;
  surf.updateJump(0.3);
  assert.equal(surf.jumpOver(from, whale), false);
  assert.equal(surf.state.jump, jump);
  assert.ok(jump.height > 0);
  surf.cancelJump();
  assert.equal(surf.state.jump, null);
  assert.equal(surf.updateJump(1), false);
  assert.ok(surf.jumpOver(from, whale));
  assert.equal(surf.updateJump(10), true);
  assert.equal(surf.state.jump, null);
});

test('the airborne board and rider tilt together without changing materials or mesh size', () => {
  const flat = new Mesh(),
    tilted = new Mesh();
  drawWindsurfer(flat, 0, 0, 0, 0, 0, { reduced: true });
  drawWindsurfer(tilted, 0, 0, 0, 0, 0, { reduced: true, pitch: 0.18 });
  assert.equal(tilted.data.length, flat.data.length);
  assert.ok(tilted.data.every(Number.isFinite));
  let changed = 0;
  for (let i = 0; i < flat.data.length; i += 11) {
    assert.ok(
      Math.abs(
        Math.hypot(flat.data[i], flat.data[i + 1]) - Math.hypot(tilted.data[i], tilted.data[i + 1]),
      ) < 1e-8,
    );
    assert.deepEqual(flat.data.slice(i + 6, i + 11), tilted.data.slice(i + 6, i + 11));
    if (Math.abs(flat.data[i + 1] - tilted.data[i + 1]) > 0.01) changed++;
  }
  assert.ok(changed > 500);
});
