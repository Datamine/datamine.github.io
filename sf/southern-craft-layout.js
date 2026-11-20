import { SOUTHERN_PALETTES, southernHousingStyle } from './neighborhood-palette.js';
import { SOUTHERN_HOUSING, SOUTHERN_TRAILS } from './southern-layout.js';
import { SOUTHERN_ROADS, airportRoadDistance } from './airship.js';
import { PENINSULA_RESERVATIONS } from './peninsula-urbanism.js';
import { westernCoastX } from './coastline.js';
import { inEstateDistrict } from './estate-layout.js';
import { inSocialGrounds } from './social-layout.js';

export function craftPoint(p, u, v) {
  const a = p.rotation || 0;
  return [p.x + u * Math.cos(a) - v * Math.sin(a), p.z + u * Math.sin(a) + v * Math.cos(a)];
}
export function craftFootprint(p, w = p.w, d = p.d) {
  return [
    [-w / 2, -d / 2],
    [w / 2, -d / 2],
    [w / 2, d / 2],
    [-w / 2, d / 2],
  ].map(([u, v]) => craftPoint(p, u, v));
}
export function craftBounds(p) {
  const poly = craftFootprint(p);
  return [
    Math.min(...poly.map((v) => v[0])),
    Math.min(...poly.map((v) => v[1])),
    Math.max(...poly.map((v) => v[0])),
    Math.max(...poly.map((v) => v[1])),
  ];
}
const craftOverlap = (a, b, gap = 0.18) =>
  a[0] < b[2] + gap && a[2] > b[0] - gap && a[1] < b[3] + gap && a[3] > b[1] - gap;
const craftRoadSegments = SOUTHERN_ROADS.flatMap((r) =>
  r.points.slice(1).map((b, i) => ({ a: r.points[i], b, name: r.name })),
);
const craftTrailSegments = SOUTHERN_TRAILS.flatMap((r) =>
  r.points.slice(1).map((b, i) => ({ a: r.points[i], b, r: r.halfWidth + 0.3 })),
);
function craftNearest(x, z, segments) {
  let best = { distance: Infinity };
  for (const s of segments) {
    const dx = s.b[0] - s.a[0],
      dz = s.b[1] - s.a[1],
      t = Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (z - s.a[1]) * dz) / (dx * dx + dz * dz))),
      xx = s.a[0] + t * dx,
      zz = s.a[1] + t * dz,
      distance = Math.hypot(x - xx, z - zz);
    if (distance < best.distance) best = { ...s, x: xx, z: zz, distance };
  }
  return best;
}
export function craftSiteFits(p, occupied = []) {
  const box = craftBounds(p);
  if (
    box[1] < 97.1 ||
    box[3] > 177 ||
    box[2] > 82 ||
    inEstateDistrict(p.x, p.z) ||
    inSocialGrounds(p.x, p.z, 1)
  )
    return false;
  if (
    [
      ...SOUTHERN_HOUSING.map(craftBounds),
      ...PENINSULA_RESERVATIONS,
      ...occupied.map(craftBounds),
    ].some((q) => craftOverlap(box, q))
  )
    return false;
  for (let z = box[1]; z <= box[3] + 0.01; z += 0.2)
    for (let x = box[0]; x <= box[2] + 0.01; x += 0.2) {
      if (x < westernCoastX(z) + 1.15 || airportRoadDistance(x, z) < 0.62) return false;
      if (craftTrailSegments.some((s) => craftNearest(x, z, [s]).distance < s.r)) return false;
    }
  return true;
}
const craftAnchors = [
  [18, 102.5, 'market'],
  [24.8, 102.5, 'garden'],
  [18, 108.6, 'studio'],
  [25, 108.6, 'garden'],
  [32, 108.5, 'arcade'],
  [39, 108.5, 'garden'],
  [46, 108.5, 'studio'],
  [53, 102.5, 'arcade'],
  [32, 115.5, 'garden'],
  [39, 115.5, 'studio'],
  [46, 115.5, 'garden'],
  [53, 115.5, 'market'],
  [18, 122.8, 'garden'],
  [25, 122.8, 'studio'],
  [32, 123.5, 'garden'],
  [39, 123, 'arcade'],
  [46, 123, 'garden'],
  [53, 123, 'studio'],
  [18, 131.2, 'market'],
  [32, 131.2, 'garden'],
  [18, 139, 'garden'],
  [25, 139.2, 'market'],
  [32, 139, 'studio'],
  [18, 147.5, 'studio'],
  [25, 147.5, 'garden'],
  [32, 147.5, 'arcade'],
  [39, 148, 'garden'],
  [46, 148, 'market'],
  [53, 148, 'garden'],
  [18, 155.5, 'garden'],
  [25, 155.5, 'market'],
  [32, 155.5, 'garden'],
  [39, 155.5, 'studio'],
  [46, 155.5, 'arcade'],
  [53, 155.5, 'garden'],
  [18, 163.4, 'arcade'],
  [25, 163.4, 'garden'],
  [32, 163.4, 'market'],
  [39, 163.4, 'garden'],
  [46, 160.8, 'studio'],
  [53, 163.4, 'garden'],
  [15.8, 172, 'market'],
  [21, 173.9, 'garden'],
  [25, 173.9, 'garden'],
  [29, 173.9, 'garden'],
  [33.5, 173.9, 'garden'],
  [41, 164, 'studio'],
  [46, 162.5, 'arcade'],
  [53, 160.5, 'market'],
  [76, 157.7, 'garden'],
  [77.1, 162.1, 'studio'],
  [77.5, 169.5, 'garden'],
];
/** Curated centers resolve only within their own block. Exact plot, route and
 * protected-land tests replace arbitrary decoration scattered over the map. */
export function planSouthernCraft() {
  const plots = [];
  for (const [index, [ax, az, kind]] of craftAnchors.entries()) {
    let found = null;
    for (const [dx, dz] of [
      [0, 0],
      [-0.65, 0],
      [0.65, 0],
      [0, -0.35],
      [0, 0.35],
      [0, -0.65],
      [0, 0.65],
      [-1.2, 0],
      [1.2, 0],
      [0, -1.2],
      [0, 1.2],
    ]) {
      const x = ax + dx,
        z = az + dz,
        road = craftNearest(x, z, craftRoadSegments),
        rotation =
          kind === 'garden' && z > 172
            ? 0
            : Math.abs(road.b[0] - road.a[0]) > Math.abs(road.b[1] - road.a[1])
              ? z > road.z
                ? Math.PI
                : 0
              : x > road.x
                ? Math.PI / 2
                : -Math.PI / 2,
        w = kind === 'garden' ? 1.85 : 2.65,
        d = kind === 'garden' ? 1.4 : 2.4;
      const p = {
        id: 'southern-craft-' + index,
        x,
        z,
        w,
        d,
        rotation,
        kind,
        index,
        street: road.name,
        palette: SOUTHERN_PALETTES[southernHousingStyle({ x, z })],
      };
      if (road.distance > 7 || !craftSiteFits(p, plots)) continue;
      const entry = craftPoint(p, 0, d / 2 + 0.3);
      p.entry = { x: entry[0] - 0.5, y: entry[1] - 0.5 };
      found = p;
      break;
    }
    if (found) plots.push(Object.freeze(found));
  }
  return Object.freeze(plots);
}
export const SOUTHERN_CRAFT = planSouthernCraft();
export function inSouthernCraft(x, z, margin = 0) {
  return SOUTHERN_CRAFT.some((p) => {
    const a = p.rotation,
      c = Math.cos(a),
      s = Math.sin(a),
      dx = x - p.x,
      dz = z - p.z;
    return (
      Math.abs(dx * c + dz * s) < p.w / 2 + margin && Math.abs(-dx * s + dz * c) < p.d / 2 + margin
    );
  });
}
