import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh } from '../geometry.ts';
import { RESEARCH_CAMPUSES } from '../research-layout.ts';
import { drawResearchCampuses } from '../research-campuses.ts';
import { createEsotericCampus } from '../alien-sites.ts';
import { createFerrari } from '../ferrari.ts';
import { createRegionalRoad } from '../regional-road.ts';
import {
  insideInstitute,
  instituteWalkable,
  instituteFixtures,
  instituteWallRects,
  instituteHiddenSections,
  raycastInstituteFloor,
  INSTITUTE_FLOOR_HEIGHT,
} from '../institute-interiors.ts';

const worldPoint = (room: { x: number; z: number; rotation: number }, u: number, v: number) => ({
  x: room.x + u * Math.cos(room.rotation) - v * Math.sin(room.rotation),
  z: room.z + u * Math.sin(room.rotation) + v * Math.cos(room.rotation),
});
test('shared institute floor plans admit the front doorway and block walls and furniture at any orientation', () => {
  for (const front of [-1, 1] satisfies [number, number])
    for (const rotation of [0, 0.7, Math.PI / 2, Math.PI] satisfies [
      number,
      number,
      number,
      number,
    ]) {
      const room = { x: 20, z: 30, w: 7, d: 4.9, base: 2, front, rotation },
        at = (u: number, v: number) => worldPoint(room, u, v);
      const center = at(0, 0);
      assert.ok(insideInstitute(room, center.x, center.z));
      assert.ok(instituteWalkable(room, center.x, center.z));
      for (let v = room.d / 2 - 0.5; v <= room.d / 2 + 0.25; v += 0.05) {
        const p = at(0, front * v);
        assert.ok(instituteWalkable(room, p.x, p.z), 'a continuous doorway is required');
      }
      const outside = at(0, front * (room.d / 2 + 0.3));
      assert.equal(insideInstitute(room, outside.x, outside.z), false);
      for (const rect of [
        ...([0, 1, 2, 3] satisfies [number, number, number, number]).flatMap((side) =>
          instituteWallRects(room, side),
        ),
        ...instituteFixtures(room),
      ]) {
        const p = at(rect.x + rect.w / 2, rect.z + rect.d / 2);
        assert.equal(
          instituteWalkable(room, p.x, p.z),
          false,
          String('kind' in rect ? rect.kind : 'wall'),
        );
      }
      const hit = raycastInstituteFloor(room, {
        origin: [center.x, 20, center.z],
        dir: [0, -1, 0] satisfies [number, number, number],
      });
      assert.ok(hit);
      assert.ok(Math.abs(hit.point[1] - room.base - INSTITUTE_FLOOR_HEIGHT) < 1e-8);
      assert.equal(
        raycastInstituteFloor(room, {
          origin: [outside.x, 20, outside.z],
          dir: [0, -1, 0] satisfies [number, number, number],
        }),
        null,
      );
    }
});

test('roof and near walls lift toward the actual camera, including the rotated Berkeley institute', () => {
  const sections = [
    { kind: 'floor' },
    ...([0, 1, 2, 3] satisfies [number, number, number, number]).map((side) => ({
      kind: 'wall',
      side,
    })),
    { kind: 'roof' },
  ];
  for (const rotation of [0, 0.6, Math.PI / 2] satisfies [number, number, number])
    for (let step = 0; step < 16; step++) {
      const room = { x: 10, z: 15, w: 7, d: 4.9, base: 1, rotation },
        angle = (step * Math.PI) / 8 + 0.03,
        eye = [room.x + Math.cos(angle) * 20, 12, room.z + Math.sin(angle) * 20] satisfies [
          number,
          number,
          number,
        ];
      assert.deepEqual(instituteHiddenSections(room, sections, eye, false), []);
      const hidden = instituteHiddenSections(room, sections, eye, true);
      assert.ok(hidden.includes(requiredFixture(sections.at(-1))));
      assert.equal(hidden.includes(sections[0]), false);
      const localAngle = angle - rotation,
        normals = [
          -Math.sin(localAngle),
          Math.sin(localAngle),
          -Math.cos(localAngle),
          Math.cos(localAngle),
        ] satisfies [number, number, number, number];
      for (let side = 0; side < 4; side++)
        assert.equal(hidden.includes(sections[side + 1]), normals[side] > 1e-7);
    }
});

test('all three authored institutes detach complete nonoverlapping sections without duplicating exterior geometry', () => {
  const drawSouth = (mesh: Mesh, separate: boolean) =>
    drawResearchCampuses(mesh, new Map(), { separateInteriors: separate });
  const campus = createEsotericCampus(createFerrari(createRegionalRoad()));
  const drawBerkeley = (mesh: Mesh, separate: boolean) => [
    campus.draw(mesh, new Map(), { separateInterior: separate }),
  ];
  for (const draw of [drawSouth, drawBerkeley]) {
    const combined = new Mesh(),
      outside = new Mesh(),
      full = draw(combined, false),
      sites = draw(outside, true);
    assert.equal(
      outside.data.length +
        sites.reduce((n, s) => n + requiredFixture(s.interior).mesh.data.length, 0),
      combined.data.length,
    );
    for (const [i, site] of sites.entries()) {
      const { mesh, sections, spec } = requiredFixture(site.interior);
      assert.ok(site.enterableInstitute);
      assert.deepEqual(site.lo, full[i].lo);
      assert.deepEqual(site.hi, full[i].hi);
      assert.ok(mesh.data.every(Number.isFinite));
      assert.equal(sections.filter((s) => s.kind === 'wall').length, 4);
      assert.equal(sections.filter((s) => s.kind === 'roof').length, 1);
      let next = 0;
      for (const section of sections) {
        assert.equal(section.start, next);
        assert.equal(section.count % 3, 0);
        assert.ok(section.count > 0);
        next += section.count;
      }
      assert.equal(next, mesh.data.length / 11);
      assert.ok(
        insideInstitute(
          spec,
          requiredFixture(site.inside).x + 0.5,
          requiredFixture(site.inside).y + 0.5,
        ),
      );
    }
  }
  assert.equal(RESEARCH_CAMPUSES.length, 2);
});
