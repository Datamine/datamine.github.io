import { configuredDialogue } from './dialogue-config.js';
import { PARROT_GREETINGS } from './config/dialogue.js';
import { pose } from './geometry.js';
export const COIT_GROVE = Object.freeze({ west: 66, east: 74, north: 13, south: 18.4 });
export function inCoitGrove(x, z) {
  const b = COIT_GROVE;
  return x > b.west && x < b.east && z > b.north && z < b.south;
}
export function drawParrot(m, npc, time, reduced = false) {
  const bob = reduced ? 0 : Math.sin(time * 0.002 + npc.index) * 0.018;
  pose(m, npc.x, npc.base, npc.z, npc.angle, () => {
    m.rod([-0.28, 0.42, 0], [0.3, 0.42, 0], 0.035, '#8c7150', 10, 'wood');
    m.rod([0, 0, 0], [0, 0.43, 0], 0.05, '#80694b', 10, 'wood');
    m.sphere(0, 0.65 + bob, 0, 0.13, 0.21, 0.12, '#568d4b', 16, 8);
    m.sphere(0.07, 0.86 + bob, 0, 0.115, 0.12, 0.11, '#64934f', 16, 8);
    m.sphere(0.135, 0.89 + bob, 0, 0.085, 0.085, 0.095, '#b65c4d', 12, 7);
    m.sphere(0.2, 0.84 + bob, 0, 0.05, 0.055, 0.04, '#c6b998', 12, 6);
    for (const side of [-1, 1]) {
      m.sphere(-0.035, 0.68 + bob, side * 0.1, 0.13, 0.17, 0.035, '#3b734b', 12, 7);
      m.sphere(0.13, 0.9 + bob, side * 0.087, 0.016, 0.017, 0.008, '#272e2c', 8, 4);
      m.rod([side * 0.045, 0.48, 0], [side * 0.045, 0.4, 0.06], 0.013, '#727a60', 6);
    }
    m.tri([-0.08, 0.58, -0.05], [-0.28, 0.25, 0], [-0.08, 0.58, 0.05], '#3a7c56');
  });
}
export function parrotDialogue(npc) {
  return configuredDialogue(
    'parrot',
    { ...npc, name: 'Wild parrot', shirt: '#5b8b4a', skin: '#b45a49', hair: '#608c50' },
    {},
    { greeting: PARROT_GREETINGS[npc.index % PARROT_GREETINGS.length] },
  );
}
