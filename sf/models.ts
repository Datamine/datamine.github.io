import { requiredValue } from './types/assert.ts';
import type { ModelContext, ResidentFixture } from './types/model-context.ts';
import type { BuildingDefinition, BuildingModel, WallSection } from './types/buildings.ts';
import type { WorldObject, Place } from './types/world.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { drawBicycle } from './bicycle-model.ts';
import { inSearchHousePlot } from './southern-layout.ts';
import { drawSearchHouseInterior } from './search-house-models.ts';
import { drawPiercedWall } from './wall-openings.ts';
import { drawAILabInterior } from './ai-lab.ts';
import {
  drawGuildInterior,
  drawTechnologistMarketInterior,
  drawGuildEmblem,
} from './guild-models.ts';
import { drawBankInterior, drawBankBillboard } from './bank-models.ts';
import { Mesh, rand, tint, unit, pose } from './geometry.ts';
import { createRestaurantPatio } from './restaurants.ts';
import { createHousing } from './housing.ts';
import { drawFacadeWindow } from './windows.ts';
import { CITY_HALL, drawCityHall } from './city-hall.ts';
import { drawBrickOfficeTower } from './offices.ts';
import { drawCommercialRoof } from './rooftops.ts';
import { drawCharacter } from './characters.ts';
import { SUTRO_SITE, drawSutroTower } from './sutro.ts';
import {
  DOWNTOWN,
  drawFerryBuilding,
  drawSalesforce,
  drawCoitTower,
  drawBayBridge,
} from './downtown.ts';
import { drawSomaPyramid } from './soma-pyramid.ts';
import { TRANSAMERICA_PYRAMID, drawTransamericaPyramid } from './transamerica.ts';
import type { Material } from './types/geometry.ts';

/** Mesh construction only; the world owns placement, navigation and GPU state. */
export function createModels({
  N,
  MAP_SCALE,
  mapTile,
  mapPosition,
  layoutPosition,
  terrainHeight,
  naturalHeight,
  cutHousePlot,
  occupy,
  upload,
  objects,
  signs,
  buildingModels,
  sightById,
  canPlaceScenery,
  isWalkable,
  pavingInArea,
  insidePolygon,
  parcelFits,
  COAST,
  MARIN,
  POND,
  PANHANDLE,
  lakes,
  getSceneMesh,
  rectangle,
}: ModelContext) {
  function sign(
    m: Mesh,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    name: string,
    side = 'front',
  ) {
    const uv = signs.get(name);
    if (!uv) return;
    if (side === 'front')
      m.quad(
        [x - w / 2, y, z] satisfies [number, number, number],
        [x + w / 2, y, z] satisfies [number, number, number],
        [x + w / 2, y + h, z] satisfies [number, number, number],
        [x - w / 2, y + h, z] satisfies [number, number, number],
        '#ffffff',
        uv,
      );
    else
      m.quad(
        [x, y, z + w / 2] satisfies [number, number, number],
        [x, y, z - w / 2] satisfies [number, number, number],
        [x, y + h, z - w / 2] satisfies [number, number, number],
        [x, y + h, z + w / 2] satisfies [number, number, number],
        '#ffffff',
        uv,
      );
  }
  function registerObject<T extends WorldObject>(
    m: Mesh,
    start: number,
    info: T,
    end = m.data.length,
  ): T & WorldObject & { mesh: Mesh; start: number; count: number; lo: number[]; hi: number[] } {
    const lo = [Infinity, Infinity, Infinity] satisfies [number, number, number],
      hi = [-Infinity, -Infinity, -Infinity] satisfies [number, number, number];
    for (let i = start; i < end; i += 11)
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], m.data[i + k]);
        hi[k] = Math.max(hi[k], m.data[i + k]);
      }
    const o = { ...info, mesh: m, start: start / 11, count: (end - start) / 11, lo, hi };
    objects.push(o);
    if (o.place) o.place.object = o;
    if (o.sight) o.sight.object = o;
    return o;
  }
  function gable(
    m: Mesh,
    x: number,
    y: number,
    z: number,
    w: number,
    d: number,
    rise: number,
    color: string,
  ) {
    m.tri(
      [x, y, z + d] satisfies [number, number, number],
      [x + w, y, z + d] satisfies [number, number, number],
      [x + w / 2, y + rise, z + d] satisfies [number, number, number],
      tint(color, 10),
    );
    m.tri(
      [x + w, y, z] satisfies [number, number, number],
      [x, y, z] satisfies [number, number, number],
      [x + w / 2, y + rise, z] satisfies [number, number, number],
      color,
    );
    m.quad(
      [x, y, z] satisfies [number, number, number],
      [x, y, z + d] satisfies [number, number, number],
      [x + w / 2, y + rise, z + d] satisfies [number, number, number],
      [x + w / 2, y + rise, z] satisfies [number, number, number],
      color,
    );
    m.quad(
      [x + w / 2, y + rise, z] satisfies [number, number, number],
      [x + w / 2, y + rise, z + d] satisfies [number, number, number],
      [x + w, y, z + d] satisfies [number, number, number],
      [x + w, y, z] satisfies [number, number, number],
      tint(color, -18),
    );
  }

  function furniture(m: Mesh, b: BuildingDefinition, base: number) {
    const { x, y: z, w, d, id } = b;
    const residents: ResidentFixture[] = [];
    if (b.searchDefinition) {
      drawSearchHouseInterior(m, b, base);
      return residents;
    }
    if (id === 'ai-lab') {
      drawAILabInterior(m, b, base);
      return residents;
    }
    if (id === 'green') {
      drawBankInterior(m, b, base);
      return residents;
    }
    if (id === 'freemasons-guild') {
      drawGuildInterior(m, b, base);
      b.interiorObstacles = [
        [
          [x + 0.2, z + 0.6],
          [x + 0.65, z + 0.6],
          [x + 0.65, z + d - 0.7],
          [x + 0.2, z + d - 0.7],
        ],
        [
          [x + w - 0.65, z + 0.6],
          [x + w - 0.2, z + 0.6],
          [x + w - 0.2, z + d - 0.7] satisfies [number, number],
          [x + w - 0.65, z + d - 0.7] satisfies [number, number],
        ],
        [
          [x + w / 2 - 0.6, z + 0.25],
          [x + w / 2 + 0.6, z + 0.25],
          [x + w / 2 + 0.6, z + 0.8],
          [x + w / 2 - 0.6, z + 0.8],
        ],
      ];
      return residents;
    }
    if (id === 'sunset-whole-foods') {
      drawTechnologistMarketInterior(m, b, base);
      b.interiorObstacles = [
        ...[[x + 0.25, 0.45], [x + w - 0.7, 0.45] satisfies [number, number]].map(([xx, ww]) => [
          [xx, z + 0.3],
          [xx + ww, z + 0.3],
          [xx + ww, z + d - 0.7],
          [xx, z + d - 0.7],
        ]),
        [
          [x + w / 2 - 0.5, z + 0.25],
          [x + w / 2 + 0.5, z + 0.25],
          [x + w / 2 + 0.5, z + 0.65],
          [x + w / 2 - 0.5, z + 0.65],
        ],
      ];
      return residents;
    }
    m.box(x + 0.6, base + 0.025, z + 0.5, w - 1.2, 0.035, Math.max(0.6, d - 1), '#88533c');
    if (id === 'writing' || id === 'books') {
      for (let i = 0; i < w - 1; i++) {
        m.box(x + 0.2 + i * 0.85, base, z + 0.18, 0.72, 1.15, 0.25, '#60482f');
        for (let row = 0; row < 3; row++)
          for (let j = 0; j < 5; j++)
            m.box(
              x + 0.24 + i * 0.85 + j * 0.12,
              base + 0.12 + row * 0.32,
              z + 0.4,
              0.08,
              0.23 + (j % 2) * 0.04,
              0.07,
              (
                ['#8e503f', '#5d7449', '#b69d55', '#697b82', '#bd8c63'] satisfies [
                  string,
                  string,
                  string,
                  string,
                  string,
                ]
              )[(j + row) % 5],
            );
      }
    } else if (id === 'home') {
      m.box(x + 0.2, base, z + 0.25, 0.7, 0.45, 1, '#697748');
      m.box(x + 0.22, base + 0.45, z + 0.25, 0.65, 0.12, 0.9, '#c1b18c');
      m.box(x + w - 0.7, base, z + 0.2, 0.45, 0.7, 0.65, '#826347');
    } else {
      m.box(x + 0.2, base, z + 0.22, w - 0.45, 0.78, 0.35, '#795537');
      m.box(x + 0.15, base + 0.78, z + 0.17, w - 0.35, 0.08, 0.45, '#b59c6b');
      for (let i = 0; i < 3; i++)
        m.box(
          x + 0.4 + i * 0.65,
          base + 0.87,
          z + 0.23,
          0.32,
          0.1,
          0.22,
          (['#a59d75', '#d2bd8c', '#a36f52'] satisfies [string, string, string])[i],
        );
    }
    if (id === 'links') {
      const nx = x + 0.65,
        nz = z + 1.92,
        tx = nx,
        tz = z + 1.25;
      m.cylinder(tx, base, tz, 0.045, 0.7, '#50635b', 12);
      m.cylinder(tx, base + 0.7, tz, 0.28, 0.055, '#c4a17b', 24);
      m.cylinder(tx + 0.04, base + 0.755, tz + 0.04, 0.055, 0.085, '#f0e5cf', 16);
      m.cylinder(tx + 0.04, base + 0.842, tz + 0.04, 0.042, 0.005, '#6c4e36', 16);
      m.box(nx - 0.16, base + 0.43, nz - 0.15, 0.32, 0.065, 0.34, '#816447', 'wood');
      m.box(nx - 0.16, base + 0.49, nz + 0.15, 0.32, 0.48, 0.045, '#816447', 'wood');
      for (const dx of [-0.13, 0.13] satisfies [number, number])
        for (const dz of [-0.12, 0.15] satisfies [number, number])
          m.rod(
            [nx + dx, base + 0.02, nz + dz],
            [nx + dx, base + 0.44, nz + dz],
            0.025,
            '#4d5d54',
            8,
          );
      const start = m.data.length;
      human(m, nx, nz, base + 0.035, -Math.PI / 2, 0, true, '#9e6e4b', '#b8896d', {
        female: true,
        hairstyle: 'curly',
        backpack: false,
        mode: 'sit',
      });
      residents.push({
        start,
        end: m.data.length,
        x: nx,
        z: nz,
        base: base + 0.035,
        fixture: { cx: nx, cz: z + 1.55, w: 0.65, d: 1.3 },
      });
      m.box(x + 0.3, base + 0.87, z + 0.25, 0.34, 0.28, 0.25, '#afb5ac', { metal: 0.35 });
      m.box(x + 0.35, base + 1.15, z + 0.27, 0.24, 0.065, 0.2, '#657d75');
    } else m.box(x + 0.2, base, z + d - 0.9, 0.4, 0.42, 0.45, '#785638');
    return residents;
  }
  function facadeBox(
    m: Mesh,
    isX: boolean,
    plane: number,
    along: number,
    y: number,
    w: number,
    h: number,
    depth: number,
    color: string,
    far: boolean,
    material: (Material | undefined) | null = null,
  ) {
    if (isX) m.box(plane - (far ? depth : 0), y, along, depth, h, w, color, material);
    else m.box(along, y, plane - (far ? depth : 0), w, h, depth, color, material);
  }
  function sashWindow(
    m: Mesh,
    isX: boolean,
    plane: number,
    along: number,
    y: number,
    w: number,
    h: number,
    far: boolean,
    bay = false,
    trim = '#e9ddc4',
    seed = 0,
  ) {
    drawFacadeWindow(m, { isX, plane, along, y, w, h, far, bay, trim, seed });
  }
  function makeBuilding(b: Place, enterable: true): BuildingModel;
  function makeBuilding(b: BuildingDefinition, enterable?: false): WorldObject;
  function makeBuilding(b: BuildingDefinition, enterable = false): WorldObject {
    const { x, y: z, w, d, color, style } = b,
      arch =
        b.arch ||
        (style === 'bank'
          ? 'beauxarts'
          : style === 'victorian'
            ? 'victorian'
            : style === 'cafe'
              ? 'cafe'
              : style === 'library'
                ? 'bookshop'
                : style === 'kiosk'
                  ? 'newsstand'
                  : style === 'civic'
                    ? 'civic'
                    : style === 'barracks'
                      ? 'presidio'
                      : 'shop');
    const bodyMaterial =
      arch === 'warehouse'
        ? 'brick'
        : arch === 'office' || arch === 'civic' || arch === 'beauxarts'
          ? 'stone'
          : 'clapboard';
    const H = b.worldHeight || (arch === 'newsstand' ? 1.85 : 1.5 + b.h! / 55),
      corners = [
        [x, z],
        [x + w, z],
        [x + w, z + d],
        [x, z + d],
      ].map(([xx, zz]) => terrainHeight(xx, zz)),
      base = (enterable ? terrainHeight(x + w / 2, z + d / 2) : Math.max(...corners)) + 0.025;
    const m = enterable ? new Mesh() : getSceneMesh(),
      start = m.data.length,
      door = b.localDoor ?? (b.inside ? b.inside.x : x + w * 0.52 - Math.min(0.26, w * 0.2)),
      doorWidth = b.inside ? 1 : Math.min(0.48, w * 0.42),
      trim = b.trim || '#e4d8bf';
    const foot = Math.min(...corners) - 0.19;
    m.box(x - 0.055, foot, z - 0.055, w + 0.11, base - foot + 0.03, d + 0.11, '#a8a38e', 'stone');
    const residents = enterable ? furniture(m, b, base + 0.025) : [];
    if (enterable) {
      for (const [wx, wz, ww, dd] of [
        [x, z, w, 0.1],
        [x, z, 0.1, d],
        [x + w - 0.1, z, 0.1, d],
        [x, z + d - 0.1, door - x, 0.1],
        [door + 1, z + d - 0.1, x + w - door - 1, 0.1],
      ])
        if (ww > 0) m.box(wx, base, wz, ww, 0.31, dd, color);
    }
    const permanent = { start: start / 11, count: (m.data.length - start) / 11 },
      walls: WallSection[] = [];
    for (let side = 0; side < 4; side++) {
      const begin = m.data.length,
        isX = side >= 2,
        far = side % 2 === 0,
        plane = isX ? (far ? x : x + w) : far ? z : z + d,
        span = isX ? d : w,
        along = isX ? z : x,
        wx = isX ? (far ? x : x + w - 0.1) : x,
        wz = isX ? z : far ? z : z + d - 0.1;
      const openings = [],
        windowSpecs = [];
      const floors = arch === 'office' ? Math.max(2, Math.floor(H / 0.7)) : H > 2.45 ? 2 : 1,
        spacing = arch === 'office' ? 0.7 : 1.05;
      for (let floor = 0; floor < floors; floor++) {
        const count = Math.max(1, Math.floor((span - 0.12) / 0.68)),
          ww = Math.min(0.39, ((span - 0.22) / count) * 0.65),
          gap = span / count;
        for (let i = 0; i < count; i++) {
          const at = along + gap * (i + 0.5) - ww / 2;
          if (side === 1 && at + ww > door && at < door + doorWidth && floor === 0) continue;
          const yy = base + 0.65 + floor * spacing,
            hh = arch === 'office' ? 0.43 : 0.57;
          if (yy + hh > base + H - 0.2) continue;
          windowSpecs.push({
            isX,
            plane: plane + (far ? -0.006 : 0.006),
            along: at,
            y: yy,
            w: ww,
            h: hh,
            far,
            bay: !enterable && (arch === 'victorian' || arch === 'rowhouse') && floor > 0,
            trim,
            seed: i + floor,
            transparent: enterable,
            wallDepth: 0.112,
          });
          openings.push({ x: at, y: yy, w: ww, h: hh });
        }
      }
      if (enterable) {
        if (side === 1) openings.push({ x: door, y: base + 0.31, w: 1, h: 1.41 });
        drawPiercedWall(m, {
          isX,
          plane,
          along,
          y: base + 0.31,
          w: span,
          h: H - 0.31,
          depth: 0.1,
          far,
          color,
          material: bodyMaterial,
          openings,
        });
      } else m.box(wx, base, wz, isX ? 0.1 : w, H, isX ? d : 0.1, color, bodyMaterial);
      for (const spec of windowSpecs) drawFacadeWindow(m, spec);
      if (arch === 'victorian' || arch === 'rowhouse' || arch === 'beauxarts' || arch === 'civic')
        for (let floor = 0; floor < floors; floor++)
          facadeBox(
            m,
            isX,
            plane,
            along - 0.025,
            base + 0.48 + floor * spacing,
            span + 0.05,
            0.045,
            0.045,
            trim,
            far,
          );
      facadeBox(m, isX, plane, along - 0.04, base + H - 0.12, span + 0.08, 0.1, 0.09, trim, far);
      if (arch === 'victorian' || arch === 'beauxarts' || arch === 'civic')
        for (let i = 0.13; i < span - 0.05; i += 0.33)
          facadeBox(m, isX, plane, along + i, base + H - 0.26, 0.055, 0.14, 0.075, trim, far);
      if (arch === 'beauxarts' || arch === 'civic')
        for (let i = 0.12; i < span; i += 0.72)
          if (!enterable || !openings.some((o) => along + i < o.x + o.w && along + i + 0.085 > o.x))
            facadeBox(
              m,
              isX,
              plane,
              along + i,
              base + 0.2,
              0.085,
              H - 0.4,
              0.075,
              tint(trim, -8),
              far,
            );
      if (side === 1) {
        if (b.id === 'freemasons-guild') drawGuildEmblem(m, b, base, H);
        for (const xx of [door - 0.055, door + doorWidth])
          m.box(xx, base, z + d + 0.008, 0.055, 1.73, 0.065, trim);
        m.box(door - 0.06, base + 1.7, z + d + 0.008, doorWidth + 0.12, 0.08, 0.075, trim);
        if (!enterable) {
          m.box(door, base + 0.03, z + d + 0.012, doorWidth, 1.62, 0.035, b.doorColor || '#455e54');
          m.box(
            door + 0.07,
            base + 0.85,
            z + d + 0.05,
            Math.max(0.12, doorWidth - 0.14),
            0.55,
            0.012,
            '#8ba9a1',
          );
          m.sphere(
            door + doorWidth - 0.065,
            base + 0.74,
            z + d + 0.07,
            0.02,
            0.02,
            0.02,
            '#cfb776',
            5,
            3,
          );
        }
        for (let step = 0; step < 3; step++)
          m.box(
            door - 0.07,
            base - 0.04,
            z + d + 0.03 + step * 0.07,
            doorWidth + 0.14,
            0.12 - step * 0.027,
            0.075,
            '#bdb7a0',
          );
        if (b.name)
          sign(
            m,
            x + w / 2,
            base + H - 0.53,
            z + d + 0.105,
            Math.min(w - 0.14, 2.7),
            0.32 + (b.signText?.includes('\n') ? 0.16 : 0),
            b.signText || b.name,
          );
      }
      if (b.name && side === 3)
        sign(
          m,
          x + w + 0.105,
          base + H - 0.53,
          z + d / 2,
          Math.min(d - 0.14, 2.7),
          0.32 + (b.signText?.includes('\n') ? 0.16 : 0),
          b.signText || b.name,
          'side',
        );
      walls.push({
        side,
        windows: windowSpecs,
        start: begin / 11,
        count: (m.data.length - begin) / 11,
      });
    }
    let roofDetails;
    const roofStart = m.data.length,
      roof =
        b.roof ||
        (arch === 'office' ||
        arch === 'warehouse' ||
        arch === 'rowhouse' ||
        arch === 'civic' ||
        arch === 'beauxarts'
          ? 'flat'
          : arch === 'victorian'
            ? 'gable'
            : 'hip'),
      roofColor =
        b.roofColor ||
        (arch === 'newsstand'
          ? '#9e6247'
          : arch === 'presidio'
            ? '#b56e50'
            : arch === 'office'
              ? '#82928e'
              : '#82796b'),
      rise = roof === 'gable' ? 0.65 : roof === 'hip' ? 0.4 : 0.18;
    m.box(x - 0.065, base + H, z - 0.065, w + 0.13, 0.09, d + 0.13, trim);
    if (roof === 'flat') {
      if (w >= 1.6 && d >= 0.9)
        roofDetails = drawCommercialRoof(m, {
          x: x + 0.015,
          y: base + H + 0.09,
          z: z + 0.015,
          w: w - 0.03,
          d: d - 0.03,
          seed: rand(x, z, 17) + x * 0.19 + z * 0.37,
          surfaceColor: b.roofColor || null,
        });
      else {
        m.box(x + 0.03, base + H + 0.09, z + 0.03, w - 0.06, 0.045, d - 0.06, roofColor, 'roof');
        for (const [xx, zz, ww, dd] of [
          [x - 0.04, z - 0.04, w + 0.08, 0.065],
          [x - 0.04, z + d - 0.025, w + 0.08, 0.065],
          [x - 0.04, z, 0.065, d],
          [x + w - 0.025, z, 0.065, d],
        ])
          m.box(xx, base + H + 0.09, zz, ww, 0.18, dd, trim);
        m.box(
          x + w * 0.3,
          base + H + 0.13,
          z + d * 0.3,
          Math.min(0.32, w * 0.35),
          0.11,
          Math.min(0.4, d * 0.4),
          '#a9b8ae',
        );
        m.box(
          x + w * 0.35,
          base + H + 0.24,
          z + d * 0.35,
          Math.min(0.22, w * 0.25),
          0.035,
          Math.min(0.28, d * 0.28),
          '#729491',
        );
      }
    } else if (roof === 'gable') {
      gable(m, x - 0.09, base + H + 0.09, z - 0.09, w + 0.18, d + 0.18, rise, roofColor);
      for (let i = 0.23; i < d; i += 0.3) {
        m.rod(
          [x - 0.08, base + H + 0.1, z + i],
          [x + w / 2, base + H + 0.09 + rise, z + i],
          0.009,
          tint(roofColor, -15),
          4,
        );
        m.rod(
          [x + w / 2, base + H + 0.09 + rise, z + i],
          [x + w + 0.08, base + H + 0.1, z + i],
          0.009,
          tint(roofColor, -15),
          4,
        );
      }
      m.rod(
        [x - 0.09, base + H + 0.1, z + d + 0.095],
        [x + w / 2, base + H + 0.1 + rise, z + d + 0.095],
        0.027,
        trim,
        5,
      );
      m.rod(
        [x + w / 2, base + H + 0.1 + rise, z + d + 0.095],
        [x + w + 0.09, base + H + 0.1, z + d + 0.095],
        0.027,
        trim,
        5,
      );
      if (w > 1.2) {
        m.box(x + w * 0.43, base + H + 0.22, z + d * 0.23, w * 0.2, 0.27, 0.3, color);
        gable(m, x + w * 0.42, base + H + 0.49, z + d * 0.22, w * 0.22, 0.32, 0.18, roofColor);
      }
    } else {
      const top = [x + w / 2, base + H + 0.09 + rise, z + d / 2],
        a = [x - 0.08, base + H + 0.09, z - 0.08],
        b = [x + w + 0.08, base + H + 0.09, z - 0.08],
        c = [x + w + 0.08, base + H + 0.09, z + d + 0.08],
        e = [x - 0.08, base + H + 0.09, z + d + 0.08];
      m.tri(a, top, b, roofColor);
      m.tri(b, top, c, tint(roofColor, -12));
      m.tri(c, top, e, roofColor);
      m.tri(e, top, a, tint(roofColor, 8));
    }
    if (!roofDetails) {
      m.box(x + w * 0.2, base + H + 0.06, z + d * 0.22, 0.14, 0.48, 0.18, '#9f8a70');
      m.box(
        x + w * 0.2 - 0.025,
        base + H + 0.52,
        z + d * 0.22 - 0.025,
        0.19,
        0.06,
        0.23,
        '#bba88a',
      );
    }
    const rooftopBillboard = b.id === 'green' ? { art: 'green-bank-roof', height: 2 } : null;
    if (rooftopBillboard) drawBankBillboard(m, b, base + H + 0.13, signs);
    const roofRange = { start: roofStart / 11, count: (m.data.length - roofStart) / 11 };
    if (
      (arch === 'cafe' || arch === 'shop' || arch === 'bookshop' || arch === 'newsstand') &&
      w > 1.3
    ) {
      for (let i = 0; i < 12; i++) {
        const xx = x + (i * w) / 12;
        m.quad(
          [xx, base + 1.93, z + d + 0.025],
          [xx + w / 12, base + 1.93, z + d + 0.025],
          [xx + w / 12, base + 1.7, z + d + 0.42],
          [xx, base + 1.7, z + d + 0.42],
          i % 2 ? '#f1e3c8' : arch === 'cafe' ? '#486e72' : '#658267',
        );
        m.quad(
          [xx, base + 1.7, z + d + 0.42],
          [xx + w / 12, base + 1.7, z + d + 0.42],
          [xx + w / 12, base + 1.6, z + d + 0.42],
          [xx, base + 1.6, z + d + 0.42],
          i % 2 ? '#f1e3c8' : '#527868',
        );
      }
    }
    if (b.rotation) {
      const c = Math.cos(b.rotation),
        s = Math.sin(b.rotation),
        cx = x + w / 2,
        cz = z + d / 2;
      for (let i = start; i < m.data.length; i += 11) {
        const dx = m.data[i] - cx,
          dz = m.data[i + 2] - cz,
          nx = m.data[i + 3],
          nz = m.data[i + 5];
        m.data[i] = cx + dx * c - dz * s;
        m.data[i + 2] = cz + dx * s + dz * c;
        m.data[i + 3] = nx * c - nz * s;
        m.data[i + 5] = nx * s + nz * c;
        if (m.data[i + 9] < -1.5) m.data[i + 10] += b.rotation;
      }
    }
    const o = registerObject(m, start, {
      x,
      y: z,
      w,
      d,
      h: H + Math.max(rise + 0.65, (roofDetails?.height || 0) + 0.2, rooftopBillboard?.height || 0),
      place: enterable ? (b as Place) : null,
      sight: b.sight || null,
      base,
      arch,
      rotation: b.rotation || 0,
      footprint: b.footprint || null,
      roofDetails,
      rooftopBillboard,
    });
    for (const resident of residents) {
      const angle = b.rotation || 0,
        c = Math.cos(angle),
        s = Math.sin(angle),
        cx = x + w / 2,
        cz = z + d / 2,
        point = (xx: number, zz: number) => [
          cx + (xx - cx) * c - (zz - cz) * s,
          cz + (xx - cx) * s + (zz - cz) * c,
        ],
        at = point(resident.x, resident.z),
        fixture = resident.fixture,
        center = point(fixture.cx, fixture.cz);
      const sight = sightById('nia')!,
        entry = point(x + 1.5, resident.z);
      sight.entry = { x: entry[0] - 0.5, y: entry[1] - 0.5 };
      sight.mapPoint = { x: at[0], y: at[1] };
      registerObject(
        m,
        resident.start,
        {
          x: center[0] - fixture.w / 2,
          y: center[1] - fixture.d / 2,
          w: fixture.w,
          d: fixture.d,
          h: 1.7,
          base: resident.base,
          rotation: angle,
          solid: true,
          sight,
          interior: b as Place,
          character: { x: at[0], z: at[1], base: resident.base, height: 1.7 },
          footprint: rectangle(center[0], center[1], fixture.w, fixture.d, angle),
        },
        resident.end,
      );
    }
    if (enterable) {
      const built = Object.assign(o, {
        gpu: upload(m),
        permanent,
        walls,
        roof: roofRange,
        extras: {
          start: roofRange.start + roofRange.count,
          count: m.data.length / 11 - roofRange.start - roofRange.count,
        },
      });
      buildingModels.push(built);
      return built;
    }
    return o;
  }
  function addScenery(
    id: string | null,
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    draw: (mesh: Mesh, base: number) => void,
    solid = false,
  ) {
    if (solid) occupy(x, z, w, d);
    const start = getSceneMesh().data.length;
    draw(getSceneMesh(), terrainHeight(x + w / 2, z + d / 2));
    return registerObject(getSceneMesh(), start, {
      x,
      y: z,
      w,
      d,
      h,
      sight: id ? sightById(id) : null,
      base: terrainHeight(x + w / 2, z + d / 2),
      solid,
    });
  }
  const landmarkAnchors = new Map([
    ['palace', [32, 12] satisfies [number, number]],
    ['chinatown', [45, 22] satisfies [number, number]],
  ]);
  function mapOccupy(
    x: number,
    z: number,
    w = 1,
    d = 1,
    anchor = [x, z] satisfies [number, number],
  ) {
    occupy(x + mapTile(anchor[0]) - anchor[0], z + mapTile(anchor[1]) - anchor[1], w, d);
  }
  function mapBuilding(b: BuildingDefinition) {
    return makeBuilding({ ...b, x: mapTile(b.x), y: mapTile(b.y) });
  }
  function mapTree(x: number, z: number, kind: number | boolean = false) {
    return tree(mapTile(x), mapTile(z), kind);
  }
  function mapCanPlace(x: number, z: number, w = 1, d = 1) {
    return canPlaceScenery(mapTile(x), mapTile(z), w, d);
  }
  function referenceHeight(x: number, z: number) {
    return terrainHeight(mapPosition(x), mapPosition(z));
  }
  function mapScenery(
    id: string | null,
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    draw: (mesh: Mesh, base: number) => void,
    solid = false,
  ) {
    const stretched = id === 'golden' || id === 'baybridge';
    if (id && !landmarkAnchors.has(id)) landmarkAnchors.set(id, [x, z] satisfies [number, number]);
    const anchor =
        (id ? landmarkAnchors.get(id) : undefined) || ([x, z] satisfies [number, number]),
      dx = mapTile(anchor[0]) - anchor[0],
      dz = mapTile(anchor[1]) - anchor[1];
    return addScenery(
      id,
      stretched ? mapPosition(x) : x + dx,
      stretched ? mapPosition(z) : z + dz,
      stretched ? w * MAP_SCALE : w,
      stretched ? d * MAP_SCALE : d,
      h,
      (m, base) => {
        const start = m.data.length;
        draw(m, base);
        for (let i = start; i < m.data.length; i += 11) {
          m.data[i] = stretched ? mapPosition(m.data[i]) : m.data[i] + dx;
          m.data[i + 2] = stretched ? mapPosition(m.data[i + 2]) : m.data[i + 2] + dz;
          if (stretched) {
            const normal = unit([
              m.data[i + 3] / MAP_SCALE,
              m.data[i + 4],
              m.data[i + 5] / MAP_SCALE,
            ]);
            m.data[i + 3] = normal[0];
            m.data[i + 4] = normal[1];
            m.data[i + 5] = normal[2];
          }
        }
      },
      solid,
    );
  }
  function palm(m: Mesh, x: number, z: number, h: number) {
    m.rod(
      [x, h, z] satisfies [number, number, number],
      [x + 0.08, h + 1.9, z] satisfies [number, number, number],
      0.065,
      '#8e7650',
      7,
    );
    m.sphere(x + 0.08, h + 1.94, z, 0.16, 0.18, 0.16, '#71844c', 7, 3);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4,
        mid = [x + 0.08 + Math.cos(a) * 0.4, h + 2.14, z + Math.sin(a) * 0.4] satisfies [
          number,
          number,
          number,
        ],
        end = [x + 0.08 + Math.cos(a) * 0.8, h + 1.74, z + Math.sin(a) * 0.8] satisfies [
          number,
          number,
          number,
        ];
      m.rod([x + 0.08, h + 1.96, z] satisfies [number, number, number], mid, 0.036, '#6f8f4c', 4);
      m.rod(mid, end, 0.026, '#668746', 4);
      m.tri(
        [x + 0.08, h + 2, z] satisfies [number, number, number],
        [mid[0] - Math.sin(a) * 0.12, mid[1], mid[2] + Math.cos(a) * 0.12] satisfies [
          number,
          number,
          number,
        ],
        end,
        '#789b54',
      );
      m.tri(
        [x + 0.08, h + 2, z] satisfies [number, number, number],
        end,
        [mid[0] + Math.sin(a) * 0.12, mid[1], mid[2] - Math.cos(a) * 0.12] satisfies [
          number,
          number,
          number,
        ],
        '#648447',
      );
    }
  }
  function tree(x: number, z: number, kind: number | boolean = false, trunkOnly = false) {
    if (inSearchHousePlot(x + 0.5, z + 0.5, 0.9)) return null;
    if (!trunkOnly) occupy(x, z);
    const size = trunkOnly ? 0.18 : 1,
      inset = (1 - size) / 2;
    const object = addScenery(
      null,
      x + inset,
      z + inset,
      size,
      size,
      3.3,
      (m, h) => {
        const px = x + 0.5,
          pz = z + 0.5,
          seed = rand(x, z, 32);
        if (kind === 2) {
          palm(m, px, pz, h);
          return;
        }
        m.cylinder(px, h, pz, 0.075, 1.45, '#806044', 7, 0.05);
        if (kind === true || kind === 1) {
          for (let i = 0; i < 4; i++)
            m.cylinder(
              px,
              h + 0.65 + i * 0.48,
              pz,
              0.58 - i * 0.1,
              0.9,
              i % 2 ? '#6f8958' : '#607c50',
              8,
              0,
            );
        } else {
          for (const [dx, dz, dy] of [
            [-0.35, 0.12, 1.45] satisfies [number, number, number],
            [0.34, -0.12, 1.7] satisfies [number, number, number],
            [0.05, 0.3, 1.9] satisfies [number, number, number],
            [-0.08, -0.24, 2.08] satisfies [number, number, number],
          ]) {
            m.rod(
              [px, h + 1, pz] satisfies [number, number, number],
              [px + dx, h + dy, pz + dz] satisfies [number, number, number],
              0.035,
              '#806044',
              5,
            );
            m.sphere(
              px + dx,
              h + dy + 0.2,
              pz + dz,
              0.5 + seed * 0.12,
              kind === 3 ? 0.25 : 0.43,
              0.48,
              seed > 0.5 ? '#739053' : '#69894e',
              8,
              4,
            );
          }
        }
      },
      true,
    );
    // Trees block movement, but inherit the existing ground rather than
    // painting a building foundation or flattening a square into the hill.
    object.scenery = 'tree';
    object.preserveGround = true;
    return object;
  }
  function bench(x: number, z: number) {
    occupy(x, z);
    const object = addScenery(
      null,
      x,
      z,
      1,
      1,
      0.65,
      (m, h) => {
        m.box(x + 0.1, h + 0.35, z + 0.2, 0.8, 0.1, 0.35, '#9c7850');
        m.box(x + 0.1, h + 0.4, z + 0.18, 0.8, 0.32, 0.08, '#a58558');
        for (const xx of [x + 0.2, x + 0.75] satisfies [number, number])
          m.box(xx, h, z + 0.24, 0.07, 0.36, 0.23, '#525c4c');
      },
      true,
    );
    object.preserveGround = true;
    return object;
  }
  function human(...args: Parameters<typeof drawCharacter>) {
    return drawCharacter(...args);
  }
  const bicycle = drawBicycle;
  function addPanhandleDetails() {
    const west = mapPosition(PANHANDLE.west),
      east = mapPosition(PANHANDLE.east),
      north = mapPosition(PANHANDLE.north),
      south = mapPosition(PANHANDLE.south);
    const m = getSceneMesh();
    // Broad crowns on small trunks leave the cycle path open below them.
    for (let x = west + 0.65; x < east - 0.35; x += 1.35)
      for (const z of [north + 0.12, south - 0.12]) {
        if (!parcelFits(rectangle(x, z, 0.2, 0.2), { park: true })) continue;
        tree(x - 0.5, z - 0.5, rand(x, z, 18) > 0.45 ? 3 : false, true);
      }
    for (const x of [west + 1.4, east - 1.1]) {
      const z = south - 0.25,
        h = terrainHeight(x, z);
      if (!parcelFits(rectangle(x, z, 0.8, 0.3), { park: true })) continue;
      const seat = addScenery(
        null,
        x - 0.4,
        z - 0.15,
        0.8,
        0.3,
        0.65,
        (mesh) => {
          for (let i = 0; i < 3; i++)
            mesh.box(x - 0.38, h + 0.37, z - 0.12 + i * 0.07, 0.76, 0.045, 0.05, '#a98b5c');
          mesh.box(x - 0.38, h + 0.43, z + 0.1, 0.76, 0.23, 0.035, '#a98b5c');
          for (const dx of [-0.28, 0.28] satisfies [number, number])
            mesh.box(x + dx, h, z - 0.06, 0.04, 0.4, 0.18, '#526451');
        },
        true,
      );
      seat.preserveGround = true;
    }
    const x = east - 0.6,
      z = north + 0.18,
      h = terrainHeight(x, z);
    addScenery(
      'panhandle',
      x - 0.2,
      z - 0.15,
      0.4,
      0.3,
      1.45,
      (mesh) => {
        mesh.box(x - 0.2, h, z - 0.15, 0.4, 0.16, 0.3, '#b0a383', 'stone');
        mesh.box(x - 0.1, h + 0.16, z - 0.1, 0.2, 0.4, 0.2, '#c0b494', 'stone');
        human(mesh, x, z, h + 0.56, 0.3, 0, false, '#776a46', '#776a46');
      },
      true,
    );
    for (let x = west + 1.8; x < east - 1.6; x += 2.1)
      for (const z of [north + 0.03, south - 0.03]) {
        if (!parcelFits(rectangle(x, z, 0.4, 0.18), { park: true })) continue;
        const h = terrainHeight(x, z);
        m.box(x - 0.2, h, z - 0.07, 0.4, 0.06, 0.14, '#816c49', 'dirt');
        for (let i = 0; i < 5; i++)
          m.sphere(
            x - 0.16 + i * 0.08,
            h + 0.09,
            z,
            0.045,
            0.04,
            0.045,
            (['#c7ab69', '#a985a0', '#bbc48a'] satisfies [string, string, string])[i % 3],
            5,
            3,
          );
      }
  }
  function makeSutroLandmark() {
    const site = SUTRO_SITE,
      cx = mapPosition(site.x),
      cz = mapPosition(site.y);
    // Use the geographic center directly; scaling spreads out the city,
    // while the tower retains its own model dimensions and slender profile.
    addScenery(
      'sutro',
      cx - site.width / 2,
      cz - site.width / 2,
      site.width,
      site.width,
      site.height,
      (m, h) => drawSutroTower(m, cx, h, cz),
      true,
    );
  }
  function makeDowntownLandmarks() {
    const f = DOWNTOWN.ferry,
      fx = mapPosition(f.center[0]),
      fz = mapPosition(f.center[1]),
      base =
        terrainHeight(mapPosition(DOWNTOWN.market[0][0]), mapPosition(DOWNTOWN.market[0][1])) +
        0.015;
    const ferry = addScenery(
      'ferry',
      fx - f.width / 2,
      fz - f.depth / 2,
      f.width,
      f.depth,
      5.1,
      (m) => drawFerryBuilding(m, fx, base, fz, sign),
      true,
    );
    ferry.base = base;
    ferry.footprint = rectangle(fx, fz, f.width, f.depth, f.angle);
    ferry.pinned = true;
    const s = DOWNTOWN.salesforce,
      cx = mapPosition(s.center[0]),
      cz = mapPosition(s.center[1]);
    addScenery(
      'salesforce',
      cx - s.width / 2,
      cz - s.depth / 2,
      s.width,
      s.depth,
      10.5,
      (m, h) => drawSalesforce(m, cx, h, cz),
      true,
    );
    const x = mapPosition(47),
      z = mapPosition(13);
    addScenery(
      'coit',
      x - 1.05,
      z - 1.05,
      2.1,
      2.1,
      5.3,
      (m, h) => drawCoitTower(m, x, h, z),
      true,
    );
    const b = DOWNTOWN.bridge,
      a = b.rampStart.map(mapPosition),
      end = b.end.map(mapPosition);
    addScenery('baybridge', a[0] - 1, end[1] - 1, end[0] - a[0] + 2, a[1] - end[1] + 5, 6.4, (m) =>
      drawBayBridge(m, MAP_SCALE, terrainHeight),
    );
  }
  function makeLandmarks() {
    makeSutroLandmark();
    makeDowntownLandmarks();
    const addScenery = mapScenery,
      occupy = mapOccupy,
      makeBuilding = mapBuilding;
    addScenery(
      'pyramid',
      48,
      19,
      TRANSAMERICA_PYRAMID.width,
      TRANSAMERICA_PYRAMID.depth,
      TRANSAMERICA_PYRAMID.height,
      (m, h) => drawTransamericaPyramid(m, 49, h, 20),
      true,
    );
    const bridge = (
      id: string,
      a: number[],
      b: number[],
      w: number,
      tower: number,
      color: string,
    ) =>
      addScenery(
        id,
        Math.min(a[0], b[0]),
        Math.min(a[1], b[1]),
        Math.abs(a[0] - b[0]) + 1,
        Math.abs(a[1] - b[1]) + 1,
        tower + 3,
        (m) => {
          const dx = b[0] - a[0],
            dz = b[1] - a[1],
            len = Math.hypot(dx, dz),
            nx = -dz / len,
            nz = dx / len,
            at = (t: number, side: number, h = 2) =>
              [a[0] + dx * t + nx * side, h, a[1] + dz * t + nz * side] satisfies [
                number,
                number,
                number,
              ];
          for (const side of [-w * 0.46, w * 0.46] satisfies [number, number]) {
            for (const t of [0.25, 0.75] satisfies [number, number]) {
              m.rod(at(t, side, 0), at(t, side, tower + 2), 0.09, color, 6);
              for (const h of [tower * 0.5 + 2, tower * 0.8 + 2] satisfies [number, number])
                m.rod(at(t, -w * 0.55, h), at(t, w * 0.55, h), 0.06, color, 5);
            }
            let last: [number, number, number] | null = null;
            for (let i = 0; i <= 40; i++) {
              const t = i / 40,
                h =
                  2 +
                  tower *
                    (t < 0.25
                      ? t * 4
                      : t > 0.75
                        ? (1 - t) * 4
                        : 0.22 + 0.78 * ((t - 0.5) / 0.25) ** 2),
                p = at(t, side, h);
              if (last) m.rod(last, p, 0.027, color, 5);
              if (i % 2 === 0) m.rod(at(t, side), p, 0.015, color, 4);
              last = p;
            }
          }
        },
      );
    bridge(
      'golden',
      [18.8, 0.5] satisfies [number, number],
      [18.8, 10] satisfies [number, number],
      1.35,
      4.3,
      '#b75c3f',
    );
    addScenery('chinatown', 45, 22, 4, 1, 3.4, (m, h) => {
      for (const x of [45.15, 48.7] satisfies [number, number])
        m.box(x, h, 22.25, 0.22, 1.9, 0.3, '#a34c35');
      m.box(45, h + 1.8, 22.2, 4, 0.28, 0.45, '#9c5839');
      for (let i = 0; i < 3; i++)
        gable(
          m,
          44.75 + i * 0.12,
          h + 2.05 + i * 0.15,
          22.05 + i * 0.03,
          4.5 - i * 0.24,
          0.75 - i * 0.06,
          0.15,
          '#486b4d',
        );
      sign(m, 47, h + 1.8, 22.72, 2.2, 0.3, 'CHINATOWN');
    });
    occupy(45, 22);
    occupy(48, 22, 1, 1, [45, 22] satisfies [number, number]);
    const barracks = (x: number, z: number) => {
      occupy(x, z, 2, 1);
      makeBuilding({
        x,
        y: z,
        w: 1.8,
        d: 0.9,
        h: 18,
        color: '#c5bc9d',
        style: 'barracks',
        name: contentText('models.barracks.name-1', {}),
      });
    };
    for (const x of [22, 27] satisfies [number, number])
      for (const z of [13, 15] satisfies [number, number]) barracks(x, z);
    addScenery(
      'presidio',
      25,
      14,
      1,
      1,
      2.9,
      (m, h) => {
        m.cylinder(25.4, h, 14.4, 0.04, 2.8, '#c9ceb8', 6);
        m.quad(
          [25.42, h + 2.7, 14.4] satisfies [number, number, number],
          [26, h + 2.63, 14.4] satisfies [number, number, number],
          [26, h + 2.3, 14.4] satisfies [number, number, number],
          [25.42, h + 2.4, 14.4] satisfies [number, number, number],
          '#bd6b50',
        );
      },
      true,
    );
    addScenery(
      'palace',
      32,
      12,
      2,
      2,
      3.2,
      (m, h) => {
        m.cylinder(33, h, 13, 1.05, 0.18, '#b4a17c', 10);
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          m.cylinder(
            33 + Math.cos(a) * 0.83,
            h + 0.18,
            13 + Math.sin(a) * 0.83,
            0.1,
            1.55,
            '#d0b78c',
            6,
          );
          m.cylinder(
            33 + Math.cos(a) * 0.83,
            h + 1.65,
            13 + Math.sin(a) * 0.83,
            0.14,
            0.14,
            '#d8c197',
            6,
          );
        }
        m.cylinder(33, h + 1.79, 13, 1.02, 0.2, '#c7af85', 10);
        m.sphere(33, h + 2.03, 13, 0.98, 0.7, 0.98, '#9c9c72', 10, 4);
        m.cylinder(33, h + 2.68, 13, 0.08, 0.15, '#c1ab7e', 6);
      },
      true,
    );
    addScenery(
      'deyoung',
      26,
      29,
      2,
      1,
      3.7,
      (m, h) => {
        m.box(26, h, 29, 2, 0.7, 1, '#866544');
        m.box(26.85, h + 0.7, 29.15, 0.55, 1.9, 0.55, '#936b45');
        const bottom = [
            [26.82, h + 2.6, 29.12] satisfies [number, number, number],
            [27.43, h + 2.6, 29.12] satisfies [number, number, number],
            [27.43, h + 2.6, 29.73] satisfies [number, number, number],
            [26.82, h + 2.6, 29.73] satisfies [number, number, number],
          ],
          top = bottom.map((p) => {
            const dx = p[0] - 27.125,
              dz = p[2] - 29.425;
            return [27.125 + (dx - dz) * 1.3, h + 3.35, 29.425 + (dx + dz) * 1.3] satisfies [
              number,
              number,
              number,
            ];
          });
        for (let i = 0; i < 4; i++)
          m.quad(bottom[i], bottom[(i + 1) % 4], top[(i + 1) % 4], top[i], '#aa8253');
        m.quad(top[0], top[1], top[2], top[3], '#b08d5c');
      },
      true,
    );
    addScenery(
      'academy',
      27,
      32,
      2,
      1,
      1.7,
      (m, h) => {
        m.box(27, h, 32, 2, 0.8, 1, '#a1af93');
        for (let i = 0; i < 6; i++)
          m.box(27.1 + i * 0.31, h + 0.14, 33.01, 0.23, 0.53, 0.025, '#547f7e');
        for (let i = 0; i < 3; i++) {
          m.sphere(
            27.35 + i * 0.6,
            h + 0.85,
            32.5,
            0.48,
            0.35 + (i % 2) * 0.12,
            0.45,
            '#7e984c',
            8,
            4,
          );
          m.sphere(27.4 + i * 0.6, h + 1.12, 32.52, 0.08, 0.04, 0.08, '#d0dcc0', 6, 3);
        }
      },
      true,
    );
    addScenery(
      'conservatory',
      30,
      29,
      2,
      1,
      1.9,
      (m, h) => {
        m.box(30, h, 29, 2, 0.55, 0.9, '#a3bdb0');
        gable(m, 30, h + 0.55, 29, 2, 0.9, 0.4, '#c3d5bf');
        m.cylinder(31, h + 0.5, 29.45, 0.35, 0.65, '#aec9b8', 8);
        m.sphere(31, h + 1.15, 29.45, 0.35, 0.32, 0.35, '#d9e4cd', 8, 4);
        for (let i = 0; i < 9; i++)
          m.rod(
            [30 + i * 0.25, h, 29.915] satisfies [number, number, number],
            [30 + i * 0.25, h + 0.55, 29.915] satisfies [number, number, number],
            0.018,
            '#f2ecd2',
            4,
          );
        m.cylinder(31, h + 1.45, 29.45, 0.03, 0.15, '#f4edd5', 5);
      },
      true,
    );
    addScenery(
      'windmill',
      11,
      29,
      1,
      1,
      3.5,
      (m, h) => {
        m.cylinder(11.5, h, 29.5, 0.35, 1.6, '#a18a5a', 8, 0.22);
        m.cylinder(11.5, h + 1.6, 29.5, 0.35, 0.45, '#6b593d', 4, 0);
        for (let i = 0; i < 4; i++) {
          const a = 0.4 + (i * Math.PI) / 2,
            p = [11.5 + Math.cos(a) * 1.25, h + 1.8 + Math.sin(a) * 1.25, 29.78] satisfies [
              number,
              number,
              number,
            ];
          m.rod([11.5, h + 1.8, 29.78] satisfies [number, number, number], p, 0.045, '#d5c49a', 5);
          const q = [11.5 + Math.cos(a) * 0.62, h + 1.8 + Math.sin(a) * 0.62, 29.8] satisfies [
            number,
            number,
            number,
          ];
          m.rod(q, p, 0.1, '#d8c9a5', 4);
        }
      },
      true,
    );

    for (const [id, x, z, name] of [
      ['park', 30, 32, 'Golden Gate Park'] satisfies [string, number, number, string],
      ['crissy', 28, 11, 'Crissy Field'] satisfies [string, number, number, string],
      ['beach', 9, 42, null] satisfies [string, number, number, string | null],
      ['merced', 17, 57, null] satisfies [string, number, number, string | null],
    ])
      addScenery(
        id,
        x,
        z,
        1,
        1,
        1,
        (m, h) => {
          m.box(x + 0.15, h, z + 0.3, 0.08, 0.85, 0.08, '#78613d');
          m.box(x + 0.8, h, z + 0.3, 0.08, 0.85, 0.08, '#78613d');
          if (name) sign(m, x + 0.5, h + 0.58, z + 0.39, 1.3, 0.4, name);
        },
        id === 'park',
      );
    addScenery(
      'peaks',
      29,
      43,
      1,
      1,
      1.5,
      (m, h) => {
        m.sphere(29.5, h + 0.18, 43.5, 0.55, 0.35, 0.45, '#a49c80', 7, 3);
        m.cylinder(29.5, h + 0.3, 43.5, 0.035, 1.2, '#a7ad98', 6);
      },
      true,
    );
    const painted = Object.assign(
      makeTownhomeRow(layoutPosition(44), layoutPosition(36.5), 4.5, 2, 2, 0.35),
      { sight: requiredValue(sightById('painted'), 'painted landmark') },
    );
    painted.sight.object = painted;
    for (const [x, z, w] of [
      [29.8, 30.35, 2.5] satisfies [number, number, number],
      [30.1, 28.65, 1.7] satisfies [number, number, number],
      [10.5, 30.1, 2] satisfies [number, number, number],
    ])
      for (let i = 0; i < 14; i++) {
        const xx = mapPosition(x + ((i + 0.5) * w) / 14),
          zz = mapPosition(z + 0.1),
          h = terrainHeight(xx, zz);
        getSceneMesh().cylinder(xx, h, zz, 0.02, 0.14, '#738347', 4);
        getSceneMesh().sphere(
          xx,
          h + 0.16,
          zz,
          0.075,
          0.055,
          0.075,
          (['#c8936d', '#d0ab61', '#b88196'] satisfies [string, string, string])[i % 3],
          6,
          3,
        );
      }
  }
  const WATERFRONT_PIERS = [
    [35.5, 9.5, 0.8, 2.2, -0.2] satisfies [number, number, number, number, number],
    [38.6, 9.2, 0.65, 1.8, 0.05] satisfies [number, number, number, number, number],
    [42, 9.1, 0.65, 2.2, 0.15] satisfies [number, number, number, number, number],
    [44.6, 9.8, 0.7, 2.4, 0.35] satisfies [number, number, number, number, number],
    [48.2, 12.8, 0.65, 2, 0.65] satisfies [number, number, number, number, number],
    [50.4, 15.3, 0.65, 2.1, 0.7] satisfies [number, number, number, number, number],
    [53, 18.5, 0.7, 2.4, 1] satisfies [number, number, number, number, number],
    [55, 24.5, 0.55, 1.8, 1.3] satisfies [number, number, number, number, number],
    [56, 37, 0.8, 2.3, 1.4] satisfies [number, number, number, number, number],
  ];
  function enhanceLandmarks() {
    const m = getSceneMesh(),
      addScenery = mapScenery,
      tree = mapTree,
      canPlaceScenery = mapCanPlace;
    addScenery(null, 52, 27, 1, 1, 7.7, (m, h) => drawSomaPyramid(m, 52.5, h, 27.5), true);
    addScenery(
      null,
      46,
      18,
      1.75,
      1.75,
      5.9,
      (m, h) => drawBrickOfficeTower(m, 46.875, h, 18.875),
      true,
    );
    const hall = addScenery(
      'cityhall',
      38,
      30,
      CITY_HALL.width,
      CITY_HALL.depth,
      CITY_HALL.height,
      (m, h) => drawCityHall(m, 38 + CITY_HALL.width / 2, h, 30 + CITY_HALL.depth / 2),
      true,
    );
    hall.sight!.entry = { x: hall.x + hall.w / 2 - 0.5, y: hall.y + hall.d + 0.15 };
    addScenery(
      'oracle',
      52,
      34,
      3,
      3,
      3.3,
      (m, h) => {
        m.box(52, h, 34, 3, 0.15, 3, '#a57958');
        m.box(52.3, h + 0.16, 34.3, 2.4, 0.025, 2.4, '#789853');
        m.quad(
          [53.5, h + 0.2, 34.7] satisfies [number, number, number],
          [54.3, h + 0.2, 35.5] satisfies [number, number, number],
          [53.5, h + 0.2, 36.3] satisfies [number, number, number],
          [52.7, h + 0.2, 35.5] satisfies [number, number, number],
          '#c7a776',
        );
        m.quad(
          [53.5, h + 0.21, 35.03] satisfies [number, number, number],
          [53.97, h + 0.21, 35.5] satisfies [number, number, number],
          [53.5, h + 0.21, 35.97] satisfies [number, number, number],
          [53.03, h + 0.21, 35.5] satisfies [number, number, number],
          '#76924f',
        );
        for (let tier = 0; tier < 4; tier++) {
          const hh = 0.3 + tier * 0.18;
          m.box(52.02 + tier * 0.06, h + hh, 34.05, 0.16, 0.12, 2.7, '#476c62');
          m.box(52.05, h + hh, 34.02 + tier * 0.06, 2.7, 0.12, 0.16, '#567c6e');
          m.box(54.78 - tier * 0.06, h + hh, 34.05, 0.16, 0.12, 2.5, '#476c62');
        }
        for (const [x, z] of [
          [52.1, 34.1] satisfies [number, number],
          [54.8, 34.1] satisfies [number, number],
          [54.8, 36.6] satisfies [number, number],
          [52.1, 36.7] satisfies [number, number],
        ]) {
          m.cylinder(x, h, z, 0.025, 2.55, '#97a69b', 6);
          m.box(x - 0.18, h + 2.55, z - 0.06, 0.36, 0.2, 0.12, '#d6d7b8');
        }
        m.box(52, h, 36.75, 3, 0.6, 0.2, '#b77d5a');
        m.box(53.02, h + 0.6, 36.75, 0.95, 0.42, 0.2, '#bd916a');
      },
      true,
    );
    addScenery('dolores', 36, 44, 1, 1, 0.7, (m, h) => {
      m.box(36.17, h, 44.5, 0.65, 0.14, 0.35, '#b7aa87');
    });
    for (const [x, z] of [
      [35.8, 43] satisfies [number, number],
      [36.7, 43] satisfies [number, number],
      [35.8, 45.3] satisfies [number, number],
    ])
      if (canPlaceScenery(Math.floor(x), Math.floor(z))) tree(Math.floor(x), Math.floor(z), 2);
    addScenery('palace', 31, 11, 5, 4, 3.3, (m, h) => {
      const points = [
        [31.4, 12.3] satisfies [number, number],
        [31.7, 11.65] satisfies [number, number],
        [32.4, 11.2] satisfies [number, number],
        [33.3, 11.2] satisfies [number, number],
        [34.2, 11.4] satisfies [number, number],
        [35, 12] satisfies [number, number],
      ];
      for (let i = 0; i < points.length; i++) {
        const [x, z] = points[i],
          base = referenceHeight(x, z);
        m.cylinder(x, base, z, 0.1, 1.55, '#d6bd91', 8);
        m.cylinder(x, base + 1.5, z, 0.15, 0.14, '#dfc89e', 8);
        if (i) {
          const p = points[i - 1];
          m.rod(
            [p[0], referenceHeight(...p) + 1.65, p[1]],
            [x, base + 1.65, z],
            0.085,
            '#cbb68e',
            6,
          );
        }
      }
    });
    addScenery('golden', 18, 0, 2, 10, 6.8, (m) => {
      for (const z of [2.875, 7.625] satisfies [number, number]) {
        for (const x of [18.18, 19.42] satisfies [number, number]) {
          m.box(x - 0.12, 0, z - 0.18, 0.24, 6.3, 0.36, '#b96848');
          m.box(x - 0.09, 6.3, z - 0.14, 0.18, 0.22, 0.28, '#c47a54');
          m.box(x - 0.18, 0.08, z - 0.25, 0.36, 0.48, 0.5, '#969989');
        }
        for (const h of [4.25, 5.4, 6.1] satisfies [number, number, number])
          m.box(18.12, h, z - 0.12, 1.36, 0.14, 0.24, '#c1714d');
      }
    });
    addScenery('deyoung', 26, 29, 2, 1, 3.7, (m, h) => {
      for (let row = 0; row < 5; row++)
        for (let i = 0; i < 18; i++)
          m.box(26.06 + i * 0.104, h + 0.08 + row * 0.115, 30.013, 0.025, 0.035, 0.012, '#5c513c');
      for (let i = 0; i < 8; i++)
        m.rod(
          [26.845, h + 0.8 + i * 0.22, 29.145] satisfies [number, number, number],
          [27.41, h + 0.8 + i * 0.22, 29.145] satisfies [number, number, number],
          0.009,
          '#b39566',
          4,
        );
      for (const x of [26.85, 27.4] satisfies [number, number])
        for (let i = 0; i < 5; i++)
          m.box(x, h + 2.3, 29.18 + i * 0.1, 0.012, 0.23, 0.06, '#4d6e6d');
    });
    addScenery('conservatory', 30, 29, 2, 1, 1.9, (m, h) => {
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        for (let j = 0; j < 5; j++) {
          const t = ((j / 5) * Math.PI) / 2,
            u = (((j + 1) / 5) * Math.PI) / 2,
            p = [
              31 + Math.cos(a) * Math.cos(t) * 0.355,
              h + 1.15 + Math.sin(t) * 0.33,
              29.45 + Math.sin(a) * Math.cos(t) * 0.355,
            ] satisfies [number, number, number],
            q = [
              31 + Math.cos(a) * Math.cos(u) * 0.355,
              h + 1.15 + Math.sin(u) * 0.33,
              29.45 + Math.sin(a) * Math.cos(u) * 0.355,
            ] satisfies [number, number, number];
          m.rod(p, q, 0.012, '#f2efdc', 4);
        }
      }
      for (let i = 0; i < 12; i++) {
        const x = 30.08 + i * 0.167;
        m.rod(
          [x, h + 0.07, 29.925] satisfies [number, number, number],
          [x, h + 0.55, 29.925] satisfies [number, number, number],
          0.012,
          '#f5f0d9',
          4,
        );
        m.rod(
          [x, h + 0.55, 29.925] satisfies [number, number, number],
          [x, h + 0.95 * (1 - Math.abs(x - 31) * 0.35), 29.45] satisfies [number, number, number],
          0.012,
          '#e8edd6',
          4,
        );
      }
    });
    addScenery('windmill', 11, 29, 1, 1, 3.5, (m, h) => {
      for (let i = 0; i < 4; i++) {
        const a = 0.4 + (i * Math.PI) / 2,
          dx = Math.cos(a),
          dy = Math.sin(a);
        for (let j = 0; j < 6; j++) {
          const t = 0.5 + j * 0.12;
          m.rod(
            [11.5 + dx * t - dy * 0.1, h + 1.8 + dy * t + dx * 0.1, 29.81] satisfies [
              number,
              number,
              number,
            ],
            [11.5 + dx * t + dy * 0.1, h + 1.8 + dy * t - dx * 0.1, 29.81] satisfies [
              number,
              number,
              number,
            ],
            0.018,
            '#eadbb6',
            4,
          );
        }
      }
    });
    // Stow Lake's island and the Japanese Tea Garden give the park a recognizable interior.
    addScenery(null, 22, 31, 3, 2, 1.5, (m) => {
      const h = lakes[0].level;
      m.sphere(
        POND.x / MAP_SCALE,
        h - 0.06,
        POND.y / MAP_SCALE,
        0.63,
        0.38,
        0.35,
        '#7b9656',
        10,
        4,
      );
      m.cylinder(POND.x / MAP_SCALE, h + 0.24, POND.y / MAP_SCALE, 0.025, 0.55, '#806443', 6);
      m.cylinder(POND.x / MAP_SCALE, h + 0.65, POND.y / MAP_SCALE, 0.28, 0.2, '#aa7351', 6, 0);
    });
    addScenery(
      null,
      25,
      31,
      1,
      1,
      1.6,
      (m, h) => {
        m.box(25.12, h, 31.12, 0.6, 0.15, 0.6, '#ad9f7a');
        for (const x of [25.2, 25.65] satisfies [number, number])
          for (const z of [31.2, 31.65] satisfies [number, number])
            m.cylinder(x, h + 0.15, z, 0.028, 0.75, '#9d573b', 5);
        for (let i = 0; i < 2; i++)
          gable(
            m,
            25.02 + i * 0.07,
            h + 0.85 + i * 0.25,
            31.02 + i * 0.07,
            0.8 - i * 0.14,
            0.8 - i * 0.14,
            0.2,
            '#607d5a',
          );
      },
      true,
    );
    // Detailed piers, timber pilings, and small boats animate the bay's edge.
    for (const [x, z, w, d, angle] of WATERFRONT_PIERS) {
      const start = m.data.length;
      pose(m, mapPosition(x), 0.18, mapPosition(z), angle, (pier) => {
        pier.box(-w / 2, 0, -d, w, 0.12, d, '#b9aa88');
        for (let t = 0.2; t < d; t += 0.38)
          for (const side of [-1, 1] satisfies [number, number])
            pier.cylinder(side * w * 0.43, -0.3, -t, 0.035, 0.48, '#786c52', 6);
        if (d > 2) {
          pier.box(-w * 0.4, 0.12, -d * 0.8, w * 0.8, 0.32, d * 0.55, '#bdbaa0');
          gable(pier, -w * 0.45, 0.44, -d * 0.82, w * 0.9, d * 0.59, 0.17, '#9c8d72');
        }
      });
      registerObject(m, start, {
        x: mapPosition(x) - 1,
        y: mapPosition(z) - d,
        w: 2,
        d: d + 1,
        h: 1,
        base: 0.18,
      });
    }
    for (const [x, z, angle] of [
      [39, 6.5, 0.4] satisfies [number, number, number],
      [44, 7, -0.4] satisfies [number, number, number],
      [54, 13.5, 1] satisfies [number, number, number],
      [57, 22, 0.5] satisfies [number, number, number],
      [57.5, 35, -0.3] satisfies [number, number, number],
    ]) {
      const start = m.data.length;
      pose(m, mapPosition(x), 0.15, mapPosition(z), angle, (boat) => {
        boat.box(-0.16, 0, -0.45, 0.32, 0.13, 0.9, '#e3dfc5');
        boat.tri(
          [-0.16, 0.1, -0.45] satisfies [number, number, number],
          [0.16, 0.1, -0.45] satisfies [number, number, number],
          [0, 0.1, -0.72] satisfies [number, number, number],
          '#e3dfc5',
        );
        boat.cylinder(0, 0.08, 0, 0.014, 0.95, '#c6bc99', 5);
        boat.tri(
          [0, 0.95, 0] satisfies [number, number, number],
          [0, 0.25, 0] satisfies [number, number, number],
          [0.36, 0.3, 0] satisfies [number, number, number],
          '#f1ead4',
        );
      });
      registerObject(m, start, {
        x: mapPosition(x) - 0.5,
        y: mapPosition(z) - 0.8,
        w: 1,
        d: 1.6,
        h: 1.2,
        base: 0.15,
      });
    }
    addScenery(null, 40.5, 1.6, 3, 1.7, 2, (m) => {
      m.sphere(42, 0.06, 2.5, 1.6, 0.28, 0.85, '#a6ae8a', 12, 4);
      m.box(40.9, 0.23, 2.2, 2.3, 0.65, 0.55, '#c8c6ad');
      m.box(41.6, 0.88, 2.25, 0.8, 0.15, 0.45, '#abb59d');
      for (let i = 0; i < 12; i++) m.box(41 + i * 0.18, 0.5, 2.76, 0.065, 0.17, 0.012, '#657e76');
      m.cylinder(41.05, 0.25, 2.1, 0.12, 1.1, '#b7b99d', 6);
    });

    // Red lanterns hang above Grant Avenue, rather than blocking the walking surface.
    addScenery('chinatown', 44, 18, 5, 5, 3.5, (m) => {
      for (const z of [19, 20.5, 23] satisfies [number, number, number]) {
        const a = [44.4, referenceHeight(44.4, z) + 2.45, z],
          b = [48.5, referenceHeight(48.5, z) + 2.45, z];
        m.rod(a, b, 0.008, '#71674b', 4);
        for (let i = 1; i < 6; i++) {
          const x = a[0] + ((b[0] - a[0]) * i) / 6,
            h = a[1] + ((b[1] - a[1]) * i) / 6 - 0.12;
          m.sphere(x, h, z, 0.08, 0.11, 0.08, '#bc6650', 8, 4);
          m.cylinder(x, h - 0.14, z, 0.015, 0.04, '#d5b474', 5);
        }
      }
    });
  }
  function detailedGround(m: Mesh) {
    for (const [x, z, r] of [
      [5.8, 25, 0.35] satisfies [number, number, number],
      [6.7, 22, 0.28] satisfies [number, number, number],
      [8, 19, 0.3] satisfies [number, number, number],
      [7.2, 24.1, 0.2] satisfies [number, number, number],
    ])
      m.sphere(mapPosition(x), 0.1, mapPosition(z), r, 0.17, r * 0.7, '#879387', 16, 8);
  }
  const { makeTownhomeRow, makeParksideTownhome, makeCurbShop, drawHillsideLifts, housingDetails } =
    createHousing({
      MAP_SCALE,
      terrainHeight,
      naturalHeight,
      cutHousePlot,
      getSceneMesh,
      registerObject,
      rectangle,
      sashWindow,
    });
  return {
    makeBuilding,
    makeRestaurantPatio: (site: import('./restaurants.ts').RestaurantSite) =>
      createRestaurantPatio(getSceneMesh(), site, registerObject),
    addScenery,
    tree,
    bench,
    human,
    bicycle,
    makeLandmarks,
    enhanceLandmarks,
    addPanhandleDetails,
    detailedGround,
    mapTree,
    mapCanPlace,
    makeTownhomeRow,
    makeParksideTownhome,
    makeCurbShop,
    drawHillsideLifts,
    housingDetails,
    WATERFRONT_PIERS,
  };
}
