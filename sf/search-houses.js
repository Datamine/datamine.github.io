import { rayBox } from './geometry.js';
import { SEARCH_HOUSE_PARCELS } from './southern-layout.js';
import { HOUSE_SEARCHES } from './config/search-houses.js';

export function searchHousePoint(p, u, v) {
  const c = Math.cos(p.rotation || 0),
    s = Math.sin(p.rotation || 0);
  return { x: p.x + u * c - v * s, z: p.z + u * s + v * c };
}
export const SEARCH_HOMES = Object.freeze(
  SEARCH_HOUSE_PARCELS.map((p, i) => {
    const search = HOUSE_SEARCHES[i],
      inside = searchHousePoint(p, 0, p.d / 2 - 0.7),
      entry = searchHousePoint(p, 0, p.d / 2 + 0.45),
      target = searchHousePoint(p, -p.w / 2 + 0.65, -p.d / 2 + 0.65),
      approach = searchHousePoint(p, -p.w / 2 + 0.95, -p.d / 2 + 1.3);
    return Object.freeze({
      id: 'explorable-home-' + (i + 1),
      parcel: p,
      search,
      inside: { x: inside.x - 0.5, y: inside.z - 0.5 },
      entry: { x: entry.x - 0.5, y: entry.z - 0.5 },
      target,
      approach: { x: approach.x - 0.5, y: approach.z - 0.5 },
    });
  }),
);

export function searchHomeContaining(x, z) {
  return SEARCH_HOMES.find((h) => {
    const p = h.parcel,
      dx = x - p.x,
      dz = z - p.z;
    if (Math.abs(dx) > 3.3 || Math.abs(dz) > 3.3) return false;
    const c = Math.cos(p.rotation || 0),
      s = Math.sin(p.rotation || 0);
    return Math.abs(dx * c + dz * s) < p.w / 2 && Math.abs(-dx * s + dz * c) < p.d / 2;
  });
}

/** A whole storage face is clickable, even when its triangles are also part
 * of the room mesh. A closer wall or furnishing still occludes the container. */
export function preferHouseStorage(ray, hit, distance, room, sites) {
  if (!room?.searchHome || hit?.place !== room) return hit;
  let chosen = hit,
    nearest = distance + 0.08;
  for (const site of sites) {
    if (site.houseId !== room.id) continue;
    const box = site.object;
    const t = rayBox(
      ray,
      box.lo.map((v) => v - 0.035),
      box.hi.map((v) => v + 0.035),
    );
    if (t !== null && t <= nearest) {
      chosen = box;
      nearest = t;
    }
  }
  return chosen;
}
