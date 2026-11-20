import test from 'node:test';
import assert from 'node:assert/strict';
import { cutawayWallMask } from '../geometry.js';

test('a quarter-turned building removes the camera-facing walls', () => {
  const building = { x: -2, y: -3, w: 4, d: 6, rotation: Math.PI / 2 };
  assert.equal(cutawayWallMask(building, [20, 10, 20]), 0b1001);
  assert.equal(cutawayWallMask(building, [-20, 10, -20]), 0b0110);
});

test('cardinal camera views hide one wall, and a directly overhead eye hides none', () => {
  const building = { x: 10, y: 20, w: 4, d: 6 };
  for (const [eye, mask] of [
    [[12, 10, 3], 1],
    [[12, 10, 43], 2],
    [[-8, 10, 23], 4],
    [[32, 10, 23], 8],
    [[12, 30, 23], 0],
  ]) {
    assert.equal(cutawayWallMask(building, eye), mask);
  }
});

test('rotated cutaways always hide the nearer wall in each opposite pair', () => {
  // Compare actual world-space distances, independently of the visibility rule.
  for (const rotation of [
    -Math.PI,
    (-3 * Math.PI) / 4,
    -Math.PI / 2,
    -Math.PI / 4,
    0,
    Math.PI / 4,
    Math.PI / 2,
    (3 * Math.PI) / 4,
  ]) {
    for (const [w, d] of [
      [3, 3],
      [3, 5],
      [4, 2],
    ])
      for (const [offsetX, offsetZ] of [
        [0, 0],
        [1.1, -0.7],
      ])
        for (let i = 0; i < 32; i++) {
          const building = { x: 47.25, y: 28.75, w, d, rotation },
            cx = building.x + w / 2,
            cz = building.y + d / 2;
          const yaw = (i * Math.PI) / 16,
            eye = [cx + offsetX + Math.sin(yaw) * 20, 14, cz + offsetZ + Math.cos(yaw) * 20];
          const c = Math.cos(rotation),
            s = Math.sin(rotation),
            midpoints = [
              [0, -d / 2],
              [0, d / 2],
              [-w / 2, 0],
              [w / 2, 0],
            ].map(([x, z]) => [cx + x * c - z * s, cz + x * s + z * c]);
          const distances = midpoints.map((p) => (p[0] - eye[0]) ** 2 + (p[1] - eye[2]) ** 2),
            mask = cutawayWallMask(building, eye);
          for (let side = 0; side < 4; side++) {
            const difference = distances[side ^ 1] - distances[side];
            if (Math.abs(difference) > 1e-6)
              assert.equal(
                !!(mask & (1 << side)),
                difference > 0,
                `rotation=${rotation}, yaw=${yaw}, side=${side}`,
              );
          }
        }
  }
});
