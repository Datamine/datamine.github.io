import type { ActionReceipt, Actor } from './types/world.ts';
import './types/assert.ts';
interface BenchDefinition {
  id: string;
  x: number;
  z: number;
  angle?: number;
  base: number;
  height?: number;
  start: number;
  count: number;
}
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { configuredDialogue } from './dialogue-config.ts';

export function neighborhoodShopDialogue(
  npc: Actor,
  request: (id: string, offer: string) => Promise<ActionReceipt>,
) {
  return configuredDialogue('neighborhood-' + npc.neighborhoodService, npc, {
    service: (offer) => ({ ok: true, pending: true, promise: request(npc.id, offer) }),
  });
}

/** A seat records its visible mesh and a separate, walkable front approach.
 * The server owns the seated pose and returns walkers to that approach. */
export function makeNeighborhoodBench({
  id,
  x,
  z,
  angle = 0,
  base,
  height = 0.38,
  start,
  count,
}: BenchDefinition) {
  const point = (u: number, v: number) => [
      x + u * Math.cos(angle) - v * Math.sin(angle),
      z + u * Math.sin(angle) + v * Math.cos(angle),
    ],
    exit = point(0, 0.85),
    footprint = [
      [-0.5, -0.22] satisfies [number, number],
      [0.5, -0.22] satisfies [number, number],
      [0.5, 0.22] satisfies [number, number],
      [-0.5, 0.22] satisfies [number, number],
    ].map((p) => point(...p));
  return {
    id,
    kind: 'bench',
    label: contentText('neighborhood-interactions.makeNeighborhoodBench.label-1', {}),
    entry: { x: exit[0] - 0.5, y: exit[1] - 0.5 },
    seat: { x, z, base, height, angle: angle + Math.PI / 2 },
    start,
    count,
    lo: [Math.min(...footprint.map((p) => p[0])), base, z - 0.6],
    hi: [Math.max(...footprint.map((p) => p[0])), base + 0.8, z + 0.6],
    footprint,
    navigationPolygons: [footprint],
    description: contentText('neighborhood-interactions.makeNeighborhoodBench.description-2', {}),
  };
}
