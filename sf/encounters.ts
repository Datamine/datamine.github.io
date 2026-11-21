import { isFiniteNumber } from './types/json.ts';
import type { RouteTo, NearestPoint } from './types/controllers.ts';
import type { Point } from './types/geometry.ts';
import type { Mesh } from './geometry.ts';
import { marinElevation } from './geography.ts';
interface PoliceOfficer extends Point {
  path: Point[];
  angle: number;
  phase: number;
  repath: number;
  index: number;
}

/** Constant-speed pursuit consumes distance across waypoint boundaries.
 * Replanning never discards the current route when a new route is unavailable. */
export function createPoliceChase({
  player,
  routeTo,
  nearest,
  canCapture,
  onArrest,
}: {
  player: Point & { angle: number };
  routeTo: RouteTo;
  nearest: NearestPoint;
  canCapture: (officer: Point, player: Point) => boolean;
  onArrest: () => void;
}) {
  const state = { wanted: false, jailed: false, officers: [] as PoliceOfficer[], elapsed: 0 };
  function start() {
    if (state.jailed || state.wanted) return;
    state.wanted = true;
    state.elapsed = 0;
    for (let i = 0; i < 3; i++) {
      let officer: PoliceOfficer | null = null;
      for (let turn = 0; turn < 12 && !officer; turn++) {
        const a =
            player.angle + Math.PI + ((turn % 2 ? 1 : -1) * Math.ceil(turn / 2) * Math.PI) / 6,
          r = 6.5 + i * 1.5;
        const p = nearest(
          player.x + Math.cos(a) * r,
          player.y + Math.sin(a) * r,
          3,
          (x: number, y: number) => Math.hypot(x - player.x, y - player.y) > 4 + i,
        );
        if (!p) continue;
        const path = routeTo(player.x, player.y, p);
        if (path?.length)
          officer = { ...p, path, angle: a + Math.PI, phase: 0, repath: 0.2 + i * 0.17, index: i };
      }
      if (officer) state.officers.push(officer);
    }
  }
  function update(dt: number, speed: number) {
    if (!state.wanted || state.jailed) return;
    state.elapsed += dt;
    for (const officer of state.officers) {
      officer.repath -= dt;
      if (officer.repath <= 0 || !officer.path.length) {
        const next = routeTo(player.x, player.y, officer);
        if (next) officer.path = next;
        officer.repath = 0.45 + officer.index * 0.09;
      }
      let budget = speed * dt;
      while (budget > 1e-8 && officer.path.length) {
        const p = officer.path[0],
          dx = p.x - officer.x,
          dy = p.y - officer.y,
          len = Math.hypot(dx, dy);
        if (len < 1e-7) {
          officer.path.shift();
          continue;
        }
        const step = Math.min(budget, len);
        officer.x += (dx / len) * step;
        officer.y += (dy / len) * step;
        officer.angle = Math.atan2(dy, dx);
        officer.phase += step * 10;
        budget -= step;
        if (step >= len - 1e-7) officer.path.shift();
      }
      if (
        Math.hypot(officer.x - player.x, officer.y - player.y) < 0.62 &&
        canCapture(officer, player)
      ) {
        state.jailed = true;
        state.wanted = false;
        onArrest();
        return;
      }
    }
  }
  return { state, start, update };
}

/** A small level pad in the actual Marin terrain, with no changes outside its
 * immediate collar. The player remains at screen center after transfer here. */
export function createDetentionSite(scale: number) {
  const x = 20 * scale,
    z = -7.6 * scale,
    w = 4.4,
    d = 4.4,
    base = marinElevation(x / scale, z / scale);
  const a = x - w / 2,
    b = z - d / 2,
    margin = 0.32,
    bed = { left: a + 0.02, right: a + 1.04, top: b + 0.07, bottom: b + 2.2 };
  function walkable(wx: unknown, wz: unknown) {
    return (
      isFiniteNumber(wx) &&
      isFiniteNumber(wz) &&
      wx >= a + margin &&
      wx <= a + w - margin &&
      wz >= b + margin &&
      wz <= b + d - margin &&
      !(wx >= bed.left && wx <= bed.right && wz >= bed.top && wz <= bed.bottom)
    );
  }
  function path(from: { x: number; y: number }, to: { x: number; y: number }) {
    const p = { x: from.x + 0.5, y: from.y + 0.5 },
      q = { x: to.x + 0.5, y: to.y + 0.5 };
    if (!walkable(p.x, p.y) || !walkable(q.x, q.y)) return null;
    const clear = (p: { x: number; y: number }, q: { x: number; y: number }) => {
      const n = Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / 0.05);
      for (let i = 0; i <= n; i++)
        if (!walkable(p.x + ((q.x - p.x) * i) / (n || 1), p.y + ((q.y - p.y) * i) / (n || 1)))
          return false;
      return true;
    };
    if (clear(p, q)) return Math.hypot(p.x - q.x, p.y - q.y) < 1e-5 ? [] : [{ ...to }];
    // The bunk meets two walls. Its exposed corner joins the two free
    // strips of floor, without routing through the mattress or the bars.
    const corner = { x: bed.right + 0.05, y: bed.bottom + 0.05 };
    return clear(p, corner) && clear(corner, q)
      ? [{ x: corner.x - 0.5, y: corner.y - 0.5 }, { ...to }]
      : null;
  }
  function terrain(wx: number, wz: number) {
    const natural = marinElevation(wx / scale, wz / scale),
      outside = Math.hypot(
        Math.max(0, Math.abs(wx - x) - w / 2),
        Math.max(0, Math.abs(wz - z) - d / 2),
      );
    if (outside >= 0.75) return natural;
    const t = Math.min(1, outside / 0.75),
      blend = t * t * (3 - 2 * t);
    return base + (natural - base) * blend;
  }
  return { x, z, w, d, base, terrain, walkable, path };
}

export function drawDetentionFacility(
  m: Mesh,
  site: Pick<ReturnType<typeof createDetentionSite>, 'x' | 'z' | 'w' | 'd' | 'base'>,
) {
  const { x, z, w, d, base } = site,
    a = x - w / 2,
    b = z - d / 2;
  m.box(a, base - 0.035, b, w, 0.18, d, '#a4a49a', 'concrete');
  for (const [p, q] of [
    [[a, b] satisfies [number, number], [a + w, b]],
    [
      [a + w, b],
      [a + w, b + d],
    ],
    [
      [a + w, b + d],
      [a, b + d],
    ],
    [[a, b + d], [a, b] satisfies [number, number]],
  ]) {
    m.rod([p[0], base + 0.2, p[1]], [q[0], base + 0.2, q[1]], 0.085, '#73817d', 8);
    m.rod([p[0], base + 2.65, p[1]], [q[0], base + 2.65, q[1]], 0.075, '#73817d', 8);
    const n = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 0.28);
    for (let i = 0; i <= n; i++) {
      const xx = p[0] + ((q[0] - p[0]) * i) / n,
        zz = p[1] + ((q[1] - p[1]) * i) / n;
      m.rod([xx, base + 0.2, zz], [xx, base + 2.65, zz], 0.027, '#536966', 8);
    }
  }
  m.box(a + 0.25, base + 0.45, b + 0.3, 0.55, 0.15, 1.65, '#7b8580', 'concrete');
  m.box(a + 0.24, base + 0.6, b + 0.29, 0.57, 0.09, 1.67, '#889c96');
  m.box(a + 0.27, base + 0.7, b + 0.34, 0.49, 0.07, 0.32, '#c4c5b3');
  for (const zz of [b + 0.5, b + 1.65] satisfies [number, number])
    m.box(a + 0.38, base + 0.15, zz, 0.12, 0.3, 0.12, '#61716c');
}
