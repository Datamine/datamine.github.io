import { createUIJob } from '../ui/scheduler.js';
import { drawCompiledMinimapRoads } from '../world-minimap.js';
import { APPLE_CAMPUS, ROBOTAXI_DEALER } from '../tech-layout.js';
import { HABERDASHER } from '../haberdasher-layout.js';
import { MINIMAP_MATERIALS, MINIMAP_BUILDING, minimapGroundColor } from '../map-colors.js';
import {
  PLACE_ICONS,
  placeIcon,
  iconSVG,
  drawPlaceIcon,
  drawDestinationFlag,
  createMinimapProjection,
  canvasPixelPoint,
  layoutMinimapIcons,
  nearestMinimapIcon,
} from '../wayfinding.js';
import { sub, unit, rayBox } from '../geometry.js';
import { DOWNTOWN } from '../downtown.js';
import {
  AIRSHIP_TERMINAL,
  AIRPORT_TERMINAL_BUILDING,
  AIRPORT_RUNWAY,
  SPACEPORT_PIER,
  STARTUP_HQ,
  airportRoadTiles,
} from '../airship.js';
import { TAX_HQ, SF_SPACEPORT, SPACEPORT_HOUSES, RAIL_PIT } from '../southern-district.js';
import { RESEARCH_CAMPUSES } from '../research-layout.js';
import { TIMES_SQUARE, TIMES_SQUARE_BUILDINGS } from '../southern-layout.js';
import { PACIFICA_PARK } from '../southern-expansion.js';
import { drawHighwayMinimap } from '../regional-road.js';
import { nearTahoe, drawTahoeMinimap } from '../tahoe.js';
import { ILLUMINATI_CAVE, CAVE_TILES } from '../map-instances.js';
import { PROMETHEUS } from '../prometheus.js';
import { GPU_FACTORY } from '../gpu-layout.js';
import { EAST_BAY_COAST_X, PANHANDLE, DOLORES_PARK, boundsPolygon } from '../geography.js';

/** Minimap services for the browser scene.
 * Dependencies are explicit live scene bindings, preserving initialization
 * order without globals. This module only reads bindings when a method runs. */
export function createMinimap(context) {
  let drawnYaw;
  const refreshMinimap = createUIJob(() => {
    renderMinimap();
    drawnYaw = context.camera.yaw;
  });
  // Match rotation on the same frame; stationary map/countdown work may coalesce.
  const drawMini = (force = true) => refreshMinimap(force || drawnYaw !== context.camera.yaw);
  function poly(c, points, fill, stroke) {
    c.beginPath();
    points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.closePath();
    if (fill) {
      c.fillStyle = fill;
      c.fill();
    }
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = 1;
      c.stroke();
    }
  }

  function line(c, pts, color, size = 1) {
    c.beginPath();
    pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.strokeStyle = color;
    c.lineWidth = size;
    c.stroke();
  }

  function ellipse(c, x, y, rx, ry, color) {
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fillStyle = color;
    c.fill();
  }

  function drawCityLandmarkSymbols(c) {
    const at = context.referenceMapArtPoint;
    const p = at(49, 20);
    poly(
      c,
      [
        { x: p.x - 7, y: p.y + 6 },
        { x: p.x + 7, y: p.y + 6 },
        { x: p.x, y: p.y - 17 },
      ],
      '#e3ddc1',
      '#6e806b',
    );
    const palace = at(33, 13);
    ellipse(c, palace.x + 15, palace.y + 1, 14, 7, '#658f82');
    ellipse(c, palace.x, palace.y, 8, 6, '#c7af7f');
    ellipse(c, palace.x, palace.y - 3, 6, 4, '#80916b');
    for (const x of [22, 27])
      for (const y of [13, 15]) {
        const b = at(x, y);
        c.fillStyle = '#9a5a3b';
        c.fillRect(b.x, b.y, 18, 7);
      }
    const flag = at(25.4, 14.4);
    line(c, [flag, { x: flag.x, y: flag.y - 12 }], '#d8d8bc', 1.5);
    c.fillStyle = '#b2644b';
    c.fillRect(flag.x, flag.y - 12, 7, 4);
    const museum = at(27, 29.5);
    c.fillStyle = '#916b45';
    c.fillRect(museum.x - 10, museum.y - 4, 20, 8);
    poly(
      c,
      [
        { x: museum.x + 1, y: museum.y - 4 },
        { x: museum.x + 8, y: museum.y - 4 },
        { x: museum.x + 11, y: museum.y - 15 },
        { x: museum.x - 1, y: museum.y - 18 },
      ],
      '#a17b4b',
    );
    const academy = at(28, 32.5);
    for (let i = -1; i <= 1; i++) ellipse(c, academy.x + i * 6, academy.y, 6, 4, '#527d43');
    const glass = at(31, 29.5);
    c.fillStyle = '#ebe9d1';
    c.fillRect(glass.x - 10, glass.y - 3, 20, 6);
    ellipse(c, glass.x, glass.y - 4, 5, 6, '#eeeedd');
    const windmill = at(11.5, 29.5);
    c.fillStyle = '#9f8152';
    c.fillRect(windmill.x - 3, windmill.y - 1, 6, 8);
    line(
      c,
      [
        { x: windmill.x - 7, y: windmill.y - 8 },
        { x: windmill.x + 7, y: windmill.y + 6 },
      ],
      '#e2d9b4',
      2,
    );
    line(
      c,
      [
        { x: windmill.x - 7, y: windmill.y + 6 },
        { x: windmill.x + 7, y: windmill.y - 8 },
      ],
      '#e2d9b4',
      2,
    );
    const dome = at(39, 31);
    ellipse(c, dome.x, dome.y, 7, 7, '#92a391');
    ellipse(c, dome.x, dome.y - 2, 3, 4, '#d7bb74');
    const towerSite = context.sightById('salesforce').mapPoint,
      tower = context.mapArtPoint(towerSite.x, towerSite.y);
    ellipse(c, tower.x, tower.y, 5, 10, '#8fa9aa');
    const ferrySite = context.sightById('ferry').mapPoint,
      f = context.mapArtPoint(ferrySite.x, ferrySite.y);
    c.save();
    c.translate(f.x, f.y);
    c.rotate(Math.PI / 4);
    c.fillStyle = '#c7bca2';
    c.fillRect(-13, -4, 26, 8);
    c.fillStyle = '#6e8378';
    c.fillRect(-2, -7, 4, 5);
    c.restore();
    const field = at(53.5, 35.5);
    poly(
      c,
      [
        { x: field.x - 8, y: field.y },
        { x: field.x, y: field.y - 8 },
        { x: field.x + 8, y: field.y },
        { x: field.x, y: field.y + 8 },
      ],
      '#6d9359',
      '#b2a17a',
    );
    const monument = at(34.4, 31);
    c.fillStyle = '#766e48';
    c.fillRect(monument.x - 2, monument.y - 5, 4, 10);
    const sutro = context.sightById('sutro').mapPoint,
      s = context.mapArtPoint(sutro.x, sutro.y);
    for (const side of [-1, 1])
      line(
        c,
        [
          { x: s.x + side * 5, y: s.y + 6 },
          { x: s.x + side * 2, y: s.y - 2 },
          { x: s.x + side * 4, y: s.y - 9 },
        ],
        '#b95b43',
        1.5,
      );
    line(
      c,
      [
        { x: s.x - 6, y: s.y - 9 },
        { x: s.x + 6, y: s.y - 9 },
      ],
      '#e9dfbd',
      2,
    );
    for (const dx of [-4, 0, 4])
      line(
        c,
        [
          { x: s.x + dx, y: s.y - 9 },
          { x: s.x + dx, y: s.y - 17 },
        ],
        '#c65d44',
        1.2,
      );
  }

  function buildCityMap() {
    const c = context.cityMap.getContext('2d');
    c.fillStyle = '#456c72';
    c.fillRect(0, 0, context.cityMap.width, context.cityMap.height);
    const project = (points) => points.map(([x, y]) => context.mapArtPoint(x, y)),
      referenceProject = (points) => project(context.mapPolygon(points));
    context.southernTerrain.drawMinimap(c, context.mapArtPoint);
    poly(c, project(context.MARIN), '#748b53', '#d2c49d');
    poly(
      c,
      project(
        context.rectangle(
          context.detention.x,
          context.detention.z,
          context.detention.w,
          context.detention.d,
        ),
      ),
      '#a4a49a',
      '#536966',
    );
    c.save();
    poly(c, project(context.COAST), null);
    c.clip();
    poly(
      c,
      project([
        [0, 0],
        [context.N, 0],
        [context.N, context.N],
        [0, context.N],
      ]),
      null,
    );
    c.clip();
    for (let z = 0; z < context.N; z++)
      for (let x = 0; x < context.N; x++) {
        const tile =
          context.worldTiles.tiles[
            Math.floor((z + 0.5) / context.worldTiles.step) * context.worldTiles.size +
              Math.floor((x + 0.5) / context.worldTiles.step)
          ];
        poly(
          c,
          project([
            [x, z],
            [x + 1, z],
            [x + 1, z + 1],
            [x, z + 1],
          ]),
          minimapGroundColor(tile.base, context.terrainHeight(x + 0.5, z + 0.5)),
        );
      }
    poly(c, project(context.PRESIDIO), '#78934d');
    poly(
      c,
      referenceProject([
        [23.7, 12.8],
        [26.9, 12.8],
        [26.9, 17.4],
        [23.7, 17.4],
      ]),
      '#a5ad75',
    );
    poly(
      c,
      referenceProject([
        [25, 10],
        [32, 11],
        [32, 12.5],
        [25, 11.5],
      ]),
      '#a5b17c',
    );
    poly(
      c,
      referenceProject([
        [9, 29],
        [32, 29],
        [32, 34],
        [9, 34],
      ]),
      '#789a4d',
    );
    poly(c, referenceProject(boundsPolygon(PANHANDLE)), '#789a4d');
    poly(
      c,
      referenceProject([
        [33, 27],
        [36, 27],
        [36, 30],
        [33, 30],
      ]),
      '#8fa35e',
    );
    poly(c, referenceProject(boundsPolygon(DOLORES_PARK)), '#86a564');
    for (const [x, y, rx, ry] of [
      [29, 43, 4, 5],
      [25.6, 39.7, 2.4, 3],
      [42, 51, 2.2, 1.4],
      [28, 52, 3, 3],
      [17, 57, 6, 5],
    ]) {
      const p = context.referenceMapArtPoint(x, y);
      ellipse(c, p.x, p.y, rx * 10, ry * 9.5, '#8b9c62');
    }
    for (const h of context.HILLS) {
      if (h.name === 'Presidio') continue;
      const p = context.mapArtPoint(h.x, h.y);
      for (const scale of [0.45, 0.7, 1]) {
        c.beginPath();
        c.ellipse(
          p.x,
          p.y,
          (h.r * 10 * scale) / context.MAP_SCALE,
          (h.r * 9.5 * scale) / context.MAP_SCALE,
          0,
          0,
          Math.PI * 2,
        );
        c.strokeStyle = '#736f4e28';
        c.lineWidth = 1;
        c.stroke();
      }
    }
    if (context.minimapRoadPaths)
      drawCompiledMinimapRoads(c, context.minimapRoadPaths.city, MINIMAP_MATERIALS);
    else
      for (let z = 0; z < context.worldTiles.size; z++)
        for (let x = 0; x < context.worldTiles.size; x++) {
          const t = context.worldTiles.tiles[z * context.worldTiles.size + x],
            patches = t.patches || [
              {
                type: t.type,
                polygon: [
                  [0, 0],
                  [1, 0],
                  [1, 1],
                  [0, 1],
                ],
              },
            ];
          for (const p of patches)
            if (['road', 'path', 'sidewalk'].includes(p.type))
              poly(
                c,
                p.polygon.map((v) =>
                  context.mapArtPoint(
                    (x + v[0]) * context.worldTiles.step,
                    (z + v[1]) * context.worldTiles.step,
                  ),
                ),
                MINIMAP_MATERIALS[p.type],
              );
        }
    const pond = [];
    for (let i = 0; i < 32; i++) {
      const a = (i * Math.PI) / 16;
      pond.push(
        context.mapArtPoint(
          context.POND.x + Math.cos(a) * context.POND.rx,
          context.POND.y + Math.sin(a) * context.POND.ry,
        ),
      );
    }
    poly(c, pond, '#568b85');
    for (const [x, y, rx, ry] of [
      [16, 56, 1.7, 2.7],
      [18.5, 58.3, 1.7, 2.2],
    ]) {
      const p = context.referenceMapArtPoint(x, y);
      ellipse(c, p.x, p.y, rx * 10, ry * 9.5, '#57867c');
    }
    for (const o of context.objects)
      if (o.arch && !o.place) poly(c, project(context.objectFootprint(o)), MINIMAP_BUILDING);
    drawCityLandmarkSymbols(c);
    for (const p of context.places)
      poly(
        c,
        project(p.footprint || context.rectangle(p.x + p.w / 2, p.y + p.d / 2, p.w, p.d)),
        '#8b7454',
      );
    c.restore();
    c.save();
    poly(
      c,
      project([
        [0, 0],
        [context.N, 0],
        [context.N, context.N],
        [0, context.N],
      ]),
      null,
    );
    c.clip();
    line(c, project(context.COAST), '#ded0a5', 2);
    c.restore();
    for (const o of context.objects)
      if (o.y >= context.N && o.arch && !['terminal', 'regional'].includes(o.arch))
        poly(c, project(context.objectFootprint(o)), MINIMAP_BUILDING);
    for (const site of context.southernNeighborhood.craftSites)
      for (const shape of site.kind === 'neighborhood-garden'
        ? [site.footprint]
        : site.navigationPolygons.slice(0, 1))
        poly(
          c,
          project(shape),
          site.minimapColor || (site.kind === 'neighborhood-garden' ? '#c3b793' : '#b4a18a'),
        );
    for (const [x, z, w, d, angle] of context.WATERFRONT_PIERS) {
      const c = Math.cos(angle),
        s = Math.sin(angle),
        points = [
          [-w / 2, 0],
          [w / 2, 0],
          [w / 2, -d],
          [-w / 2, -d],
        ].map(([u, v]) => [x + u * c - v * s, z + u * s + v * c]);
      poly(context.cityMap.getContext('2d'), referenceProject(points), '#c9bca0');
    }
    poly(
      c,
      project([
        [82.4, 103.2],
        [94.8, 103.2],
        [94.8, 150.5],
        [82.4, 150.5],
      ]),
      '#9da99c',
      '#d4ceb1',
    );
    const pier = SPACEPORT_PIER,
      pad = pier.pad;
    poly(
      c,
      project([
        [pier.west, pier.north],
        [pier.east, pier.north],
        [pier.east, pier.south],
        [pier.west, pier.south],
      ]),
      '#a5b5b0',
    );
    poly(
      c,
      project([
        [pad.west, pad.north],
        [pad.east, pad.north],
        [pad.east, pad.south],
        [pad.west, pad.south],
      ]),
      '#a5b5b0',
      '#d4ceb1',
    );
    poly(
      c,
      project([
        [TIMES_SQUARE.west, TIMES_SQUARE.north],
        [TIMES_SQUARE.east, TIMES_SQUARE.north],
        [TIMES_SQUARE.east, TIMES_SQUARE.south],
        [TIMES_SQUARE.west, TIMES_SQUARE.south],
      ]),
      '#a6a1a3',
    );
    const apple = APPLE_CAMPUS,
      appleCircle = (r) =>
        Array.from({ length: 64 }, (_, i) => [
          apple.x + Math.sin((i * Math.PI) / 32) * r,
          apple.z + Math.cos((i * Math.PI) / 32) * r,
        ]);
    poly(c, project(appleCircle(apple.outer)), '#cbd8d2');
    poly(c, project(appleCircle(apple.inner)), '#87a171');
    poly(
      c,
      project(
        context.rectangle(
          ROBOTAXI_DEALER.x,
          ROBOTAXI_DEALER.z,
          ROBOTAXI_DEALER.w,
          ROBOTAXI_DEALER.d,
        ),
      ),
      '#b8c4bc',
    );
    poly(
      c,
      project(context.rectangle(HABERDASHER.x, HABERDASHER.z, HABERDASHER.w, HABERDASHER.d)),
      '#8a7474',
      '#d7c7a6',
    );
    poly(
      c,
      project(context.rectangle(GPU_FACTORY.x, GPU_FACTORY.z, GPU_FACTORY.w, GPU_FACTORY.d)),
      '#a8bdb3',
      '#d3ddd0',
    );
    for (const site of context.southernNeighborhood.village?.sites || [])
      if (site.kind !== 'neighborhood-garden') poly(c, project(site.footprint), '#b5ab94');
    for (const r of RESEARCH_CAMPUSES) {
      poly(
        c,
        project([
          [r.west, r.north],
          [r.east, r.north],
          [r.east, r.south],
          [r.west, r.south],
        ]),
        '#91ad83',
      );
      poly(c, project(context.rectangle(r.x, r.z, r.w, r.d)), '#8caaa8', '#e0d7bd');
    }
    for (const b of TIMES_SQUARE_BUILDINGS)
      poly(c, project(context.rectangle(b.x, b.z, b.w, b.d)), '#8d6c94', '#c9b791');
    poly(
      c,
      project([
        [PACIFICA_PARK.west, PACIFICA_PARK.north],
        [PACIFICA_PARK.east, PACIFICA_PARK.north],
        [PACIFICA_PARK.east, PACIFICA_PARK.south],
        [PACIFICA_PARK.west, PACIFICA_PARK.south],
      ]),
      '#749b67',
    );
    if (context.minimapRoadPaths)
      drawCompiledMinimapRoads(c, context.minimapRoadPaths.south, MINIMAP_MATERIALS);
    else
      for (const { x, z, step, tile } of airportRoadTiles())
        for (const patch of tile.patches || [
          {
            type: tile.type,
            polygon: [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
            ],
          },
        ])
          if (['road', 'path', 'sidewalk'].includes(patch.type))
            poly(
              c,
              project(patch.polygon.map((p) => [x + p[0] * step, z + p[1] * step])),
              MINIMAP_MATERIALS[patch.type],
            );
    poly(c, project(context.rectangle(TAX_HQ.x, TAX_HQ.z, 5.4, 3.4)), '#c6b778');
    poly(c, project(context.rectangle(SF_SPACEPORT.x, SF_SPACEPORT.z, 5, 5)), '#8fa5c0');
    poly(
      c,
      project(
        context.rectangle(
          SPACEPORT_HOUSES.x + SPACEPORT_HOUSES.w / 2,
          SPACEPORT_HOUSES.z + SPACEPORT_HOUSES.d / 2,
          SPACEPORT_HOUSES.w,
          SPACEPORT_HOUSES.d,
        ),
      ),
      '#b49e79',
    );
    poly(
      c,
      project([
        [RAIL_PIT.west, RAIL_PIT.north],
        [RAIL_PIT.east, RAIL_PIT.north],
        [RAIL_PIT.east, RAIL_PIT.south],
        [RAIL_PIT.west, RAIL_PIT.south],
      ]),
      '#82715b',
    );
    poly(
      c,
      project(
        context.rectangle(
          AIRSHIP_TERMINAL.x,
          AIRSHIP_TERMINAL.z,
          AIRPORT_TERMINAL_BUILDING.w,
          AIRPORT_TERMINAL_BUILDING.d,
        ),
      ),
      '#7d9487',
    );
    line(
      c,
      project([
        [AIRPORT_RUNWAY.x + AIRPORT_RUNWAY.width / 2, AIRPORT_RUNWAY.z],
        [AIRPORT_RUNWAY.x + AIRPORT_RUNWAY.width / 2, AIRPORT_RUNWAY.z + AIRPORT_RUNWAY.depth],
      ]),
      '#bfc5af',
      4,
    );
    poly(
      c,
      project([
        [STARTUP_HQ.x - 1.7, 133.1],
        [STARTUP_HQ.x + 1.7, 133.1],
        [STARTUP_HQ.x + 1.7, 135.9],
        [STARTUP_HQ.x - 1.7, 135.9],
      ]),
      '#e88440',
    );
    const mooring = context.mapArtPoint(
      AIRSHIP_TERMINAL.boarding.x + 0.5,
      AIRSHIP_TERMINAL.boarding.y + 0.5,
    );
    ellipse(c, mooring.x, mooring.y, 5, 3, '#dfd3ac');
    const island = context.referenceMapArtPoint(42, 2.5);
    ellipse(c, island.x, island.y, 14, 6, '#aeb995');
    c.fillStyle = '#d1cdb4';
    c.fillRect(island.x - 9, island.y - 2, 18, 4);
    const statue = context.mapArtPoint(PROMETHEUS.x, PROMETHEUS.z);
    ellipse(c, statue.x, statue.y, 12, 10, '#a3b29d');
    ellipse(c, statue.x, statue.y, 4, 4, '#e2ba62');
    line(
      c,
      referenceProject([
        [18.8, 0.5],
        [18.8, 10],
      ]),
      '#bb6945',
      4,
    );
    line(
      c,
      referenceProject([DOWNTOWN.bridge.rampStart, DOWNTOWN.bridge.abutment, DOWNTOWN.bridge.end]),
      '#c4c8ad',
      3,
    );
    poly(
      c,
      referenceProject([
        [DOWNTOWN.bridge.end[0] - 0.5, DOWNTOWN.bridge.end[1]],
        [DOWNTOWN.bridge.end[0] + 1, DOWNTOWN.bridge.end[1] - 2],
        [DOWNTOWN.bridge.end[0] + 3, DOWNTOWN.bridge.end[1] - 1],
        [DOWNTOWN.bridge.end[0] + 2, DOWNTOWN.bridge.end[1] + 1],
      ]),
      '#8e9b65',
    );
  }

  function miniProjection() {
    return createMinimapProjection(
      context.secretWorld?.kind === 'illuminati' ? 28 : context.N,
      context.map.width,
      context.map.height,
      context.camera.yaw,
      context.player.x + 0.5,
      context.player.y + 0.5,
    );
  }

  function renderMinimap() {
    if (context.secretWorld?.kind === 'illuminati') return drawCaveMinimap();
    if (context.secretWorld?.kind === 'kraken') return drawHuntMinimap();
    const m = miniProjection(),
      origin = m.point(
        (-context.MAP_ART.x / 10) * context.MAP_SCALE,
        (-context.MAP_ART.y / 9.5) * context.MAP_SCALE,
      );
    context.mc.setTransform(1, 0, 0, 1, 0, 0);
    context.mc.fillStyle = '#456c72';
    context.mc.fillRect(0, 0, context.map.width, context.map.height);
    context.mc.save();
    context.mc.setTransform(
      (m.a * context.MAP_SCALE) / 10,
      (m.b * context.MAP_SCALE) / 10,
      (m.c * context.MAP_SCALE) / 9.5,
      (m.d * context.MAP_SCALE) / 9.5,
      origin.x,
      origin.y,
    );
    context.mc.drawImage(context.cityMap, 0, 0);
    context.mc.restore();
    if (nearTahoe(context.player.x + 0.5, context.player.y + 0.5))
      drawTahoeMinimap(context.mc, m, [context.player.x + 0.5, context.player.y + 0.5]);
    else
      poly(
        context.mc,
        [
          [EAST_BAY_COAST_X, context.player.y - 2000],
          [Math.max(EAST_BAY_COAST_X, context.player.x) + 2000, context.player.y - 2000],
          [Math.max(EAST_BAY_COAST_X, context.player.x) + 2000, context.player.y + 2000],
          [EAST_BAY_COAST_X, context.player.y + 2000],
        ].map(([x, z]) => m.point(x, z)),
        '#9eaa84',
      );
    if (context.regionalRoad) drawHighwayMinimap(context.mc, m, context.regionalRoad);
    if (context.esotericCampus)
      for (const feature of context.esotericCampus.mapFeatures)
        poly(
          context.mc,
          feature.polygon.map((p) => m.point(p[0], p[2])),
          feature.color,
        );
    if (context.goldenGate) drawHighwayMinimap(context.mc, m, context.goldenGate);
    if (context.player.path.length)
      line(
        context.mc,
        [
          m.point(context.player.x + 0.5, context.player.y + 0.5),
          ...context.player.path.map((p) => m.point(p.x + 0.5, p.y + 0.5)),
        ],
        '#ead294aa',
        1,
      );
    for (const s of context.sights)
      if (!s.hiddenFromDirectory && s.kind !== 'bike') {
        const at = s.mapPoint || { x: s.entry.x + 0.5, y: s.entry.y + 0.5 },
          p = m.point(at.x, at.y);
        ellipse(context.mc, p.x, p.y, 1.2, 1.2, '#e0d4ab');
      }
    context.miniIcons = layoutMinimapIcons(
      context.places
        .filter((p) => !p.activityBuilding)
        .map((place) => ({ place, ...m.point(place.x + place.w / 2, place.y + place.d / 2) })),
      context.map.width,
      context.map.height,
      13,
      12,
    );
    for (const p of context.miniIcons)
      if (Math.hypot(p.x - p.anchorX, p.y - p.anchorY) > 3)
        line(context.mc, [{ x: p.anchorX, y: p.anchorY }, p], '#ddcea580', 0.7);
    for (const p of context.miniIcons) drawPlaceIcon(context.mc, p.place.id, p.x, p.y);
    const selected = context.miniIcons.find((p) => p.place === context.miniKeyboardPlace);
    if (document.activeElement === context.$('sf-map-button') && selected) {
      context.mc.beginPath();
      context.mc.arc(selected.x, selected.y, 7, 0, Math.PI * 2);
      context.mc.strokeStyle = '#fff5d0';
      context.mc.lineWidth = 1;
      context.mc.stroke();
    }
    const p = m.point(context.player.x + 0.5, context.player.y + 0.5),
      direction = m.point(
        context.player.x + 0.5 + Math.cos(context.player.angle),
        context.player.y + 0.5 + Math.sin(context.player.angle),
      ),
      angle = Math.atan2(direction.y - p.y, direction.x - p.x);
    context.mc.save();
    context.mc.translate(p.x, p.y);
    context.mc.rotate(angle);
    poly(
      context.mc,
      [
        { x: 5, y: 0 },
        { x: -4, y: -3 },
        { x: -2, y: 0 },
        { x: -4, y: 3 },
      ],
      '#fff6bb',
      '#263d32',
    );
    context.mc.restore();
    const nx = -m.c,
      ny = -m.d,
      len = Math.hypot(nx, ny),
      ux = nx / len,
      uy = ny / len;
    line(
      context.mc,
      [
        { x: context.map.width - 17 - ux * 6, y: 18 - uy * 6 },
        { x: context.map.width - 17 + ux * 9, y: 18 + uy * 9 },
      ],
      '#f2dfa4',
      1.5,
    );
    poly(
      context.mc,
      [
        { x: context.map.width - 17 + ux * 9, y: 18 + uy * 9 },
        { x: context.map.width - 17 + ux * 2 - uy * 3, y: 18 + uy * 2 + ux * 3 },
        { x: context.map.width - 17 + ux * 2 + uy * 3, y: 18 + uy * 2 - ux * 3 },
      ],
      '#f2dfa4',
    );
    if (context.destination) {
      const flag = m.point(context.destination.x + 0.5, context.destination.y + 0.5);
      drawDestinationFlag(context.mc, flag.x, flag.y);
    }
  }

  function drawCaveMinimap() {
    const m = miniProjection();
    context.miniIcons = [];
    context.mc.setTransform(1, 0, 0, 1, 0, 0);
    context.mc.fillStyle = '#28342d';
    context.mc.fillRect(0, 0, context.map.width, context.map.height);
    for (const tile of CAVE_TILES)
      if (tile.type !== 'rock')
        poly(
          context.mc,
          [
            [tile.x, tile.z],
            [tile.x + 1, tile.z],
            [tile.x + 1, tile.z + 1],
            [tile.x, tile.z + 1],
          ].map(([x, z]) => m.point(x, z)),
          tile.walkable ? (tile.type === 'hangar' ? '#889181' : '#aaa184') : '#3e5052',
        );
    const wing = [
      [-6, 2],
      [0, -3],
      [6, 2],
      [0, 1],
    ].map(([x, z]) => m.point(ILLUMINATI_CAVE.bomber.x + x, ILLUMINATI_CAVE.bomber.z + z));
    poly(context.mc, wing, '#c4cdb9');
    const stairs = m.point(ILLUMINATI_CAVE.entrance.x, ILLUMINATI_CAVE.entrance.z);
    for (let i = 0; i < 3; i++)
      line(
        context.mc,
        [
          { x: stairs.x - 3, y: stairs.y - 2 + i * 2 },
          { x: stairs.x + 3, y: stairs.y - 2 + i * 2 },
        ],
        '#efcf88',
        1,
      );
    if (context.player.path.length)
      line(
        context.mc,
        [
          m.point(context.player.x + 0.5, context.player.y + 0.5),
          ...context.player.path.map((p) => m.point(p.x + 0.5, p.y + 0.5)),
        ],
        '#ead294aa',
        1,
      );
    const p = m.point(context.player.x + 0.5, context.player.y + 0.5),
      d = m.point(
        context.player.x + 0.5 + Math.cos(context.player.angle),
        context.player.y + 0.5 + Math.sin(context.player.angle),
      );
    context.mc.save();
    context.mc.translate(p.x, p.y);
    context.mc.rotate(Math.atan2(d.y - p.y, d.x - p.x));
    poly(
      context.mc,
      [
        { x: 5, y: 0 },
        { x: -4, y: -3 },
        { x: -2, y: 0 },
        { x: -4, y: 3 },
      ],
      '#fff6bb',
      '#263d32',
    );
    context.mc.restore();
    if (context.destination) {
      const f = m.point(context.destination.x + 0.5, context.destination.y + 0.5);
      drawDestinationFlag(context.mc, f.x, f.y);
    }
  }

  function drawHuntMinimap() {
    const m = createMinimapProjection(
      44,
      context.map.width,
      context.map.height,
      context.camera.yaw,
      context.player.x + 0.5,
      context.player.y + 0.5,
    );
    context.miniIcons = [];
    context.mc.setTransform(1, 0, 0, 1, 0, 0);
    context.mc.fillStyle = '#456c72';
    context.mc.fillRect(0, 0, context.map.width, context.map.height);
    const home = context.expeditions.ship.home;
    if (home) {
      const p = m.point(home.x, home.z);
      ellipse(context.mc, p.x, p.y, 3, 3, '#d4c38c');
    }
    if (context.expeditions.kraken.visible) {
      const p = m.point(context.expeditions.kraken.x, context.expeditions.kraken.z);
      ellipse(context.mc, p.x, p.y, 3, 3, '#bc7f8b');
    }
    const p = m.point(context.player.x + 0.5, context.player.y + 0.5),
      d = m.point(context.player.x + 1.5, context.player.y + 0.5);
    context.mc.save();
    context.mc.translate(p.x, p.y);
    context.mc.rotate(Math.atan2(d.y - p.y, d.x - p.x));
    poly(
      context.mc,
      [
        { x: 5, y: 0 },
        { x: -4, y: -3 },
        { x: -2, y: 0 },
        { x: -4, y: 3 },
      ],
      '#fff6bb',
      '#263d32',
    );
    context.mc.restore();
  }

  function minimapPointer(e) {
    return canvasPixelPoint(e.clientX, e.clientY, context.map.getBoundingClientRect(), {
      width: context.map.width,
      height: context.map.height,
      offsetWidth: context.map.offsetWidth,
      offsetHeight: context.map.offsetHeight,
      clientWidth: context.map.clientWidth,
      clientHeight: context.map.clientHeight,
      clientLeft: context.map.clientLeft,
      clientTop: context.map.clientTop,
    });
  }

  function navigateFromMinimap(e) {
    if (context.chase?.state.jailed) return false;
    context.keys.clear();
    context.closeMenu();
    context.closeReader();
    drawMini();
    const pixel =
      e.detail === 0 && e.clientX === 0 && e.clientY === 0
        ? context.miniIcons.find((p) => p.place === context.miniKeyboardPlace) ||
          context.miniIcons[0]
        : minimapPointer(e);
    if (!pixel) return false;
    if (context.secretWorld?.bomber.state.active) {
      const p = miniProjection().unproject(pixel.x, pixel.y);
      const result = context.walkTo(p.x - 0.5, p.y - 0.5);
      context.canvas.focus({ preventScroll: true });
      return result;
    }
    const icon = nearestMinimapIcon(context.miniIcons, pixel.x, pixel.y);
    if (icon) {
      context.goToPlace(icon.place);
      drawMini();
      return;
    }
    const worldPoint = miniProjection().unproject(pixel.x, pixel.y),
      x = worldPoint.x - 0.5,
      y = worldPoint.y - 0.5;
    if (context.ferrari?.state.riding) {
      context.driveFerrari(x, y);
      context.canvas.focus({ preventScroll: true });
      return;
    }
    if (context.flying()) {
      context.walkTo(x, y);
      context.canvas.focus({ preventScroll: true });
      return;
    }
    if (context.tahoe.state.mode === 'ski') {
      context.walkTo(x, y);
      context.canvas.focus({ preventScroll: true });
      return;
    }
    const target = context.minimapTarget(x, y);
    const accepted = target ? context.walkTo(target.x, target.y) : false;
    if (!accepted && context.clickAttempt) context.clickAttempt.worked = false;
    context.canvas.focus({ preventScroll: true });
    return accepted;
  }

  function selectMinimapIcon(e) {
    if (
      !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) ||
      context.chase?.state.jailed
    )
      return;
    e.preventDefault();
    e.stopPropagation();
    context.keys.clear();
    if (!context.miniIcons.length) return;
    const step = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
    const current = context.miniIcons.findIndex((p) => p.place === context.miniKeyboardPlace),
      index =
        current < 0
          ? step < 0
            ? context.miniIcons.length - 1
            : 0
          : (current + step + context.miniIcons.length) % context.miniIcons.length;
    const p = context.miniIcons[index].place,
      name = placeIcon(p.id).label;
    context.miniKeyboardPlace = p;
    context
      .$('sf-map-button')
      .setAttribute(
        'aria-label',
        'Minimap: ' + name + '. Press Enter to travel. Arrow keys select another icon.',
      );
    context.$('sf-status').textContent = name + ' · ' + p.label;
    drawMini();
  }

  function prepareWayfinding() {
    const legend = context.$('sf-icon-legend'),
      layer = context.$('sf-place-markers');
    legend.replaceChildren();
    layer.replaceChildren();
    for (const p of context.places) {
      if (p.activityBuilding) continue;
      if (!PLACE_ICONS[p.id]) throw new Error('Missing content icon for ' + p.id);
      const icon = placeIcon(p.id),
        item = document.createElement('div'),
        badge = document.createElement('span'),
        copy = document.createElement('span'),
        title = document.createElement('strong'),
        detail = document.createElement('small');
      item.className = 'sf-legend-item';
      item.setAttribute('role', 'listitem');
      badge.className = 'sf-legend-icon';
      badge.style.setProperty('--sf-place-color', icon.color);
      badge.innerHTML = iconSVG(p.id);
      title.textContent = icon.label;
      detail.textContent = icon.detail;
      copy.append(title, detail);
      item.append(badge, copy);
      legend.append(item);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sf-place-marker';
      button.dataset.place = p.id;
      button.style.setProperty('--sf-place-color', icon.color);
      button.innerHTML = iconSVG(p.id);
      button.title = icon.label + ' · ' + p.label;
      button.setAttribute('aria-label', 'Visit ' + p.label + ' · ' + icon.label);
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        context.clicked(e.clientX, e.clientY, () => context.goToPlace(p));
        drawMini();
      });
      layer.append(button);
      context.placeMarkerViews.push({
        place: p,
        button,
        lastCheck: -Infinity,
        version: -1,
        blocked: false,
      });
    }
  }

  function drawPlaceMarkers(t) {
    if (context.secretWorld?.kind !== 'world') {
      for (const view of context.placeMarkerViews) view.button.hidden = true;
      return;
    }
    for (const marker of context.placeMarkerViews) {
      const { place: p, button } = marker;
      if (context.chase.state.jailed || context.currentInterior === p) {
        button.hidden = true;
        continue;
      }
      const anchor = [p.x + p.w / 2, p.object.hi[1] + 0.55, p.y + p.d / 2],
        at = context.project(...anchor);
      if (
        at.distance <= 0 ||
        at.depth > 1 ||
        at.x < 14 ||
        at.x > context.width - 14 ||
        at.y < 28 ||
        at.y > context.height - 14
      ) {
        button.hidden = true;
        continue;
      }
      if (t - marker.lastCheck > 120 || marker.version !== context.camera.version) {
        const ray = { origin: context.camera.eye, dir: unit(sub(anchor, context.camera.eye)) },
          distance = Math.hypot(...sub(anchor, context.camera.eye));
        marker.blocked = context.objects.some((o) => {
          if (o === p.object || o.interior === p || (!o.arch && !o.solid)) return false;
          const d = rayBox(ray, o.lo, o.hi);
          return d !== null && d < distance - 0.35;
        });
        marker.lastCheck = t;
        marker.version = context.camera.version;
      }
      button.hidden = marker.blocked;
      if (!marker.blocked) {
        button.style.left = at.x + 'px';
        button.style.top = at.y + 'px';
      }
    }
  }
  return {
    buildCityMap,
    drawMini,
    minimapPointer,
    navigateFromMinimap,
    selectMinimapIcon,
    prepareWayfinding,
    drawPlaceMarkers,
  };
}
