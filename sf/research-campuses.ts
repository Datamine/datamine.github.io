import type { Actor, SignAtlas } from './types/world.ts';
type ResearcherActor = Omit<Actor, 'points' | 'stops' | 'phase'> & {
  campus: string;
  researcher: true;
  points: number[][];
  stops: number;
  phase: number;
  routeIndex: number;
  pause: number;
  speed: number;
  hold: number;
  waiting: boolean;
  angle: number;
  motion: number;
};
function researcherActor(actor: Actor): ResearcherActor {
  if (
    !Array.isArray(actor.points) ||
    !actor.points.every(Array.isArray) ||
    typeof actor.stops !== 'number' ||
    typeof actor.phase !== 'number' ||
    typeof actor.routeIndex !== 'number' ||
    typeof actor.pause !== 'number' ||
    typeof actor.speed !== 'number' ||
    typeof actor.hold !== 'number' ||
    typeof actor.angle !== 'number' ||
    typeof actor.motion !== 'number' ||
    typeof actor.waiting !== 'boolean' ||
    actor.researcher !== true
  )
    throw new Error('Incomplete researcher route: ' + actor.id);
  return actor as ResearcherActor;
}
import { requiredValue } from './types/assert.ts';

// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { detachInstituteMesh } from './institute-interiors.ts';
import { drawResearchInstitute, drawResearchCourtDetails } from './research-architecture.ts';
import { RESEARCH_CAMPUSES } from './research-layout.ts';
import { RESEARCHERS } from './research-dialogue.ts';
import { CHARACTER_CLIPS } from './characters.ts';
import type { Mesh } from './geometry.ts';

const researchSignLines = [
  ['CALIFORNIA INSTITUTE', 'FOR CONSCIOUSNESS', 'RESEARCH'] satisfies [string, string, string],
  ['CONSCIOUSNESS RESEARCH', 'FIELD STATION', 'CALIFORNIA'] satisfies [string, string, string],
];
export const RESEARCH_SIGNS = Object.freeze(researchSignLines.map((lines) => lines.join('\n')));

/** Two authored campuses share their footprints with the navigation mask.
 * Signs belong to the façades; NPCs are animated by the normal actor renderer. */
export function drawResearchCampuses(
  m: Mesh,
  signs: SignAtlas,
  { separateInteriors = false } = {},
) {
  return RESEARCH_CAMPUSES.map((c, index) => {
    const start = m.data.length,
      trim = index ? '#64848e' : '#8d8975';
    m.box(
      c.west,
      c.base - 0.035,
      c.north,
      c.east - c.west,
      0.04,
      c.south - c.north,
      index ? '#96b79c' : '#a6ba8b',
      'grass',
    );
    for (const x of [c.x - 1.1, c.x + 1.1] satisfies [number, number])
      m.box(
        x - 0.23,
        c.base + 0.007,
        c.z + c.d / 2,
        0.46,
        0.009,
        c.south - c.z - c.d / 2,
        '#c9c0a7',
        'herringbone',
      );
    m.box(
      c.west + 0.3,
      c.base + 0.008,
      c.z + 4.85,
      c.east - c.west - 0.6,
      0.009,
      0.3,
      '#c7bda5',
      'flagstone',
    );
    // Paving seams, inlaid centerlines, and a planted edge give the courts
    // detail without loading an additional texture atlas.
    m.box(c.x - 1.3, c.base + 0.007, c.z + 2.22, 2.6, 0.009, 0.35, '#d4c4a9', 'flagstone');
    for (const x of [c.west + 0.18, c.east - 0.42] satisfies [number, number]) {
      m.box(x, c.base + 0.01, c.z - 2, 0.24, 0.2, 4.7, trim, 'stone');
      for (let z = c.z - 1.7; z < c.z + 2.5; z += 0.7)
        m.sphere(x + 0.12, c.base + 0.36, z, 0.2, 0.22, 0.22, index ? '#709f83' : '#8caa72', 10, 4);
    }
    const definition = drawResearchInstitute(m, signs, c, index, RESEARCH_SIGNS[index]),
      interior = separateInteriors ? detachInstituteMesh(m, definition) : null;
    drawResearchCourtDetails(m, signs, c, index);
    const furnitureStart = m.data.length;
    if (!index) {
      m.cylinder(c.x, c.base, c.z + 3.3, 0.72, 0.22, '#9ca898', 32);
      m.cylinder(c.x, c.base + 0.22, c.z + 3.3, 0.62, 0.035, '#8ec1c1', 32, 0.62, { water: 0 });
      m.cylinder(c.x, c.base + 0.24, c.z + 3.3, 0.09, 0.44, '#c2c9b3', 16);
      m.sphere(c.x, c.base + 0.71, c.z + 3.3, 0.19, 0.12, 0.19, '#d6d4b8', 16, 8);
    } else {
      m.box(c.x - 0.65, c.base, c.z + 2.77, 1.3, 0.16, 1.06, '#818b91', 'stone');
      // An empty center, framed in brass: a physical sculpture with an
      // actual hole through it, not a black rectangle painted on a box.
      for (const x of [-0.48, 0.35] satisfies [number, number])
        m.box(c.x + x, c.base + 0.16, c.z + 3.18, 0.13, 1.25, 0.22, '#c0a469', { metal: 0.4 });
      m.box(c.x - 0.48, c.base + 1.28, c.z + 3.18, 0.96, 0.13, 0.22, '#c0a469', { metal: 0.4 });
    }
    for (let i = furnitureStart; i < m.data.length; i += 11) {
      m.data[i] = c.x + 2.25 + (m.data[i] - c.x) * 0.75;
      m.data[i + 2] = c.z + 3.3 + (m.data[i + 2] - (c.z + 3.3)) * 0.75;
    }
    const benchX = c.west + 0.65;
    for (const x of [benchX - 0.3, benchX + 0.25] satisfies [number, number])
      m.box(x, c.base, c.z + 4.35, 0.06, 0.53, 0.3, '#6b7c79', { metal: 0.2 });
    m.box(benchX - 0.43, c.base + 0.51, c.z + 4.22, 0.86, 0.06, 0.52, '#a18569', 'wood');
    m.box(benchX - 0.43, c.base + 0.57, c.z + 4.19, 0.86, 0.52, 0.06, '#a18569', 'wood');
    const lo = [Infinity, Infinity, Infinity] satisfies [number, number, number],
      hi = [-Infinity, -Infinity, -Infinity] satisfies [number, number, number];
    for (let i = start; i < m.data.length; i += 11)
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], m.data[i + k]);
        hi[k] = Math.max(hi[k], m.data[i + k]);
      }
    if (interior)
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], interior.lo[k]);
        hi[k] = Math.max(hi[k], interior.hi[k]);
      }
    return {
      enterableInstitute: true,
      interior,
      inside: { x: c.x - 0.5, y: c.z + 0.15 },
      id: c.id,
      kind: 'research-institute',
      label: c.label,
      base: c.base,
      entry: { ...c.entry },
      description: index
        ? contentText('research-campuses.drawResearchCampuses.description-2.yes', {})
        : contentText('research-campuses.drawResearchCampuses.description-2.no', {}),
      start,
      count: m.data.length - start,
      lo,
      hi,
    };
  });
}

export function createResearcherNPCs(): ResearcherActor[] {
  return RESEARCHERS.map((person, index) => {
    const c = requiredValue(
        RESEARCH_CAMPUSES.find((c) => c.id === person.campus),
        'Missing researcher campus: ' + person.campus,
      ),
      side = person.side || 1;
    // One researcher uses the indoor aisle; the others stroll around the
    // courtyard furnishings. Both routes use the shared collision plan.
    const indoors = RESEARCHERS.find((p) => p.campus === person.campus) === person;
    const points = indoors
      ? [
          [c.x - 0.6, c.z + 0.6] satisfies [number, number],
          [c.x + 0.6, c.z + 0.6] satisfies [number, number],
          [c.x + 0.6, c.z - 0.8] satisfies [number, number],
          [c.x - 0.6, c.z - 0.8] satisfies [number, number],
        ]
      : person.seated
        ? [
            [c.x - 1.4, c.z + 4.6] satisfies [number, number],
            [c.x - 2.8, c.z + 4.6] satisfies [number, number],
            [c.x - 2.8, c.z + 5.03] satisfies [number, number],
            [c.x + 2.8, c.z + 5.03] satisfies [number, number],
            [c.x + 2.8, c.z + 4.6] satisfies [number, number],
            [c.x + 1.4, c.z + 4.6] satisfies [number, number],
            [c.x + 1.4, c.z + 5.03] satisfies [number, number],
            [c.x - 1.4, c.z + 5.03] satisfies [number, number],
          ]
        : [
            [c.x + side * 1.4, c.z + 3.2] satisfies [number, number],
            [c.x + side * 1.4, c.z + 4.55] satisfies [number, number],
            [c.x + side * 3.1, c.z + 4.55] satisfies [number, number],
            [c.x + side * 3.1, c.z + 3.2] satisfies [number, number],
            [c.x + side * 3.1, c.z + 4.55] satisfies [number, number],
            [c.x + side * 1.4, c.z + 4.55] satisfies [number, number],
          ];
    return {
      ...person,
      kind: 'researcher',
      researcher: true,
      seated: false,
      x: points[0][0],
      z: points[0][1],
      base: c.base + 0.025,
      height: 1.85,
      angle: Math.PI / 2,
      hold: 0,
      waiting: false,
      points,
      routeIndex: 1,
      pause: 0.5 + index * 0.55,
      speed: 0.56 + (index % 3) * 0.09,
      phase: index * 0.9,
      motion: 0,
      moving: false,
      stops: 0,
      get approach(): { x: number; y: number } {
        return { x: this.x - 0.5, y: this.z + 0.65 - 0.5 };
      },
    };
  });
}

/** Distance-driven walking with staggered thinking breaks. No per-frame
 * pathfinding: the courtyard loops are checked against the tile graph in tests. */
export function moveResearcherNPCs(
  people: Actor[],
  dt: number,
  {
    paused = false,
    lookAt = null,
  }: { lookAt?: { x: number; z: number } | null; paused?: boolean } | undefined = {},
) {
  if (dt <= 0) return;
  for (const actor of people) {
    if (!actor.researcher) continue;
    const npc = researcherActor(actor);
    let remaining = dt,
      distance = 0,
      facing = npc.angle;
    const held = npc.hold > 0 || npc.waiting;
    if (npc.hold > 0 && !paused) npc.hold = Math.max(0, npc.hold - dt);
    if (!paused && !held) {
      while (remaining > 1e-8) {
        if (npc.pause > 0) {
          const spent = Math.min(remaining, npc.pause);
          npc.pause -= spent;
          remaining -= spent;
          continue;
        }
        const [x, z] = npc.points[npc.routeIndex],
          dx = x - npc.x,
          dz = z - npc.z,
          d = Math.hypot(dx, dz),
          step = Math.min(d, npc.speed * remaining);
        if (d > 1e-8) {
          npc.x += (dx / d) * step;
          npc.z += (dz / d) * step;
          facing = Math.atan2(dz, dx);
          distance += step;
          remaining -= step / npc.speed;
        }
        if (d - step < 1e-8) {
          npc.routeIndex = (npc.routeIndex + 1) % npc.points.length;
          npc.stops++;
          npc.pause = 1.1 + ((npc.stops * 7 + npc.id.length) % 9) * 0.32;
        }
      }
    }
    npc.moving = distance > 1e-8;
    npc.phase += (distance * Math.PI * 2) / CHARACTER_CLIPS.walk.stride;
    npc.motion += (Number(npc.moving) - npc.motion) * (1 - Math.exp(-dt * 12));
    if (held && lookAt) facing = Math.atan2(lookAt.z - npc.z, lookAt.x - npc.x);
    npc.angle += Math.max(
      -dt * 3,
      Math.min(dt * 3, Math.atan2(Math.sin(facing - npc.angle), Math.cos(facing - npc.angle))),
    );
  }
}
