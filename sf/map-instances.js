import { createNavigationGrid } from './navigation.js';

export const PUBLIC_INSTANCE = Object.freeze({ id: 'world', kind: 'world', layer: 0 });
export const ILLUMINATI_PRICE = 250000;
export const ILLUMINATI_CAVE = Object.freeze({
  width: 28,
  depth: 28,
  floor: -7.5,
  entrance: { x: 13.5, z: 24.5 },
  bomber: { x: 13.5, z: 11.5 },
  boarding: { x: 13.5, z: 16.5 },
});
export const CAVE_TILES = Object.freeze(
  Array.from({ length: 28 * 28 }, (_, i) => {
    const x = i % 28,
      z = Math.floor(i / 28),
      hall = x >= 3 && x <= 24 && z >= 3 && z <= 19 && ((x >= 5 && x <= 22) || (z >= 5 && z <= 17)),
      passage = x >= 12 && x <= 15 && z >= 19 && z <= 25;
    const floor = hall || passage,
      aircraft = x >= 12 && x <= 14 && z >= 10 && z <= 12;
    return Object.freeze({
      x,
      z,
      type: floor ? (hall ? 'hangar' : 'stone') : 'rock',
      walkable: floor && !aircraft,
    });
  }),
);
export const CAVE_NAVIGATION = createNavigationGrid({
  width: 28,
  offset: 0.5,
  mask: CAVE_TILES.map((t) => (t.walkable ? 1 : 0)),
});
export function instanceKind(value) {
  return value?.instance?.kind || value?.kind || 'world';
}
export function instanceID(value) {
  return value?.instance?.id || 'world';
}
export function sameMapInstance(a, b) {
  return instanceID(a) === instanceID(b);
}
export function privateMapInstance(kind, owner, home = null) {
  if (kind === 'illuminati')
    return {
      id: 'illuminati:' + owner,
      kind,
      layer: -1,
      bounds: { west: 0, east: 28, north: 0, south: 28 },
    };
  if (kind === 'kraken' && home)
    return {
      id: 'kraken:' + owner,
      kind,
      layer: 0,
      bounds: { west: home.x - 38, east: home.x + 6, north: home.z - 18, south: home.z + 18 },
    };
  throw Error('Unknown private map template');
}
export function instanceContains(instance, x, z) {
  const b = instance?.bounds;
  return !!b && x >= b.west && x < b.east && z >= b.north && z < b.south;
}
export function instanceTile(instance, x, z) {
  if (!instanceContains(instance, x, z)) return null;
  if (instance.kind === 'illuminati') return CAVE_TILES[Math.floor(z) * 28 + Math.floor(x)] || null;
  return { x: Math.floor(x), z: Math.floor(z), type: 'private-water', walkable: false };
}
export function guildLocalPoint(site, u, v) {
  const a = site.rotation || 0,
    c = Math.cos(a),
    s = Math.sin(a);
  return { x: site.x + site.w / 2 + u * c - v * s, z: site.y + site.d / 2 + u * s + v * c };
}
export function guildSecretSites(site) {
  if (!site) return null;
  const oldMan = guildLocalPoint(site, 0, -0.3),
    portal = guildLocalPoint(site, site.w / 2 - 1.25, -site.d / 2 + 1.1);
  return { oldMan, portal };
}
