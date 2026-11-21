import { requiredValue } from './types/assert.ts';
import type { WorldModel } from './types/server.ts';
import type { Point } from './types/geometry.ts';

import { auditNavigationGrid } from './navigation.ts';
import { SOUTHERN_TRAILS } from './southern-layout.ts';
import { SF_ZOO } from './zoo.ts';
import { auditInteractionApproaches } from './interaction-audit.ts';

/** Contracts describe intended access, rather than recording positions from a
 * browser session. They are evaluated against a freshly built production map. */
export function auditWorldNavigation(world: WorldModel) {
  const graph = auditNavigationGrid(world.navigation),
    interactions = auditInteractionApproaches(world),
    errors = [...graph.errors, ...interactions.errors],
    routes: { id: string; waypoints: number; length: number }[] = [];
  for (const [district, plan] of [
    ['city', world.cityLightPlan],
    ['south', world.southernNeighborhood?.lightPlan],
  ] as const)
    for (const gap of plan?.unlit || [])
      errors.push(
        district + ' street lighting: ' + gap.street + ' has an unlit block ' + gap.block,
      );
  for (const s of world.sights)
    if (
      s.navigationAccess &&
      !(['walk', 'observe-only'] satisfies [string, string]).includes(s.navigationAccess)
    )
      errors.push(s.id + ': unknown navigation access ' + s.navigationAccess);
  const walkableSights = world.sights.filter((s) => s.navigationAccess !== 'observe-only');
  const destinations = [
    ...world.places.flatMap((p) => [
      { id: p.id + ':entrance', point: p.entry },
      { id: p.id + ':inside', point: p.inside },
    ]),
    ...walkableSights.flatMap((s) => [
      { id: s.id, point: s.entry },
      ...(s.inside ? [{ id: s.id + ':inside', point: s.inside }] : []),
    ]),
  ];
  destinations.push(
    ...world.airship.gates.map((p, i) => ({ id: 'airport-gate-' + i, point: p })),
    { id: 'bay-bridge-city-gate', point: world.regionalRoad.gate('city') },
    { id: 'bay-bridge-tahoe-gate', point: world.regionalRoad.gate('tahoe') },
  );
  destinations.push({
    id: 'airship-mooring',
    point: { x: world.airship.home.x - 0.5, y: world.airship.home.z - 0.5 },
  });
  for (const cow of world.expeditions.cows) {
    destinations.push({ id: cow.id + '-pasture', point: { x: cow.x - 0.5, y: cow.z - 0.5 } });
    for (const weapon of ['unarmed', 'railgun'] as const) {
      const point = world.approaches.combat(
        cow,
        weapon,
        requiredValue(
          world.sights.find((s) => s.id === 'south-cow-pen'),
          'Missing authored entity: south-cow-pen',
        ).entry,
      );
      if (point) destinations.push({ id: cow.id + '-' + weapon + '-approach', point });
      else errors.push(cow.id + ': no reachable ' + weapon + ' attack approach');
    }
  }
  destinations.push(
    ...(world.wilderness?.actors || []).map((n) => ({
      id: n.id + '-encounter',
      point: { x: n.x - 0.5, y: n.z - 0.5 },
    })),
  );
  if (world.marinLand)
    destinations.push(
      ...[
        [15, -15] satisfies [number, number],
        [30, -20] satisfies [number, number],
        [40, -10] satisfies [number, number],
        [0, -25] satisfies [number, number],
        [55, -30] satisfies [number, number],
      ].map(([x, z], i) => ({ id: 'marin-hills-' + i, point: { x: x - 0.5, y: z - 0.5 } })),
    );
  if (world.countryside)
    destinations.push(
      ...[
        [180, -10] satisfies [number, number],
        [350, -150] satisfies [number, number],
        [720, -530] satisfies [number, number],
        [1000, -730] satisfies [number, number],
      ].map(([x, y], i) => ({ id: 'regional-grass-' + i, point: { x, y } })),
    );
  for (const [id, p] of Object.entries(world.tabletDestinations || {}))
    destinations.push({ id: id + '-tablet-arrival', point: { x: p.x - 0.5, y: p.z - 0.5 } });
  for (const [i, trail] of SOUTHERN_TRAILS.entries())
    for (const [j, [x, z]] of trail.points.entries())
      destinations.push({ id: 'southern-trail-' + i + '-' + j, point: { x: x - 0.5, y: z - 0.5 } });
  destinations.push(
    { id: 'tiger-exit', point: SF_ZOO.exit },
    ...SF_ZOO.wardens.map((point, i) => ({ id: 'animal-control-start-' + i, point })),
  );
  const approaches: { id: string; point: Point | null | undefined }[] = [
    { id: 'bunny-petting', point: world.approaches.bunny(world.spawn) },
    { id: 'sutro-ladder', point: world.approaches.sutro(world.spawn) },
    ...world.merchants.map((npc) => ({
      id: npc.id + '-conversation',
      point: world.approaches.merchant(npc),
    })),
  ];
  approaches.push(
    ...(world.parrots || []).map((npc) => ({ id: npc.id + '-conversation', point: npc.approach })),
  );
  for (const a of approaches)
    if (a.point) destinations.push({ id: a.id, point: a.point });
    else errors.push(a.id + ': no valid interaction approach');
  function check(id: string, from: Point, to: Point) {
    const route = world.pathTo(to.x, to.y, from);
    if (!route) {
      errors.push(
        id + ': no route; destination ' + JSON.stringify(world.navigation.describe(to.x, to.y)),
      );
      return;
    }
    let previous = from,
      length = 0;
    for (const p of route) {
      if (!world.clearAt(p.x, p.y) || !world.canTravel(previous.x, previous.y, p.x, p.y)) {
        errors.push(id + ': invalid segment ' + JSON.stringify({ from: previous, to: p }));
        break;
      }
      length += Math.hypot(p.x - previous.x, p.y - previous.y);
      previous = p;
    }
    if (Math.hypot(previous.x - to.x, previous.y - to.y) > 1e-7)
      errors.push(id + ': route ends before its destination');
    routes.push({ id, waypoints: route.length, length: +length.toFixed(2) });
  }
  for (const target of destinations) {
    check('spawn -> ' + target.id, world.spawn, target.point);
    check(target.id + ' -> spawn', target.point, world.spawn);
  }
  const city = walkableSights.filter((s) => world.navigation.cellAt(s.entry.x, s.entry.y) >= 0);
  const spawnRegion = world.navigation.regionAt(world.spawn.x, world.spawn.y);
  for (const s of city)
    if (world.navigation.regionAt(s.entry.x, s.entry.y) !== spawnRegion)
      errors.push(s.id + ': destination snapped into a disconnected component');
  // Corner-to-corner regional journeys exercise all real city/airport/highway/
  // Tahoe adapters in series, using no stubbed cityPath or movement simulation.
  const byId = (id: string) =>
    requiredValue(
      world.sights.find((s) => s.id === id),
      'Audit destination ' + id,
    ).entry;
  check('zoo -> Tahoe spaceport', byId('zoo'), byId('tahoe-spaceport'));
  check('Tahoe spaceport -> zoo', byId('tahoe-spaceport'), byId('zoo'));
  check('airport spaceport -> UCSF', byId('sf-spaceport'), byId('ucsf'));
  check('UCSF -> airport spaceport', byId('ucsf'), byId('sf-spaceport'));
  return {
    ok: graph.ok && !errors.length,
    errors,
    graph,
    interactions,
    destinations: destinations.length,
    routes,
    observations: world.sights
      .filter((s) => s.navigationAccess === 'observe-only')
      .map((s) => s.id),
  };
}
