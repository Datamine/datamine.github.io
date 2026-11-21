import type { Economy } from './types/controllers.ts';
import type { SignAtlas } from './types/world.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { configuredDialogue } from './dialogue-config.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
import { drawFacadeWindow } from './windows.ts';
import { SECOND_STREET_X, AIRSHIP_TERMINAL, AIRPORT_SPACEPORT } from './airship.ts';
import { drawRocketPad } from './rocket.ts';

export const TAX_HQ = Object.freeze({
  x: SECOND_STREET_X - 10,
  z: 135.1,
  entry: { x: SECOND_STREET_X - 10.5, y: 131.4 },
});
export const SF_SPACEPORT = AIRPORT_SPACEPORT;
export const SPACEPORT_HOUSES = Object.freeze({ x: SECOND_STREET_X - 4.7, z: 133, w: 4.2, d: 3.4 });
export const RAIL_PIT = Object.freeze({
  west: SECOND_STREET_X - 12,
  east: SECOND_STREET_X - 8,
  north: 139,
  south: 143.5,
  floor: 0.12,
});
export function inRailPit(x: number, z: number) {
  return x > RAIL_PIT.west && x < RAIL_PIT.east && z > RAIL_PIT.north && z < RAIL_PIT.south;
}

// Keep the officials' forecourt, headquarters, rail sign, and excavation open.
// Tree planting adds a canopy margin beyond these public grounds.
export const CIVIC_GROUNDS = Object.freeze({
  west: TAX_HQ.x - 3.5,
  east: TAX_HQ.x + 3.5,
  north: TAX_HQ.entry.y - 3,
  south: RAIL_PIT.south + 0.2,
});
export function inCivicGrounds(x: number, z: number, margin = 0) {
  const p = CIVIC_GROUNDS;
  return (
    x >= p.west - margin && x <= p.east + margin && z >= p.north - margin && z <= p.south + margin
  );
}

export function drawPlaque(
  m: Mesh,
  signs: SignAtlas,
  text: string,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  front = true,
) {
  const uv = signs.get(text);
  if (!uv) return;
  const p = [
    [x - w / 2, y, z] satisfies [number, number, number],
    [x + w / 2, y, z] satisfies [number, number, number],
    [x + w / 2, y + h, z] satisfies [number, number, number],
    [x - w / 2, y + h, z] satisfies [number, number, number],
  ];
  const q = front ? p : [p[1], p[0], p[3], p[2]];
  m.quad(q[0], q[1], q[2], q[3], '#ffffff', uv);
}

export function drawSouthernDistrict(
  m: Mesh,
  signs: SignAtlas,
  {
    terrain = null,
    includeRailPit = true,
  }: {
    terrain?: ReturnType<typeof import('./southern-terrain.ts').createSouthernTerrain> | null;
    includeRailPit?: boolean;
  } = {},
) {
  const base = AIRSHIP_TERMINAL.base,
    buildings = [];
  let start = m.data.length;
  const { x, z } = TAX_HQ;
  pose(m, x, base, z, 0, () => {
    m.box(-2.7, 0, -1.7, 5.4, 0.2, 3.4, '#a8a992', 'stone');
    m.box(-2.5, 0.2, -1.5, 5, 2.9, 3, '#bfbea5', 'stone');
    for (const xx of [-1.95, -1.2, 0.7, 1.45] satisfies [number, number, number, number])
      for (const yy of [0.6, 1.8] satisfies [number, number])
        drawFacadeWindow(m, {
          plane: -1.5,
          along: xx,
          y: yy,
          w: 0.46,
          h: 0.75,
          far: true,
          trim: '#d6c577',
          seed: xx + yy,
        });
    m.box(-0.39, 0.2, -1.54, 0.78, 1.65, 0.04, '#49645b', 'wood');
    for (const xx of [-0.85, 0.85] satisfies [number, number]) {
      m.cylinder(xx, 0.22, -1.58, 0.09, 2.65, '#e0c874', 16, 0.075, 'stone');
      m.cylinder(xx, 2.85, -1.58, 0.15, 0.16, '#d3b456', 16);
    }
    m.box(-2.68, 3.1, -1.65, 5.36, 0.18, 3.3, '#d8cd96', 'stone');
    m.box(-2.45, 3.28, -1.4, 4.9, 0.15, 2.8, '#7d8a79', 'roof');
    m.tri(
      [-1.2, 3.3, -1.7] satisfies [number, number, number],
      [0, 4.2, -1.7] satisfies [number, number, number],
      [1.2, 3.3, -1.7] satisfies [number, number, number],
      '#d3bd6a',
      'stone',
    );
    m.sphere(0, 3.6, -1.73, 0.19, 0.19, 0.04, '#e9cb60', 20, 10, { metal: 0.5 });
  });
  drawPlaque(m, signs, 'TAX AUTHORITY', x, base + 2.6, z - 1.65, 3.2, 0.34, false);
  buildings.push({
    id: 'tax-hq',
    label: contentText('southern-district.drawSouthernDistrict.label-1', {}),
    kind: 'tax-hq',
    entry: TAX_HQ.entry,
    start,
    count: m.data.length - start,
    lo: [x - 2.7, base, z - 1.75] satisfies [number, number, number],
    hi: [x + 2.7, base + 4.2, z + 1.7] satisfies [number, number, number],
  });
  const pad = drawRocketPad(m, SF_SPACEPORT, signs);
  buildings.push({
    id: 'sf-spaceport',
    label: contentText('southern-district.drawSouthernDistrict.label-2', {}),
    kind: 'spaceport',
    entry: SF_SPACEPORT.entry,
    ...pad,
  });
  if (includeRailPit) buildings.push(drawRailPit(m, signs, terrain));
  return buildings;
}

/** The excavation closes against the final graded land, after nearby house
 * plots have been cut. The rim vertices are shared with the terrain boundary. */
export function drawRailPit(
  m: Mesh,
  signs: SignAtlas,
  terrain: ReturnType<typeof import('./southern-terrain.ts').createSouthernTerrain> | null = null,
) {
  const start = m.data.length,
    p = RAIL_PIT,
    base = AIRSHIP_TERMINAL.base,
    x = TAX_HQ.x;
  const corners = [
    [p.west, p.north] satisfies [number, number],
    [p.east, p.north] satisfies [number, number],
    [p.east, p.south] satisfies [number, number],
    [p.west, p.south] satisfies [number, number],
  ];
  const ground = (x: number, z: number) => (terrain ? terrain.height(x, z) : base);
  const rim = terrain
    ? terrain.pitRim()
    : corners.map(([x, z]) => [x, base, z] satisfies [number, number, number]);
  m.quad(
    [p.west, p.floor, p.north] satisfies [number, number, number],
    [p.west, p.floor, p.south] satisfies [number, number, number],
    [p.east, p.floor, p.south] satisfies [number, number, number],
    [p.east, p.floor, p.north] satisfies [number, number, number],
    '#9a8668',
    'dirt',
  );
  for (const [i, a] of rim.entries()) {
    const b = rim[(i + 1) % rim.length];
    m.quad(a, [a[0], p.floor, a[2]], [b[0], p.floor, b[2]], b, '#ac9571', 'dirt');
    m.rod([a[0], a[1] + 0.55, a[2]], [b[0], b[1] + 0.55, b[2]], 0.012, '#9a9e89', 6);
  }
  for (let i = 0; i < 4; i++) {
    const a = corners[i],
      b = corners[(i + 1) % 4],
      n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
    for (let j = 0; j < n; j++) {
      const x = a[0] + ((b[0] - a[0]) * j) / n,
        z = a[1] + ((b[1] - a[1]) * j) / n;
      m.cylinder(x, ground(x, z), z, 0.023, 0.7, '#7e8d80', 8);
    }
  }
  const signZ = p.south + 0.22;
  for (const xx of [x - 1.8, x + 1.8] satisfies [number, number])
    m.box(xx, ground(xx, signZ), signZ - 0.04, 0.07, 1.3, 0.08, '#8d7351', 'wood');
  drawPlaque(
    m,
    signs,
    'California high-speed rail',
    x,
    ground(x, signZ) + 0.9,
    signZ,
    4.4,
    0.45,
    true,
  );
  return {
    id: 'rail-pit',
    label: contentText('southern-district.drawRailPit.label-3', {}),
    kind: 'rail-pit',
    navigationAccess: 'observe-only',
    entry: { x: x - 0.5, y: p.north - 1 },
    start,
    count: m.data.length - start,
    lo: [Math.min(p.west, x - 2.2), p.floor, p.north] satisfies [number, number, number],
    hi: [
      Math.max(p.east, x + 2.2),
      Math.max(...rim.map((p) => p[1]), ground(x, signZ)) + 1.5,
      signZ + 0.08,
    ] satisfies [number, number, number],
  };
}

export function taxDialogue(economy: Economy) {
  return configuredDialogue(
    'tax',
    {
      name: contentText('southern-district.taxDialogue.name-4', {}),
      skin: '#b99b75',
      hair: '#342f27',
      shirt: '#d4b85d',
    },
    {
      payTaxes: () => {
        const amount = economy.state.coins,
          result = economy.trade('tax');
        return {
          ...result,
          message: result.ok
            ? 'You pay ' + amount + ' coins in taxes. Thank you for your contribution.'
            : result.message,
        };
      },
    },
  );
}

export function moveTaxAuthorities(
  npcs: import('./types/world.ts').Actor[],
  dt: number,
  time: number,
  paused = false,
) {
  for (const npc of npcs)
    if (npc.kind === 'tax') {
      npc.hold = Math.max(0, (npc.hold || 0) - dt);
      if (paused || npc.hold > 0) continue;
      const t = time * 0.00025 + ((npc.index ?? 0) * Math.PI) / 2,
        old = [npc.x, npc.z];
      npc.x = TAX_HQ.x + Math.sin(t) * 1.9;
      npc.z = 130.5 + Math.cos(t) * 0.7;
      npc.angle = Math.atan2(npc.z - old[1], npc.x - old[0]);
      npc.phase = (typeof npc.phase === 'number' ? npc.phase : 0) + dt * 2;
    }
}
