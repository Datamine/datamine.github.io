import { configuredDialogue } from './dialogue-config.js';
import { RAIL_PIT } from './southern-district.js';
import { AIRSHIP_TERMINAL } from './airship.js';
import { pose } from './geometry.js';
export const RAIL_WORKER = Object.freeze({
  id: 'rail-lunch-worker',
  kind: 'rail-worker',
  label: 'Rail worker',
  name: 'Gus, excavation specialist',
  x: RAIL_PIT.east + 1,
  z: RAIL_PIT.north + 1,
  base: AIRSHIP_TERMINAL.base + 0.04,
  skin: '#aa7d5b',
  shirt: '#d58c36',
  hair: '#726451',
  cap: true,
  seated: true,
  regional: true,
  angle: Math.PI / 2,
  height: 1.75,
  approach: { x: RAIL_PIT.east + 0.5, y: RAIL_PIT.north + 2 },
  description:
    'An excavator operator protecting a sandwich of considerable historical significance.',
});
export function railWorkerDialogue() {
  return configuredDialogue('rail-worker', RAIL_WORKER);
}

export function drawRailWorks(m, ground) {
  const p = RAIL_PIT,
    x = p.west + 1.1,
    z = p.north + 1.7;
  drawExcavator(m, { x, y: p.floor + 0.07, z, angle: -0.35 });
  // The lunch bench and open sandwich tin sit safely beyond the pit fence.
  const n = RAIL_WORKER,
    h = ground(n.x, n.z);
  for (const dx of [-0.37, 0.37]) m.box(n.x + dx, h, n.z - 0.17, 0.06, 0.48, 0.34, '#69766c');
  m.box(n.x - 0.49, h + 0.47, n.z - 0.23, 0.98, 0.08, 0.46, '#ac8a5a', 'wood');
  m.box(n.x + 0.42, h + 0.55, n.z + 0.13, 0.25, 0.06, 0.23, '#a2aba3', { metal: 0.2 });
  m.box(n.x + 0.45, h + 0.62, n.z + 0.15, 0.18, 0.04, 0.18, '#e2c98e');
}

/** Shared tracked excavator, used by both construction sites. */
export function drawExcavator(m, { x, y, z, angle = 0 }) {
  pose(m, x, y, z, angle, () => {
    // Tracked undercarriage, rotating cab, articulated boom, and open bucket.
    for (const side of [-1, 1]) {
      m.box(side * 0.39 - 0.12, 0, -0.53, 0.24, 0.21, 1.02, '#3e4844', { metal: 0.2 });
      for (let j = 0; j < 7; j++)
        m.box(side * 0.39 - 0.13, 0.025, -0.52 + j * 0.145, 0.26, 0.035, 0.08, '#69736b');
      for (const zz of [-0.35, 0.32]) m.cylinder(side * 0.39, 0.04, zz, 0.1, 0.16, '#7b8171', 12);
    }
    m.cylinder(0, 0.21, 0, 0.26, 0.1, '#6b7161', 20);
    m.box(-0.43, 0.31, -0.41, 0.86, 0.32, 0.78, '#dbac3e', { metal: 0.2 });
    m.box(-0.35, 0.63, -0.39, 0.45, 0.66, 0.52, '#e2b748');
    m.box(-0.3, 0.75, -0.415, 0.36, 0.43, 0.02, '#6f9c9c', 'glass');
    m.box(-0.37, 1.29, -0.42, 0.5, 0.06, 0.59, '#e2bc5c');
    m.box(0.14, 0.62, -0.35, 0.23, 0.1, 0.51, '#b19743');
    m.rod([0.17, 0.62, 0.12], [0.24, 1.54, 0.7], 0.085, '#e1b243', 12, { metal: 0.2 });
    m.rod([0.24, 1.54, 0.7], [0.24, 0.81, 1.26], 0.067, '#cba33e', 12, { metal: 0.2 });
    m.rod([0.24, 0.78, 0.24], [0.24, 1.43, 0.67], 0.027, '#bdc6bd', 10, { metal: 0.5 });
    m.rod([0.24, 1.34, 0.81], [0.24, 0.9, 1.2], 0.023, '#c0c6bb', 10, { metal: 0.5 });
    m.box(0.02, 0.58, 1.17, 0.46, 0.22, 0.39, '#60665a', { metal: 0.3 });
    for (let j = 0; j < 4; j++) m.box(0.04 + j * 0.12, 0.53, 1.43, 0.045, 0.08, 0.16, '#8f927b');
  });
}
