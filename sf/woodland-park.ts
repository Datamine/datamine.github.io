import type { LandscapeOptions } from './types/scenery.ts';
import type { Mesh } from './geometry.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { SAND_HILL_WOODS, PENINSULA_GREENS } from './peninsula-urbanism.ts';
import {
  SAND_HILL_CAPITAL,
  southernTrailDistance,
  inSouthernHousePlot,
} from './southern-layout.ts';
import './southern-district.ts';

export const WOODLAND_SIGNS = Object.freeze([
  'OCEAN TERRACE GARDEN',
  'BAYSHORE COURTYARD',
] satisfies [string, string]);
export function drawWoodlandParks(
  m: Mesh,
  { terrain, tree, bench, roadDistance, signs }: LandscapeOptions,
) {
  const p = SAND_HILL_WOODS,
    start = m.data.length,
    trees = [];
  for (let row = 0; row < 7; row++)
    for (let col = 0; col < 6; col++) {
      const x = 38.4 + col * 2.45 + (row % 2) * 0.35,
        z = 130 + row * 2.1;
      if (
        x > p.east - 0.5 ||
        roadDistance(x, z) < 1.3 ||
        southernTrailDistance(x, z) < 0.9 ||
        inSouthernHousePlot(x, z, 0.8) ||
        (Math.abs(x - SAND_HILL_CAPITAL.x) < 3.5 && Math.abs(z - SAND_HILL_CAPITAL.z) < 3.1)
      )
        continue;
      tree(x - 0.5, z - 0.5, (row + col) % 3 ? true : 3, true);
      trees.push({ x, z });
      for (let i = 0; i < 3; i++)
        m.sphere(
          x - 0.32 + i * 0.25,
          terrain.height(x, z) + 0.11,
          z + 0.35,
          0.17,
          0.12,
          0.2,
          i % 2 ? '#66874d' : '#77924f',
          10,
          6,
        );
    }
  for (const [x, z] of [
    [47.4, 141.6] satisfies [number, number],
    [40.4, 139.8] satisfies [number, number],
    [47.5, 132.1] satisfies [number, number],
  ])
    bench(x, z);
  const sites: import('./types/world.ts').RenderedSite[] = [
    {
      id: p.id,
      kind: 'park',
      label: p.label,
      entry: p.entry,
      description: contentText('woodland-park.drawWoodlandParks.description-2', {}),
      start,
      count: m.data.length - start,
      lo: [p.west, 0, p.north] satisfies [number, number, number],
      hi: [p.east, 15, p.south] satisfies [number, number, number],
    },
  ];
  for (const [i, g] of PENINSULA_GREENS.entries()) {
    const start = m.data.length;
    for (const dx of [-g.w * 0.34, g.w * 0.34] satisfies [number, number]) {
      const x = g.x + dx,
        z = g.z - 0.6;
      tree(x - 0.5, z - 0.5, i ? 3 : false, true);
      trees.push({ x, z });
    }
    bench(g.x, g.z + 0.5);
    for (let j = 0; j < 12; j++) {
      const a = (j * Math.PI) / 6,
        x = g.x + Math.cos(a) * g.w * 0.42,
        z = g.z + Math.sin(a) * g.d * 0.4,
        h = terrain.height(x, z);
      m.cylinder(x, h, z, 0.08, 0.15, '#b08058', 10, 0.12, 'stone');
      m.sphere(
        x,
        h + 0.22,
        z,
        0.15,
        0.12,
        0.15,
        (['#d69bb3', '#edc874', '#b899cb'] satisfies [string, string, string])[j % 3],
        10,
        6,
      );
    }
    sites.push({
      id: g.id,
      kind: 'park',
      label: g.label,
      entry: g.entry,
      description: contentText('woodland-park.drawWoodlandParks.description-4', {}),
      start,
      count: m.data.length - start,
      lo: [g.x - g.w / 2, 0, g.z - g.d / 2] satisfies [number, number, number],
      hi: [g.x + g.w / 2, 15, g.z + g.d / 2] satisfies [number, number, number],
    });
  }
  return { sites, trees };
}
