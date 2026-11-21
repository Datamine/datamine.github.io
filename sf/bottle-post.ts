import type { Actor } from './types/world.ts';
import { requiredValue } from './types/assert.ts';
interface BottleTerrain {
  height: (x: number, z: number) => number;
}
import { drawHumanNPC } from './human-npc.ts';
import { pose, Mesh } from './geometry.ts';
import { BOTTLE_STREAM, inStreamCulvert, TWITTER_HQ } from './social-layout.ts';
import { westernCoastX } from './coastline.ts';
import { sampleCharacterPose, CHARACTER_BONES } from './characters.ts';

export const BOTTLE_POST_EXAMINE = 'I never thought about how the technology worked.';
const bottleCache = new Map<string, Mesh>();
export function drawPostBottle(
  m: Mesh,
  x: number,
  y: number,
  z: number,
  { lying = false, angle = 0, scale = 1 } = {},
) {
  const key = lying ? 'floating' : 'upright';
  if (!bottleCache.has(key)) {
    const b = new Mesh();
    if (lying) {
      b.rod(
        [-0.08, 0, 0] satisfies [number, number, number],
        [0.065, 0, 0] satisfies [number, number, number],
        0.051,
        '#8fb1a9',
        12,
      );
      b.sphere(0.068, 0, 0, 0.055, 0.046, 0.046, '#a2beb1', 12, 6);
      b.rod(
        [0.085, 0, 0] satisfies [number, number, number],
        [0.15, 0, 0] satisfies [number, number, number],
        0.023,
        '#8eaba2',
        10,
      );
      b.rod(
        [0.15, 0, 0] satisfies [number, number, number],
        [0.17, 0, 0] satisfies [number, number, number],
        0.026,
        '#b59870',
        10,
      );
      b.box(-0.055, 0.028, -0.031, 0.1, 0.014, 0.062, '#e7dfc4');
    } else {
      b.cylinder(0, 0, 0, 0.051, 0.15, '#8fb1a9', 12, 0.051);
      b.sphere(0, 0.15, 0, 0.051, 0.04, 0.051, '#a1bcb1', 12, 6);
      b.cylinder(0, 0.17, 0, 0.023, 0.065, '#8eaba2', 10, 0.023);
      b.cylinder(0, 0.235, 0, 0.026, 0.023, '#b59870', 10, 0.026);
      b.box(-0.033, 0.035, 0.042, 0.066, 0.085, 0.012, '#e7dfc4');
    }
    bottleCache.set(key, b);
  }
  pose(m, x, y, z, angle, () => {
    const data = bottleCache.get(key)!.data;
    for (let i = 0; i < data.length; i += 11)
      m.data.push(
        data[i] * scale,
        data[i + 1] * scale,
        data[i + 2] * scale,
        ...data.slice(i + 3, i + 11),
      );
  });
}
export function drawEnvelope(m: Mesh, x: number, y: number, z: number, angle = 0) {
  pose(m, x, y, z, angle, () => {
    m.box(-0.085, 0, -0.057, 0.17, 0.009, 0.114, '#e3ddc8');
    for (const side of [-1, 1] satisfies [number, number])
      m.rod(
        [side * 0.08, 0.011, -0.05] satisfies [number, number, number],
        [0, 0.011, 0.02] satisfies [number, number, number],
        0.0035,
        '#b5ae98',
        3,
      );
  });
}
export function streamSample(fraction: number) {
  const pts = BOTTLE_STREAM.points,
    lengths = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])),
    total = lengths.reduce((a, b) => a + b, 0);
  let distance = Math.max(0, Math.min(1, fraction)) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i] || i === lengths.length - 1) {
      const a = pts[i],
        b = pts[i + 1],
        t = distance / lengths[i];
      return {
        x: a[0] + (b[0] - a[0]) * t,
        z: a[1] + (b[1] - a[1]) * t,
        angle: Math.atan2(b[1] - a[1], b[0] - a[0]),
      };
    }
    distance -= lengths[i];
  }
  throw new Error('Bottle stream must contain at least one segment.');
}
/** Terrain triangles own the channel surface. Banks and culvert mouths here
 * add relief, while the road's paving remains the authoritative crossing. */
export function drawRunoffBanks(m: Mesh, terrain: BottleTerrain) {
  for (let i = 0; i <= 58; i++) {
    const p = streamSample(i / 58);
    if (p.x < westernCoastX(p.z) + 0.15 || inStreamCulvert(p.x, p.z)) continue;
    const nx = -Math.sin(p.angle),
      nz = Math.cos(p.angle);
    for (const side of [-1, 1] satisfies [number, number]) {
      const x = p.x + nx * 0.28 * side,
        z = p.z + nz * 0.28 * side,
        y = terrain.height(x, z);
      m.sphere(x, y + 0.025, z, 0.1, 0.06, 0.09, i % 3 ? '#9caa99' : '#acb39f', 8, 4, 'stone');
    }
  }
  // Pipe collars are visible at the two edges of Ocean Esplanade. No solid
  // post, bank or water collision is placed on the actual crossing tiles.
  for (const [x, out] of [
    [13.68, -1] satisfies [number, number],
    [15.32, 1] satisfies [number, number],
  ]) {
    const z = 114.05,
      y = terrain.height(x, z);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 12,
        b = ((i + 1) * Math.PI) / 12,
        r = 0.26,
        R = 0.31;
      const at = (t: number, rr: number) => [
        x + out * 0.01,
        y + Math.sin(t) * rr,
        z + Math.cos(t) * rr,
      ];
      m.quad(at(a, r), at(b, r), at(b, R), at(a, R), '#b1b5a1', 'concrete');
    }
  }
}
export function drawBottlePostAnimation(
  m: Mesh,
  time: number,
  terrain: BottleTerrain,
  npcs: readonly Actor[],
  {
    reduced = false,
    addTarget = () => {},
  }: { reduced?: boolean; addTarget?: (start: number, npc: Actor) => void } = {},
) {
  const t = reduced ? 0 : time * 0.001,
    room = TWITTER_HQ;
  const worker = npcs.find((n) => n.kind === 'twitter-worker'),
    poster = npcs.find((n) => n.kind === 'twitter-poster');
  if (worker) {
    const start = m.data.length,
      phase = (t * 0.25) % 1;
    drawHumanNPC(m, worker, time, {
      x: worker.x,
      z: worker.z,
      base: worker.base,
      angle: worker.angle,
      phase: 0,
      seated: false,
      skin: worker.skin,
      shirt: worker.shirt,
      appearance: { backpack: false, action: 'bottle-post', actionT: phase, time: t },
      reduced: reduced,
    });
    addTarget(start, worker);
    const poseData = sampleCharacterPose('idle', 0, {
        action: 'bottle-post',
        actionT: phase,
        time: t,
      }),
      hand = CHARACTER_BONES.rightHand,
      k = hand * 3,
      px = poseData.joints[k],
      py = poseData.joints[k + 1],
      pz = poseData.joints[k + 2],
      a = requiredValue(worker.angle, 'Bottle worker angle');
    if (phase < 0.58)
      drawEnvelope(
        m,
        worker.x + px * Math.sin(a) + pz * Math.cos(a),
        requiredValue(worker.base, 'Bottle worker base') + py,
        worker.z - px * Math.cos(a) + pz * Math.sin(a),
        a,
      );
    else
      drawPostBottle(
        m,
        worker.x + px * Math.sin(a) + pz * Math.cos(a),
        requiredValue(worker.base, 'Bottle worker base') + py - 0.1,
        worker.z - px * Math.cos(a) + pz * Math.sin(a),
        { scale: 0.8 },
      );
  }
  if (poster) {
    const start = m.data.length;
    drawHumanNPC(m, poster, time, {
      x: poster.x,
      z: poster.z,
      base: poster.base,
      angle: poster.angle,
      phase: 0,
      seated: true,
      skin: poster.skin,
      shirt: poster.shirt,
      appearance: { mode: 'sit', phone: true, backpack: false, time: t },
      reduced: reduced,
    });
    addTarget(start, poster);
  }
  pose(m, room.x, room.base + 0.015, room.z, 0, () => {
    for (let i = 0; i < 4; i++) {
      const f = (t * 0.22 + i * 0.25) % 1;
      drawEnvelope(m, 1.65 - f * 1.2, 0.813, -1.27);
    }
    for (let i = 0; i < 3; i++) {
      const f = (t * 0.18 + i / 3) % 1;
      drawPostBottle(m, 0.12 - f * 2.42, 0.813, -0.75);
    }
    for (let i = 0; i < 14; i++) {
      const x = -2.3 + ((i * 0.18 + t * 0.3) % 2.5);
      m.box(x, 0.805, -1.015, 0.012, 0.008, 0.53, '#8b9994');
    }
  });
  for (let i = 0; i < 4; i++) {
    const p = streamSample((t * 0.045 + i * 0.25) % 1);
    if (p.x < westernCoastX(p.z) + 0.02 || inStreamCulvert(p.x, p.z)) continue;
    drawPostBottle(m, p.x, terrain.height(p.x, p.z) + 0.045, p.z, {
      lying: true,
      angle: p.angle,
      scale: 0.85,
    });
  }
}
