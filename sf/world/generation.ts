import { requirePlacedBuilding } from '../building-placement.ts';
import type { ParcelRectangle } from '../types/parcels.ts';
import type { HeightField } from '../southern-terrain.ts';
import type { RenderedSite, Street, Site, Place, WorldObject } from '../types/world.ts';
import { hasPhysicalBounds, isPickTarget, requiredPhysicalObject } from '../picking.ts';
import type { InstituteRoom, DetachedInterior } from '../types/interiors.ts';
import { isFiniteNumber, isRecord } from '../types/json.ts';
import { requiredValue } from '../types/assert.ts';
import type { StaticWorldSnapshot } from '../types/static-world.ts';

import type { BuiltWorldTileMap } from '../types/tiles.ts';
import type { CityParcel } from '../types/scene-state.ts';

import type { DestinationBuilding } from '../types/buildings.ts';

import type { WorldContext } from './scene.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText, refreshContent, subscribeContent } from '../content-runtime.ts';
import { BOLINAS } from '../bolinas.ts';
import {
  DOG_PONY_SIGN,
  drawDogPonyShowground,
  createDogPonyAdministrator,
} from '../dog-pony-show.ts';
import { RENDERING, sceneryMemoryLimit } from '../config/rendering.ts';
import { WIZARD_HOUSE } from '../wizard-house.ts';
import { drawSouthernCountryside } from '../southern-countryside.ts';
import { compileMinimapRoads } from '../world-minimap.ts';
import { packWorldTiles, unpackWorldTiles } from '../world-tile-codec.ts';
import { signAtlasLayout } from '../materials.ts';
import { restoreTileNavigation, navigationObstacles } from '../navigation.ts';
import { createWorldStream } from '../world-stream.ts';
import { drawCupertinoGardens } from '../cupertino-gardens.ts';
import {
  VILLAGE_SIGNS,
  drawSouthernVillage,
  drawDuelArena,
  drawStockExchange,
} from '../southern-village.ts';
import { duelDeckHeightAt } from '../duel-layout.ts';
import { nextLoadingPaint } from '../loading-screen.ts';
import { createTeleportTablets } from '../teleport-tablets.ts';
import { createMarinLand } from '../marin-land.ts';
import { createCountryside } from '../countryside.ts';
import { equipmentDefense } from '../item-stats.ts';
import { createWilderness, wildernessSpawns } from '../wilderness.ts';
import { drawPirateWreck } from '../wilderness-sites.ts';
import { createFerrariCityRoads } from '../ferrari-roads.ts';
import { drawArmory } from '../armory.ts';
import { batchInFrustum } from '../static-batches.ts';
import { SOUTHERN_CRAFT_SIGNS } from '../southern-craft.ts';
import { TWITTER_HQ, SALES_CONFERENCE, socialLocalPoint } from '../social-layout.ts';
import { SOCIAL_SIGNS, drawSocialBuildings } from '../social-buildings.ts';
import { drawRunoffBanks } from '../bottle-post.ts';
import { TECH_SIGNS, drawAppleCampus, drawRobotaxiDealer } from '../tech-buildings.ts';
import { HABERDASHER_SIGNS, drawHaberdasherShop } from '../haberdasher-shop.ts';
import { SALT_FLATS_SIGNS, drawSaltFlats } from '../salt-flats.ts';
import { planBlockStreetLights, houseDoorPositions } from '../street-light-layout.ts';

import { Mesh, rand, tint } from '../geometry.ts';
import { gradeStreetHeightField } from '../street-ground.ts';
import {
  TILE_CONFIG,
  TILE_TYPES,
  TILE_PRESETS,
  TILE_EDGES,
  tilePolygonOverlap,
  surfaceTileFromPatches,
  buildSurfaceTile,
  validateTileMap,
  runTileRuleTests,
} from '../tiles.ts';
import { createWaterTiles, applyWaterTile } from '../water-tiles.ts';
import { shorelineSegments, westernCoastX, westernBeachWidth } from '../coastline.ts';
import { createCoastalRocks, drawCoastalRocks } from '../western-coast-details.ts';
import { drawStreetLamp } from '../lighting.ts';
import { DOWNTOWN, marketSide } from '../downtown.ts';
import { createSeaSurface, decorateHeadlands } from '../environment.ts';
import {
  AIRSHIP_TERMINAL,
  SOUTHERN_ROADS,
  STARTUP_HQ,
  airportGate,
  airportRoadTiles,
  airportRoadDistance,
  airportSurfaceTypeAt,
  onAirportApron,
  drawAirshipTerminal,
} from '../airship.ts';
import {
  TAX_HQ,
  SF_SPACEPORT,
  SPACEPORT_HOUSES,
  RAIL_PIT,
  inRailPit,
  drawSouthernDistrict,
  drawPlaque,
  drawRailPit,
} from '../southern-district.ts';
import {
  SOUTHERN_BOUNDS,
  SOUTHERN_TRAILS,
  SOUTHERN_LEVEL_PADS,
  SF_FITNESS,
  SAND_HILL_CAPITAL,
  gymAccess,
  timesSquareWalkable,
  TIMES_SQUARE,
  inTimesSquare,
} from '../southern-layout.ts';
import { createSouthernTerrain } from '../southern-terrain.ts';
import { JURASSIC, COW_PEN, PEQUOD } from '../jurassic-layout.ts';
import { JURASSIC_SIGNS, drawJurassicCampus, drawCattlePen } from '../jurassic-models.ts';
import { rollEnemyDamage } from '../combat.ts';
import { createDeli } from '../deli.ts';
import { createStreetTraffic } from '../street-traffic.ts';
import {
  AIRPORT_FIELD_ADS,
  planAirportBillboards,
  drawAirportBillboard,
} from '../airport-billboards.ts';
import { createFerrari } from '../ferrari.ts';
import {
  ADVENTURE_SIGNS,
  drawFitness,
  drawTrainingSites,
  createHighwaySites,
  drawHighwaySites,
} from '../adventure-sites.ts';
import { fitnessObstacles } from '../fitness-layout.ts';

import { WOODLAND_SIGNS } from '../woodland-park.ts';
import { BILLBOARD_ART } from '../billboards.ts';
import { RESEARCH_ART } from '../research-art.ts';
import { TIMES_SQUARE_SIGNS } from '../times-square.ts';
import { insideInstitute, INSTITUTE_FLOOR_HEIGHT } from '../institute-interiors.ts';
import {
  RESEARCH_SIGNS,
  drawResearchCampuses,
  createResearcherNPCs,
} from '../research-campuses.ts';
import { SUNGLASSES_BEACH_TARGET, beachSunglassesSite } from '../sunglasses.ts';
import { SEARCH_HOMES, searchHomeContaining } from '../search-houses.ts';
import { createLoreBookTarget } from '../world-lore.ts';
import { TERMINATOR_FACTORY } from '../encounter-layout.ts';
import { drawAbandonedFactory } from '../encounter-buildings.ts';
import { ALIEN_TARGETS } from '../they-live.ts';
import {
  ALIEN_SITE_SIGNS,
  INDUSTRIAL_CENTER,
  drawIndustrialCenter,
  createEsotericCampus,
} from '../alien-sites.ts';
import { SQUARE_LIFE_SIGNS, createSquareNPCs } from '../times-square-life.ts';
import { drawSquareConstruction } from '../square-construction.ts';

import { createNPCRoaming } from '../npc-roaming.ts';
import { drawShipyardCargo } from '../shipyard.ts';
import { COIT_GROVE, inCoitGrove } from '../parrots.ts';
import { detentionStaff } from '../rehabilitation.ts';
import { createMonkeyPursuit } from '../monkey-escape.ts';
import { ZOO_PURSUIT_SPEED, createTigerEncounter } from '../zoo-encounter.ts';
import { createMotorcycle, MOTORCYCLE_EXAMINE } from '../motorcycle.ts';
import { RAIL_WORKER, drawRailWorks } from '../rail-works.ts';

import { populateSouthernNeighborhood } from '../southern-neighborhood.ts';
import { PACIFICA_PARK_RESIDENTS } from '../southern-expansion.ts';
import { PENINSULA_SIGNS } from '../peninsula-details.ts';
import { rocketCruiseSpeed } from '../rocket.ts';
import { createRegionalRoad, createGoldenGateCrossing } from '../regional-road.ts';
import {
  TAHOE,
  TAHOE_SUPPLY_HUT,
  tahoeHeight,
  regionalGroundHeight,
  drawTahoeTerrain,
  drawTahoeStructures,
} from '../tahoe.ts';
import { AIRSHIP_BASKET } from '../airship-basket.ts';
import { MERCHANTS } from '../economy.ts';
import { peptideSpawnPoints } from '../guild.ts';
import { ILLUMINATI_CAVE } from '../map-instances.ts';
import { createSecretAdventures } from '../secret-adventures.ts';
import { createBankService, createBankMenu } from '../bank-ui.ts';
import { createIlluminatiCaveMesh, drawSecretStair } from '../illuminati-models.ts';
import { applyWorldEdits } from '../world-edits.ts';
import { bomberCruiseHeight } from '../stealth-bomber.ts';
import { AIRPORT_AD_GARDEN } from '../south-bay-layout.ts';
import { serviceStaffPosition } from '../building-interactions.ts';
import { drawStartupHQ, drawGrainStand, merchant } from '../commerce-world.ts';
import { createPaintedBunny } from '../bunny.ts';
import { createSkateDog } from '../skate-dog.ts';
import { drawPrometheus, prometheusTorchLight } from '../prometheus.ts';
import { RESTAURANTS, restaurantPoint } from '../restaurants.ts';
import { createCityLife, clipLifeRoutes, NOE_VALLEY_BOUNDS } from '../life.ts';
import { createTrafficSignals } from '../traffic-signals.ts';
import { createSlowBus, planNightlifeBus } from '../slow-bus.ts';
import { BUS_SIGNS, drawTrafficSignalPosts } from '../transit-models.ts';
import { GPU_FACTORY_SIGNS, oceanBeachSandSite, drawGPUFactory } from '../gpu-factory.ts';
import {
  buildNightlife,
  nightlifeObstacles,
  NIGHTLIFE,
  nightlifeAccess,
  nightlifeWalkable,
  nightlifeHeight,
} from '../nightlife.ts';
import { ZOO_ENCLOSURES, drawZooEnclosures } from '../zoo-animals.ts';

import { SF_ZOO, UCSF_HOSPITAL, drawZooAndHospital } from '../zoo.ts';
import { DOG_SURFING, drawDogSurfingBeach } from '../dog-surfing.ts';
import { PACIFICA_SURF_SPOT, drawSurfRack } from '../surfing.ts';
import { createPoliceChase, drawDetentionFacility } from '../encounters.ts';
import {
  REFERENCE_SIZE,
  PARK_BOUNDS,
  PANHANDLE,
  sfElevation,
  sfHillCover,
  levelHeightField,
  cutBuildingPlot,
} from '../geography.ts';

import type { Color, Point } from '../types/geometry.ts';

/** Authored world construction and hydration; shared by Node and the browser.
 * Dependencies are explicit live scene bindings, preserving initialization
 * order without globals. This module only reads bindings when a method runs. */
export function createGeneration(context: WorldContext) {
  // Entrances and interiors are assigned during placement.
  const planningPlaces = (): DestinationBuilding[] => context.places;
  function placedBuilding(id: string): Place {
    return requirePlacedBuilding(context.places.find((place) => place.id === id));
  }
  function insidePolygon(x: number, y: number, points: readonly (readonly number[])[]) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [ax, ay] = points[i],
        [bx, by] = points[j];
      if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
    }
    return inside;
  }

  function distanceToSegment(x: number, y: number, a: number[], b: number[]) {
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t);
  }

  function nearestStreet(x: number, y: number) {
    let distance = Infinity,
      index = 0;
    context.streets.forEach((r, i) => {
      for (let j = 1; j < r.points.length; j++) {
        const d = distanceToSegment(x, y, r.points[j - 1], r.points[j]);
        if (d < distance) {
          distance = d;
          index = i;
        }
      }
    });
    return { distance, index };
  }

  function alongStreet(r: Street, f: number) {
    r = { ...r, points: r.route || r.points };
    const lengths = r.points
      .slice(1)
      .map((p, i) => Math.hypot(p[0] - r.points[i][0], p[1] - r.points[i][1]));
    let d = f * lengths.reduce((a, b) => a + b, 0);
    for (let i = 0; i < lengths.length; i++) {
      if (d <= lengths[i] || i === lengths.length - 1) {
        const a = r.points[i],
          b = r.points[i + 1],
          t = d / lengths[i];
        return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t };
      }
      d -= lengths[i];
    }
  }

  function registerInstituteInterior(sight: Site, interior: DetachedInterior) {
    const room: InstituteRoom = {
      ...interior.spec,
      sight,
      entry: sight.entry,
      inside: sight.inside,
    };
    const object = {
      sight,
      researchRoom: room,
      mesh: interior.mesh,
      gpu: context.upload(interior.mesh),
      sections: interior.sections,
      start: 0,
      count: interior.mesh.data.length / 11,
      lo: interior.lo,
      hi: interior.hi,
      x: room.x - room.w / 2,
      y: room.z - room.d / 2,
      w: room.w,
      d: room.d,
      base: room.base,
      arch: 'research-interior',
      preserveGround: true,
      navigationPolygons: [],
    };
    room.object = object;
    context.objects.push(object);
    context.buildingModels.push(object);
    context.instituteRooms.push(room);
    for (const detail of sight.details || []) {
      const section = interior.sections.find((p) => p.kind === detail.section);
      if (!section) throw new Error('Missing detail geometry: ' + detail.id);
      const lo = [Infinity, Infinity, Infinity] satisfies [number, number, number],
        hi = [-Infinity, -Infinity, -Infinity] satisfies [number, number, number],
        data = interior.mesh.data;
      for (let i = section.start * 11; i < (section.start + section.count) * 11; i += 11)
        for (let k = 0; k < 3; k++) {
          lo[k] = Math.min(lo[k], data[i + k]);
          hi[k] = Math.max(hi[k], data[i + k]);
        }
      const target = {
        sight: { ...detail },
        detailTarget: true,
        mesh: interior.mesh,
        start: section.start,
        count: section.count,
        lo,
        hi,
      };
      target.sight.object = target;
      context.objects.push(target);
      context.sights.push(target.sight);
    }
  }

  function occupy(x: number, y: number, w = 1, d = 1) {
    for (let j = Math.max(0, Math.floor(y)); j < Math.min(context.N, Math.ceil(y + d)); j++)
      for (let i = Math.max(0, Math.floor(x)); i < Math.min(context.N, Math.ceil(x + w)); i++)
        context.occupied[j * context.N + i] = 1;
  }

  function setupZoo() {
    const c = SF_ZOO.cage,
      h = UCSF_HOSPITAL;
    context.zooBase = levelTerrainPad(c.x, c.z, c.w + 0.2, c.d + 0.2);
    levelTerrainPad(18.7, 86.8, 2.6, 1.7);
    levelTerrainPad(h.x, h.z, h.w, h.d);
    for (const poly of [
      context.rectangle(SF_ZOO.x, SF_ZOO.z, SF_ZOO.w, SF_ZOO.d),
      context.rectangle(h.x, h.z, 5.4, 8.4),
    ]) {
      claimParcel({ polygon: poly, kind: 'public garden' });
      context.publicSpaces.push(poly);
    }
    for (const pen of ZOO_ENCLOSURES.filter((s) => s.z < context.N)) {
      levelTerrainPad(pen.x, pen.z, pen.w + 0.1, pen.d + 0.1);
      const poly = context.rectangle(pen.x, pen.z, pen.w + 0.1, pen.d + 0.1);
      claimParcel({ polygon: poly, kind: 'public garden' });
      context.publicSpaces.push(poly);
    }
    for (const site of [
      ...drawZooAndHospital(context.sceneMesh, terrainHeight, context.signs),
      ...drawZooEnclosures(context.sceneMesh, terrainHeight, {
        include: (s: { z: number }) => s.z < context.N,
      }),
    ]) {
      const sight: Site = {
        id: site.id,
        kind: site.kind,
        label: site.label,
        entry: site.entry,
        description: site.description,
        mapPoint: {
          x: site.lo[0] + (site.hi[0] - site.lo[0]) / 2,
          y: site.lo[2] + (site.hi[2] - site.lo[2]) / 2,
        },
      };
      const object = {
        mesh: context.sceneMesh,
        start: site.start / 11,
        count: site.count / 11,
        x: site.lo[0],
        y: site.lo[2],
        w: site.hi[0] - site.lo[0],
        d: site.hi[2] - site.lo[2],
        lo: site.lo,
        hi: site.hi,
        base: site.base,
        footprint: site.footprint,
        solid: true,
        pinned: true,
        preserveGround: true,
        arch: site.kind === 'zoo' ? 'enclosure' : 'civic',
        sight,
      };
      sight.object = object;
      context.objects.push(object);
      context.sights.push(sight);
    }
  }

  function setupCityFitness() {
    const g = SF_FITNESS;
    levelTerrainPad(g.x, g.z, g.w + 0.15, g.d + 0.2, 0, g.base - 0.015);
    const site = drawFitness(context.sceneMesh, context.signs),
      sight: Site = { ...site },
      object = {
        sight,
        mesh: context.sceneMesh,
        start: site.start / 11,
        count: site.count / 11,
        lo: site.lo,
        hi: site.hi,
        x: g.x - g.w / 2,
        y: g.z - g.d / 2,
        w: g.w,
        d: g.d,
        base: g.base,
        arch: 'fitness',
        solid: true,
        pinned: true,
        preserveGround: true,
        footprint: context.rectangle(g.x, g.z, g.w, g.d),
        navigationPolygons: fitnessObstacles(),
      };
    sight.object = object;
    context.sights.push(sight);
    context.objects.push(object);
    const grounds = context.rectangle(g.x, g.z + 0.3, g.w + 0.4, g.d + 1.2);
    claimParcel({ polygon: grounds, kind: 'fitness grounds', object });
    context.publicSpaces.push(grounds);
  }

  function setupJurassicCampus() {
    const j = JURASSIC;
    levelTerrainPad(j.x, j.z, j.w, j.d, 0, j.base - 0.04);
    const site = drawJurassicCampus(context.sceneMesh, context.signs),
      sight: Site = {
        id: 'jurassic-biosciences',
        kind: 'biosciences',
        label: contentText('world.generation.setupJurassicCampus.label-3', {}),
        entry: { ...j.entry },
        description: contentText('world.generation.setupJurassicCampus.description-4', {}),
      };
    const obstacle = (b: ParcelRectangle) => context.rectangle(b.x, b.z, b.w + 0.06, b.d + 0.06),
      object = {
        sight,
        mesh: context.sceneMesh,
        start: site.start / 11,
        count: site.count / 11,
        lo: site.lo,
        hi: site.hi,
        x: j.x - j.w / 2,
        y: j.z - j.d / 2,
        w: j.w,
        d: j.d,
        base: j.base,
        arch: 'biosciences',
        pinned: true,
        solid: true,
        preserveGround: true,
        navigationPolygons: [obstacle(j.lab), obstacle(j.cage)],
      };
    sight.object = object;
    context.objects.push(object);
    context.sights.push(sight);
    const grounds = context.rectangle(j.x, j.z + 0.7, j.w + 0.8, j.d + 2.2);
    claimParcel({ polygon: grounds, kind: 'biosciences grounds' });
    context.publicSpaces.push(grounds);
  }

  function setupExpeditionSites() {
    const j = JURASSIC,
      scientistPoint = context.airship.nearest(j.entry.x, j.entry.y, 0.9, (x: number, y: number) =>
        context.landClearAt(x, y),
      );
    if (!scientistPoint) throw new Error('Jurassic Biosciences needs a reachable scientist');
    requiredValue(
      context.sightById('jurassic-biosciences'),
      'Missing authored entity: jurassic-biosciences',
    ).entry = { ...scientistPoint };
    context.merchants.push({
      id: 'jurassic-scientist',
      expeditionRole: 'scientist',
      label: contentText('world.generation.setupExpeditionSites.label-5', {}),
      name: contentText('world.generation.setupExpeditionSites.name-6', {}),
      x: scientistPoint.x + 0.5,
      z: scientistPoint.y + 0.5,
      base: characterGround(scientistPoint.x + 0.5, scientistPoint.y + 0.5),
      skin: '#a98260',
      shirt: '#e7e8de',
      hair: '#554737',
      coat: true,
      angle: -Math.PI / 2,
      height: 1.9,
      description: contentText('world.generation.setupExpeditionSites.description-7', {}),
    });
    const p = COW_PEN,
      start = context.sceneMesh.data.length;
    drawCattlePen(context.sceneMesh, terrainHeight);
    const footprint = (x: number, z: number, w: number, d: number) => context.rectangle(x, z, w, d),
      sight: Site = {
        id: 'south-cow-pen',
        kind: 'cattle',
        label: contentText('world.generation.setupExpeditionSites.label-8', {}),
        entry: { ...p.entry },
        description: contentText('world.generation.setupExpeditionSites.description-9', {}),
      },
      polygons = [
        footprint(p.x, p.z - p.d / 2, p.w, 0.12),
        footprint(p.x - p.w / 2, p.z, 0.12, p.d),
        footprint(p.x + p.w / 2, p.z, 0.12, p.d),
        ...([-1, 1] satisfies [number, number]).map((side) =>
          footprint(p.x + side * (p.w / 4 + 0.35), p.z + p.d / 2, p.w / 2 - 0.7, 0.12),
        ),
      ];
    const object = {
      sight,
      mesh: context.sceneMesh,
      start: start / 11,
      count: (context.sceneMesh.data.length - start) / 11,
      lo: [p.x - p.w / 2, 0, p.z - p.d / 2] satisfies [number, number, number],
      hi: [p.x + p.w / 2, 16, p.z + p.d / 2] satisfies [number, number, number],
      x: p.x - p.w / 2,
      y: p.z - p.d / 2,
      w: p.w,
      d: p.d,
      arch: 'cow-pen',
      solid: true,
      preserveGround: true,
      navigationPolygons: polygons,
    };
    sight.object = object;
    context.objects.push(object);
    context.sights.push(sight);
    const coast = westernCoastX(PEQUOD.z),
      entry = context.airship.nearest(
        coast + 0.6 - 0.5,
        PEQUOD.z - 0.5,
        4,
        (x: number, y: number) => context.landClearAt(x, y),
      );
    if (!entry) throw new Error('The Pequod needs a connected beach approach');
    context.pequodSite = {
      id: 'pequod',
      kind: 'pequod',
      label: contentText('world.generation.setupExpeditionSites.label-10', {}),
      entry,
      description: contentText('world.generation.setupExpeditionSites.description-11', {}),
    };
    context.sights.push(context.pequodSite);
    context.expeditions.setHarbor({ x: coast - PEQUOD.offshore, z: PEQUOD.z });
    context.ahabNPC = {
      id: 'captain-ahab',
      expeditionRole: 'ahab',
      label: contentText('world.generation.setupExpeditionSites.label-12', {}),
      name: contentText('world.generation.setupExpeditionSites.name-13', {}),
      x: entry.x + 0.5,
      z: entry.y + 0.5,
      shore: { x: entry.x + 0.5, z: entry.y + 0.5 },
      base: characterGround(entry.x + 0.5, entry.y + 0.5),
      skin: '#ba9f7e',
      hair: '#c3c1ac',
      shirt: '#394a58',
      coat: true,
      cap: true,
      angle: Math.PI,
      height: 1.95,
      description: contentText('world.generation.setupExpeditionSites.description-14', {}),
      approach: { ...entry },
    };
    context.merchants.push(context.ahabNPC);
    const h = terrainHeight(entry.x + 0.5, entry.y + 0.5);
    for (let x = coast - 1.5; x < entry.x + 0.8; x += 0.35) {
      context.sceneMesh.box(x, 0.38, PEQUOD.z - 0.45, 0.32, 0.09, 0.9, '#a58c68', 'wood');
      if (Math.floor((x - coast) * 10) % 7 === 0)
        context.sceneMesh.rod(
          [x, -0.25, PEQUOD.z - 0.4] satisfies [number, number, number],
          [x, h + 0.5, PEQUOD.z - 0.4],
          0.035,
          '#827253',
          9,
        );
    }
  }

  function drawWildernessSigns() {
    for (const [text, x, z] of [
      ['BOLINAS', -7, -42.5] satisfies [string, number, number],
      ['COASTAL GROCER', -3, -45.7] satisfies [string, number, number],
      ['MOUNT TAM GOBLINS', 30, -17.2] satisfies [string, number, number],
      ['TAM MODERN FURNITURE', 29.5, -29.1] satisfies [string, number, number],
      ['FOG JAR CO-OP', 26.5, -20.1] satisfies [string, number, number],
    ]) {
      const base = characterGround(x, z);
      context.sceneMesh.rod([x - 0.7, base, z], [x - 0.7, base + 1.4, z], 0.035, '#8e7654', 8);
      drawPlaque(context.sceneMesh, context.signs, text, x, base + 1.25, z, 1.8, 0.23, true);
    }
  }

  function setupWilderness() {
    if (!context.sights.some((s) => s.id === 'bolinas'))
      context.sights.push({
        id: 'bolinas',
        kind: 'village',
        label: contentText('world.generation.setupWilderness.label-15', {}),
        entry: { ...BOLINAS.entry },
        description: contentText('world.generation.setupWilderness.description-16', {}),
      });
    for (const [id, x, z, name, line] of [
      [
        'bolinas-grocer',
        -3,
        -44.5,
        'Bolinas grocer',
        'The fog came in early. It has a key to the shop now.',
      ] satisfies [string, number, number, string, string],
      [
        'bolinas-surfer',
        -5,
        -49,
        'Bolinas surfer',
        'The best wave is always the one somebody saw yesterday.',
      ] satisfies [string, number, number, string, string],
    ])
      if (!context.merchants.some((n) => n.id === id))
        context.merchants.push({
          id,
          kind: 'bolinas-local',
          label: name,
          name,
          localLine: line,
          approach: { x: x - 0.5, y: z + 0.5 },
          x,
          z,
          base: characterGround(x, z),
          regional: true,
          stationary: true,
          skin: '#b89372',
          shirt: '#75958c',
          hair: '#6c5848',
          height: 1.8,
          description: contentText('world.generation.setupWilderness.description-19', {}),
        });
    if (!context.merchants.some((n) => n.id === 'ssf-battery-seller')) {
      const spot = context.airship.nearest(84, 143, 10, (x: number, y: number) =>
        context.landClearAt(x, y),
      );
      if (!spot) throw Error('South San Francisco battery seller needs a walkable counter');
      const x = spot.x + 0.5,
        z = spot.y + 0.5;
      context.merchants.push({
        approach: context.airship.nearest(spot.x + 1, spot.y, 2, (x: number, y: number) => {
          const d = Math.hypot(x - spot.x, y - spot.y);
          return d >= 0.8 && d < 1.6;
        }),
        id: 'ssf-battery-seller',
        kind: 'battery-seller',
        name: contentText('world.generation.setupWilderness.name-20', {}),
        label: contentText('world.generation.setupWilderness.label-21', {}),
        x,
        z,
        base: characterGround(x, z),
        regional: true,
        stationary: true,
        skin: '#ae8263',
        shirt: '#a78b50',
        hair: '#383c3d',
        height: 1.85,
        description: contentText('world.generation.setupWilderness.description-22', {}),
      });
    }
    if (!context.sights.some((s) => s.id === 'mount-tam-goblins'))
      context.sights.push({
        id: 'mount-tam-goblins',
        kind: 'goblin-town',
        label: contentText('world.generation.setupWilderness.label-23', {}),
        entry: { x: 29.5, y: -17.5 },
        description: contentText('world.generation.setupWilderness.description-24', {}),
      });
    const spawns = wildernessSpawns({ marin: context.goldenGate.gate('marin'), tahoe: TAHOE.base });
    const bison = requiredValue(
        spawns.find((n) => n.combatKind === 'bison'),
        'Missing authored world entity: bison',
      ),
      grass = context.nearestNavigation(
        bison.x - 0.5,
        bison.z - 0.5,
        4,
        (x: number, y: number) =>
          context.inPark(x, y) &&
          surfaceTypeAt(x + 0.5, y + 0.5) === 'grass' &&
          [
            [0.6, 0] satisfies [number, number],
            [-0.6, 0] satisfies [number, number],
            [0, 0.6] satisfies [number, number],
            [0, -0.6] satisfies [number, number],
          ].every(([dx, dy]) => context.landClearAt(x + dx, y + dy)),
      );
    if (!grass) throw Error('The park bison needs a clear grass meadow');
    Object.assign(bison, { x: grass.x + 0.5, z: grass.y + 0.5 });
    for (const p of spawns.filter((p) => p.combatKind === 'seagull')) {
      const clear = context.nearestNavigation(p.x - 0.5, p.z - 0.5, 6, (x: number, y: number) =>
        context.landClearAt(x, y),
      );
      if (clear) Object.assign(p, { x: clear.x + 0.5, z: clear.y + 0.5 });
    }
    for (const p of spawns)
      if (!context.landClearAt(p.x - 0.5, p.z - 0.5))
        throw Error(p.id + ' needs a native walkable spawn');
    context.wilderness = createWilderness({
      spawns,
      ground: characterGround,
      canTravel: (a: { x: number; z: number }, b: { x: number; z: number }) =>
        context.canTravel(a.x - 0.5, a.z - 0.5, b.x - 0.5, b.z - 0.5, true),
      route: (a, b) =>
        context
          .pathTo(b.x - 0.5, b.z - 0.5, { x: a.x - 0.5, y: a.z - 0.5 })
          ?.map((p) => ({ x: p.x + 0.5, z: p.y + 0.5 })),
      onHit: ({ actor, damage }) => {
        if (!context.headless)
          context.expeditionEvent({
            type: 'shot',
            target: actor,
            damage,
            hp: actor.hp,
            max: actor.max,
          });
      },
      onDrop: (record) =>
        context.expeditions.state.loot.push({
          ...record,
          id: 'wild-loot-' + ++context.wildLootSerial,
          kind: 'loot',
          expires: context.expeditions.state.clock + 120,
        }),
      onDamage: (person, amount: number, actor) => {
        if (context.headless) return;
        const damage = context.health.damage(
          Math.max(
            0,
            rollEnemyDamage(amount, context.strength.status.level) -
              equipmentDefense(context.playerLook),
          ),
        );
        context.expeditionEvent({
          type: 'damage',
          damage,
          hp: context.health.state.hp,
          max: context.health.state.max,
          target: actor,
          message: null,
        });
        if (!context.health.state.hp) {
          context.wildTarget = null;
          context.expeditionEvent({
            type: 'death',
            message: 'You have died and respawned at UCSF Hospital',
          });
        }
      },
    });
  }

  function setupTigerEncounter() {
    context.zoo = createTigerEncounter({
      player: context.player,
      home: { x: SF_ZOO.cage.x - 0.5, y: SF_ZOO.cage.z - 0.5 },
      exit: SF_ZOO.exit,
      wardenStarts: SF_ZOO.wardens,
      routeTo: (x: number, y: number, from: Point | undefined) => context.pathTo(x, y, from, true),
      speed: ZOO_PURSUIT_SPEED,
      canPursue: () =>
        !context.ferrari?.state.riding &&
        !context.chase.state.jailed &&
        !context.rocket.state.active &&
        !context.flying() &&
        !context.rope.climbing &&
        !context.sutroClimb.state.active &&
        !context.surf.state.riding &&
        context.tahoe.state.mode === 'ground' &&
        !(
          context.zoo?.state.deaths &&
          Math.hypot(
            context.player.x -
              requiredValue(context.sightById('ucsf'), 'Missing authored entity: ucsf').entry.x,
            context.player.y -
              requiredValue(context.sightById('ucsf'), 'Missing authored entity: ucsf').entry.y,
          ) < 2.5
        ),
      canCapture: (a: { x: number; y: number }, b: { x: number; y: number }) =>
        context.canTravel(a.x, a.y, b.x, b.y, true),
      onDeath: () => context.beginCapture('tiger', context.respawnAtHospital),
      onEvent: (event, warden) => {
        if (event === 'released')
          context.announce(
            'You open the tiger’s gate. The tiger has interpreted this as a dinner invitation. Run!',
            'Zoo',
          );
        if (event === 'dispatched')
          context.announce(
            'Animal control is on its way. “Nobody said there would be cardio.”',
            'Animal Control',
          );
        if (event === 'captured')
          context.announce(
            '“Got you! Back to your rent-controlled enclosure.” Animal control escorts the tiger home.',
            'Animal Control',
          );
        if (event === 'caged')
          context.announce(
            'The tiger is safely back in its cage. The latch has learned absolutely nothing.',
            'Zoo',
          );
        if (event === 'missed' && warden) {
          warden.speech = 'That was a practice net!';
          warden.speechFor = 2.4;
        }
        requiredValue(context.sightById('zoo'), 'Missing authored entity: zoo').tigerLoose =
          event !== 'caged';
      },
    });
  }

  function setupAirshipTerminal() {
    const region = context.navigationRegionAt(context.player.x, context.player.y),
      approach = airportGate(context.N),
      gate = context.nearestNavigation(
        approach.x,
        approach.y,
        0.8,
        (x: number, y: number) =>
          y < context.N - 0.5 &&
          context.navFree(x + 0.5, y + 0.5) &&
          surfaceTypeAt(x + 0.5, y + 0.5) === 'road' &&
          context.navigationRegionAt(x, y) === region,
      );
    if (!gate) throw new Error('Private jet terminal has no connected city approach');
    context.airship.setGate(gate);
    context.airship.setCruiseHeight(
      Math.max(...context.objects.filter(isPickTarget).map((o) => o.hi[1])) + 4,
    );
    const sight: Site = {
      id: 'airship',
      kind: 'airship',
      label: contentText('world.generation.setupAirshipTerminal.label-25', {}),
      category: 'South of San Francisco · Airship rentals',
      entry: { ...AIRSHIP_TERMINAL.entry },
      description: contentText('world.generation.setupAirshipTerminal.description-26', {}),
    };
    context.sights.push(sight);
    const { start, end, lo, hi } = drawAirshipTerminal(
        context.sceneMesh,
        airportSurfaceHeight,
        context.signs,
      ),
      object = {
        sight,
        x: lo[0],
        y: lo[2],
        w: hi[0] - lo[0],
        d: hi[2] - lo[2],
        base: AIRSHIP_TERMINAL.base,
        arch: 'terminal',
        preserveGround: true,
        mesh: context.sceneMesh,
        start: start / 11,
        count: (end - start) / 11,
        lo,
        hi,
      };
    context.objects.push(object);
    sight.object = object;
    const hq = drawStartupHQ(context.sceneMesh),
      hqSight: Site = {
        id: 'startup-hq',
        kind: 'startup',
        label: contentText('world.generation.setupAirshipTerminal.label-27', {}),
        entry: { x: STARTUP_HQ.x - 0.5, y: 131.6 },
        description: contentText('world.generation.setupAirshipTerminal.description-28', {}),
      };
    const house = {
      sight: hqSight,
      mesh: context.sceneMesh,
      start: hq.start / 11,
      count: hq.count / 11,
      lo: hq.lo,
      hi: hq.hi,
      x: hq.lo[0],
      y: hq.lo[2],
      w: hq.hi[0] - hq.lo[0],
      d: hq.hi[2] - hq.lo[2],
      solid: true,
      base: AIRSHIP_TERMINAL.base,
    };
    context.objects.push(house);
    hqSight.object = house;
    context.sights.push(hqSight);
  }

  function setupMerchants() {
    const region = context.navigationRegionAt(context.player.x, context.player.y),
      near = (x: number, z: number) =>
        context.nearestNavigation(
          x - 0.5,
          z - 0.5,
          4,
          (a: number, b: number) =>
            context.navigationRegionAt(a, b) === region && context.clearAt(a, b),
        );
    const exchange = placedBuilding('venture'),
      buyer = near(exchange.entry.x + 1.8, exchange.entry.y + 0.5),
      grain = near(context.POND.x - 1, PARK_BOUNDS.north * context.MAP_SCALE - 0.8);
    if (!buyer || !grain) throw new Error('Trading NPCs need reachable street positions');
    context.merchants.push(
      merchant('founder', STARTUP_HQ.x + 0.35, 131.8, AIRSHIP_TERMINAL.base + 0.04),
      merchant(
        'secondary',
        buyer.x + 0.5,
        buyer.y + 0.5,
        characterGround(buyer.x + 0.5, buyer.y + 0.5),
      ),
      merchant(
        'grain',
        grain.x + 0.5,
        grain.y + 0.5,
        characterGround(grain.x + 0.5, grain.y + 0.5),
      ),
    );
    drawGrainStand(
      context.sceneMesh,
      context.merchants.find((p) => p.kind === 'grain'),
    );
    const bar = requiredValue(
        context.sightById('shanghai-kelly'),
        'Missing authored entity: shanghai-kelly',
      ),
      barPoint = near(bar.entry.x + 0.7, bar.entry.y + 0.5);
    if (!barPoint) throw new Error('The bar needs a reachable bartender');
    context.merchants.push({
      id: 'shanghai-bartender',
      kind: 'bartender',
      label: contentText('world.generation.setupMerchants.label-29', {}),
      name: contentText('world.generation.setupMerchants.name-30', {}),
      x: barPoint.x + 0.5,
      z: barPoint.y + 0.5,
      base: characterGround(barPoint.x + 0.5, barPoint.y + 0.5),
      angle: Math.PI / 2,
      skin: '#ba8d6d',
      shirt: '#e5dcc8',
      hair: '#4b3f35',
      height: 1.9,
    });
    const deliSite = requiredValue(
        context.sightById('lucindas-deli'),
        'Missing authored entity: lucindas-deli',
      ),
      deliPoint = near(deliSite.entry.x + 0.6, deliSite.entry.y);
    if (!deliPoint) throw new Error('Lucinda’s needs a reachable proprietor');
    context.merchants.push({
      id: 'lucindas-proprietor',
      kind: 'deli',
      label: contentText('world.generation.setupMerchants.label-31', {}),
      name: contentText('world.generation.setupMerchants.name-32', {}),
      x: deliPoint.x + 0.5,
      z: deliPoint.y + 0.5,
      base: characterGround(deliPoint.x + 0.5, deliPoint.y + 0.5),
      angle: Math.PI / 2,
      skin: '#ad825f',
      shirt: '#ede0bd',
      hair: '#43362e',
      height: 1.9,
    });
    const maz = placedBuilding('links'),
      mp = near(maz.entry.x + 0.7, maz.entry.y + 0.5);
    if (!mp) throw Error('Mazarine needs a reachable clerk');
    context.merchants.push({
      id: 'mazarine-clerk',
      kind: 'mazarine-clerk',
      neighborhoodService: 'mazarine',
      label: contentText('world.generation.setupMerchants.label-33', {}),
      name: contentText('world.generation.setupMerchants.name-34', {}),
      x: mp.x + 0.5,
      z: mp.y + 0.5,
      base: characterGround(mp.x + 0.5, mp.y + 0.5),
      angle: Math.PI / 2,
      skin: '#b88963',
      shirt: '#e5dfcc',
      hair: '#413c34',
      height: 1.85,
    });
    const lab = placedBuilding('ai-lab'),
      recruiter = near(lab.entry.x + 0.8, lab.entry.y + 0.5);
    if (!recruiter) throw new Error('The AI Lab needs a reachable recruiter');
    context.merchants.push({
      ...merchant(
        'recruiter',
        recruiter.x + 0.5,
        recruiter.y + 0.5,
        characterGround(recruiter.x + 0.5, recruiter.y + 0.5),
      ),
      id: 'ai-lab-recruiter',
      height: 1.9,
    });
    const restaurant = requiredValue(
        context.sightById('cotogna'),
        'Missing authored entity: cotogna',
      ),
      chef = near(restaurant.entry.x + 1.3, restaurant.entry.y + 0.5);
    if (!chef) throw new Error('Cotogna needs a reachable chef');
    context.merchants.push({
      ...merchant('chef', chef.x + 0.5, chef.y + 0.5, characterGround(chef.x + 0.5, chef.y + 0.5)),
      id: 'cotogna-chef',
      coat: true,
      height: 2.15,
    });
    for (let i = 0; i < 5; i++)
      context.merchants.push({
        ...merchant(
          'tax',
          TAX_HQ.x + Math.sin((i * Math.PI) / 2.5) * 1.9,
          130.5 + Math.cos((i * Math.PI) / 2.5) * 0.7,
          AIRSHIP_TERMINAL.base + 0.04,
        ),
        id: 'tax-authority-' + i,
        index: i,
        hold: 0,
        height: 2.15,
        phase: 0,
      });
  }

  function setupNPCRoaming() {
    const obstacles = new Map<string, { x: number; z: number; r: number }[]>(),
      add = (x: number, z: number, r: number) => {
        const key = Math.floor(x / 4) + ',' + Math.floor(z / 4);
        if (!obstacles.has(key)) obstacles.set(key, []);
        requiredValue(obstacles.get(key), 'Obstacle bucket').push({ x, z, r });
      };
    for (const p of [...context.cityLightPlan.lamps, ...context.southernNeighborhood.lamps])
      add(p.x, p.z, 0.23);
    const grain = requiredValue(
      context.merchants.find((n) => n.kind === 'grain'),
      'Missing authored world entity: grain',
    );
    for (const dx of [-0.6, -0.35] satisfies [number, number])
      add(grain.x + dx, grain.z + 0.45, 0.25);
    const free = (x: number, y: number) => {
      if (!context.landClearAt(x, y) || context.placeAt(x, y)) return false;
      const wx = x + 0.5,
        wz = y + 0.5,
        cx = Math.floor(wx / 4),
        cz = Math.floor(wz / 4);
      for (let j = cz - 1; j <= cz + 1; j++)
        for (let i = cx - 1; i <= cx + 1; i++)
          for (const p of obstacles.get(i + ',' + j) || [])
            if (Math.hypot(p.x - wx, p.z - wz) < p.r) return false;
      return true;
    };
    context.specialNPCLife = createNPCRoaming(context.merchants, {
      eligible: (n) =>
        !n.socialActor &&
        !n.seated &&
        !n.researcher &&
        !!(
          n.neighborhood ||
          n.alienId ||
          n.questRole ||
          n.expeditionRole === 'scientist' ||
          (n.kind && MERCHANTS[n.kind])
        ),
      walkable: free,
      canTravel: (ax: number, ay: number, bx: number, by: number) =>
        context.canTravel(ax, ay, bx, by, true),
      ground: characterGround,
      approachFor: context.merchantApproach,
    });
    if (context.specialNPCLife.unavailable.length)
      throw new Error(
        'Special NPCs need a connected roaming area: ' +
          context.specialNPCLife.unavailable.join(', '),
      );
    // Late furniture/decor placement can invalidate a stationary NPC's
    // original approach. Recheck after the final collision graph exists.
    // Seated staff behind counters retain their authored service side.
    for (const npc of context.merchants) {
      if (npc.roam || !context.landClearAt(npc.x - 0.5, npc.z - 0.5)) continue;
      const from = { x: npc.x - 0.5, y: npc.z - 0.5 },
        arrival = context.merchantApproach(npc);
      if (arrival && context.canTravel(from.x, from.y, arrival.x, arrival.y, true)) continue;
      const room = context.placeAt(from.x, from.y),
        replacement = context.nearestExpeditionPoint(
          from.x,
          from.y,
          1.7,
          (x: number, y: number) => {
            const d = Math.hypot(x - from.x, y - from.y);
            return (
              d > 0.7 &&
              d < 1.7 &&
              context.placeAt(x, y) === room &&
              context.landClearAt(x, y) &&
              context.canTravel(from.x, from.y, x, y, true)
            );
          },
        );
      if (!replacement) throw Error(npc.id + ' needs an unobstructed conversation approach');
      npc.approach = replacement;
    }
  }

  function setupCityNightlife() {
    const c = NIGHTLIFE,
      club = buildNightlife(context.sceneMesh, {
        height: terrainHeight,
        naturalHeight: (x: number, z: number) => sampleTerrain(context.naturalHeights, x, z),
        cutPlot: (pad) => cutHousePlot({ ...pad, angle: pad.angle ?? 0 }),
      }),
      sight: RenderedSite = club.sight;
    const object = {
      sight,
      mesh: context.sceneMesh,
      start: sight.start / 11,
      count: sight.count / 11,
      lo: sight.lo,
      hi: sight.hi,
      x: c.x - c.w / 2,
      y: c.z - c.d / 2,
      w: c.w,
      d: c.d,
      base: sight.base,
      arch: 'nightlife',
      pinned: true,
      preserveGround: true,
      navigationPolygons: nightlifeObstacles().map((o) => o.polygon),
    };
    sight.object = object;
    context.nightclub = sight;
    context.objects.push(object);
    context.sights.push(sight);
    context.restaurantDiners.push(...club.diners);
    const parcel = context.rectangle(c.x, c.z + 0.65, c.w + 0.4, c.d + 1.7);
    claimParcel({ polygon: parcel, kind: 'nightclub' });
    context.publicSpaces.push(parcel);
  }

  function setupIndustrialCenter() {
    const c = INDUSTRIAL_CENTER,
      footprint = context.rectangle(c.x, c.z, c.w, c.d, c.angle);
    if (!parcelFits(footprint, { park: true }))
      throw new Error('American Industrial Center must fit between streets on dry land');
    const base = levelTerrainPad(c.x, c.z, c.w, c.d, c.angle),
      site = drawIndustrialCenter(context.sceneMesh, context.signs, { base });
    const sight: Site = { ...site },
      object = {
        sight,
        mesh: context.sceneMesh,
        start: site.start / 11,
        count: site.count / 11,
        lo: site.lo,
        hi: site.hi,
        x: site.lo[0],
        y: site.lo[2],
        w: site.hi[0] - site.lo[0],
        d: site.hi[2] - site.lo[2],
        base,
        arch: 'industrial',
        solid: true,
        pinned: true,
        preserveGround: true,
        footprint,
      };
    sight.object = object;
    context.objects.push(object);
    context.sights.push(sight);
    const court = context.rectangle(82.85, c.z, 0.6, 3.2);
    claimParcel({ polygon: court, kind: 'workshop forecourt' });
    context.publicSpaces.push(court);
    let placed = 0;
    for (const [i, [x, z]] of [
      [87.2, 74.4] satisfies [number, number],
      [87.2, 80.3] satisfies [number, number],
      [84.3, 81.5] satisfies [number, number],
      [83, 73.5] satisfies [number, number],
      [88.3, 77.5] satisfies [number, number],
      [88.5, 80.8] satisfies [number, number],
      [89.2, 78.4] satisfies [number, number],
      [87.5, 82.5] satisfies [number, number],
      [88.5, 72] satisfies [number, number],
      [85.8, 72] satisfies [number, number],
      [87.6, 75] satisfies [number, number],
    ].entries()) {
      if (placed >= 6) break;
      const footprint = context.rectangle(x, z, 1.7, 2);
      if (!parcelFits(footprint, { park: true })) continue;
      const h = levelTerrainPad(x, z, 1.7, 2),
        part = drawShipyardCargo(context.sceneMesh, x, h, z, 0.17 + i * 0.19, placed === 0),
        lo = [x - 0.85, h, z - 1],
        hi = [x + 0.85, h + (placed === 0 ? 4.3 : 1.5), z + 1];
      const object = {
        mesh: context.sceneMesh,
        start: part.start / 11,
        count: part.count / 11,
        lo,
        hi,
        x: x - 0.85,
        y: z - 1,
        w: 1.7,
        d: 2,
        base: h,
        arch: 'shipyard',
        solid: true,
        preserveGround: true,
        footprint,
      };
      context.objects.push(object);
      claimParcel({ polygon: footprint, kind: 'shipyard', object });
      placed++;
    }
  }

  function setupQuestCharacters() {
    const region = context.navigationRegionAt(context.player.x, context.player.y);
    const near = (x: number, z: number) =>
      context.nearestNavigation(
        x - 0.5,
        z - 0.5,
        3,
        (a: number, b: number) =>
          context.navigationRegionAt(a, b) === region && !context.placeAt(a, b),
      );
    const cityPerson = (id: string, x: number, z: number, extra = {}) => {
      const p = near(x, z);
      if (!p) throw new Error(id + ' needs a connected public position');
      const approach = context.nearestNavigation(
        p.x + 0.65,
        p.y + 0.25,
        1,
        (a: number, b: number) =>
          context.navigationRegionAt(a, b) === region &&
          !context.placeAt(a, b) &&
          Math.hypot(a - p.x, b - p.y) > 0.5 &&
          Math.hypot(a - p.x, b - p.y) < 1.3,
      );
      if (!approach) throw new Error(id + ' needs a reachable conversation approach');
      return {
        id,
        label: contentText('world.generation.cityPerson.label-35', {}),
        x: p.x + 0.5,
        z: p.y + 0.5,
        base: characterGround(p.x + 0.5, p.y + 0.5),
        angle: Math.PI / 2,
        skin: '#ba926d',
        hair: '#423b32',
        shirt: '#758b7c',
        height: 1.85,
        approach,
        ...extra,
      };
    };
    const hall = requiredValue(context.sightById('cityhall'), 'Missing authored entity: cityhall'),
      ferry = requiredValue(context.sightById('ferry'), 'Missing authored entity: ferry'),
      venture = placedBuilding('venture'),
      factory = requiredValue(
        context.sightById('american-industrial-center'),
        'Missing authored entity: american-industrial-center',
      );
    context.merchants.push(
      cityPerson('city-hall-clerk', hall.entry.x + 1.4, hall.entry.y + 0.6, {
        name: contentText('world.generation.setupQuestCharacters.name-36', {}),
        label: contentText('world.generation.setupQuestCharacters.label-37', {}),
        questRole: 'clerk',
        shirt: '#7c869f',
        description: contentText('world.generation.setupQuestCharacters.description-38', {}),
        female: true,
        longHair: true,
      }),
    );
    const armorer = cityPerson('industrial-armorer', 82.9, INDUSTRIAL_CENTER.z, {
      name: contentText('world.generation.setupQuestCharacters.name-39', {}),
      label: contentText('world.generation.setupQuestCharacters.label-40', {}),
      questRole: 'armorer',
      shirt: '#7b756b',
      cap: true,
      description: contentText('world.generation.setupQuestCharacters.description-41', {}),
    });
    factory.entry = { ...armorer.approach };
    context.merchants.push(armorer);
    const cityAliens = [
      ['alien-civic', hall.entry.x - 1, hall.entry.y + 1.8] satisfies [string, number, number],
      ['alien-ferry', ferry.entry.x - 1.4, ferry.entry.y + 2] satisfies [string, number, number],
      ['alien-venture', venture.entry.x + 2, venture.entry.y + 1.6] satisfies [
        string,
        number,
        number,
      ],
      ['alien-industrial', 82.8, INDUSTRIAL_CENTER.z + 1.5] satisfies [string, number, number],
    ];
    for (const [i, [id, x, z]] of cityAliens.entries())
      context.merchants.push(
        cityPerson(id, x, z, {
          alienId: id,
          label:
            i % 2
              ? contentText('world.generation.setupQuestCharacters.label-42.yes', {})
              : contentText('world.generation.setupQuestCharacters.label-42.no', {}),
          female: !!(i % 2),
          longHair: !!(i % 2),
          shirt: (
            ['#847b69', '#9b797e', '#637e8c', '#72876b'] satisfies [string, string, string, string]
          )[i],
        }),
      );
    const regionalAlien = (id: string, x: number, z: number, female = false) => ({
      id,
      alienId: id,
      label: female
        ? contentText('world.generation.regionalAlien.label-43.yes', {})
        : contentText('world.generation.regionalAlien.label-43.no', {}),
      female,
      longHair: female,
      x,
      z,
      base: characterGround(x, z),
      angle: Math.PI / 2,
      skin: '#b69272',
      hair: '#403d36',
      shirt: female ? '#8f7b93' : '#71887c',
      height: 1.85,
      regional: true,
      approach: { x: x - 0.5, y: z + 0.35 },
    });
    context.merchants.push(
      regionalAlien('alien-square', 63.5, 152.55, true),
      regionalAlien('alien-sand-hill', 47, 137.5),
    );
    for (const target of ALIEN_TARGETS)
      if (!context.merchants.some((n) => n.alienId === target.id))
        throw new Error('Missing quest alien ' + target.id);
  }

  function setupSearchHomes() {
    for (const [i, home] of SEARCH_HOMES.entries()) {
      const p = home.parcel,
        house: Place = {
          id: home.id,
          name: contentText('world.generation.setupSearchHomes.name-44', {}),
          label: contentText('world.generation.setupSearchHomes.label-45', {}),
          kind: 'residence',
          activityBuilding: true,
          searchHome: true,
          x: p.x - p.w / 2,
          y: p.z - p.d / 2,
          w: p.w,
          d: p.d,
          rotation: p.rotation || 0,
          localDoor: p.x - 0.5,
          inside: { ...home.inside },
          entry: { ...home.entry },
          h: 48,
          worldHeight: 2.4 + (i % 3) * 0.25,
          color: (
            ['#a6b9ad', '#c4a0a5', '#c1b17e', '#9caec1'] satisfies [string, string, string, string]
          )[i % 4],
          style: 'victorian',
          roof: i % 3 === 1 ? 'hip' : 'gable',
          searchDefinition: home.search,
          searchIndex: i,
          description: contentText('world.generation.setupSearchHomes.description-46', {}),
        };
      const ground = terrainHeight(p.x, p.z);
      context.southernTerrain.cutPlot({
        cx: p.x,
        cz: p.z,
        w: p.w,
        d: p.d,
        angle: p.rotation || 0,
        height: ground,
      });
      planningPlaces().push(house);
      const object = context.makeBuilding(house, true),
        range = requiredValue(house.searchContainer, 'Search container geometry'),
        lo = [Infinity, Infinity, Infinity] satisfies [number, number, number],
        hi = [-Infinity, -Infinity, -Infinity] satisfies [number, number, number];
      for (let j = range.start; j < range.start + range.count; j += 11)
        for (let k = 0; k < 3; k++) {
          lo[k] = Math.min(lo[k], object.mesh.data[j + k]);
          hi[k] = Math.max(hi[k], object.mesh.data[j + k]);
        }
      const site: Site = {
        id: home.search.id,
        houseId: house.id,
        kind: 'house-storage',
        label: home.search.label,
        entry: { ...home.approach },
        x: home.target.x,
        z: home.target.z,
        base: object.base,
        description: contentText('world.generation.setupSearchHomes.description-48', {}),
      };
      const target = {
        sight: site,
        interior: house,
        detailTarget: true,
        mesh: object.mesh,
        start: range.start / 11,
        count: range.count / 11,
        lo,
        hi,
        x: lo[0],
        y: lo[2],
        w: hi[0] - lo[0],
        d: hi[2] - lo[2],
      };
      site.object = target;
      context.objects.push(target);
      context.sights.push(site);
      context.searchSites.push(site);
      if (house.loreBook) registerLoreBook(house, home.approach);
    }
  }

  function registerLoreBook(place: Place, entry: Point) {
    const existing = context.sights.find((s) => s.id === 'lore-' + place.id);
    if (existing) return existing;
    const site = createLoreBookTarget(place, entry);
    context.objects.push(site.object);
    context.sights.push(site);
    context.loreSites.push(site);
    return site;
  }

  function setupRegionalWorld() {
    const register = (site: RenderedSite, mesh: Mesh) => {
      const regionalDescription =
        site.kind === 'rail-pit'
          ? 'An empty pit. The sign says California high-speed rail.'
          : site.kind === 'tax-hq'
            ? 'The Tax Authority Headquarters. Gilded officials in top hats patrol the forecourt.'
            : site.kind === 'spaceport'
              ? 'A SpaceX reusable rocket and landing pad. Speak to the attendant for a one-coin flight between San Francisco and Tahoe.'
              : site.kind === 'gondola'
                ? 'A gondola climbs the immense mountain above Lake Tahoe.'
                : 'The summit lift attendant rents skis for one coin. Then ski the winding course and jump its ramps.';
      const sight: Site = { ...site, description: site.description || regionalDescription };
      const object = {
        sight,
        mesh,
        start: site.start / 11,
        count: site.count / 11,
        lo: site.lo,
        hi: site.hi,
        x: site.lo[0],
        y: site.lo[2],
        w: site.hi[0] - site.lo[0],
        d: site.hi[2] - site.lo[2],
        base: site.lo[1],
        arch: 'regional',
        solid: true,
        preserveGround: true,
        footprint: site.footprint,
        navigationPolygons: site.navigationPolygons,
      };
      sight.object = object;
      context.objects.push(object);
      context.sights.push(sight);
      if (site.interior) registerInstituteInterior(sight, site.interior);
    };
    const ruinParcel = context.rectangle(TERMINATOR_FACTORY.x, TERMINATOR_FACTORY.z, 7, 7);
    claimParcel({ polygon: ruinParcel, kind: 'abandoned factory' });
    context.publicSpaces.push(ruinParcel);
    register(drawAbandonedFactory(context.sceneMesh), context.sceneMesh);
    for (const site of [
      ...drawSocialBuildings(context.sceneMesh, context.signs),
      drawAppleCampus(context.sceneMesh, context.signs),
      drawRobotaxiDealer(context.sceneMesh, context.signs),
      drawHaberdasherShop(context.sceneMesh, context.signs),
      drawSaltFlats(context.sceneMesh, context.signs, context.southernTerrain),
      ...drawSouthernDistrict(context.sceneMesh, context.signs, { includeRailPit: false }),
      ...drawTrainingSites(context.sceneMesh, context.signs, { includeGym: false }),
      drawGPUFactory(context.sceneMesh, context.signs, terrainHeight),
      ...drawResearchCampuses(context.sceneMesh, context.signs, { separateInteriors: true }),
    ])
      register(site, context.sceneMesh);
    for (const site of drawZooEnclosures(context.sceneMesh, terrainHeight, {
      include: (s: { z: number }) => s.z >= context.N,
    }))
      register(site, context.sceneMesh);
    for (const p of AIRPORT_FIELD_ADS) {
      const start = context.sceneMesh.data.length,
        base = context.southernTerrain.height(p.x, p.z);
      drawAirportBillboard(context.sceneMesh, context.signs, { ...p, base });
      const object = {
        mesh: context.sceneMesh,
        start: start / 11,
        count: (context.sceneMesh.data.length - start) / 11,
        x: p.x - 1.15,
        y: p.z - 0.4,
        w: 2.3,
        d: 0.8,
        base,
        arch: 'airport-field-billboard',
        solid: true,
        preserveGround: true,
        footprint: p.polygon,
        lo: [p.x - 1.15, base - 0.1, p.z - 0.4] satisfies [number, number, number],
        hi: [p.x + 1.15, base + 2.8, p.z + 0.4],
      };
      context.objects.push(object);
      context.airportFieldAds.push({ ...p, base, object });
    }
    drawRunoffBanks(context.sceneMesh, context.southernTerrain);
    drawRailWorks(context.sceneMesh, terrainHeight);
    context.merchants.push({ ...RAIL_WORKER });
    context.merchants.push(...createResearcherNPCs(), ...createSquareNPCs());
    context.merchants.push({
      ...merchant('capital', SAND_HILL_CAPITAL.x + 0.7, 137.1, SAND_HILL_CAPITAL.base + 0.04),
      id: 'sand-hill-partner',
      angle: Math.PI / 2,
    });
    register(drawPrometheus(context.sceneMesh, context.signs), context.sceneMesh);
    context.streetLights.push(prometheusTorchLight());
    context.makeTownhomeRow(
      SPACEPORT_HOUSES.x,
      SPACEPORT_HOUSES.z,
      SPACEPORT_HOUSES.w,
      SPACEPORT_HOUSES.d,
      0,
      0.25,
    );
    setupSearchHomes();
    context.southernNeighborhood = populateSouthernNeighborhood({
      mesh: context.sceneMesh,
      terrain: context.southernTerrain,
      makeTownhomeRow: context.makeTownhomeRow,
      tree: context.tree,
      bench: context.bench,
      roadDistance: airportRoadDistance,
      signs: context.signs,
      cityRoads: context.worldTiles.routes.filter(
        (r) => r.kind === 'road' && r.points.some((p) => p[1] >= 78),
      ),
      cityBuildings: context.objects
        .filter(hasPhysicalBounds)
        .filter((o) => o.arch === 'townhomes'),
      surfaceType: (x: number, z: number) =>
        z >= context.N ? airportSurfaceTypeAt(x, z) : surfaceTypeAt(x, z),
      registerEstate: (o: WorldObject) => context.objects.push(o),
      entrances: [...context.sights, ...planningPlaces()]
        .filter((s) => s.entry)
        .map((s) => ({ x: s.entry!.x + 0.5, z: s.entry!.y + 0.5 })),
    });
    register(drawArmory(context.sceneMesh, context.signs, characterGround), context.sceneMesh);
    register(
      drawRailPit(context.sceneMesh, context.signs, context.southernTerrain),
      context.sceneMesh,
    );
    for (const site of context.southernNeighborhood.sights) register(site, context.sceneMesh);
    const cupertino = drawCupertinoGardens(context.sceneMesh, {
      terrain: context.southernTerrain,
      tree: context.tree,
    });
    register(cupertino.site, context.sceneMesh);
    context.merchants.push(...cupertino.people);
    context.southernNeighborhood.cupertino = cupertino;
    const wh = WIZARD_HOUSE,
      wizardHouse = {
        id: 'orin-house',
        name: contentText('world.generation.setupRegionalWorld.name-50', {}),
        label: contentText('world.generation.setupRegionalWorld.label-51', {}),
        kind: 'wizard-house',
        activityBuilding: true,
        x: wh.x - wh.w / 2,
        y: wh.z - wh.d / 2,
        w: wh.w,
        d: wh.d,
        h: 50,
        worldHeight: 2.4,
        color: '#a398bc',
        trim: '#e5d9bd',
        style: 'victorian',
        localDoor: wh.x - 0.5,
        inside: { x: wh.x - 0.5, y: wh.z + 0.15 },
        entry: { x: wh.x - 0.5, y: wh.z + wh.d / 2 + 0.15 },
        description: contentText('world.generation.setupRegionalWorld.description-52', {}),
      };
    planningPlaces().push(wizardHouse);
    context.makeBuilding(wizardHouse, true);
    const country = drawSouthernCountryside(context.sceneMesh, {
      terrain: context.southernTerrain,
      tree: context.tree,
      roadDistance: airportRoadDistance,
    });
    register(country.site, context.sceneMesh);
    context.merchants.push(...country.people);
    context.southernNeighborhood.countryside = country;
    register(drawPirateWreck(context.sceneMesh, characterGround), context.sceneMesh);
    const village = drawSouthernVillage(context.sceneMesh, {
      terrain: context.southernTerrain,
      tree: context.tree,
      signs: context.signs,
    });
    for (const site of village.sites) register(site, context.sceneMesh);
    context.southernNeighborhood.village = village;
    context.merchants.push(...village.people);
    register(
      drawDogPonyShowground(context.sceneMesh, context.southernTerrain, context.signs),
      context.sceneMesh,
    );
    context.merchants.push(createDogPonyAdministrator(characterGround));
    for (const site of [...context.sights])
      for (const seat of site.seats || []) register(seat, context.sceneMesh);
    register(
      drawDuelArena(context.sceneMesh, context.southernTerrain, context.signs),
      context.sceneMesh,
    );
    register(
      drawStockExchange(context.sceneMesh, context.signs, TIMES_SQUARE.base + 0.04),
      context.sceneMesh,
    );
    context.merchants.push(
      {
        ...merchant('duel-referee', 47.35, 165.7, characterGround(47.35, 165.7)),
        id: 'duel-referee',
      },
      {
        ...merchant('stockbroker', 67, 155.6, characterGround(67, 155.6)),
        id: 'times-square-stockbroker',
      },
    );
    context.merchants.push(
      ...context.southernNeighborhood.people.map((n) => ({
        ...n,
        base: characterGround(n.x, n.z) + 0.025,
      })),
    );
    register(
      drawSquareConstruction(context.sceneMesh, context.signs, context.southernTerrain),
      context.sceneMesh,
    );
    const foreman = requiredValue(
      context.merchants.find((n) => n.id === 'square-foreman'),
      'Missing authored world entity: square-foreman',
    );
    foreman.base = characterGround(foreman.x, foreman.z) + 0.025;
    context.nightclub =
      context.southernNeighborhood.sights.find((s) => s.id === 'nightlife') || context.nightclub;
    context.merchants.push(
      ...PACIFICA_PARK_RESIDENTS.map((p) => ({ ...p, base: terrainHeight(p.x, p.z) + 0.025 })),
    );
    context.restaurantDiners.push(...context.southernNeighborhood.diners);
    for (const p of context.southernNeighborhood.lamps) {
      const post = context.addScenery(
        null,
        p.x - 0.06,
        p.z - 0.06,
        0.12,
        0.12,
        3.7,
        () =>
          context.streetLights.push(
            ...drawStreetLamp(
              context.sceneMesh,
              p.x,
              characterGround(p.x, p.z) + 0.02,
              p.z,
              p.angle,
              p.style,
            ),
          ),
        true,
      );
      post.preserveGround = true;
      post.lamp = p;
    }
    context.tahoeMesh = new Mesh();
    if (!context.headless || context.bake) drawTahoeTerrain(context.tahoeMesh);
    for (const site of drawTahoeStructures(context.tahoeMesh, context.tahoe, context.signs))
      register(site, context.tahoeMesh);
    context.tahoeGPU = context.upload(context.tahoeMesh);
    const hs = TAHOE_SUPPLY_HUT;
    context.merchants.push({
      id: 'hiking-supplier',
      kind: 'hiking-supplier',
      approach: { x: hs.entry.x - 0.8, y: hs.entry.y + 0.7 },
      label: contentText('world.generation.setupRegionalWorld.label-53', {}),
      name: contentText('world.generation.setupRegionalWorld.name-54', {}),
      x: hs.entry.x + 0.5,
      z: hs.entry.y + 0.5,
      base: tahoeHeight(hs.entry.x + 0.5, hs.entry.y + 0.5),
      shirt: '#748968',
      skin: '#ba9371',
      hair: '#5e4b3d',
      height: 1.85,
      angle: Math.PI / 2,
      coat: true,
    });
    for (const [id, site] of [
      ['sf-spaceport', SF_SPACEPORT],
      ['tahoe-spaceport', context.tahoe.spaceport],
    ] as const) {
      const npc = merchant(
        'crew',
        site.entry.x + 1.2,
        site.entry.y + 0.5,
        id === 'sf-spaceport'
          ? airportWalkingHeight(site.entry.x + 1.2, site.entry.y + 0.5)
          : tahoeHeight(site.entry.x + 1.2, site.entry.y + 0.5) + 0.04,
      );
      context.merchants.push({ ...npc, id: id + '-attendant', siteId: id, angle: Math.PI });
    }
    context.merchants.push({
      ...merchant(
        'lift',
        TAHOE.peak.x + 1.9,
        TAHOE.peak.z - 2.4,
        tahoeHeight(TAHOE.peak.x + 1.9, TAHOE.peak.z - 2.4) + 0.04,
      ),
      id: 'summit-lift-attendant',
      cap: true,
      coat: true,
      angle: Math.PI / 2,
    });
    const a = DOWNTOWN.bridge.rampStart.map(context.mapPosition),
      cityGate = context.nearestNavigation(a[0] - 0.5, a[1] - 0.5, 1.5, (x: number, y: number) =>
        context.navFree(x + 0.5, y + 0.5),
      );
    if (!cityGate) throw new Error('Bay Bridge must connect to the city navigation grid');
    context.regionalRoad = createRegionalRoad({
      scale: context.MAP_SCALE,
      groundHeight: terrainHeight,
      cityGate,
    });
    context.highwayMesh = context.regionalRoad.mesh();
    context.ferrari = context.clientController(
      'ferrari',
      createFerrari(
        context.regionalRoad,
        context.savedFerrari,
        (state) => {
          if (!context.headless)
            try {
              localStorage.setItem('sf-ferrari-v1', JSON.stringify(state));
            } catch {}
        },
        {
          cityDriving: createFerrariCityRoads({
            road: context.regionalRoad,
            traffic: () => context.streetTraffic,
            ground: characterGround,
          }),
        },
      ),
    );
    context.highwaySites = createHighwaySites(context.ferrari);
    for (const site of drawHighwaySites(
      context.highwayMesh,
      context.ferrari,
      context.highwaySites,
      context.signs,
    ))
      register(site, context.highwayMesh);
    context.esotericCampus = createEsotericCampus(context.ferrari);
    register(
      context.esotericCampus.draw(context.highwayMesh, context.signs, { separateInterior: true }),
      context.highwayMesh,
    );
    context.merchants.push(context.esotericCampus.npc);
    context.esotericCampus.life = createCityLife({
      ...context.pedestrianNavigation,
      visible: context.actorInView,
      routes: context.esotericCampus.routes,
      surfaceType: context.esotericCampus.surfaceType,
      lamps: [],
      terrainHeight: context.esotericCampus.ground,
      groundHeight: characterGround,
      scale: context.MAP_SCALE,
      human: context.human,
      bicycle: context.bicycle,
      maxWalkers: 6,
      maxRiders: 0,
      waterTraffic: false,
      prefix: 'berkeley-scholar',
      regional: true,
    });
    context.esotericCampus.life!.update(0);
    context.countryside = createCountryside({
      road: context.regionalRoad,
      campus: context.esotericCampus,
      parcels: context.highwaySites.flatMap((s) => s.solidParcels || []),
    });
    context.sights.push({
      id: 'ferrari-car',
      kind: 'ferrari',
      label: contentText('world.generation.setupRegionalWorld.label-55', {}),
      get entry() {
        const p = context.ferrari.position;
        return { x: p.x - 0.5, y: p.z - 0.5 };
      },
      description: contentText('world.generation.setupRegionalWorld.description-56', {}),
    });
    context.goldenGate = createGoldenGateCrossing({
      scale: context.MAP_SCALE,
      cityGate: context.sightById('golden')!.entry,
      groundHeight: terrainHeight,
      marinHeight: context.detention.terrain,
    });
    context.marinLand = createMarinLand({
      polygon: context.MARIN,
      scale: context.MAP_SCALE,
      detention: context.detention,
      gate: context.goldenGate.gate('marin'),
    });
    for (const value of context.goldenGate.mesh().data) context.highwayMesh.data.push(value);
    context.highwayGPU = context.upload(context.highwayMesh);
    context.sights.push({
      id: 'marin-bridge-landing',
      kind: 'bridge',
      label: contentText('world.generation.setupRegionalWorld.label-57', {}),
      entry: context.goldenGate.gate('marin'),
      description: contentText('world.generation.setupRegionalWorld.description-58', {}),
    });
  }

  function setupMonkeyEscape() {
    const pen = requiredValue(
        context.sightById('zoo-monkeys'),
        'Missing authored entity: zoo-monkeys',
      ),
      home = context.airship.nearest(
        15.2,
        98.6,
        2,
        (x: number, y: number) =>
          Math.hypot(x - pen.entry.x, y - pen.entry.y) < 3 && !context.placeAt(x, y),
      );
    const keeperHome = context.nearestNavigation(
      pen.entry.x,
      pen.entry.y - 4.5,
      2,
      (x: number, y: number) => !context.placeAt(x, y),
    );
    if (!home || !keeperHome)
      throw new Error('Monkey escape needs reachable motorcycle parking and a zookeeper post');
    const validSaved = (s: Partial<{ x: number; y: number; angle: number; rented: boolean }>) =>
      isFiniteNumber(s.x) &&
      isFiniteNumber(s.y) &&
      context.landClearAt(s.x, s.y) &&
      !context.placeAt(s.x, s.y);
    context.motorcycle = context.clientController(
      'motorcycle',
      createMotorcycle({
        home,
        saved: validSaved(context.savedMotorcycle)
          ? context.savedMotorcycle
          : { rented: context.savedMotorcycle.rented },
        onSave: (s) => {
          if (!context.headless)
            try {
              localStorage.setItem('sf-motorcycle-v1', JSON.stringify(s));
            } catch {}
        },
      }),
    );
    const sight: Site = {
      id: 'zoo-motorcycle',
      kind: 'motorcycle',
      label: contentText('world.generation.setupMonkeyEscape.label-59', {}),
      description: MOTORCYCLE_EXAMINE,
      get rented() {
        return context.motorcycle.state.rented;
      },
      get entry() {
        return { x: context.motorcycle.state.x, y: context.motorcycle.state.y };
      },
    };
    context.sights.push(sight);
    const rentalClerk = serviceStaffPosition(home, {
      walkable: (p: { x: number; y: number }) => context.landClearAt(p.x, p.y),
      canTravel: (a: { x: number; y: number }, b: { x: number; y: number }) =>
        context.canTravel(a.x, a.y, b.x, b.y, true),
    });
    context.merchants.push({
      ...merchant(
        'motorcycle-clerk',
        rentalClerk.x + 0.5,
        rentalClerk.y + 0.5,
        characterGround(rentalClerk.x + 0.5, rentalClerk.y + 0.5),
      ),
      id: 'zoo-motorcycle-clerk',
      stationary: true,
      motion: 0,
      phase: 0,
      regional: true,
      cap: true,
    });
    context.monkeyKeeper = context.clientController(
      'keeper',
      createMonkeyPursuit({
        player: context.player,
        home: keeperHome,
        saved:
          context.quests.carrying && validSaved(context.savedKeeper) ? context.savedKeeper : {},
        routeTo: (x: number, y: number, from: Point | undefined) =>
          context.pathTo(x, y, from, true),
        canCapture: (a: { x: number; y: number }, b: { x: number; y: number }) =>
          context.canTravel(a.x, a.y, b.x, b.y, true),
        canPursue: () =>
          context.quests.carrying &&
          !context.capture.state.active &&
          !context.chase.state.jailed &&
          !context.rocket.state.active &&
          !context.flying() &&
          !context.rope.climbing &&
          !context.sutroClimb.state.active &&
          !context.surf.state.riding &&
          context.tahoe.state.mode === 'ground',
        onSave: (s) => {
          if (!context.headless)
            try {
              localStorage.setItem('sf-monkey-keeper-v1', JSON.stringify(s));
            } catch {}
        },
        onCaught: () => {
          const result = context.quests.recover();
          context.parkMotorcycle(false);
          context.player.path = [];
          context.player.speed = 0;
          context.action = null;
          context.destination = null;
          context.player.gesture = {
            name: contentText('world.generation.setupMonkeyEscape.name-61', {}),
            started: performance.now(),
            duration: 900,
          };
          context.announce(result.message, 'Zookeeper');
        },
      }),
    );
    const actor = context.monkeyKeeper.state.actor;
    context.keeperNPC = {
      id: 'monkey-zookeeper',
      label: contentText('world.generation.setupMonkeyEscape.label-62', {}),
      keeper: true,
      get x() {
        return actor.x + 0.5;
      },
      get z() {
        return actor.y + 0.5;
      },
      get regional() {
        return actor.y >= context.N - 2.5;
      },
    };
    context.sights.push({
      id: 'monkey-keeper-post',
      kind: 'scenery',
      label: contentText('world.generation.setupMonkeyEscape.label-63', {}),
      entry: { ...keeperHome },
      description: contentText('world.generation.setupMonkeyEscape.description-64', {}),
    });
    if (context.quests.carrying) context.monkeyKeeper.start();
  }

  function setupSocialNPCs() {
    const add = (
      room:
        | Readonly<{
            id: 'twitter-hq';
            label: string;
            x: 18.8;
            z: 114.8;
            w: 4.4;
            d: 3.6;
            base: 3;
            front: 1;
            entry: Readonly<{ x: 18.3; y: 117 }>;
            inside: Readonly<{ x: 18.3; y: 115.6 }>;
          }>
        | Readonly<{
            id: 'sales-conference';
            label: string;
            x: 24.8;
            z: 114.8;
            w: 4.4;
            d: 3.6;
            base: 3;
            front: 1;
            entry: Readonly<{ x: 24.3; y: 117 }>;
            inside: Readonly<{ x: 24.3; y: 115.6 }>;
          }>,
      kind: string,
      id: string,
      u: number,
      v: number,
      au: number,
      av: number,
      extra:
        | {
            fixedFacing?: boolean;
            seated?: boolean;
            phone?: boolean;
            angle?: number;
            shirt?: string;
            skin?: string;
            hair?: string;
          }
        | undefined = {},
    ) => {
      const p = socialLocalPoint(room, u, v),
        a = socialLocalPoint(room, au, av),
        npc = {
          ...merchant(kind, p.x, p.z, room.base + 0.015),
          id,
          siteId: room.id,
          socialActor: true,
          regional: true,
          angle: Math.PI,
          approach: { x: a.x - 0.5, y: a.z - 0.5 },
          ...extra,
        };
      if (!context.landClearAt(npc.approach.x, npc.approach.y))
        throw new Error(id + ' needs a reachable indoor approach');
      context.merchants.push(npc);
      return npc;
    };
    add(TWITTER_HQ, 'twitter-worker', 'twitter-bottle-worker', 0.38, -0.65, 0.25, 0.22, {
      fixedFacing: true,
    });
    add(TWITTER_HQ, 'twitter-poster', 'twitter-poster', 1.35, 0.86, 0.55, 0.95, {
      seated: true,
      phone: true,
      angle: -Math.PI / 2,
    });
    add(SALES_CONFERENCE, 'software-vendor', 'software-vendor', -0.72, -0.95, -0.35, -0.2);
    add(SALES_CONFERENCE, 'software-buyer', 'software-buyer-1', 0.35, -0.85, 0.2, -0.05, {
      shirt: '#6d7e9b',
      skin: '#b48d70',
    });
    add(SALES_CONFERENCE, 'software-buyer', 'software-buyer-2', 0.9, 0.2, 0.2, 0.2, {
      shirt: '#928278',
      skin: '#956c50',
      hair: '#353135',
    });
    add(SALES_CONFERENCE, 'software-buyer', 'software-buyer-3', -0.65, 0.9, 0.05, 0.9, {
      shirt: '#798a72',
      skin: '#c5a17e',
      hair: '#6b5646',
    });
    context.socialLife = createNPCRoaming(context.merchants, {
      eligible: (n) => n.kind === 'software-buyer',
      span: 1.7,
      walkable: (x: number, y: number) =>
        insideInstitute(SALES_CONFERENCE, x + 0.5, y + 0.5) && context.landClearAt(x, y),
      canTravel: (ax: number, ay: number, bx: number, by: number) =>
        context.canTravel(ax, ay, bx, by, true),
      ground: characterGround,
      approachFor: context.merchantApproach,
    });
    if (context.socialLife.unavailable.length)
      throw new Error(
        'Salesmen need connected indoor roaming: ' + context.socialLife.unavailable.join(', '),
      );
  }

  function setupServiceNPCs() {
    setupSocialNPCs();
    const agent = { x: 93.2, z: 122.2 };
    context.merchants.push({
      ...merchant('airship-agent', agent.x, agent.z, characterGround(agent.x, agent.z)),
      id: 'airship-rental-attendant',
      siteId: 'airship',
      regional: true,
      cap: true,
      angle: -Math.PI / 2,
    });
    for (const [i, site] of [
      ...context.southernNeighborhood.craftSites,
      ...context.southernNeighborhood.village!.sites.filter((s) => s.neighborhoodService),
    ].entries()) {
      if (site.kind === 'neighborhood-garden' && (site.alwaysPopulated || i % 3)) continue;
      const p = serviceStaffPosition(site.entry, {
        walkable: (p: { x: number; y: number }) => context.landClearAt(p.x, p.y),
        canTravel: (a: { x: number; y: number }, b: { x: number; y: number }) =>
          context.canTravel(a.x, a.y, b.x, b.y, true),
      });
      context.merchants.push({
        id: site.id + '-neighbor',
        siteId: site.id,
        label: site.neighborhoodService
          ? contentText('world.generation.setupServiceNPCs.label-65.yes', { v0: site.label })
          : i % 2
            ? contentText('world.generation.setupServiceNPCs.label-65.no.yes', {})
            : contentText('world.generation.setupServiceNPCs.label-65.no.no', {}),
        name: site.neighborhoodService ? site.label + ' shopkeeper' : undefined,
        neighborhood: true,
        neighborhoodService: site.neighborhoodService,
        neighborLine: site.neighborLine,
        description:
          site.kind === 'neighborhood-garden'
            ? contentText('world.generation.setupServiceNPCs.description-67.yes', {})
            : contentText('world.generation.setupServiceNPCs.description-67.no', {}),
        x: p.x + 0.5,
        z: p.y + 0.5,
        base: characterGround(p.x + 0.5, p.y + 0.5),
        angle: site.rotation || 0,
        skin: (['#a77c5c', '#bf987a', '#825c48'] satisfies [string, string, string])[i % 3],
        shirt: (
          ['#a17c91', '#759996', '#bd985f', '#879c77'] satisfies [string, string, string, string]
        )[i % 4],
        hair: (['#463b34', '#86644b', '#44403b'] satisfies [string, string, string])[i % 3],
        female: !!(i % 2),
        longHair: !!(i % 2),
        height: 1.85,
        regional: true,
      });
    }
    for (const [id, kind] of [
      ['tim-apple-campus', 'tim-apple'] satisfies [string, string],
      ['tesla-robotaxi', 'robotaxi-sales'] satisfies [string, string],
    ]) {
      const site = requiredValue(context.sightById(id), 'Service NPC site: ' + id),
        p = serviceStaffPosition(site.entry, {
          walkable: (p: { x: number; y: number }) => context.landClearAt(p.x, p.y),
          canTravel: (a: { x: number; y: number }, b: { x: number; y: number }) =>
            context.canTravel(a.x, a.y, b.x, b.y, true),
        });
      context.merchants.push({
        ...merchant(kind, p.x + 0.5, p.y + 0.5, characterGround(p.x + 0.5, p.y + 0.5)),
        id: kind,
        siteId: id,
        regional: true,
        phone: kind === 'tim-apple',
        angle: -Math.PI / 2,
      });
    }
    const shop = requiredValue(
        context.sightById('haberdasher'),
        'Missing authored entity: haberdasher',
      ),
      hatter = serviceStaffPosition(shop.entry, {
        walkable: (p: { x: number; y: number }) => context.landClearAt(p.x, p.y),
        canTravel: (a: { x: number; y: number }, b: { x: number; y: number }) =>
          context.canTravel(a.x, a.y, b.x, b.y, true),
      });
    context.merchants.push({
      ...merchant(
        'haberdasher',
        hatter.x + 0.5,
        hatter.y + 0.5,
        characterGround(hatter.x + 0.5, hatter.y + 0.5),
      ),
      id: 'haberdasher-merchant',
      siteId: shop.id,
      regional: true,
      topHat: true,
      coat: true,
      angle: -Math.PI / 2,
    });
    const flats = requiredValue(
        context.sightById('salt-flats'),
        'Missing authored entity: salt-flats',
      ),
      activist = serviceStaffPosition(flats.entry, {
        walkable: (p: { x: number; y: number }) => context.landClearAt(p.x, p.y),
        canTravel: (a: { x: number; y: number }, b: { x: number; y: number }) =>
          context.canTravel(a.x, a.y, b.x, b.y, true),
      });
    context.merchants.push({
      ...merchant(
        'salt-activist',
        activist.x + 0.5,
        activist.y + 0.5,
        characterGround(activist.x + 0.5, activist.y + 0.5),
      ),
      id: 'salt-conservationist',
      siteId: flats.id,
      regional: true,
      cap: true,
      angle: -Math.PI / 2,
    });
    const factory = requiredValue(
        context.sightById('gpu-factory'),
        'Missing authored entity: gpu-factory',
      ),
      buyer = serviceStaffPosition(factory.entry, {
        walkable: (p: { x: number; y: number }) => context.landClearAt(p.x, p.y),
        canTravel: (a: { x: number; y: number }, b: { x: number; y: number }) =>
          context.canTravel(a.x, a.y, b.x, b.y, true),
      });
    context.merchants.push({
      ...merchant(
        'gpu-buyer',
        buyer.x + 0.5,
        buyer.y + 0.5,
        characterGround(buyer.x + 0.5, buyer.y + 0.5),
      ),
      id: 'gpu-factory-buyer',
      siteId: factory.id,
      regional: true,
      coat: true,
      angle: Math.PI / 2,
    });
    const burger = requiredValue(
        context.sightById('in-n-out'),
        'Missing authored entity: in-n-out',
      ),
      burgerStaff = serviceStaffPosition(burger.entry, {
        walkable: (p: { x: number; y: number }) => context.landClearAt(p.x, p.y),
        canTravel: (a: { x: number; y: number }, b: { x: number; y: number }) =>
          context.canTravel(a.x, a.y, b.x, b.y, true),
      });
    context.merchants.push({
      id: 'in-n-out-clerk',
      kind: 'burger-clerk',
      name: contentText('world.generation.setupServiceNPCs.name-68', {}),
      label: contentText('world.generation.setupServiceNPCs.label-69', {}),
      x: burgerStaff.x + 0.5,
      z: burgerStaff.y + 0.5,
      base: characterGround(burgerStaff.x + 0.5, burgerStaff.y + 0.5),
      skin: '#ba936d',
      shirt: '#f0e8d3',
      pants: '#c64a41',
      cap: true,
      height: 1.9,
      regional: true,
      approach: { ...burger.entry },
      description: contentText('world.generation.setupServiceNPCs.description-70', {}),
    });
    const sites = context.highwaySites.filter((s) => s.kind === 'fuel' || s.kind === 'dealership');
    for (const site of sites) {
      const p = serviceStaffPosition(site.entry, {
        walkable: (p: { x: number; y: number }) => context.landClearAt(p.x, p.y),
        canTravel: (a: { x: number; y: number }, b: { x: number; y: number }) =>
          context.canTravel(a.x, a.y, b.x, b.y, true),
      });
      context.merchants.push({
        ...merchant('fuel-attendant', p.x + 0.5, p.y + 0.5, characterGround(p.x + 0.5, p.y + 0.5)),
        id: site.id + '-attendant',
        siteId: site.id,
        regional: true,
        cap: true,
        shirt: site.paid ? '#a06865' : '#709d8b',
      });
    }
  }

  function setupTabletWizard() {
    const house = placedBuilding('orin-house'),
      center = buildingPoint(house, house.x + house.w * 0.5, house.y + house.d * 0.35);
    const spot = context.airship.nearest(
        center[0] - 0.5,
        center[1] - 0.5,
        1.8,
        (x: number, y: number) => context.placeAt(x, y) === house,
      ),
      approach =
        spot &&
        context.airship.nearest(
          spot.x,
          spot.y,
          1.5,
          (x: number, y: number) =>
            context.placeAt(x, y) === house && Math.hypot(x - spot.x, y - spot.y) > 0.65,
        );
    if (!spot || !approach)
      throw Error('The tablet wizard needs a reachable room and conversation approach');
    context.tabletWizard = {
      id: 'tablet-wizard',
      kind: 'tablet-wizard',
      label: contentText('world.generation.setupTabletWizard.label-71', {}),
      name: contentText('world.generation.setupTabletWizard.name-72', {}),
      x: spot.x + 0.5,
      z: spot.y + 0.5,
      base: characterGround(spot.x + 0.5, spot.y + 0.5),
      interior: house,
      approach,
      angle: Math.PI / 2,
      skin: '#bd9c7e',
      hair: '#cfc9b5',
      shirt: '#71609c',
      pants: '#48425f',
      hat: 'wizard',
      coat: true,
      height: 1.95,
      description: contentText('world.generation.setupTabletWizard.description-73', {}),
    };
    context.merchants.push(context.tabletWizard);
    const downtown = placedBuilding('links').entry,
      tahoePoint = { x: TAHOE.base.x + 2.5, z: TAHOE.base.z + 3.5 };
    context.tabletDestinations = {
      downtown: {
        x: downtown.x + 0.5,
        z: downtown.y + 0.5,
        label: contentText('world.generation.setupTabletWizard.label-74', {}),
      },
      tahoe: {
        ...tahoePoint,
        label: contentText('world.generation.setupTabletWizard.label-75', {}),
      },
    };
    for (const p of Object.values(context.tabletDestinations)) {
      if (!context.landClearAt(p.x - 0.5, p.z - 0.5))
        throw Error('A teleport tablet destination is blocked');
      p.y = characterGround(p.x, p.z);
    }
    context.tabletService = createTeleportTablets({
      client: context.multiplayer,
      canUse: context.canUseTablet,
      onMessage: context.announce,
      onStart: () => {
        if (context.headless) return;
        context.multiplayerWorld?.stopFollowing(true);
        if (context.training) context.stopTraining();
        context.expeditions.stop();
        context.fishing.cancel();
        context.setDancing(false);
        context.forwardRoll.cancel();
        context.alienCombat = null;
        context.wildTarget = null;
        context.closeMenu();
        context.closeReader();
        context.closeCharacter();
        context.questMenu?.close();
        context.dialogue.close();
        context.keys.clear();
        context.player.path = [];
        context.player.speed = 0;
        context.player.motion = 0;
        context.player.gesture = null;
      },
      onArrive: (to: { x: number; z: number }) => {
        Object.assign(context.player, {
          x: to.x - 0.5,
          y: to.z - 0.5,
          path: [],
          speed: 0,
          moving: false,
          motion: 0,
        });
        context.currentInterior = null;
        if (!context.headless) {
          context.updateAdventureUI();
          context.updateCamera();
          context.drawMini();
        }
      },
    });
  }

  function setupYohji() {
    const house = placedBuilding(requiredValue(SEARCH_HOMES.at(-1), 'Yohji home').id),
      center = buildingPoint(house, house.x + house.w * 0.52, house.y + house.d * 0.52);
    const spot = context.airship.nearest(
        center[0] - 0.5,
        center[1] - 0.5,
        1.5,
        (x: number, y: number) => context.placeAt(x, y) === house,
      ),
      approach =
        spot &&
        context.airship.nearest(
          spot.x,
          spot.y,
          1.5,
          (x: number, y: number) =>
            context.placeAt(x, y) === house &&
            Math.hypot(x - spot.x, y - spot.y) > 0.8 &&
            context.canTravel(x, y, spot.x, spot.y, true),
        );
    if (!spot || !approach) throw Error('Yohji needs a reachable room and conversation approach');
    context.merchants.push({
      id: 'yohji',
      kind: 'yohji',
      name: contentText('world.generation.setupYohji.name-76', {}),
      label: contentText('world.generation.setupYohji.label-77', {}),
      interior: house,
      approach,
      x: spot.x + 0.5,
      z: spot.y + 0.5,
      base: characterGround(spot.x + 0.5, spot.y + 0.5),
      angle: Math.PI / 2,
      skin: '#bca58c',
      hair: '#292a2d',
      shirt: '#1b1e23',
      pants: '#181b20',
      cloakTop: true,
      cloakBottom: true,
      height: 1.95,
      description: contentText('world.generation.setupYohji.description-78', {}),
    });
  }

  function setupGreenBank() {
    const bank = placedBuilding('green'),
      point = buildingPoint(bank, bank.x + bank.w / 2, bank.y + 0.32);
    context.banker = {
      id: 'green-banker',
      kind: 'banker',
      label: contentText('world.generation.setupGreenBank.label-79', {}),
      name: contentText('world.generation.setupGreenBank.name-80', {}),
      x: point[0],
      z: point[1],
      base: requiredValue(requiredValue(bank.object, 'bank model').base, 'bank elevation') + 0.065,
      skin: '#aa7a57',
      hair: '#48392e',
      shirt: '#437855',
      pants: '#455747',
      coat: true,
      angle: (bank.rotation || 0) + Math.PI / 2,
      height: 1.9,
      interior: bank,
    };
    context.merchants.push(context.banker);
    context.bankService = createBankService({
      client: context.multiplayer,
      onDrink: () => {
        if (!context.headless) {
          context.setDancing(false);
          context.player.path = [];
          context.player.speed = 0;
          context.action = null;
          context.destination = null;
          context.player.gesture = {
            name: contentText('world.generation.setupGreenBank.name-81', {}),
            started: performance.now(),
            duration: 1600,
          };
        }
      },
    });
    if (!context.headless)
      context.bankMenu = createBankMenu({
        element: context.$('sf-bank'),
        service: context.bankService,
        economy: context.economy,
        announce: context.announce,
        beforeOpen: () => {
          context.closeReader();
          context.closeMenu();
          context.closeHelp();
          context.closeCharacter();
          context.questMenu?.close();
          context.dialogue.close();
          context.player.path = [];
          context.player.speed = 0;
          context.keys.clear();
          context.$('sf-reader-shade').hidden = false;
        },
        afterClose: () => {
          context.$('sf-reader-shade').hidden = true;
          context.canvas.focus({ preventScroll: true });
        },
      });
  }

  function setupGuildSites() {
    const lodge = placedBuilding('freemasons-guild'),
      store = placedBuilding('sunset-whole-foods');
    const table = buildingPoint(lodge, lodge.x + lodge.w / 2, lodge.y + 1.12),
      bookEntry = context.nearestNavigation(
        table[0] - 0.5,
        table[1] - 0.5,
        1.2,
        (x: number, y: number) => context.placeAt(x, y) === lodge,
      );
    if (!bookEntry) throw Error('The lodge ledger needs a reachable reading spot');
    registerLoreBook(lodge, bookEntry);
    const entry = context.nearestNavigation(
      lodge.entry.x + 0.8,
      lodge.entry.y,
      1.5,
      (x: number, y: number) =>
        !context.placeAt(x, y) && context.cityNavigation.connected(context.player, { x, y }),
    );
    if (!entry) throw Error('Ray needs a reachable guild entrance');
    context.merchants.push({
      id: 'guild-ray',
      kind: 'guild-master',
      name: contentText('world.generation.setupGuildSites.name-82', {}),
      label: contentText('world.generation.setupGuildSites.label-83', {}),
      x: entry.x + 0.5,
      z: entry.y + 0.5,
      base: characterGround(entry.x + 0.5, entry.y + 0.5),
      skin: '#bd926d',
      hair: '#171717',
      shirt: '#b7393f',
      pants: '#8e2932',
      coat: true,
      height: 1.95,
      angle: lodge.rotation || 0,
    });
    context.peptideSpawns = peptideSpawnPoints(
      store,
      (x, y) =>
        context.landClearAt(x, y) &&
        !context.placeAt(x, y) &&
        context.cityNavigation.connected(context.player, { x, y }),
    );
    const farmers = [
        ['Ada', 0.4, 0.38, 'The tomatoes are heirloom. The simulation is legacy.'] satisfies [
          string,
          number,
          number,
          string,
        ],
        [
          'Lin',
          0.6,
          0.59,
          'There is no spoon. There is, however, an excellent seasonal chard.',
        ] satisfies [string, number, number, string],
        [
          'Null',
          0.4,
          0.77,
          'I took the red pill and became a small-batch peptide farmer.',
        ] satisfies [string, number, number, string],
        ['Root', null, null, 'We grow everything locally. Even the glitches.'] satisfies [
          string,
          null,
          null,
          string,
        ],
      ],
      occupiedFarmers: Point[] = [];
    for (const [i, [name, u, v, line]] of farmers.entries()) {
      const inside = u !== null && v !== null,
        p = inside
          ? buildingPoint(store, store.x + store.w * u, store.y + store.d * v)
          : [store.entry.x + 0.5, store.entry.y + 0.5];
      const spot = context.nearestNavigation(
        p[0] - 0.5,
        p[1] - 0.5,
        1.4,
        (x: number, y: number) =>
          (inside ? context.placeAt(x, y) === store : !context.placeAt(x, y)) &&
          context.cityNavigation.connected(context.player, { x, y }) &&
          occupiedFarmers.every((a) => Math.hypot(x - a.x, y - a.y) > 0.75),
      );
      if (!spot) throw Error('The farmers market needs a reachable vendor position for ' + name);
      occupiedFarmers.push(spot);
      const approach = context.nearestNavigation(
        spot.x,
        spot.y,
        1.5,
        (x: number, y: number) =>
          (!inside || context.placeAt(x, y) === store) &&
          Math.hypot(x - spot.x, y - spot.y) > 0.7 &&
          context.canTravel(spot.x, spot.y, x, y, true),
      );
      if (!approach) throw Error('A market farmer needs a reachable conversation approach');
      context.merchants.push({
        id: 'market-farmer-' + i,
        kind: 'market-farmer',
        name: contentText('world.generation.setupGuildSites.name-84', { v0: name }),
        label: contentText('world.generation.setupGuildSites.label-85', { v0: name }),
        x: spot.x + 0.5,
        z: spot.y + 0.5,
        base: characterGround(spot.x + 0.5, spot.y + 0.5),
        angle: (store.rotation || 0) + Math.PI / 2,
        skin: (
          ['#b9815d', '#d0ac87', '#8f634c', '#bc9675'] satisfies [string, string, string, string]
        )[i],
        hair: (
          ['#161b19', '#242b25', '#161616', '#413a30'] satisfies [string, string, string, string]
        )[i],
        shirt: (
          ['#202923', '#151c1b', '#2a302c', '#19201e'] satisfies [string, string, string, string]
        )[i],
        pants: '#161d1a',
        coat: true,
        sunglasses: true,
        female: i === 0 || i === 1,
        longHair: i === 0 || i === 1,
        height: 1.95,
        interior: inside ? store : null,
        approach,
        marketLine: line,
      });
    }
    context.secretWorld = context.clientController(
      'secret',
      createSecretAdventures({
        client: context.multiplayer,
        guildSite: lodge,
        ground: characterGround,
        cruiseHeight: () => bomberCruiseHeight(context.airship.cruiseHeight),
        boostSpeed: () => rocketCruiseSpeed(SF_SPACEPORT, context.tahoe.spaceport),
        transition: context.changeMapInstance,
        onMessage: context.announce,
        onProgress: () => context.questMenu?.render(),
      }),
    );
    context.questMenu?.render();
    const { oldMan: elder, portal } = requiredValue(
      context.secretWorld.sites,
      'Guild secret sites',
    );
    context.oldMan = {
      id: 'illuminati-old-man',
      kind: 'illuminati-elder',
      name: contentText('world.generation.setupGuildSites.name-86', {}),
      label: contentText('world.generation.setupGuildSites.label-87', {}),
      x: elder.x,
      z: elder.z,
      base:
        requiredValue(requiredValue(lodge.object, 'guild model').base, 'guild elevation') + 0.065,
      skin: '#c8ae8b',
      shirt: '#4e6258',
      pants: '#3e4941',
      hair: '#d8d3b9',
      coat: true,
      height: 1.9,
      angle: Math.PI / 2,
      interior: lodge,
    };
    context.merchants.push(context.oldMan);
    const access = context.nearestNavigation(
      portal.x - 0.5,
      portal.z - 0.5,
      1,
      (x: number, y: number) => context.placeAt(x, y) === lodge,
    );
    if (!access) throw Error('The Illuminati passage needs a clear guild approach');
    context.secretStairs = context.sights.find((s) => s.id === 'illuminati-stairway') || {
      id: 'illuminati-stairway',
      kind: 'secret-stairs',
      label: contentText('world.generation.setupGuildSites.label-88', {}),
      x: portal.x,
      z: portal.z,
      entry: access,
      description: contentText('world.generation.setupGuildSites.description-89', {}),
    };
    if (!context.secretStairs.object) {
      const mesh = context.sceneMesh,
        start = mesh.data.length,
        base =
          requiredValue(requiredValue(lodge.object, 'guild model').base, 'guild elevation') + 0.065;
      drawSecretStair(mesh, portal.x, base, portal.z, lodge.rotation || 0);
      const lo = [Infinity, Infinity, Infinity] satisfies [number, number, number],
        hi = [-Infinity, -Infinity, -Infinity] satisfies [number, number, number];
      for (let i = start; i < mesh.data.length; i += 11)
        for (let k = 0; k < 3; k++) {
          lo[k] = Math.min(lo[k], mesh.data[i + k]);
          hi[k] = Math.max(hi[k], mesh.data[i + k]);
        }
      const object = {
        sight: context.secretStairs,
        interior: lodge,
        detailTarget: true,
        mesh,
        start: start / 11,
        count: (mesh.data.length - start) / 11,
        lo,
        hi,
        x: lo[0],
        y: lo[2],
        w: hi[0] - lo[0],
        d: hi[2] - lo[2],
        base,
      };
      context.secretStairs.object = object;
      context.objects.push(object);
      context.sights.push(context.secretStairs);
    }
    context.caveMesh = createIlluminatiCaveMesh();
    if (!context.headless) {
      context.caveGPU = context.upload(context.caveMesh);
      context.caveGPU.walls = context.caveMesh.walls.map((w) => ({
        ...w,
        gpu: context.upload(w.mesh),
      }));
    }
  }

  function setupDeli() {
    const origin = requiredValue(
      context.sightById('lucindas-deli'),
      'Missing authored entity: lucindas-deli',
    ).entry;
    context.deli = context.clientController(
      'deli',
      createDeli({
        economy: context.economy,
        health: context.health,
        origin,
        routeTo: (target, from: Point | undefined) =>
          context.pathTo(target.x, target.y, from, true),
        canTravel: (a: { x: number; y: number }, b: { x: number; y: number }) =>
          context.canTravel(a.x, a.y, b.x, b.y, true),
        saved: context.savedDeli,
        onSave: (state) => {
          if (!context.headless)
            try {
              localStorage.setItem('sf-deli-v1', JSON.stringify(state));
            } catch {}
        },
        onMessage: (message: string) => {
          if (!context.headless) context.announce(message, 'Lucinda’s');
        },
      }),
    );
  }

  function planBeachBillboard() {
    const pickup = [
        context.mapPosition(SUNGLASSES_BEACH_TARGET.x),
        context.mapPosition(SUNGLASSES_BEACH_TARGET.y),
      ] satisfies [number, number],
      near = [pickup[0], pickup[1] - 3] satisfies [number, number];
    let best = null,
      score = Infinity;
    for (const road of context.worldTiles.routes)
      if (road.name === 'Great Highway') {
        const [a, b] = road.points,
          dx = b[0] - a[0],
          dz = b[1] - a[1],
          length = Math.hypot(dx, dz),
          ux = dx / length,
          uz = dz / length;
        for (let t = 1.2; t < length - 1.2; t += 0.25)
          for (const side of [-1, 1] satisfies [number, number]) {
            const x = a[0] + ux * t - uz * side * (road.halfWidth + 0.9),
              z = a[1] + uz * t + ux * side * (road.halfWidth + 0.9),
              distance = (x - near[0]) ** 2 + (z - near[1]) ** 2;
            if (
              x >= a[0] + ux * t ||
              distance >= score ||
              Math.hypot(x - pickup[0], z - pickup[1]) < 2.5
            )
              continue;
            const angle = Math.atan2(uz, ux),
              polygon = context.rectangle(x, z, 2.3, 0.6, angle);
            if (parcelFits(polygon, { park: true })) {
              score = distance;
              best = { x, z, angle, polygon };
            }
          }
      }
    if (!best || score > 25)
      throw new Error('The beach sunglasses need a nearby dry billboard plot');
    const base = terrainHeight(best.x, best.z),
      sight: Site = {
        id: 'beach-billboard',
        label: contentText('world.generation.planBeachBillboard.label-90', {}),
        kind: 'billboard',
        entry: { x: best.x + 0.45, y: best.z - 0.5 },
        get description() {
          return context.playerLook.sunglasses
            ? 'The billboard reads OBEY. The promise of relaxation has become a rather direct instruction.'
            : 'A Local Minimum AI advertisement promises a little gradient descent by the sea. Even the beach has a pitch deck.';
        },
      };
    context.sights.push(sight);
    const parcel = claimParcel({ polygon: best.polygon, kind: 'coastal billboard' });
    const object = context.addScenery(sight.id, best.x - 1.2, best.z - 1.2, 2.4, 2.4, 2.75, (m) =>
      drawAirportBillboard(m, context.signs, { ...best, base, art: 'beach-getaway' }),
    );
    Object.assign(object, { solid: true, footprint: best.polygon, preserveGround: true });
    parcel.object = object;
    context.beachBillboard = { ...best, base, art: 'beach-getaway', sight, object };
  }

  function planAirportAds() {
    for (const best of planAirportBillboards({
      routes: [
        ...context.worldTiles.routes,
        ...SOUTHERN_ROADS.map((r) => ({ ...r, halfWidth: 0.5 })),
      ],
      fits: (polygon: number[][]) => parcelFits(polygon, { park: true }),
      curbWidth: TILE_CONFIG.curbWidth,
    })) {
      const parcel = claimParcel({ polygon: best.clearing, kind: 'airport billboard' });
      levelTerrainPad(best.x, best.z, best.width, 0.8, 0);
      const base = terrainHeight(best.x, best.z);
      const object = context.addScenery(null, best.x - 1.2, best.z - 1.2, 2.4, 2.4, 2.75, (m) =>
        drawAirportBillboard(m, context.signs, { ...best, base }),
      );
      Object.assign(object, { solid: true, footprint: best.polygon, preserveGround: true });
      parcel.object = object;
      context.airportAds.push({ ...best, base, object });
    }
  }

  function setupSunglasses() {
    context.sunglassesSite = beachSunglassesSite(context.cityNavigation, {
      scale: context.MAP_SCALE,
      from: context.player,
    });
    context.sights.push(context.sunglassesSite);
  }

  function setupOceanSand() {
    context.sandSite = oceanBeachSandSite(context.cityNavigation, {
      scale: context.MAP_SCALE,
      from: context.player,
    });
    context.sights.push(context.sandSite);
  }

  function setupParrots() {
    const region = context.navigationRegionAt(context.player.x, context.player.y);
    for (const [index, [x, z]] of [
      [67.2, 16] satisfies [number, number],
      [69.2, 14.4] satisfies [number, number],
      [72, 16] satisfies [number, number],
    ].entries()) {
      const p = context.nearestNavigation(
        x - 0.5,
        z - 0.5,
        2.5,
        (a: number, b: number) =>
          context.navigationRegionAt(a, b) === region &&
          context.landClearAt(a, b) &&
          !context.placeAt(a, b),
      );
      if (!p) throw new Error('Parrot grove needs a reachable perch');
      context.parrots.push({
        id: 'coit-parrot-' + index,
        label: contentText('world.generation.setupParrots.label-92', {}),
        parrot: true,
        index,
        x: p.x + 0.5,
        z: p.y + 0.5,
        base: characterGround(p.x + 0.5, p.y + 0.5),
        height: 1.25,
        angle: index,
        description: contentText('world.generation.setupParrots.description-93', {}),
        approach: { x: p.x + 0.6, y: p.y },
      });
    }
  }

  function setupFishing() {
    const region = context.navigationRegionAt(context.player.x, context.player.y),
      target = { x: 60.75, y: 15.75 };
    let best = null,
      score = Infinity;
    for (let z = 12.5; z <= 21; z += 0.25)
      for (let x = 56; x <= 68; x += 0.25) {
        const entry = { x: x - 0.5, y: z - 0.5 },
          cost = (x - target.x) ** 2 + (z - target.y) ** 2;
        if (
          cost >= score ||
          context.navigationRegionAt(entry.x, entry.y) !== region ||
          !context.landClearAt(entry.x, entry.y) ||
          context.placeAt(entry.x, entry.y)
        )
          continue;
        for (const angle of [-Math.PI / 2, -Math.PI / 4, (-Math.PI * 3) / 4, 0, Math.PI] satisfies [
          number,
          number,
          number,
          number,
          number,
        ]) {
          const water = { x: x + Math.cos(angle) * 2, z: z + Math.sin(angle) * 2 };
          if (
            !context.surf.water(water.x, water.z) ||
            context.objects.some(
              (o) =>
                isPickTarget(o) &&
                water.x > o.lo[0] - 0.15 &&
                water.x < o.hi[0] + 0.15 &&
                water.z > o.lo[2] - 0.15 &&
                water.z < o.hi[2] + 0.15,
            )
          )
            continue;
          best = { entry, water, base: characterGround(x, z) };
          score = cost;
          break;
        }
      }
    if (!best)
      throw new Error('Fisherman’s Wharf needs a connected fishing spot facing open water');
    context.fishingSite = {
      id: 'wharf-fishing',
      kind: 'fishing',
      label: contentText('world.generation.setupFishing.label-94', {}),
      ...best,
      description: contentText('world.generation.setupFishing.description-95', {}),
    };
    context.sights.push(context.fishingSite);
  }

  function setupBunny() {
    const p = requiredValue(context.sightById('painted'), 'Missing authored entity: painted'),
      o = requiredPhysicalObject(p.object, 'The painted houses footprint is missing.'),
      a = o.rotation || 0,
      cx = o.x + o.w / 2,
      cz = o.y + o.d / 2;
    const x = cx - Math.sin(a) * (o.d / 2 + 1.6),
      z = cz + Math.cos(a) * (o.d / 2 + 1.6),
      region = context.navigationRegionAt(context.player.x, context.player.y);
    const reachable = (x: number, y: number) =>
      context.navigationRegionAt(x, y) === region && !context.placeAt(x, y);
    const site =
      context.nearestNavigation(
        x - 0.5,
        z - 0.5,
        3,
        (x: number, y: number) => reachable(x, y) && surfaceTypeAt(x + 0.5, y + 0.5) === 'grass',
      ) || context.nearestNavigation(x - 0.5, z - 0.5, 2, reachable);
    if (!site) throw new Error('The Painted Ladies bunny needs a reachable patch of grass');
    context.bunny = createPaintedBunny(site.x + 0.5, site.y + 0.5);
    context.sights.push(context.bunny.sight);
  }

  function setupSkateDog() {
    const park = requiredValue(context.sightById('dolores'), 'Missing authored entity: dolores'),
      cx = park.entry.x + 0.5,
      front = park.entry.y + 0.5,
      region = context.navigationRegionAt(context.player.x, context.player.y);
    const paved = (x: number, y: number) =>
      context.navigationRegionAt(x, y) === region &&
      !context.placeAt(x, y) &&
      (
        ['plaza', 'courtyard', 'sidewalk', 'path', 'cobble'] satisfies [
          string,
          string,
          string,
          string,
          string,
        ]
      ).includes(surfaceTypeAt(x + 0.5, y + 0.5));
    const home = context.nearestNavigation(cx - 0.5, front - 0.5, 4, paved);
    if (!home) throw new Error('Dolores Park needs a paved path for its skateboarding dog');
    let route: { x: number; z: number }[] | null = null;
    search: for (const angle of [0, Math.PI / 2] satisfies [number, number])
      for (const half of [1.2, 0.9, 0.6] satisfies [number, number, number]) {
        const a = { x: home.x - Math.cos(angle) * half, y: home.y - Math.sin(angle) * half },
          b = { x: home.x + Math.cos(angle) * half, y: home.y + Math.sin(angle) * half };
        if (!context.canTravel(a.x, a.y, b.x, b.y)) continue;
        let valid = true;
        for (let i = 0; i <= 12; i++)
          if (!paved(a.x + ((b.x - a.x) * i) / 12, a.y + ((b.y - a.y) * i) / 12)) valid = false;
        if (!valid) continue;
        route = [a, b].map((p) => ({ x: p.x + 0.5, z: p.y + 0.5 }));
        break search;
      }
    if (!route) throw new Error('The skateboarding dog needs a clear route beside Dolores Park');
    context.skateDog = createSkateDog(route, {
      onWoof: () => context.announce('Woof!', 'Skateboarding dog'),
    });
    context.sights.push(context.skateDog.sight);
  }

  function setupPacificaSurf() {
    drawDogSurfingBeach(context.sceneMesh, characterGround, context.signs);
    const judgePoint = context.airship.nearest(
      westernCoastX(DOG_SURFING.z) + 1,
      DOG_SURFING.z + 2,
      4,
    );
    if (!judgePoint) throw new Error('Dog surfing needs a walkable judging area');
    context.merchants.push({
      id: 'pacifica-dog-surf-judge',
      kind: 'dog-surfing-judge',
      dogSurfJudge: true,
      name: contentText('world.generation.setupPacificaSurf.name-96', {}),
      label: contentText('world.generation.setupPacificaSurf.label-97', {}),
      x: judgePoint.x + 0.5,
      z: judgePoint.y + 0.5,
      base: characterGround(judgePoint.x + 0.5, judgePoint.y + 0.5),
      regional: true,
      stationary: true,
      skin: '#b38a64',
      shirt: '#dcaa5e',
      hair: '#604938',
      height: 1.8,
      angle: Math.PI,
      description: contentText('world.generation.setupPacificaSurf.description-98', {}),
    });
    const z = PACIFICA_SURF_SPOT.z,
      coast = westernCoastX(z),
      near = { x: coast + Math.max(0.6, westernBeachWidth(z) * 0.5) - 0.5, y: z - 0.5 },
      entry = context.airship.nearest(near.x, near.y, 2);
    if (!entry) throw new Error('Pacifica needs a dry surfboard launch');
    const launch = { x: coast - PACIFICA_SURF_SPOT.launchDistance - 0.5, y: z - 0.5 };
    if (!context.surf.water(launch.x + 0.5, launch.y + 0.5))
      throw new Error('Pacifica surf launch must be in the ocean');
    const x = entry.x + 1.25,
      zz = entry.y - 0.5,
      base = airportWalkingHeight(x, zz);
    const sight: Site = {
      id: 'pacifica-surf',
      kind: 'surfing',
      label: contentText('world.generation.setupPacificaSurf.label-99', {}),
      entry,
      launch,
      description: contentText('world.generation.setupPacificaSurf.description-100', {}),
    };
    const object = context.addScenery(null, x - 0.35, zz - 0.95, 0.7, 1.9, 2.4, (m) =>
      drawSurfRack(m, { x, z: zz, base }),
    );
    Object.assign(object, {
      sight,
      base,
      arch: 'surf-rack',
      solid: true,
      preserveGround: true,
      footprint: context.rectangle(x, zz, 0.65, 1.85),
    });
    sight.object = object;
    context.sights.push(sight);
    context.pacificaSurfSite = sight;
  }

  function initializeGeography() {
    for (let y = 0; y < context.N; y++)
      for (let x = 0; x < context.N; x++) {
        const id = y * context.N + x;
        context.landMask[id] = [
          [0.04, 0.04] satisfies [number, number],
          [0.96, 0.04] satisfies [number, number],
          [0.96, 0.96] satisfies [number, number],
          [0.04, 0.96] satisfies [number, number],
        ].every(([dx, dy]) => insidePolygon(x + dx, y + dy, context.COAST))
          ? 1
          : 0;
        const r = nearestStreet(x + 0.5, y + 0.5);
        context.roadIndex[id] = r.index;
        context.roadDistance[id] = r.distance;
        if (
          context.landMask[id] &&
          (context.pondValue(x + 0.5, y + 0.5) < 1.1 ||
            context.mercedValue(x + 0.5, y + 0.5) < 1.08 ||
            context.palaceWater(x + 0.5, y + 0.5) < 1.08)
        )
          context.occupied[id] = 1;
      }
    // Entrances and landmark approaches remain open when scenery is generated.
    for (const p of [
      ...planningPlaces().map((p) => p.entry),
      ...context.sights.map((s) => s.entry),
      context.player,
    ]) {
      if (!p) continue;
      for (let x = Math.floor(p.x) - 1; x <= Math.ceil(p.x) + 1; x++)
        for (let y = Math.floor(p.y) - 1; y <= Math.ceil(p.y) + 1; y++)
          if (x >= 0 && y >= 0 && x < context.N && y < context.N)
            context.reserved[y * context.N + x] = 1;
    }
  }

  function tileBaseType(x: number, z: number, fixed = false) {
    if (!insidePolygon(x, z, context.COAST)) return 'sea';
    if (
      context.worldTiles?.waterTiles
        ? context.worldTiles.waterTiles.regionAt(x, z).type === 'water'
        : context.pondValue(x, z) < 1.12 ||
          context.mercedValue(x, z) < 1.1 ||
          context.palaceWater(x, z) < 1.1
    )
      return 'water';
    return tileLandType(x, z, fixed);
  }

  function tileLandType(x: number, z: number, fixed = false) {
    if (fixed) return 'building';
    if (Math.abs(x - SF_ZOO.x) < SF_ZOO.w / 2 && Math.abs(z - SF_ZOO.z) < SF_ZOO.d / 2)
      return 'grass';
    const u = x / context.MAP_SCALE,
      v = z / context.MAP_SCALE;
    if (u >= 23.7 && u <= 26.9 && v >= 12.8 && v <= 17.4) return 'grass';
    if (u >= 47.8 && u <= 51.6 && v >= 18.8 && v <= 23) return 'plaza';
    if (u < 9.6 && v > 28) return 'sand';
    if (context.greenArea(x, z)) return sfHillCover(u, v);
    return 'plaza';
  }

  function chamferDistance(mask: Uint8Array, size: number) {
    const out = new Float32Array(mask.length);
    for (let i = 0; i < out.length; i++) out[i] = mask[i] ? 0 : 1e5;
    for (let z = 0; z < size; z++)
      for (let x = 0; x < size; x++) {
        const i = z * size + x;
        if (x) out[i] = Math.min(out[i], out[i - 1] + 1);
        if (z) {
          out[i] = Math.min(out[i], out[i - size] + 1);
          if (x) out[i] = Math.min(out[i], out[i - size - 1] + Math.SQRT2);
          if (x + 1 < size) out[i] = Math.min(out[i], out[i - size + 1] + Math.SQRT2);
        }
      }
    for (let z = size - 1; z >= 0; z--)
      for (let x = size - 1; x >= 0; x--) {
        const i = z * size + x;
        if (x + 1 < size) out[i] = Math.min(out[i], out[i + 1] + 1);
        if (z + 1 < size) {
          out[i] = Math.min(out[i], out[i + size] + 1);
          if (x) out[i] = Math.min(out[i], out[i + size - 1] + Math.SQRT2);
          if (x + 1 < size) out[i] = Math.min(out[i], out[i + size + 1] + Math.SQRT2);
        }
      }
    return out;
  }

  function builtTiles(): BuiltWorldTileMap {
    const map = context.worldTiles;
    if (
      !map.blocked ||
      !map.clearance ||
      !map.road ||
      !map.path ||
      !map.roadFrames ||
      map.connectors === undefined
    )
      throw new Error('Tile compilation grids are unavailable.');
    return map as BuiltWorldTileMap;
  }

  function createTileBuilder(): BuiltWorldTileMap {
    const size = context.N * TILE_CONFIG.resolution,
      step = 1 / TILE_CONFIG.resolution,
      blocked = new Uint8Array(size * size),
      fixed = new Uint8Array(context.N * context.N);
    for (let i = 0; i < fixed.length; i++) fixed[i] = context.occupied[i];
    for (let z = 0; z < size; z++)
      for (let x = 0; x < size; x++) {
        const wx = (x + 0.5) * step,
          wz = (z + 0.5) * step,
          id = z * size + x,
          base = tileBaseType(wx, wz);
        blocked[id] =
          !context.landMask[Math.floor(wz) * context.N + Math.floor(wx)] ||
          base === 'water' ||
          fixed[Math.floor(wz) * context.N + Math.floor(wx)]
            ? 1
            : 0;
      }
    const vertices = (size + 1) ** 2,
      road = new Float32Array(vertices),
      path = new Float32Array(vertices);
    road.fill(100);
    path.fill(100);
    return {
      size,
      step,
      blocked,
      clearance: chamferDistance(blocked, size),
      road,
      path,
      roadFrames: new Float32Array(vertices),
      routes: [],
      tiles: [],
      connectors: 0,
      waterTiles: createWaterTiles({ size, step, coast: context.COAST, lakes: context.lakes }),
    };
  }

  function simplifyRoute(ids: readonly number[], size: number, step: number) {
    const result = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i],
        x = id % size,
        z = Math.floor(id / size),
        prev = ids[i - 1],
        next = ids[i + 1];
      if (
        i &&
        i + 1 < ids.length &&
        x - (prev % size) === (next % size) - x &&
        z - Math.floor(prev / size) === Math.floor(next / size) - z
      )
        continue;
      result.push([(x + 0.5) * step, (z + 0.5) * step] satisfies [number, number]);
    }
    return result;
  }

  function paintStreetField(
    map: BuiltWorldTileMap,
    points: number[][],
    kind: string,
    halfWidth: number,
  ) {
    const field = kind === 'path' ? map.path : map.road,
      stride = map.size + 1,
      margin = halfWidth + TILE_CONFIG.curbWidth + map.step * 2;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i],
        loX = Math.max(0, Math.floor((Math.min(a[0], b[0]) - margin) / map.step)),
        hiX = Math.min(map.size, Math.ceil((Math.max(a[0], b[0]) + margin) / map.step)),
        loZ = Math.max(0, Math.floor((Math.min(a[1], b[1]) - margin) / map.step)),
        hiZ = Math.min(map.size, Math.ceil((Math.max(a[1], b[1]) + margin) / map.step));
      for (let z = loZ; z <= hiZ; z++)
        for (let x = loX; x <= hiX; x++) {
          const id = z * stride + x;
          const value = distanceToSegment(x * map.step, z * map.step, a, b) - halfWidth;
          if (value < field[id]) {
            field[id] = value;
            if (kind !== 'path')
              map.roadFrames[id] =
                ((Math.atan2(b[1] - a[1], b[0] - a[0]) % (Math.PI / 2)) + Math.PI / 2) %
                (Math.PI / 2);
          }
        }
    }
  }

  function centerNetworkComponents(map: BuiltWorldTileMap) {
    const labels = new Int32Array(map.size * map.size);
    labels.fill(-1);
    const centers = new Uint8Array(labels.length),
      stride = map.size + 1;
    for (let z = 0; z < map.size; z++)
      for (let x = 0; x < map.size; x++) {
        const a = z * stride + x,
          c = (z + 1) * stride + x + 1;
        centers[z * map.size + x] =
          Math.min((map.road[a] + map.road[c]) * 0.5, (map.path[a] + map.path[c]) * 0.5) <= 1e-9
            ? 1
            : 0;
      }
    let count = 0;
    for (let id = 0; id < labels.length; id++)
      if (centers[id] && labels[id] < 0) {
        const queue = [id];
        labels[id] = count;
        for (let i = 0; i < queue.length; i++) {
          const k = queue[i],
            x = k % map.size,
            z = Math.floor(k / map.size);
          for (const d of TILE_EDGES) {
            const nx = x + d.dx,
              nz = z + d.dz;
            if (nx < 0 || nz < 0 || nx >= map.size || nz >= map.size) continue;
            const ni = nz * map.size + nx;
            if (centers[ni] && labels[ni] < 0) {
              labels[ni] = count;
              queue.push(ni);
            }
          }
        }
        count++;
      }
    return { labels, count };
  }

  function connectStreetNetwork(map: BuiltWorldTileMap) {
    for (let tries = 0; tries < 16; tries++) {
      const { labels, count } = centerNetworkComponents(map);
      if (count <= 1) return;
      const owner = new Int32Array(labels),
        parent = new Int32Array(labels.length);
      parent.fill(-1);
      const queue: number[] = [];
      for (let id = 0; id < labels.length; id++) if (labels[id] >= 0) queue.push(id);
      const need = (0.18 + TILE_CONFIG.curbWidth + map.step * Math.SQRT2) / map.step + 0.5;
      let pair = null;
      search: for (let i = 0; i < queue.length; i++) {
        const k = queue[i],
          x = k % map.size,
          z = Math.floor(k / map.size);
        for (const d of TILE_EDGES) {
          const nx = x + d.dx,
            nz = z + d.dz;
          if (nx < 0 || nz < 0 || nx >= map.size || nz >= map.size) continue;
          const ni = nz * map.size + nx;
          if (map.clearance[ni] < need) continue;
          if (owner[ni] < 0) {
            owner[ni] = owner[k];
            parent[ni] = k;
            queue.push(ni);
          } else if (owner[ni] !== owner[k]) {
            pair = [k, ni];
            break search;
          }
        }
      }
      if (!pair) throw new Error('Isolated street network');
      const left = [],
        right = [];
      for (let id = pair[0]; id >= 0; id = parent[id]) left.push(id);
      for (let id = pair[1]; id >= 0; id = parent[id]) right.push(id);
      const route = [...left.reverse(), ...right],
        points = simplifyRoute(route, map.size, map.step);
      if (route.length * map.step > 12) throw new Error('Unreasonably long street connector');
      paintStreetField(map, points, 'path', 0.18);
      map.routes.push({
        name: contentText('world.generation.connectStreetNetwork.name-101', {}),
        kind: 'path',
        points,
        halfWidth: 0.18,
      });
      map.connectors++;
    }
    throw new Error('Too many disconnected street fragments');
  }

  function compileStreetTiles() {
    const map = createTileBuilder();
    for (const r of context.streets) {
      const profile = { kind: r.kind === 'path' ? 'path' : 'road', halfWidth: r.w! },
        parts: number[][][] = [];
      // Clip straight road runs to dry land. Buildings never bend the grid.
      for (let i = 1; i < r.points.length; i++) {
        const a = r.points[i - 1],
          b = r.points[i],
          length = Math.hypot(b[0] - a[0], b[1] - a[1]),
          steps = Math.max(1, Math.ceil(length / 0.125));
        let part: number[][] = [];
        const finish = () => {
          if (part.length > 1) {
            const line = [part[0], part[part.length - 1]];
            parts.push(line);
          }
          part = [];
        };
        for (let j = 0; j <= steps; j++) {
          const t = j / steps,
            x = a[0] + (b[0] - a[0]) * t,
            z = a[1] + (b[1] - a[1]) * t,
            ix = Math.floor(x / map.step),
            iz = Math.floor(z / map.step),
            need =
              (profile.halfWidth + TILE_CONFIG.curbWidth + map.step * Math.SQRT2) / map.step + 0.5;
          if (
            ix >= 0 &&
            iz >= 0 &&
            ix < map.size &&
            iz < map.size &&
            map.clearance[iz * map.size + ix] >= need
          )
            part.push([x, z]);
          else finish();
        }
        finish();
      }
      const runs: number[][][][] = [];
      for (const p of parts) {
        const last = runs[runs.length - 1];
        if (last && Math.hypot(...context.sub2(last[last.length - 1][1], p[0])) < 0.15)
          last.push(p);
        else runs.push([p]);
      }
      const main =
        runs.sort(
          (a, b) =>
            b.reduce((s, p) => s + Math.hypot(...context.sub2(p[1], p[0])), 0) -
            a.reduce((s, p) => s + Math.hypot(...context.sub2(p[1], p[0])), 0),
        )[0] || [];
      parts.length = 0;
      parts.push(...main);
      for (const line of parts) {
        paintStreetField(map, line, profile.kind, profile.halfWidth);
        map.routes.push({ name: r.name, ...profile, points: line });
      }
      r.parts = parts;
      r.route = parts.length
        ? parts.reduce((a, b) =>
            Math.hypot(...context.sub2(b[1], b[0])) > Math.hypot(...context.sub2(a[1], a[0]))
              ? b
              : a,
          )
        : r.points;
      // This road continues over the grid boundary. Evaluate its complete
      // centerline so the final city tiles match the airport tiles exactly.
      if (r.regional) paintStreetField(map, r.points, profile.kind, profile.halfWidth);
      if (r.name === 'Market Street') r.route = r.points;
    }
    connectStreetNetwork(map);
    const stride = map.size + 1,
      claims = new Map<string, number>();
    map.overrideTypes = new Map();
    for (const item of TILE_CONFIG.overrides) {
      const preset = TILE_PRESETS[item.preset];
      if (!preset) throw new Error('Unknown tile preset: ' + item.preset);
      if (
        !Number.isInteger(item.rotation ?? 0) ||
        (item.rotation ?? 0) < 0 ||
        (item.rotation ?? 0) > 3
      )
        throw new Error('Tile rotation must be 0–3');
      if (
        !Number.isInteger(item.x) ||
        !Number.isInteger(item.z) ||
        item.x < 0 ||
        item.z < 0 ||
        item.x >= map.size ||
        item.z >= map.size
      )
        throw new Error('Tile override outside map');
      const ids = [
        item.z * stride + item.x,
        item.z * stride + item.x + 1,
        (item.z + 1) * stride + item.x + 1,
        (item.z + 1) * stride + item.x,
      ];
      for (const key of ['road', 'path'] as const)
        if (preset[key])
          for (let i = 0; i < 4; i++) {
            const value = preset[key]![(i - (item.rotation || 0) + 4) % 4],
              vertex = ids[i],
              claim = key + ':' + vertex;
            if (claims.has(claim) && claims.get(claim) !== value)
              throw new Error('Conflicting shared tile override');
            claims.set(claim, value);
            map[key][vertex] = value;
          }
      if (preset.type) map.overrideTypes.set(item.z * map.size + item.x, preset.type);
    }
    map.passageCache?.clear();
    context.worldTiles = map;
    rebuildSurfaceTiles();
  }

  function rebuildSurfaceTiles() {
    const map = builtTiles(),
      overrides = requiredValue(map.overrideTypes, 'Tile overrides have not been initialized.'),
      stride = map.size + 1;
    map.tiles = [];
    for (let z = 0; z < map.size; z++)
      for (let x = 0; x < map.size; x++) {
        const id = z * map.size + x,
          wx = (x + 0.5) * map.step,
          wz = (z + 0.5) * map.step,
          cell = map.waterTiles.boundaries.get(id),
          region = map.waterTiles.regionAt(wx, wz);
        const base =
          overrides.get(id) || (cell ? tileLandType(wx, wz) : region.type || tileLandType(wx, wz));
        const tile = applyWaterTile(
          buildSurfaceTile(
            base,
            (
              [
                z * stride + x,
                z * stride + x + 1,
                (z + 1) * stride + x + 1,
                (z + 1) * stride + x,
              ] satisfies [number, number, number, number]
            ).map((k) => [map.road[k], map.path[k]]),
          ),
          cell,
        );
        if (region.type) tile.waterLevel = region.level;
        tile.frame =
          map.road[z * stride + x] < 99
            ? map.roadFrames[z * stride + x]
            : wx - wz >= context.layoutPosition(3) &&
                wx + wz >= context.layoutPosition(99) &&
                wx + wz <= context.layoutPosition(126)
              ? Math.PI / 4
              : 0;
        map.tiles.push(tile);
      }
  }

  function pavingInArea(x: number, z: number, w = 1, d = 1) {
    if (!context.worldTiles) return false;
    const m = context.worldTiles;
    for (
      let iz = Math.max(0, Math.floor(z / m.step));
      iz < Math.min(m.size, Math.ceil((z + d) / m.step));
      iz++
    )
      for (
        let ix = Math.max(0, Math.floor(x / m.step));
        ix < Math.min(m.size, Math.ceil((x + w) / m.step));
        ix++
      ) {
        const t = m.tiles[iz * m.size + ix];
        if ((t.areas.road || 0) + (t.areas.path || 0) + (t.areas.sidewalk || 0) > 1e-8) return true;
      }
    return false;
  }

  function auditDowntown() {
    const end = DOWNTOWN.market[0].map(context.mapPosition),
      f = DOWNTOWN.ferry.entrance.map(context.mapPosition),
      tower = requiredPhysicalObject(
        context.objects.find((o) => o.sight?.id === 'salesforce'),
        'Missing authored world entity: salesforce',
      ),
      ferry = requiredValue(
        context.objects.find((o) => o.sight?.id === 'ferry'),
        'Missing authored world entity: ferry',
      );
    const endpoint = (name: string, p: number[]) =>
      Math.min(
        ...context.worldTiles.routes
          .filter((r) => r.name === name)
          .flatMap((r) => r.points.map((q) => Math.hypot(q[0] - p[0], q[1] - p[1]))),
      );
    const first = DOWNTOWN.bridge.rampStart.map(context.mapPosition),
      dx = f[0] - end[0],
      dz = f[1] - end[1];
    const checks = {
      salesforceSouthOfMarket:
        marketSide(
          (tower.x + tower.w / 2) / context.MAP_SCALE,
          (tower.y + tower.d / 2) / context.MAP_SCALE,
        ) > 2.5,
      marketReachesFerryPlaza: endpoint('Market Street', end) < 0.26,
      embarcaderoMeetsMarket: endpoint('Embarcadero', end) < 0.26,
      ferryFacesMarket: Math.abs(dx + dz) < 1e-7 && dx > 0,
      bridgeJoinsFirstStreet: endpoint('First Street', first) < 0.26,
      ferryPinned: !!ferry.pinned,
    };
    return { ok: Object.values(checks).every(Boolean), checks };
  }

  function finalizeSurfaceTiles() {
    for (let z = 0; z < context.worldTiles.size; z++)
      for (let x = 0; x < context.worldTiles.size; x++) {
        const tile = context.worldTiles.tiles[z * context.worldTiles.size + x];
        if (!inCoitGrove((x + 0.5) * context.worldTiles.step, (z + 0.5) * context.worldTiles.step))
          continue;
        if (
          (['plaza', 'courtyard', 'dirt'] satisfies [string, string, string]).includes(tile.base)
        ) {
          tile.base = 'grass';
          if (tile.patches)
            tile.patches = tile.patches.map((p) =>
              (['plaza', 'courtyard', 'dirt'] satisfies [string, string, string]).includes(p.type)
                ? { ...p, type: 'grass' }
                : p,
            );
          else {
            tile.type = 'grass';
            tile.areas = { grass: 1 };
            tile.edges = TILE_EDGES.map(() => [{ from: 0, to: 1, type: 'grass' }]);
          }
        }
      }
    const map = context.worldTiles;
    for (const o of context.objects)
      if (hasPhysicalBounds(o) && (o.place || o.arch || o.solid) && !o.preserveGround) {
        const footprint = context.objectFootprint(o),
          bounds = context.polygonBounds(footprint);
        for (
          let z = Math.max(0, Math.floor(bounds.z / map.step));
          z < Math.min(map.size, Math.ceil(bounds.bottom / map.step));
          z++
        )
          for (
            let x = Math.max(0, Math.floor(bounds.x / map.step));
            x < Math.min(map.size, Math.ceil(bounds.right / map.step));
            x++
          ) {
            const wx = x * map.step,
              wz = z * map.step,
              tile = map.tiles[z * map.size + x];
            if (tile.areas.road || tile.areas.path || tile.areas.sidewalk) {
              const patches = tile.patches || [
                {
                  type: tile.type,
                  polygon: [
                    [0, 0] satisfies [number, number],
                    [1, 0] satisfies [number, number],
                    [1, 1] satisfies [number, number],
                    [0, 1] satisfies [number, number],
                  ],
                },
              ];
              for (const patch of patches)
                if (
                  (['road', 'path', 'sidewalk'] satisfies [string, string, string]).includes(
                    patch.type,
                  ) &&
                  tilePolygonOverlap(
                    footprint,
                    patch.polygon.map(
                      (p) =>
                        [wx + p[0] * map.step, wz + p[1] * map.step] satisfies [number, number],
                    ),
                  ) > 1e-6
                )
                  throw new Error('Building crosses its curb at ' + o.x + ',' + o.y);
              continue;
            }
            if (!insidePolygon(wx + map.step / 2, wz + map.step / 2, footprint)) continue;
            if ((tile.areas.road || 0) + (tile.areas.path || 0) + (tile.areas.sidewalk || 0) > 1e-7)
              continue;
            tile.frame = (((o.rotation || 0) % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
            // Waterfront piers and lagoon landmarks may span water. Their
            // footprints can recolor dry ground, but must retain the bank.
            if (tile.areas.sea || tile.areas.water) {
              if (tile.patches?.some((p) => TILE_TYPES[p.type].group !== 'water')) {
                const replacement = surfaceTileFromPatches(
                  'building',
                  tile.patches.map((p) =>
                    TILE_TYPES[p.type].group === 'water' ? p : { ...p, type: 'building' },
                  ),
                  { keepPolygons: true },
                );
                replacement.variant = 'shoreline';
                Object.assign(tile, replacement);
              }
              continue;
            }
            tile.base = 'building';
            tile.type = 'building';
            tile.variant = 'building';
            tile.patches = null;
            tile.areas = { building: 1 };
            tile.edges = TILE_EDGES.map(() => [{ from: 0, to: 1, type: 'building' }]);
          }
      }
    // Enclosed rear-block space is a shared garden, not an empty paved lot.
    const buildings = chamferDistance(
        Uint8Array.from(map.tiles, (t) => (t.type === 'building' ? 1 : 0)),
        map.size,
      ),
      paving = chamferDistance(
        Uint8Array.from(map.tiles, (t) =>
          t.areas.road || t.areas.path || t.areas.sidewalk ? 1 : 0,
        ),
        map.size,
      );
    for (let z = 0; z < map.size; z++)
      for (let x = 0; x < map.size; x++) {
        const id = z * map.size + x,
          t = map.tiles[id],
          wx = (x + 0.5) * map.step,
          wz = (z + 0.5) * map.step;
        if (
          t.type !== 'plaza' ||
          t.areas.sea ||
          t.areas.water ||
          buildings[id] > 8 ||
          paving[id] < 2.5 ||
          context.publicSpaces.some((p) => insidePolygon(wx, wz, p))
        )
          continue;
        t.type = 'courtyard';
        t.base = 'courtyard';
        t.variant = 'courtyard';
        t.patches = null;
        t.areas = { courtyard: 1 };
        t.edges = TILE_EDGES.map(() => [{ from: 0, to: 1, type: 'courtyard' }]);
      }
    const regression = runTileRuleTests(),
      report = validateTileMap(map);
    if (!report.ok)
      throw new Error('World tile validation failed: ' + report.errors.slice(0, 8).join('; '));
    const geography = auditDowntown();
    if (!geography.ok)
      throw new Error('Downtown geography failed: ' + JSON.stringify(geography.checks));
    const frontages = auditCityBlocks();
    if (!frontages.ok)
      throw new Error(
        'Street-block validation failed: ' +
          frontages.coverage +
          '% building frontage; ' +
          frontages.alignmentErrors +
          ' alignment errors',
      );
    map.validation = {
      ...report,
      regression,
      connectors: map.connectors,
      dimensions: {
        x: context.N,
        y: context.N,
        reference: REFERENCE_SIZE,
        scale: context.MAP_SCALE,
      },
      frontages,
      geography,
    };
  }

  function signNames() {
    return [
      DOG_PONY_SIGN,
      ...VILLAGE_SIGNS,
      'THE ARMORY',
      ...SOUTHERN_CRAFT_SIGNS,
      ...SOCIAL_SIGNS,
      ...TECH_SIGNS,
      ...HABERDASHER_SIGNS,
      ...SALT_FLATS_SIGNS,
      ...GPU_FACTORY_SIGNS,
      ...BUS_SIGNS,
      ...JURASSIC_SIGNS,
      ...planningPlaces().flatMap((p) => [p.name, ...(p.signText ? [p.signText] : [])]),
      'Golden Gate Park',
      'The Panhandle',
      'Presidio',
      'Mazarine Coffee',
      'City Lights',
      'FERRY BUILDING',
      'CHINATOWN',
      'de Young',
      'Conservatory',
      'Academy of Sciences',
      'Crissy Field',
      'TAX AUTHORITY',
      'California high-speed rail',
      'SPACEX · 1 COIN',
      'PRIVATE JET TERMINAL',
      'PROMETHEUS',
      'Fire is for everyone.',
      'NIGHTLIFE',
      ...TIMES_SQUARE_SIGNS,
      ...SQUARE_LIFE_SIGNS,
      ...ALIEN_SITE_SIGNS,
      ...RESEARCH_SIGNS,
      ...PENINSULA_SIGNS,
      ...WOODLAND_SIGNS,
      ...ADVENTURE_SIGNS,
      'GONDOLA',
      'SKIS · 1 COIN',
      'HIKING SUPPLIES',
      'SF ZOO',
      'TIGER',
      'UCSF HOSPITAL',
      ...RESTAURANTS.map((r) => r.name),
    ];
  }

  function rawHeight(x: number, z: number) {
    const land = insidePolygon(x, z, context.COAST);
    let coast = Infinity;
    for (let i = 1; i < context.COAST.length; i++)
      coast = Math.min(coast, distanceToSegment(x, z, context.COAST[i - 1], context.COAST[i]));
    if (!land) return coast < 0.6 ? 0.35 : -0.65;
    // Relief scales independently of map size; fade it into the shoreline.
    const shoulder = 1.8 + 1.4 * Math.exp(-(((x - 72) / 14) ** 2 + ((z - 24) / 12) ** 2)),
      shore = Math.min(1, coast / shoulder),
      grade = shore * shore * (3 - 2 * shore);
    let y = 0.35 + (sfElevation(x / context.MAP_SCALE, z / context.MAP_SCALE) - 0.35) * grade;
    for (const lake of context.lakes) {
      const d = ((x - lake.x) / lake.rx) ** 2 + ((z - lake.z) / lake.rz) ** 2;
      if (d < 1.15) y = Math.min(y, lake.level - 0.3 * Math.min(1, (1.15 - d) * 5));
    }
    return y;
  }

  function buildHeightField() {
    for (const [x, z, rx, rz] of [
      [context.POND.x, context.POND.y, context.POND.rx, context.POND.ry] satisfies [
        number,
        number,
        number,
        number,
      ],
      [
        context.PALACE_LAGOON.x,
        context.PALACE_LAGOON.y,
        context.PALACE_LAGOON.rx,
        context.PALACE_LAGOON.ry,
      ] satisfies [number, number, number, number],
      ([16, 56, 1.7, 2.7] satisfies [number, number, number, number]).map(context.mapPosition),
      ([18.5, 58.3, 1.7, 2.2] satisfies [number, number, number, number]).map(context.mapPosition),
    ])
      context.lakes.push({ x, z, rx, rz, level: rawHeight(x, z) + 0.015 });
    // Merced's connected lobes share one surface instead of overlapping discs.
    context.lakes[2].level = context.lakes[3].level = Math.min(
      context.lakes[2].level,
      context.lakes[3].level,
    );
    context.heights = Array.from({ length: context.TERRAIN_GRID + 1 }, (_, z) =>
      Array.from({ length: context.TERRAIN_GRID + 1 }, (_, x) =>
        rawHeight(x / context.TERRAIN_RES, z / context.TERRAIN_RES),
      ),
    );
    // Ease the road into the peninsula's level ground, without an elevated
    // walkway or a height discontinuity at the edge of the city grid.
    for (let z = (context.N - 2) * context.TERRAIN_RES; z <= context.TERRAIN_GRID; z++)
      for (let x = 0; x <= context.TERRAIN_GRID; x++) {
        const distance = airportRoadDistance(x / context.TERRAIN_RES, z / context.TERRAIN_RES);
        if (distance > TILE_CONFIG.curbWidth + 0.6) continue;
        const t = (z / context.TERRAIN_RES - (context.N - 2)) / 2,
          collar = Math.max(0, Math.min(1, (distance - TILE_CONFIG.curbWidth) / 0.6)),
          weight = t * t * (3 - 2 * t) * (1 - collar * collar * (3 - 2 * collar));
        context.heights[z][x] += (AIRSHIP_TERMINAL.base - context.heights[z][x]) * weight;
      }
    const fulton = requiredValue(
      context.streets.find((r) => r.name === 'Fulton Street'),
      'Missing authored world entity: Fulton Street',
    );
    gradeStreetHeightField(context.heights, context.TERRAIN_RES, {
      points: fulton.points,
      halfWidth: fulton.w,
      curbWidth: TILE_CONFIG.curbWidth,
      contains: (x: number, z: number) => insidePolygon(x, z, context.COAST),
    });
    context.naturalHeights = context.heights.map((row) => row.slice());
  }

  function terrainHeight(x: number, z: number): number {
    if (context.countryside?.contains(x, z)) return context.countryside.height(x, z);
    if (context.marinLand?.onLand(x, z)) return context.marinLand.height(x, z);
    return context.esotericCampus?.contains(x, z)
      ? context.esotericCampus.ground()
      : sampleTerrain(context.heights, x, z);
  }

  function airportSurfaceHeight(x: number, z: number) {
    return context.southernTerrain?.contains(x, z)
      ? context.southernTerrain.height(x, z)
      : AIRSHIP_TERMINAL.base;
  }

  function airportWalkingHeight(x: number, z: number): number {
    const deck = duelDeckHeightAt(x, z);
    if (deck !== null) return deck;
    if (inTimesSquare(x, z))
      return (
        TIMES_SQUARE.base +
        Math.max(0.012, TILE_TYPES[airportSurfaceTypeAt(x, z)]?.height || 0) +
        0.008
      );
    if (gymAccess(x, z)) return SF_FITNESS.base + 0.04;
    if (context.nightclub && nightlifeAccess(x, z) && nightlifeWalkable(x, z))
      return nightlifeHeight(
        x,
        z,
        requiredValue(context.nightclub.base, 'nightclub floor'),
        terrainHeight,
      );
    return (
      airportSurfaceHeight(x, z) +
      (onAirportApron(x, z) ? 0.03 : (TILE_TYPES[airportSurfaceTypeAt(x, z)]?.height || 0) + 0.008)
    );
  }

  function characterGround(x: number, z: number): number {
    if (context.secretWorld?.kind === 'illuminati') return ILLUMINATI_CAVE.floor + 0.025;
    const home = searchHomeContaining(x, z),
      residence = home && planningPlaces().find((p) => p.id === home.id);
    if (residence?.object) return requiredValue(residence.object.base, 'house floor') + 0.045;
    const institute = context.instituteRoomAt(x, z);
    if (institute) return institute.base + INSTITUTE_FLOOR_HEIGHT;
    if (gymAccess(x, z)) return SF_FITNESS.base + 0.065;
    if (context.nightclub && nightlifeAccess(x, z) && nightlifeWalkable(x, z))
      return (
        nightlifeHeight(
          x,
          z,
          requiredValue(context.nightclub.base, 'nightclub floor'),
          terrainHeight,
        ) + 0.025
      );
    if (context.esotericCampus?.contains(x, z)) return context.esotericCampus.ground();
    const road = context.goldenGate?.at(x, z) || context.regionalRoad?.at(x, z);
    if (road) return road.height + 0.015;
    if (context.tahoe.contains(x, z)) return tahoeHeight(x, z) + 0.04;
    if (z >= context.N && context.airship.contains(x, z)) return airportWalkingHeight(x, z);
    const type = surfaceTypeAt(x, z);
    if (type === 'building') {
      const room = context.placeAt(x - 0.5, z - 0.5);
      if (room) {
        const [u, v] = buildingPoint(room, x, z, true),
          rug =
            u > room.x + 0.6 &&
            u < room.x + room.w - 0.6 &&
            v > room.y + 0.5 &&
            v < room.y + room.d - 0.5;
        return (
          requiredValue(requiredValue(room.object, 'room model').base, 'room floor') +
          (rug ? 0.09 : 0.035)
        );
      }
    }
    return terrainHeight(x, z) + (TILE_TYPES[type]?.height || 0) + 0.008;
  }

  function playerGround(ignoreCustody = false): number {
    if (context.tabletService?.state.active)
      return requiredValue(context.tabletService.state.pose, 'active teleport pose').position.y;
    if (context.secretWorld?.kind === 'kraken' && context.expeditions.ship.aboard)
      return PEQUOD.deck;
    if (context.rocket.state.active)
      return requiredValue(context.rocket.state.position, 'active rocket position').y;
    if (context.secretWorld?.bomber.state.active)
      return context.secretWorld.bomber.state.position.y;
    if (context.secretWorld?.kind === 'illuminati') return ILLUMINATI_CAVE.floor + 0.025;
    if (context.multiplayerWorld?.traversing)
      return requiredValue(context.multiplayerWorld.ground, 'multiplayer traversal elevation');
    if (
      context.multiplayerWorld?.serverWalking &&
      context.multiplayerWorld.followingGround !== null
    )
      return context.multiplayerWorld.followingGround;
    if (context.expeditions.ship.aboard)
      return PEQUOD.deck + Math.sin(context.expeditions.state.clock * 1.4) * 0.035;
    if (context.capture.state.active) return context.capture.state.base;
    if (context.chase?.state.jailed && !ignoreCustody) return context.detention.base + 0.18;
    if (context.tahoe.state.mode !== 'ground')
      return requiredValue(context.tahoe.state.position, 'active ski position').y;
    if (context.rope.climbing)
      return requiredValue(context.rope.state.position, 'active rope position').y;
    if (context.sutroClimb.state.active)
      return requiredValue(context.sutroClimb.state.position, 'active climb position').y;
    if (context.flying())
      return (
        requiredValue(context.airship.state.position, 'active airship position').y +
        AIRSHIP_BASKET.floor
      );
    if (context.ferrari?.state.riding) return context.ferrari.position.y;
    if (context.training) return SF_FITNESS.base;
    if (context.surf.state.riding)
      return (
        0.06 +
        (context.surf.state.mode === 'surf'
          ? context.waveSurf.pose.height
          : context.surf.state.jump?.height || 0)
      );
    const x = context.player.x + 0.5,
      z = context.player.y + 0.5,
      institute = context.instituteRoomAt(x, z);
    if (institute) return institute.base + INSTITUTE_FLOOR_HEIGHT;
    if (gymAccess(x, z)) return SF_FITNESS.base + 0.065;
    if (context.esotericCampus?.contains(x, z)) return context.esotericCampus.ground();
    const road = context.goldenGate?.at(x, z) || context.regionalRoad?.at(x, z);
    if (road) return road.height + 0.015;
    if (context.tahoe.contains(x, z)) return tahoeHeight(x, z);
    if (z >= context.N && context.airship.contains(x, z)) return airportWalkingHeight(x, z);
    return terrainHeight(x, z);
  }

  function naturalHeight(x: number, z: number): number {
    return context.southernTerrain?.contains(x, z)
      ? context.southernTerrain.naturalHeight(x, z)
      : sampleTerrain(context.naturalHeights, x, z);
  }

  function protectPublicGroundVertex(x: number, z: number) {
    const m = context.worldTiles;
    if (!m) return false;
    const ix = Math.round(x / m.step),
      iz = Math.round(z / m.step);
    for (const dx of [-1, 0] satisfies [number, number])
      for (const dz of [-1, 0] satisfies [number, number]) {
        const xx = ix + dx,
          zz = iz + dz;
        if (xx < 0 || zz < 0 || xx >= m.size || zz >= m.size) continue;
        const t = m.tiles[zz * m.size + xx];
        if (t && (t.areas.road || t.areas.path || t.areas.sidewalk)) return true;
      }
    return false;
  }

  function cutHousePlot(pad: import('../types/buildings.ts').TerrainPad) {
    cutBuildingPlot(context.heights, context.TERRAIN_RES, pad, {
      protect: protectPublicGroundVertex,
    });
    if (context.southernTerrain && pad.cz + Math.hypot(pad.w, pad.d) / 2 >= context.N)
      context.southernTerrain.cutPlot(pad);
  }

  function sampleTerrain(field: HeightField | null, x: number, z: number): number {
    if (!field) return 1.15;
    if (x < 0 || z < 0 || x >= context.N || z >= context.N)
      return context.southernTerrain?.contains(x, z)
        ? context.southernTerrain.height(x, z)
        : inRailPit(x, z)
          ? RAIL_PIT.floor
          : z >= SOUTHERN_BOUNDS.north &&
              z <= SOUTHERN_BOUNDS.south &&
              x >= SOUTHERN_BOUNDS.west &&
              x <= SOUTHERN_BOUNDS.east
            ? 1.15
            : regionalGroundHeight(x, z);
    const ix = Math.floor(x * context.TERRAIN_RES),
      iz = Math.floor(z * context.TERRAIN_RES),
      u = x * context.TERRAIN_RES - ix,
      v = z * context.TERRAIN_RES - iz,
      a = field[iz][ix],
      b = field[iz][ix + 1],
      c = field[iz + 1][ix + 1],
      d = field[iz + 1][ix];
    return u >= v ? a + (b - a) * u + (c - b) * v : a + (c - d) * u + (d - a) * v;
  }

  function levelTerrainPad(
    cx: number,
    cz: number,
    w: number,
    d: number,
    angle = 0,
    height = terrainHeight(cx, cz),
  ) {
    const pad = { cx, cz, w, d, angle, height };
    const result = levelHeightField(context.heights, context.TERRAIN_RES, pad, {
      protect: protectPublicGroundVertex,
    });
    context.terrainPads.push({ ...pad, ...result });
    return height;
  }

  function groundPoint(x: number, z: number, offset = 0.025) {
    return [x, terrainHeight(x, z) + offset, z];
  }

  function surfacePolygon(m: Mesh, points: number[][], color: Color, offset: number) {
    const xs = points.map((p) => p[0]),
      zs = points.map((p) => p[1]);
    const clip = (polygon: number[][], a: number[], b: number[]) => {
      const out = [],
        side = (p: number[]) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
      for (let i = 0; i < polygon.length; i++) {
        const p = polygon[i],
          q = polygon[(i + 1) % polygon.length],
          dp = side(p),
          dq = side(q);
        if (dp >= -1e-9) out.push(p);
        if (dp >= 0 !== dq >= 0) {
          const t = dp / (dp - dq);
          out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t] satisfies [number, number]);
        }
      }
      return out;
    };
    for (
      let iz = Math.floor(Math.min(...zs) * context.TERRAIN_RES);
      iz <= Math.floor(Math.max(...zs) * context.TERRAIN_RES);
      iz++
    )
      for (
        let ix = Math.floor(Math.min(...xs) * context.TERRAIN_RES);
        ix <= Math.floor(Math.max(...xs) * context.TERRAIN_RES);
        ix++
      )
        for (const tri of [
          [
            [ix / context.TERRAIN_RES, iz / context.TERRAIN_RES] satisfies [number, number],
            [(ix + 1) / context.TERRAIN_RES, iz / context.TERRAIN_RES] satisfies [number, number],
            [(ix + 1) / context.TERRAIN_RES, (iz + 1) / context.TERRAIN_RES] satisfies [
              number,
              number,
            ],
          ],
          [
            [ix / context.TERRAIN_RES, iz / context.TERRAIN_RES] satisfies [number, number],
            [(ix + 1) / context.TERRAIN_RES, (iz + 1) / context.TERRAIN_RES] satisfies [
              number,
              number,
            ],
            [ix / context.TERRAIN_RES, (iz + 1) / context.TERRAIN_RES] satisfies [number, number],
          ],
        ]) {
          let polygon = points;
          for (let i = 0; i < 3 && polygon.length; i++)
            polygon = clip(polygon, tri[i], tri[(i + 1) % 3]);
          if (polygon.length < 3) continue;
          const cx = polygon.reduce((v, p) => v + p[0], 0) / polygon.length,
            cz = polygon.reduce((v, p) => v + p[1], 0) / polygon.length;
          if (!insidePolygon(cx, cz, context.COAST)) continue;
          for (let i = 1; i < polygon.length - 1; i++)
            m.tri(
              groundPoint(polygon[0][0], polygon[0][1], offset),
              groundPoint(polygon[i + 1][0], polygon[i + 1][1], offset),
              groundPoint(polygon[i][0], polygon[i][1], offset),
              color,
            );
        }
  }

  function terrainStrip(m: Mesh, points: number[][], w: number, color: string, offset = 0.04) {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        len = Math.hypot(dx, dz),
        nx = (-dz / len) * w,
        nz = (dx / len) * w;
      surfacePolygon(
        m,
        [
          [a[0] - nx, a[1] - nz] satisfies [number, number],
          [b[0] - nx, b[1] - nz] satisfies [number, number],
          [b[0] + nx, b[1] + nz],
          [a[0] + nx, a[1] + nz],
        ],
        color,
        offset,
      );
    }
  }

  function renderSurfaceTiles(m: Mesh) {
    const map = builtTiles();
    for (let z = 0; z < map.size; z++)
      for (let x = 0; x < map.size; x++) {
        const t = map.tiles[z * map.size + x],
          wx = x * map.step,
          wz = z * map.step;
        if (t.type === 'sea') continue;
        const stride = map.size + 1,
          corners = [
            [0, 0] satisfies [number, number],
            [1, 0] satisfies [number, number],
            [1, 1] satisfies [number, number],
            [0, 1] satisfies [number, number],
          ],
          polygon =
            t.type === 'sidewalk'
              ? corners.map((p) => {
                  const k = (z + p[1]) * stride + x + p[0],
                    r = map.road[k],
                    q = map.path[k];
                  return [...p, r, q, Math.min(r, q)];
                })
              : corners,
          patches = t.patches || [{ type: t.type, polygon }];
        for (const patch of patches) {
          // Ocean fragments are covered by the continuous offshore surface.
          // Lakes use their shared level, never the terrain below the water.
          if (patch.type === 'sea') continue;
          const material = TILE_TYPES[patch.type],
            wet = patch.type === 'water',
            level = patch.level ?? t.waterLevel ?? 0;
          const shade =
              patch.type === 'grass' ? Math.floor(rand(Math.floor(wx), Math.floor(wz)) * 5) - 2 : 0,
            color = shade ? tint(material.color, shade) : material.color;
          const points = patch.polygon.map((p) =>
            wet
              ? [wx + p[0] * map.step, level, wz + p[1] * map.step]
              : groundPoint(wx + p[0] * map.step, wz + p[1] * map.step, material.height),
          );
          for (let i = 1; i < points.length - 1; i++)
            m.tri(
              points[0],
              points[i + 1],
              points[i],
              color,
              wet
                ? { water: 2 }
                : material.texture
                  ? { material: material.texture, angle: t.frame || 0 }
                  : null,
            );
          if (patch.type === 'sidewalk')
            for (let i = 0; i < patch.polygon.length; i++) {
              const a = patch.polygon[i],
                b = patch.polygon[(i + 1) % patch.polygon.length],
                roadEdge =
                  (Math.abs(a[2]) < 1e-6 && Math.abs(b[2]) < 1e-6) ||
                  (Math.abs(a[3]) < 1e-6 && Math.abs(b[3]) < 1e-6),
                outer =
                  Math.abs(a[4] - TILE_CONFIG.curbWidth) < 1e-6 &&
                  Math.abs(b[4] - TILE_CONFIG.curbWidth) < 1e-6;
              if (!roadEdge && !outer) continue;
              const bottom = roadEdge ? TILE_TYPES.road.height : TILE_TYPES[t.base].height,
                ax = wx + a[0] * map.step,
                az = wz + a[1] * map.step,
                bx = wx + b[0] * map.step,
                bz = wz + b[1] * map.step;
              m.quad(
                groundPoint(ax, az, bottom),
                groundPoint(bx, bz, bottom),
                groundPoint(bx, bz, material.height),
                groundPoint(ax, az, material.height),
                '#aaa58f',
              );
            }
        }
      }
  }

  function makeTerrain() {
    const m = new Mesh();
    renderSurfaceTiles(m);
    context.southernTerrain.drawLand(m);
    context.marinLand.draw(m);
    for (const [p, q] of shorelineSegments(context.COAST, 1 / context.TERRAIN_RES)) {
      if (Math.min(p[1], q[1]) >= context.N - 1e-8) continue;
      m.quad(
        [p[0], -0.25, p[1]],
        [q[0], -0.25, q[1]],
        [q[0], terrainHeight(q[0], q[1]) + 0.02, q[1]],
        [p[0], terrainHeight(p[0], p[1]) + 0.02, p[1]],
        '#9c9d87',
        'stone',
      );
    }
    context.seaBounds = createSeaSurface(m, [
      { polygon: context.sailingCoast, width: 2.8 },
      { polygon: context.MARIN, width: 2.2 },
    ]);
    decorateHeadlands(m, context.MARIN, context.MAP_SCALE);
    drawCoastalRocks(m, createCoastalRocks(), terrainHeight, (x, z) =>
      z >= context.N ? context.southernTerrain.contains(x, z) : insidePolygon(x, z, context.COAST),
    );
    // Rails are details contained inside Market Street's merged road surface.
    for (const shift of [-0.18, 0.18] satisfies [number, number]) {
      const p = context.market.route || context.market.points,
        rail = p.map((v, i) => {
          const a = p[Math.max(0, i - 1)],
            b = p[Math.min(p.length - 1, i + 1)],
            len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
          return [
            v[0] - ((b[1] - a[1]) / len) * shift,
            v[1] + ((b[0] - a[0]) / len) * shift,
          ] satisfies [number, number];
        });
      terrainStrip(m, rail, 0.018, '#424e49', 0.028);
    }
    context.detailedGround(m);

    context.groundMesh = m;
    context.groundGPU = context.upload(m, { spatial: true });
  }

  function parcelNeighbors(poly: number[][]) {
    const b = context.polygonBounds(poly),
      found = new Set<CityParcel>();
    for (let z = Math.floor(b.z / 3); z <= Math.floor(b.bottom / 3); z++)
      for (let x = Math.floor(b.x / 3); x <= Math.floor(b.right / 3); x++)
        for (const p of context.parcelBins.get(x + ',' + z) || []) found.add(p);
    return found;
  }

  function claimParcel(p: CityParcel) {
    context.cityParcels.push(p);
    const b = context.polygonBounds(p.polygon);
    for (let z = Math.floor(b.z / 3); z <= Math.floor(b.bottom / 3); z++)
      for (let x = Math.floor(b.x / 3); x <= Math.floor(b.right / 3); x++) {
        const key = x + ',' + z;
        if (!context.parcelBins.has(key)) context.parcelBins.set(key, []);
        context.parcelBins.get(key)!.push(p);
      }
    return p;
  }

  function parcelFits(
    poly: number[][],
    { park = false, ignore = null }: { park?: boolean; ignore?: CityParcel | null } = {},
  ) {
    const b = context.polygonBounds(poly),
      m = context.worldTiles;
    if (b.x < 0 || b.z < 0 || b.right > context.N || b.bottom > context.N) return false;
    for (const p of parcelNeighbors(poly))
      if (p !== ignore && tilePolygonOverlap(poly, p.polygon) > 1e-6) return false;
    for (
      let z = Math.max(0, Math.floor(b.z / m.step));
      z < Math.min(m.size, Math.ceil(b.bottom / m.step));
      z++
    )
      for (
        let x = Math.max(0, Math.floor(b.x / m.step));
        x < Math.min(m.size, Math.ceil(b.right / m.step));
        x++
      ) {
        const wx = x * m.step,
          wz = z * m.step,
          t = m.tiles[z * m.size + x],
          cell = [
            [wx, wz] satisfies [number, number],
            [wx + m.step, wz],
            [wx + m.step, wz + m.step],
            [wx, wz + m.step],
          ];
        if (tilePolygonOverlap(poly, cell) < 1e-7) continue;
        if (
          t.base === 'sea' ||
          t.base === 'water' ||
          (!park && context.greenArea(wx + m.step / 2, wz + m.step / 2))
        )
          return false;
        if (!((t.areas.road || 0) + (t.areas.path || 0) + (t.areas.sidewalk || 0))) continue;
        if (!t.patches) return false;
        for (const patch of t.patches)
          if (
            (['road', 'path', 'sidewalk'] satisfies [string, string, string]).includes(
              patch.type,
            ) &&
            tilePolygonOverlap(
              poly,
              patch.polygon.map(
                (v) => [wx + v[0] * m.step, wz + v[1] * m.step] satisfies [number, number],
              ),
            ) > 1e-7
          )
            return false;
      }
    return true;
  }

  function moveObject(o: WorldObject, dx: number, dz: number) {
    if (!isPickTarget(o) || typeof o.base !== 'number')
      throw new Error('Movable landmark lacks geometry');
    const dy =
      terrainHeight(o.x + o.w / 2 + dx, o.y + o.d / 2 + dz) -
      terrainHeight(o.x + o.w / 2, o.y + o.d / 2);
    for (let v = o.start * 11; v < (o.start + o.count) * 11; v += 11) {
      o.mesh.data[v] += dx;
      o.mesh.data[v + 1] += dy;
      o.mesh.data[v + 2] += dz;
    }
    o.x += dx;
    o.y += dz;
    o.base += dy;
    for (const p of [o.lo, o.hi]) {
      p[0] += dx;
      p[1] += dy;
      p[2] += dz;
    }
    if (o.footprint) o.footprint = o.footprint.map((p) => [p[0] + dx, p[1] + dz]);
  }

  function fitLandmarksToBlocks() {
    const groups = new Map<string | WorldObject, WorldObject[]>();
    for (const o of context.objects)
      if (hasPhysicalBounds(o) && (o.arch || o.solid)) {
        const key = o.sight?.id || o;
        if (key === 'nia') continue;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(o);
      }
    for (const [key, solid] of groups) {
      const group =
        typeof key === 'string'
          ? context.objects.filter(hasPhysicalBounds).filter((o) => o.sight?.id === key)
          : solid;
      let offset: [number, number] | null = null;
      if (group.some((o) => o.pinned)) {
        for (const o of solid)
          claimParcel({ polygon: context.objectFootprint(o), kind: 'landmark', object: o });
        continue;
      }
      search: for (let r = 0; r <= 32; r++)
        for (let dz = -r; dz <= r; dz++)
          for (let dx = -r; dx <= r; dx++) {
            if (r && Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
            if (
              key === 'salesforce' &&
              solid.some(
                (o) =>
                  marketSide(
                    (o.x + o.w / 2 + dx * 0.25) / context.MAP_SCALE,
                    (o.y + o.d / 2 + dz * 0.25) / context.MAP_SCALE,
                  ) < 2.5,
              )
            )
              continue;
            if (
              solid.every((o) =>
                parcelFits(
                  context
                    .objectFootprint(o)
                    .map((p) => [p[0] + dx * 0.25, p[1] + dz * 0.25] satisfies [number, number]),
                  { park: true },
                ),
              )
            ) {
              offset = [dx * 0.25, dz * 0.25] satisfies [number, number];
              break search;
            }
          }
      if (!offset)
        throw new Error(
          'No planned landmark site for ' + (typeof key === 'string' ? key : 'building'),
        );
      for (const o of group) moveObject(o, ...offset);
      for (const o of solid)
        if (o.arch !== 'townhomes' && !o.preserveGround)
          levelTerrainPad(
            o.x + o.w / 2,
            o.y + o.d / 2,
            o.w,
            o.d,
            o.rotation || 0,
            requiredValue(o.base, 'landmark elevation') - (o.arch ? 0.025 : 0),
          );
      for (const o of solid)
        claimParcel({ polygon: context.objectFootprint(o), kind: 'landmark', object: o });
      if (key === 'cityhall') {
        const hall = solid[0],
          forecourt = context.rectangle(
            hall.x + hall.w / 2,
            hall.y + hall.d + 0.65,
            hall.w - 0.1,
            1.3,
          );
        if (parcelFits(forecourt, { park: true })) {
          context.publicSpaces.push(forecourt);
          claimParcel({ polygon: forecourt, kind: 'civic forecourt' });
        }
      }
      if (typeof key === 'string') {
        const s = context.sightById(key);
        if (s) {
          s.entry.x += offset[0];
          s.entry.y += offset[1];
          if (s.mapPoint) {
            s.mapPoint.x += offset[0];
            s.mapPoint.y += offset[1];
          }
        }
      }
    }
  }

  function reserveBridgeApproach() {
    const a = DOWNTOWN.bridge.rampStart.map(context.mapPosition),
      b = DOWNTOWN.bridge.abutment.map(context.mapPosition),
      cx = (a[0] + b[0]) / 2,
      cz = (a[1] + b[1]) / 2,
      length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const polygon = context.rectangle(
        cx,
        cz,
        length + 1,
        1.65,
        Math.atan2(b[1] - a[1], b[0] - a[0]),
      ),
      object = context.objects.filter(hasPhysicalBounds).find((o) => o.sight?.id === 'baybridge');
    context.publicSpaces.push(polygon);
    claimParcel({ polygon, kind: 'bridge approach', object });
  }

  function buildingPoint(
    p: { x: number; y: number; w: number; d: number; rotation?: number },
    x: number,
    z: number,
    inverse = false,
  ) {
    const a = (p.rotation || 0) * (inverse ? -1 : 1),
      cx = p.x + p.w / 2,
      cz = p.y + p.d / 2,
      dx = x - cx,
      dz = z - cz;
    return [
      cx + dx * Math.cos(a) - dz * Math.sin(a),
      cz + dx * Math.sin(a) + dz * Math.cos(a),
    ] satisfies [number, number];
  }

  function planContentBuildings() {
    for (const p of planningPlaces()) {
      const target = [p.x + p.w / 2, p.y + p.d / 2] satisfies [number, number];
      let best = null,
        score = Infinity;
      for (const r of context.worldTiles.routes)
        if (r.kind === 'road' && (p.id !== 'links' || r.name === 'Market Street')) {
          const [a, b] = r.points,
            dx = b[0] - a[0],
            dz = b[1] - a[1],
            length = Math.hypot(dx, dz),
            ux = dx / length,
            uz = dz / length,
            at = Math.max(0, Math.min(length, (target[0] - a[0]) * ux + (target[1] - a[1]) * uz));
          for (const side of [-1, 1] satisfies [number, number])
            for (let step = -24; step <= 24; step++) {
              const t = Math.max(p.w / 2, Math.min(length - p.w / 2, at + step * 0.25));
              if (length < p.w + 0.5) continue;
              const nx = -uz * side,
                nz = ux * side,
                offset = r.halfWidth + TILE_CONFIG.curbWidth + 0.18 + p.d / 2,
                cx = a[0] + ux * t + nx * offset,
                cz = a[1] + uz * t + nz * offset,
                angle = Math.atan2(nx, -nz),
                poly = context.rectangle(cx, cz, p.w, p.d, angle),
                distance = (cx - target[0]) ** 2 + (cz - target[1]) ** 2;
              if (
                p.id === 'ai-lab' &&
                (marketSide(cx / context.MAP_SCALE, cz / context.MAP_SCALE) <= 0 ||
                  cz > context.mapPosition(40) ||
                  cx < context.mapPosition(43))
              )
                continue;
              if (distance >= score || !parcelFits(poly)) continue;
              score = distance;
              best = { cx, cz, angle, poly };
            }
        }
      if (!best) throw new Error('No curb-facing site for ' + p.name);
      p.x = best.cx - p.w / 2;
      p.y = best.cz - p.d / 2;
      p.rotation = best.angle;
      p.footprint = best.poly;
      p.localDoor = p.x + (p.w - 1) / 2;
      const inside = buildingPoint(p, p.x + p.w / 2, p.y + p.d - 0.7),
        entry = buildingPoint(p, p.x + p.w / 2, p.y + p.d + 0.65);
      p.inside = { x: inside[0] - 0.5, y: inside[1] - 0.5 };
      p.entry = { x: entry[0] - 0.5, y: entry[1] - 0.5 };
      claimParcel({ polygon: best.poly, kind: 'destination', place: p });
      // Doorways have short, deliberate public approaches, never vacant lots.
      const forecourt = context.rectangle(
        ...buildingPoint(p, p.x + p.w / 2, p.y + p.d + 0.3),
        1.2,
        0.6,
        p.rotation,
      );
      context.publicSpaces.push(forecourt);
      claimParcel({ polygon: forecourt, kind: 'entrance' });
      levelTerrainPad(best.cx, best.cz, p.w, p.d, p.rotation);
      context.makeBuilding(p as Place, true);
    }
  }

  function planRestaurants() {
    for (const definition of RESTAURANTS) {
      const target = definition.target.map(context.mapPosition),
        width = definition.w,
        depth = definition.d + definition.patioDepth;
      let best = null,
        score = Infinity;
      for (const r of context.worldTiles.routes)
        if (
          r.kind === 'road' &&
          (definition.id !== 'rich-table' ||
            (
              ['Oak Street', 'Van Ness Avenue', 'Fell Street'] satisfies [string, string, string]
            ).includes(r.name))
        ) {
          const [a, b] = r.points,
            dx = b[0] - a[0],
            dz = b[1] - a[1],
            length = Math.hypot(dx, dz),
            ux = dx / length,
            uz = dz / length;
          if (length < width + 0.4) continue;
          const at = Math.max(
            0,
            Math.min(length, (target[0] - a[0]) * ux + (target[1] - a[1]) * uz),
          );
          for (const side of [-1, 1] satisfies [number, number])
            for (let step = -64; step <= 64; step++) {
              const t = Math.max(width / 2, Math.min(length - width / 2, at + step * 0.125)),
                nx = -uz * side,
                nz = ux * side,
                offset = r.halfWidth + TILE_CONFIG.curbWidth + 0.18 + depth / 2;
              const cx = a[0] + ux * t + nx * offset,
                cz = a[1] + uz * t + nz * offset,
                angle = Math.atan2(nx, -nz),
                polygon = context.rectangle(cx, cz, width, depth, angle),
                distance = (cx - target[0]) ** 2 + (cz - target[1]) ** 2;
              const bodyX = cx + (nx * definition.patioDepth) / 2,
                bodyZ = cz + (nz * definition.patioDepth) / 2;
              if (
                definition.id === 'rich-table' &&
                (bodyX < context.mapPosition(PANHANDLE.east + 0.25) ||
                  bodyZ < context.mapPosition(PANHANDLE.south) ||
                  bodyX > context.mapPosition(44) ||
                  bodyZ > context.mapPosition(37) ||
                  marketSide(bodyX / context.MAP_SCALE, bodyZ / context.MAP_SCALE) >= 0)
              )
                continue;
              if (distance >= score || !parcelFits(polygon)) continue;
              score = distance;
              best = { cx, cz, nx, nz, angle, polygon, street: r.name };
            }
        }
      if (!best || score > 144)
        throw new Error('No nearby curb-facing restaurant plot for ' + definition.label);
      const cx = best.cx + (best.nx * definition.patioDepth) / 2,
        cz = best.cz + (best.nz * definition.patioDepth) / 2;
      const sight = requiredValue(context.sightById(definition.id), 'restaurant landmark'),
        site: import('../restaurants.ts').RestaurantPlan = Object.assign(
          { ...definition },
          {
            ...definition,
            x: cx - definition.w / 2,
            y: cz - definition.d / 2,
            rotation: best.angle,
            footprint: context.rectangle(cx, cz, definition.w, definition.d, best.angle),
            sight,
            street: best.street,
          },
        );
      if (definition.id === 'rich-table') site.localDoor = site.x + 0.14;
      const parcel = claimParcel({ polygon: best.polygon, kind: 'restaurant' });
      levelTerrainPad(best.cx, best.cz, width, depth, best.angle);
      const object = requiredPhysicalObject(context.makeBuilding(site), 'Restaurant model');
      if (typeof object.base !== 'number') throw new Error('Restaurant needs floor elevation');
      const completed = Object.assign(site, {
        object: Object.assign(object, { base: object.base }),
      });
      parcel.object = completed.object;
      const patio = context.makeRestaurantPatio(completed);
      sight.object = completed.object;
      completed.tables = patio.tables;
      context.restaurantDiners.push(...patio.diners);
      context.restaurantSites.push(completed);
      const entry = restaurantPoint(
        site,
        definition.id === 'rich-table' ? -site.w / 2 + 0.38 : 0,
        site.d / 2 + site.patioDepth + 0.3,
      );
      sight.x = cx - 0.5;
      sight.y = cz - 0.5;
      sight.entry = { x: entry[0] - 0.5, y: entry[1] - 0.5 };
      sight.mapPoint = { x: cx, y: cz };
      sight.site = completed;
    }
  }

  function protectLandmarkApproaches() {
    for (const s of context.sights)
      if (s.kind !== 'bike' && s.kind !== 'guest' && !s.approachReserved) {
        s.approachReserved = true;
        const origin = [s.entry.x + 0.5, s.entry.y + 0.5] satisfies [number, number];
        let nearest = null,
          best = Infinity;
        for (const r of context.worldTiles.routes) {
          const [a, b] = r.points,
            dx = b[0] - a[0],
            dz = b[1] - a[1],
            t = Math.max(
              0,
              Math.min(
                1,
                ((origin[0] - a[0]) * dx + (origin[1] - a[1]) * dz) / (dx * dx + dz * dz),
              ),
            ),
            p = [a[0] + dx * t, a[1] + dz * t],
            d = Math.hypot(p[0] - origin[0], p[1] - origin[1]);
          if (d < best) {
            best = d;
            nearest = p;
          }
        }
        if (!nearest || best > 7) continue;
        const middle = [(origin[0] + nearest[0]) / 2, (origin[1] + nearest[1]) / 2] satisfies [
            number,
            number,
          ],
          angle = Math.atan2(nearest[1] - origin[1], nearest[0] - origin[0]),
          poly = context.rectangle(...middle, best + 1, 1, angle);
        context.publicSpaces.push(poly);
        claimParcel({ polygon: poly, kind: 'public approach' });
      }
  }

  function auditCityBlocks() {
    const map = context.worldTiles,
      missing = [];
    let eligible = 0,
      backed = 0,
      alignmentErrors = 0;
    for (const p of context.cityParcels)
      if (p.kind === 'housing' || p.kind === 'shopfront') {
        const routes = map.routes.filter((r) => r.name === p.street),
          valid = routes.some((r) => {
            const [a, b] = r.points,
              angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
            return Math.abs(Math.sin((p.rotation ?? 0) - angle)) < 1e-6;
          });
        if (!valid) alignmentErrors++;
      }
    for (const r of map.routes)
      if (r.kind === 'road') {
        const [a, b] = r.points,
          length = Math.hypot(...context.sub2(b, a)),
          ux = (b[0] - a[0]) / length,
          uz = (b[1] - a[1]) / length;
        for (let t = 0.5; t < length; t += 0.5)
          for (const side of [-1, 1] satisfies [number, number]) {
            const nx = -uz * side,
              nz = ux * side,
              x = a[0] + ux * t + nx * (r.halfWidth + TILE_CONFIG.curbWidth + 0.15),
              z = a[1] + uz * t + nz * (r.halfWidth + TILE_CONFIG.curbWidth + 0.15),
              ix = Math.floor(x / map.step),
              iz = Math.floor(z / map.step),
              tile = map.tiles[iz * map.size + ix];
            if (
              !tile ||
              (
                ['sea', 'water', 'grass', 'sand'] satisfies [string, string, string, string]
              ).includes(tile.base) ||
              tile.areas.road ||
              tile.areas.path ||
              tile.areas.sidewalk ||
              context.publicSpaces.some((p) => insidePolygon(x, z, p))
            )
              continue;
            const nearby = [
              ...parcelNeighbors(context.rectangle(x + nx * 1.5, z + nz * 1.5, 6, 6)),
            ].filter((p) => p.object || p.place);
            let hit = false,
              junction = false,
              landscape = false;
            for (let d = 0; d <= 3; d += 0.125) {
              const px = x + nx * d,
                pz = z + nz * d;
              if (nearby.some((p) => insidePolygon(px, pz, p.polygon))) {
                hit = true;
                break;
              }
              if (d < 1) {
                const t =
                  map.tiles[Math.floor(pz / map.step) * map.size + Math.floor(px / map.step)];
                if (t && (t.areas.road || t.areas.path)) {
                  junction = true;
                  break;
                }
                if (
                  t &&
                  (
                    ['grass', 'sea', 'water', 'sand'] satisfies [string, string, string, string]
                  ).includes(t.base)
                ) {
                  landscape = true;
                  break;
                }
              }
            }
            if (junction || landscape) continue;
            eligible++;
            if (hit) backed++;
            else missing.push({ street: r.name, x: +x.toFixed(2), z: +z.toFixed(2) });
          }
      }
    return {
      ok: alignmentErrors === 0 && backed / eligible >= 0.9,
      eligible,
      backed,
      coverage: +((100 * backed) / eligible).toFixed(1),
      alignmentErrors,
      missing,
    };
  }

  function balancedCurbDepth(r: import('../types/tiles.ts').WorldRoute, t: number, side: number) {
    const [a, b] = r.points,
      length = Math.hypot(...context.sub2(b, a)),
      ux = (b[0] - a[0]) / length,
      uz = (b[1] - a[1]) / length,
      nx = -uz * side,
      nz = ux * side,
      px = a[0] + ux * t,
      pz = a[1] + uz * t;
    let depth = 3.25;
    for (const other of context.worldTiles.routes)
      if (other !== r && other.kind === 'road') {
        const [c, d] = other.points,
          len = Math.hypot(...context.sub2(d, c)),
          vx = (d[0] - c[0]) / len,
          vz = (d[1] - c[1]) / len;
        if (Math.abs(ux * vz - uz * vx) > 1e-5) continue;
        const along = (px - c[0]) * vx + (pz - c[1]) * vz,
          gap = (c[0] - px) * nx + (c[1] - pz) * nz;
        if (along < -0.1 || along > len + 0.1 || gap < 1) continue;
        depth = Math.min(
          depth,
          (gap - r.halfWidth - other.halfWidth - 2 * TILE_CONFIG.curbWidth - 0.16) / 2,
        );
      }
    return Math.max(1.5, Math.floor(depth * 4) / 4);
  }

  function populateCity() {
    // Fill urban curbs in street order; Great Highway keeps an open
    // beachfront instead of a continuous row of houses.
    const rows = [];
    for (const r of context.worldTiles.routes)
      if (r.kind === 'road') {
        if (r.name === 'Great Highway') continue;
        const [a, b] = r.points,
          dx = b[0] - a[0],
          dz = b[1] - a[1],
          length = Math.hypot(dx, dz),
          ux = dx / length,
          uz = dz / length;
        for (const side of [-1, 1] satisfies [number, number]) {
          const nx = -uz * side,
            nz = ux * side;
          const angle = Math.atan2(nx, -nz),
            curb = r.halfWidth + TILE_CONFIG.curbWidth + 0.08;
          let row = null,
            t = 0;
          while (t < length - 1) {
            let found = null;
            const preferred = balancedCurbDepth(r, t + 0.75, side);
            for (const width of [1.5, 1.25] satisfies [number, number]) {
              for (const depth of [
                ...new Set([preferred, Math.max(1.5, preferred - 0.5), 1.5] satisfies [
                  number,
                  number,
                  number,
                ]),
              ]) {
                if (t + width > length) continue;
                const cx = a[0] + ux * (t + width / 2) + nx * (curb + depth / 2),
                  cz = a[1] + uz * (t + width / 2) + nz * (curb + depth / 2),
                  poly = context.rectangle(cx, cz, width, depth, angle);
                if (parcelFits(poly)) {
                  found = { cx, cz, width, depth, poly };
                  break;
                }
              }
              if (found) break;
            }
            if (!found) {
              row = null;
              t += 0.25;
              continue;
            }
            const parcel = claimParcel({
              polygon: found.poly,
              kind: 'housing',
              street: r.name,
              rotation: angle,
            });
            if (row && Math.abs(row.end - t) < 1e-5 && row.depth === found.depth) {
              row.end = t + found.width;
              row.parcels.push(parcel);
            } else {
              row = {
                a,
                ux,
                uz,
                nx,
                nz,
                angle,
                curb,
                start: t,
                end: t + found.width,
                depth: found.depth,
                parcels: [parcel],
              };
              rows.push(row);
            }
            t += found.width;
          }
        }
      }
    for (const r of rows) {
      const width = r.end - r.start,
        cx = r.a[0] + r.ux * (r.start + width / 2) + r.nx * (r.curb + r.depth / 2),
        cz = r.a[1] + r.uz * (r.start + width / 2) + r.nz * (r.curb + r.depth / 2),
        o = context.makeTownhomeRow(
          cx - width / 2,
          cz - r.depth / 2,
          width,
          r.depth,
          2,
          rand(Math.round(cx), Math.round(cz), 8),
          r.angle,
        );
      for (const p of r.parcels) p.object = o;
    }
    // Close the short frontage gaps with shallow, single-story premises.
    for (const r of context.worldTiles.routes)
      if (r.kind === 'road') {
        if (r.name === 'Great Highway') continue;
        const [a, b] = r.points,
          length = Math.hypot(...context.sub2(b, a)),
          ux = (b[0] - a[0]) / length,
          uz = (b[1] - a[1]) / length;
        for (const side of [-1, 1] satisfies [number, number]) {
          const nx = -uz * side,
            nz = ux * side;
          const angle = Math.atan2(nx, -nz),
            curb = r.halfWidth + TILE_CONFIG.curbWidth + 0.08;
          for (let t = 0; t < length - 0.7;) {
            let found = false;
            for (const width of [1.25, 1, 0.75, 0.5] satisfies [number, number, number, number]) {
              for (const depth of [1.5, 1.25, 1, 0.75] satisfies [number, number, number, number]) {
                if (width * depth < 0.375 || t + width > length) continue;
                const cx = a[0] + ux * (t + width / 2) + nx * (curb + depth / 2),
                  cz = a[1] + uz * (t + width / 2) + nz * (curb + depth / 2),
                  poly = context.rectangle(cx, cz, width, depth, angle);
                if (!parcelFits(poly)) continue;
                const o = context.makeCurbShop(cx, cz, width, depth, angle, rand(cx, cz, 10));
                Object.assign(o, { street: r.name });
                claimParcel({
                  polygon: poly,
                  kind: 'shopfront',
                  street: r.name,
                  rotation: angle,
                  object: o,
                });
                t += width;
                found = true;
                break;
              }
              if (found) break;
            }
            if (!found) t += 0.25;
          }
        }
      }
    protectLandmarkApproaches();
    // The narrow strip along the park's southern edge is a grove, never a
    // row of undersized houses. Small trunk footprints keep the path clear.
    for (
      let x = context.parkSouthEdge.west + 0.8, i = 0;
      x < context.parkSouthEdge.east - 0.5;
      x += 1.65, i++
    ) {
      const z = context.parkSouthEdge.north + 0.25 + rand(x, 51, 12) * 0.12;
      if (!parcelFits(context.rectangle(x, z, 0.2, 0.2), { park: true })) continue;
      const o = context.tree(x - 0.5, z - 0.5, i % 3 === 0 ? 3 : true, true);
      if (!o) continue;
      o.district = 'park-edge-trees';
      o.street = 'Lincoln Way';
    }
    let count = 0;
    for (let z = context.mapTile(8); z < context.mapTile(62); z += 2)
      for (let x = context.mapTile(10); x < context.mapTile(55); x += 2) {
        if (
          count >= Math.round(105 * context.LAYOUT_SCALE ** 2) ||
          !canPlaceScenery(x, z) ||
          !context.greenArea(x + 0.5, z + 0.5) ||
          context.roadDistance[z * context.N + x] < 0.85 ||
          rand(x, z, 9) < 0.23 ||
          context.pondValue(x + 0.5, z + 0.5) < 1.7 ||
          context.mercedValue(x + 0.5, z + 0.5) < 1.5 ||
          context.palaceWater(x + 0.5, z + 0.5) < 1.5
        )
          continue;
        context.tree(
          x,
          z,
          x < context.mapTile(30) && z < context.mapTile(22)
            ? count++ % 3 !== 0
            : count++ % 4 === 0
              ? 3
              : false,
        );
      }
    for (const x of [11, 14, 17, 23, 26, 29] satisfies [
      number,
      number,
      number,
      number,
      number,
      number,
    ])
      for (const z of [29, 34] satisfies [number, number])
        if (
          context.mapCanPlace(x, z) &&
          context.pondValue(context.mapTile(x) + 0.5, context.mapTile(z) + 0.5) > 1.5
        )
          context.mapTree(x, z, x % 3 === 0);
    context.addPanhandleDetails();
    for (const [x, z] of [
      [21, 12] satisfies [number, number],
      [21, 16] satisfies [number, number],
      [29, 18] satisfies [number, number],
      [30, 13] satisfies [number, number],
    ])
      if (context.mapCanPlace(x, z)) context.mapTree(x, z, 3);
    for (const z of [20, 21] satisfies [number, number])
      if (
        context.isWalkable(context.mapTile(50), context.mapTile(z)) &&
        !pavingInArea(context.mapTile(50), context.mapTile(z))
      )
        context.mapTree(50, z, true);
    for (const [x, z] of [
      [17, 32] satisfies [number, number],
      [27, 33] satisfies [number, number],
      [35, 28] satisfies [number, number],
      [41, 30] satisfies [number, number],
      [25, 15] satisfies [number, number],
    ])
      if (context.mapCanPlace(x, z)) context.bench(context.mapTile(x), context.mapTile(z));
  }

  function surfaceTypeAt(x: number, z: number) {
    if (context.countryside?.contains(x, z)) return 'grass';
    if (context.marinLand?.onLand(x, z))
      return context.marinLand.contains(x, z) ? 'grass' : 'building';
    const m = context.worldTiles,
      ix = Math.floor(x / m.step),
      iz = Math.floor(z / m.step);
    if (ix < 0 || iz < 0 || ix >= m.size || iz >= m.size) return 'sea';
    const tile = m.tiles[iz * m.size + ix];
    if (!tile.patches) return tile.type;
    return (
      tile.patches.find((p) => insidePolygon(x / m.step - ix, z / m.step - iz, p.polygon))?.type ||
      tile.base
    );
  }

  function placeStreetLights() {
    const parkPaths = new Set([
      'JFK Promenade',
      'Martin Luther King Jr Drive',
      'Main Post walk',
      'Crissy Field promenade',
      'Lovers Lane',
    ] satisfies [string, string, string, string, string]);
    const roads = context.worldTiles.routes.filter(
      (r) => r.kind === 'road' || parkPaths.has(r.name),
    );
    const avoid = [
      ...[...planningPlaces(), ...context.sights]
        .filter((s) => s.entry)
        .map((s) => ({
          x: requiredValue(s.entry, 'light approach').x + 0.5,
          z: requiredValue(s.entry, 'light approach').y + 0.5,
          clearance: s.id === 'links' ? 1.35 : 0.8,
        })),
      ...houseDoorPositions(context.objects),
    ];
    const surface = (x: number, z: number) => {
      const type = surfaceTypeAt(x, z);
      return (['grass', 'plaza', 'courtyard'] satisfies [string, string, string]).includes(type) &&
        !context.navFree(x, z)
        ? 'building'
        : type;
    };
    context.cityLightPlan = planBlockStreetLights({
      roads,
      surfaceType: surface,
      avoid,
      minZ: 0,
      maxZ: 78,
      maxSpacing: 6,
    });
    for (const p of context.cityLightPlan.lamps) {
      const object = context.addScenery(
        null,
        p.x - 0.12,
        p.z - 0.12,
        0.24,
        0.24,
        2.9,
        (mesh, h) =>
          context.streetLights.push(...drawStreetLamp(mesh, p.x, h + 0.065, p.z, p.angle, p.style)),
        true,
      );
      object.lamp = p;
      object.preserveGround = true;
    }
  }

  function setupTransit({
    draw = true,
    preparedRoute = null,
  }: { draw?: boolean; preparedRoute?: import('../types/traffic.ts').BusRoute | null } = {}) {
    const route = preparedRoute || planNightlifeBus(context.streetTraffic),
      nodeIds = new Set(route.points.map((p) => p.node).filter((id) => id !== null));
    const roadWidths = new Map(
      [...context.worldTiles.routes, ...SOUTHERN_ROADS].map((r) => [
        r.name,
        ('halfWidth' in r ? r.halfWidth : undefined) ?? 0.5,
      ]),
    );
    const avoid = [
      ...context.objects.filter((o) => o.lamp).map((o) => o.lamp!),
      ...context.southernNeighborhood.lamps,
      ...houseDoorPositions(context.objects),
      ...[...planningPlaces(), ...context.sights]
        .filter((s) => s.entry)
        .map((s) => ({ x: s.entry!.x + 0.5, z: s.entry!.y + 0.5 })),
    ];
    const signals = createTrafficSignals({
      ...context.streetTraffic,
      nodeIds,
      roadWidths,
      avoid,
      canPlace: (x: number, z: number) =>
        context.landClearAt(x - 0.5, z - 0.5) &&
        (
          ['sidewalk', 'grass', 'plaza', 'courtyard', 'path'] satisfies [
            string,
            string,
            string,
            string,
            string,
          ]
        ).includes(z >= context.N ? airportSurfaceTypeAt(x, z) : surfaceTypeAt(x, z)),
    });
    if (signals.missing.length)
      throw new Error(
        'Bus-route junctions need visible traffic lights: ' + signals.missing.join(', '),
      );
    for (const fixture of signals.fixtures)
      Object.assign(fixture, {
        base: characterGround(fixture.x, fixture.z) + (fixture.overhead ? 0.8 : 0),
      });
    if (draw) drawTrafficSignalPosts(context.sceneMesh, signals, characterGround);
    context.streetTraffic.setSignals(signals);
    context.slowBus = createSlowBus({
      network: context.streetTraffic,
      signals,
      route,
      walkingSpeed: context.WALK_SPEED,
      ground: characterGround,
    });
  }

  function canPlaceScenery(x: number, z: number, w = 1, d = 1) {
    if (
      context.worldTiles &&
      context.cityParcels.length &&
      !parcelFits(context.rectangle(x + w / 2, z + d / 2, w, d), { park: true })
    )
      return false;
    if (pavingInArea(x, z, w, d)) return false;
    for (let yy = z; yy < z + d; yy++)
      for (let xx = x; xx < x + w; xx++)
        if (!context.isWalkable(xx, yy) || context.reserved[yy * context.N + xx]) return false;
    return true;
  }

  function snapshotStaticWorld(): StaticWorldSnapshot {
    return {
      searchSites: context.searchSites,
      objects: context.objects,
      places: planningPlaces(),
      sights: context.sights,
      instituteRooms: context.instituteRooms,
      buildingModels: context.buildingModels,
      streetLights: context.streetLights,
      streets: context.streets,
      lakes: context.lakes,
      heights: context.heights.map((row) => Float64Array.from(row)),
      naturalHeights: context.naturalHeights.map((row) => Float64Array.from(row)),
      occupied: context.occupied,
      landMask: context.landMask,
      reserved: context.reserved,
      roadIndex: context.roadIndex,
      roadDistance: context.roadDistance,
      worldTiles: {
        size: context.worldTiles.size,
        step: context.worldTiles.step,
        routes: context.worldTiles.routes,
        validation: context.worldTiles.validation,
        packedTiles: packWorldTiles(context.worldTiles.tiles),
      },
      cityNavigation: context.cityNavigation,
      terrainPads: context.terrainPads,
      sceneMesh: context.sceneMesh,
      groundMesh: context.groundMesh,
      highwayMesh: context.highwayMesh,
      tahoeMesh: context.tahoeMesh,
      seaBounds: context.seaBounds,
      cityLightPlan: context.cityLightPlan,
      southernNeighborhood: context.southernNeighborhood,
      southernTerrain: context.southernTerrain.snapshot(),
      restaurantDiners: context.restaurantDiners,
      restaurantSites: context.restaurantSites,
      merchants: context.merchants,
      parrots: context.parrots,
      jailStaff: context.jailStaff,
      airportAds: context.airportAds,
      airportFieldAds: context.airportFieldAds,
      beachBillboard: context.beachBillboard,
      sunglassesSite: context.sunglassesSite,
      fishingSite: context.fishingSite,
      sandSite: context.sandSite,
      pacificaSurfSite: context.pacificaSurfSite,
      zooBase: context.zooBase,
      nightclub: context.nightclub,
      niaCitizen: context.niaCitizen,
      highwaySites: context.highwaySites,
      traffic: {
        nodes: context.streetTraffic.nodes,
        edges: context.streetTraffic.edges,
        components: context.streetTraffic.components,
        cars: context.streetTraffic.cars,
        route: context.slowBus.route,
      },
      lives: {
        city: context.cityLife.people,
        south: context.southernLife.people,
        noe: context.noeValleyLife.people,
        square: context.squareLife.people,
        berkeley: context.esotericCampus.life!.people,
      },
      minimapRoadPaths: compileMinimapRoads(
        context.worldTiles,
        airportRoadTiles(),
        context.mapArtPoint,
      ),
      regionalGraphs: {
        airship: context.airship.groundNavigation.graph,
        marin: context.marinLand.graph,
        berkeley: context.esotericCampus.graph,
      },
      airshipGate: context.airship.gate,
      cityGate: context.regionalRoad.gate('city'),
      harbor: { x: context.expeditions.ship.home!.x, z: context.expeditions.ship.home!.z },
      spawn: { x: context.player.x, y: context.player.y },
      bike: { x: context.bike.x, y: context.bike.y },
      pequodSite: context.pequodSite,
      ahabNPC: context.ahabNPC,
      airshipObstacles: navigationObstacles(
        context.objects
          .filter(hasPhysicalBounds)
          .filter(
            (o) =>
              o.y + o.d >= context.N - 2.625 &&
              o.arch !== 'terminal' &&
              !(
                [
                  'times-square',
                  'research-institute',
                  'park',
                  'nightlife',
                  'gym',
                  'spaceport',
                ] satisfies [string, string, string, string, string, string]
              ).includes(o.sight?.kind || ''),
          ),
      ).map((o) => o.polygon),
    };
  }

  function build() {
    for (const _step of buildSteps()) {
    }
  }

  function hydrateStaticWorld(input: unknown) {
    if (
      !isRecord(input) ||
      !Array.isArray(input.objects) ||
      !Array.isArray(input.sights) ||
      !isRecord(input.worldTiles)
    )
      throw new Error('Invalid compiled world metadata');
    // The graph codec preserves the types and references written by snapshotStaticWorld.
    const data = input as unknown as StaticWorldSnapshot;
    let stamp = performance.now();
    context.worldStream.stats.startup = [];
    const mark = (stage: string) => {
      const now = performance.now();
      context.worldStream.stats.startup.push({ stage, ms: Math.round(now - stamp) });
      stamp = now;
    };
    context.searchSites.length = 0;
    context.searchSites.push(...(data.searchSites || []));
    const replace = <T>(target: T[], source: readonly T[]) => {
      target.length = 0;
      target.push(...source);
    };
    replace(context.objects, data.objects);
    replace(planningPlaces(), data.places);
    replace(context.sights, data.sights);
    replace(context.instituteRooms, data.instituteRooms);
    replace(context.buildingModels, data.buildingModels);
    replace(context.streetLights, data.streetLights);
    replace(context.lakes, data.lakes);
    replace(context.terrainPads, data.terrainPads);
    replace(context.restaurantDiners, data.restaurantDiners);
    replace(context.restaurantSites, data.restaurantSites);
    replace(context.merchants, data.merchants);
    context.loreSites.length = 0;
    context.loreSites.push(...context.sights.filter((s) => s.kind === 'lore-book'));
    data.streets.forEach((r, i) => Object.assign(context.streets[i], r));
    for (const [target, source] of [
      [context.occupied, data.occupied],
      [context.landMask, data.landMask],
      [context.reserved, data.reserved],
      [context.roadIndex, data.roadIndex],
      [context.roadDistance, data.roadDistance],
    ])
      target.set(source);
    context.minimapRoadPaths = data.minimapRoadPaths;
    context.heights = data.heights;
    context.naturalHeights = data.naturalHeights;
    context.worldTiles = {
      ...data.worldTiles,
      tiles: unpackWorldTiles(data.worldTiles.packedTiles),
      waterTiles: createWaterTiles({
        size: data.worldTiles.size,
        step: data.worldTiles.step,
        coast: context.COAST,
        lakes: context.lakes,
      }),
    };
    context.cityNavigation = restoreTileNavigation(data.cityNavigation);
    mark('City data');
    context.sceneMesh = data.sceneMesh;
    context.groundMesh = data.groundMesh;
    context.highwayMesh = data.highwayMesh;
    context.tahoeMesh = data.tahoeMesh;
    context.seaBounds = data.seaBounds;
    context.cityLightPlan = data.cityLightPlan;
    context.southernNeighborhood = data.southernNeighborhood;
    context.airportAds = data.airportAds;
    context.airportFieldAds = data.airportFieldAds;
    context.beachBillboard = data.beachBillboard;
    context.sunglassesSite = data.sunglassesSite;
    context.fishingSite = data.fishingSite;
    context.sandSite = data.sandSite;
    context.pacificaSurfSite = data.pacificaSurfSite;
    context.zooBase = data.zooBase;
    context.nightclub = data.nightclub;
    context.parrots = data.parrots;
    context.jailStaff = data.jailStaff;
    context.highwaySites = data.highwaySites;
    context.pequodSite = data.pequodSite;
    context.ahabNPC = data.ahabNPC;
    Object.assign(context.niaCitizen, data.niaCitizen);
    Object.assign(context.player, data.spawn);
    Object.assign(context.bike, data.bike);
    context.southernTerrain = createSouthernTerrain({
      roads: SOUTHERN_ROADS,
      pit: RAIL_PIT,
      pads: SOUTHERN_LEVEL_PADS,
      prepared: data.southernTerrain,
    });
    context.airship.setGate(data.airshipGate);
    context.airship.setObstacles(data.airshipObstacles);
    if (data.regionalGraphs) context.airship.groundNavigation.restore(data.regionalGraphs.airship!);
    mark('Southern data');
    context.regionalRoad = createRegionalRoad({
      scale: context.MAP_SCALE,
      groundHeight: terrainHeight,
      cityGate: data.cityGate,
    });
    context.ferrari = context.clientController(
      'ferrari',
      createFerrari(
        context.regionalRoad,
        context.savedFerrari,
        (state) => {
          try {
            localStorage.setItem('sf-ferrari-v1', JSON.stringify(state));
          } catch {}
        },
        {
          cityDriving: createFerrariCityRoads({
            road: context.regionalRoad,
            traffic: () => context.streetTraffic,
            ground: characterGround,
          }),
        },
      ),
    );
    context.esotericCampus = createEsotericCampus(context.ferrari, {
      prepared: data.regionalGraphs?.berkeley,
    });
    context.esotericCampus.npc =
      context.merchants.find((n) => n.id === context.esotericCampus.npc.id) ||
      context.esotericCampus.npc;
    context.countryside = createCountryside({
      road: context.regionalRoad,
      campus: context.esotericCampus,
      parcels: context.highwaySites.flatMap((s) => s.solidParcels || []),
    });
    context.goldenGate = createGoldenGateCrossing({
      scale: context.MAP_SCALE,
      cityGate: context.sightById('golden')!.entry,
      groundHeight: terrainHeight,
      marinHeight: context.detention.terrain,
    });
    context.marinLand = createMarinLand({
      polygon: context.MARIN,
      scale: context.MAP_SCALE,
      detention: context.detention,
      gate: context.goldenGate.gate('marin'),
      prepared: data.regionalGraphs?.marin,
    });
    mark('Regional routes');
    context.expeditions.setHarbor(data.harbor);
    context.surf.state.shore = { ...context.sightById('windsurf')!.entry };
    context.chase = context.clientController(
      'police',
      createPoliceChase({
        player: context.player,
        routeTo: (x, y, from = context.player) => context.officerRoute(x, y, from),
        nearest: (x, y, r, p) =>
          context.marinLand?.contains(context.player.x + 0.5, context.player.y + 0.5)
            ? context.marinLand.nearest(x, y, r, p)
            : context.airship.contains(context.player.x + 0.5, context.player.y + 0.5)
              ? context.airship.nearest(x, y, r, p)
              : context.nearestNavigation(x, y, r, p),
        canCapture: (o: { x: number; y: number }, p: { x: number; y: number }) =>
          !context.rocket.state.active &&
          !context.flying() &&
          ((context.surf.water(o.x + 0.5, o.y + 0.5) && context.surf.water(p.x + 0.5, p.y + 0.5)) ||
            context.canTravel(o.x, o.y, p.x, p.y)),
        onArrest: () => context.beginCapture('police', context.arrestPlayer),
      }),
    );
    // These initialize presentation/services, not placed world geometry.
    const removeSights = new Set([
      'painted-bunny',
      'dolores-skate-dog',
      'zoo-motorcycle',
      'monkey-keeper-post',
    ] satisfies [string, string, string, string]);
    for (let i = context.sights.length - 1; i >= 0; i--)
      if (removeSights.has(context.sights[i].id)) context.sights.splice(i, 1);
    setupBunny();
    setupSkateDog();
    setupTigerEncounter();
    setupWilderness();
    setupGuildSites();
    setupGreenBank();
    setupDeli();
    setupMonkeyEscape();
    setupTabletWizard();
    setupYohji();
    mark('Services');
    const uniqueMerchants = new Map(context.merchants.map((n) => [n.id, n]));
    replace(context.merchants, [...uniqueMerchants.values()]);
    const life = (people: import('../life.ts').LifeActor[], waterTraffic = false) =>
      createCityLife({
        routes: [],
        surfaceType: surfaceTypeAt,
        lamps: [],
        terrainHeight,
        groundHeight: characterGround,
        scale: context.MAP_SCALE,
        human: context.human,
        bicycle: context.bicycle,
        visible: context.actorInView,
        waterTraffic,
        preparedPeople: people,
      });
    context.cityLife = life(data.lives.city, true);
    context.southernLife = life(data.lives.south);
    context.noeValleyLife = life(data.lives.noe);
    context.squareLife = life(data.lives.square);
    context.esotericCampus.life = life(data.lives.berkeley);
    context.streetTraffic = createStreetTraffic({
      routes: [],
      isRoad: (x: number, z: number) =>
        (z >= context.N ? airportSurfaceTypeAt(x, z) : surfaceTypeAt(x, z)) === 'road' &&
        context.landClearAt(x - 0.5, z - 0.5),
      ground: characterGround,
      prepared: data.traffic,
    });
    setupTransit({ draw: false, preparedRoute: data.traffic.route });
    mark('NPCs and traffic');
    Object.defineProperty(context.sightById('bicycle'), 'entry', {
      configurable: true,
      get: () => ({ x: Math.round(context.bike.x), y: Math.round(context.bike.y) }),
    });
    Object.defineProperty(context.sightById('ferrari-car'), 'entry', {
      configurable: true,
      get: () => ({ x: context.ferrari.position.x - 0.5, y: context.ferrari.position.z - 0.5 }),
    });
    Object.defineProperty(context.beachBillboard.sight, 'description', {
      configurable: true,
      get: () =>
        context.playerLook.sunglasses
          ? 'The billboard reads OBEY. The promise of relaxation has become a rather direct instruction.'
          : 'A Local Minimum AI advertisement promises a little gradient descent by the sea. Even the beach has a pitch deck.',
    });
    context.sceneGPU = context.upload(context.sceneMesh);
    context.groundGPU = context.upload(context.groundMesh);
    context.highwayGPU = context.upload(context.highwayMesh);
    context.tahoeGPU = context.upload(context.tahoeMesh);
    for (const object of context.buildingModels) object.gpu = context.upload(object.mesh);
    context.lampGlow.setLights(context.streetLights, terrainHeight);
    context.buildCityMap();
    context.prepareWayfinding();
    mark('Minimap and lights');
    return data;
  }

  async function buildForBrowser() {
    await refreshContent().catch((error) => console.warn('Content refresh:', error));
    subscribeContent(() => applyWorldEdits(context));
    const contentTimer = setInterval(
      () => refreshContent().catch((error) => console.warn('Content refresh:', error)),
      3000,
    );
    window.addEventListener('pagehide', () => clearInterval(contentTimer), { once: true });
    await context.loading?.stage(8, 'Preparing graphics…');
    context.initGPU();
    const memoryLimitBytes = sceneryMemoryLimit({
      deviceMemory: 'deviceMemory' in navigator ? navigator.deviceMemory : undefined,
      coarsePointer: matchMedia('(pointer: coarse)').matches,
      override: new URL(location.href).searchParams.get('mapMemoryMB'),
    });
    context.worldStream = await createWorldStream({
      gl: context.gl,
      memoryLimitBytes,
      warmAll: RENDERING.preloadDesktopScenery && memoryLimitBytes === 0,
      onChange: (chunk) => {
        if (!chunk || batchInFrustum(chunk, context.shadowMatrix)) context.shadowRoom = undefined;
        context.pickedCache = null;
        context.gpuStats.triangles = context.worldStream.stats.triangles;
      },
    });
    await context.loading?.stage(18, 'Loading streets and destinations…');
    const data = await context.worldStream.metadata();
    await context.loading?.stage(40, 'Restoring your neighborhood…');
    const staticData = hydrateStaticWorld(data);
    applyWorldEdits(context);
    const position = context.multiplayer.state.position || {
      x: staticData.spawn.x + 0.5,
      z: staticData.spawn.y + 0.5,
    };
    Object.assign(context.player, { x: position.x - 0.5, y: position.z - 0.5 });
    context.resize();
    await context.loading?.stage(55, 'Loading the visible map…');
    if (context.multiplayer.state.instance?.kind === 'world')
      await context.worldStream.ensure(
        position.x,
        position.z,
        Math.max(18, 30 / context.zoom),
        (done: number, total: number) =>
          context.loading?.report(
            55 + (35 * done) / total,
            'Loading the visible map · ' + done + '/' + total,
          ),
        context.camera.matrix,
      );
    context.worldStream.start();
    while (
      !context.materialState.ready ||
      !context.alpineState.ready ||
      context.signTextureControls.pending
    ) {
      if (context.materialState.error || context.alpineState.error)
        throw Error(String(context.materialState.error || context.alpineState.error));
      await nextLoadingPaint();
    }
    context.built = true;
    context.setupWorldMultiplayer();
    context.updateCamera();
    context.drawMini();
    context.updateBikeButton();
    context.updateSurfButton();
    context.updateAirshipButton();
    context.updateTahoeButton();
    if (
      context.multiplayer.state.instance &&
      context.multiplayer.state.position &&
      context.multiplayer.state.instance.kind !== 'world'
    ) {
      context.worldStream.update(position.x, position.z, 0, false);
      context.secretWorld.accept({
        type: 'instance',
        instance: context.multiplayer.state.instance,
        position: context.multiplayer.state.position,
        bomber: context.multiplayer.state.bomber,
      });
    }
  }

  function* buildSteps() {
    yield [8, 'Preparing graphics…'] satisfies [number, string];
    if (context.headless) {
      const layout = signAtlasLayout(signNames(), [...BILLBOARD_ART, ...RESEARCH_ART]);
      for (const [name, uv] of layout.signs) context.signs.set(name, uv);
    } else context.initGPU();
    yield [16, 'Building the hills and shoreline…'] satisfies [number, string];
    initializeGeography();
    buildHeightField();
    context.sceneMesh = new Mesh();
    yield [25, 'Laying out neighborhoods…'] satisfies [number, string];
    compileStreetTiles();
    setupZoo();
    setupCityFitness();
    setupJurassicCampus();
    setupIndustrialCenter();
    setupCityNightlife();
    context.makeLandmarks();
    context.enhanceLandmarks();
    fitLandmarksToBlocks();
    const grove = context.rectangle(
      (COIT_GROVE.west + COIT_GROVE.east) / 2,
      (COIT_GROVE.north + COIT_GROVE.south) / 2,
      COIT_GROVE.east - COIT_GROVE.west,
      COIT_GROVE.south - COIT_GROVE.north,
    );
    claimParcel({ polygon: grove, kind: 'parrot grove' });
    context.publicSpaces.push(grove);
    reserveBridgeApproach();
    planRestaurants();
    planContentBuildings();
    yield [36, 'Building homes and streets…'] satisfies [number, string];
    positionBani();
    planBeachBillboard();
    protectLandmarkApproaches();
    planAirportAds();
    const adGarden = AIRPORT_AD_GARDEN;
    const adGround = context.rectangle(
      (adGarden.west + adGarden.east) / 2,
      (adGarden.north + adGarden.south) / 2,
      adGarden.east - adGarden.west,
      adGarden.south - adGarden.north,
    );
    claimParcel({ polygon: adGround, kind: 'airport advertising garden' });
    context.publicSpaces.push(adGround);
    populateCity();
    context.buildNavigation();
    setupBunny();
    setupSkateDog();
    finalizeSurfaceTiles();
    setupSunglasses();
    setupOceanSand();
    setupFishing();
    setupParrots();
    yield [53, 'Connecting the peninsula and Marin…'] satisfies [number, string];
    context.southernTerrain = createSouthernTerrain({
      roads: SOUTHERN_ROADS,
      pit: RAIL_PIT,
      pads: SOUTHERN_LEVEL_PADS,
      edgeHeight: (x: number) => {
        const ix = Math.min(
            context.TERRAIN_GRID - 1,
            Math.max(0, Math.floor(x * context.TERRAIN_RES)),
          ),
          u = x * context.TERRAIN_RES - ix;
        return (
          context.heights[context.TERRAIN_GRID][ix] * (1 - u) +
          context.heights[context.TERRAIN_GRID][ix + 1] * u
        );
      },
    });
    context.surf.state.shore = { ...context.sightById('windsurf')!.entry };
    context.chase = context.clientController(
      'police',
      createPoliceChase({
        player: context.player,
        routeTo: (x, y, from = context.player) => context.officerRoute(x, y, from),
        nearest: (x, y, r, p) =>
          context.marinLand?.contains(context.player.x + 0.5, context.player.y + 0.5)
            ? context.marinLand.nearest(x, y, r, p)
            : context.airship.contains(context.player.x + 0.5, context.player.y + 0.5)
              ? context.airship.nearest(x, y, r, p)
              : context.nearestNavigation(x, y, r, p),
        canCapture: (o: { x: number; y: number }, p: { x: number; y: number }) =>
          !context.rocket.state.active &&
          !context.flying() &&
          ((context.surf.water(o.x + 0.5, o.y + 0.5) && context.surf.water(p.x + 0.5, p.y + 0.5)) ||
            context.canTravel(o.x, o.y, p.x, p.y)),
        onArrest: () => context.beginCapture('police', context.arrestPlayer),
      }),
    );
    yield [61, 'Placing landmarks and adventures…'] satisfies [number, string];
    setupAirshipTerminal();
    setupMerchants();
    setupRegionalWorld();
    drawWildernessSigns();
    setupWilderness();
    setupGuildSites();
    setupGreenBank();
    setupPacificaSurf();
    setupDeli();
    setupQuestCharacters();
    setupExpeditionSites();
    context.airship.setObstacles(
      navigationObstacles(
        context.objects
          .filter(hasPhysicalBounds)
          .filter(
            (o) =>
              o.y + o.d >= context.N - 2.625 &&
              o.arch !== 'terminal' &&
              !(
                [
                  'times-square',
                  'research-institute',
                  'park',
                  'nightlife',
                  'gym',
                  'spaceport',
                ] satisfies [string, string, string, string, string, string]
              ).includes(o.sight?.kind || ''),
          ),
      ).map((o) => o.polygon),
    );
    setupTigerEncounter();
    setupMonkeyEscape();
    setupServiceNPCs();
    setupTabletWizard();
    setupYohji();
    drawDetentionFacility(context.sceneMesh, context.detention);
    context.jailStaff = detentionStaff(context.detention);
    yield [72, 'Texturing the terrain…'] satisfies [number, string];
    if (!context.headless || context.bake) makeTerrain();
    yield [82, 'Bringing the city to life…'] satisfies [number, string];
    placeStreetLights();
    context.finalizeSceneryNavigation();
    setupNPCRoaming();
    const regionalRoutes = [
      ...clipLifeRoutes(
        context.worldTiles.routes.filter((r) => r.kind === 'road'),
        78,
        context.N,
      ),
      ...clipLifeRoutes(
        [
          ...SOUTHERN_ROADS.map((r) => ({ ...r, kind: 'road', halfWidth: 0.5 })),
          ...SOUTHERN_TRAILS.map((r) => ({ ...r, kind: 'path' })),
        ],
        context.N,
      ),
    ];
    context.southernLife = createCityLife({
      ...context.pedestrianNavigation,
      visible: context.actorInView,
      routes: regionalRoutes,
      surfaceType: (x: number, z: number) =>
        context.landClearAt(x - 0.5, z - 0.5)
          ? z >= context.N
            ? airportSurfaceTypeAt(x, z)
            : surfaceTypeAt(x, z)
          : 'grass',
      lamps: context.southernNeighborhood.lamps,
      terrainHeight,
      groundHeight: characterGround,
      scale: context.MAP_SCALE,
      human: context.human,
      bicycle: context.bicycle,
      maxWalkers: 114,
      maxRiders: 8,
      walkerQuotas: [
        { count: 20, contains: (x: number, z: number) => z < 96 },
        { count: 22, contains: (x: number, z: number) => z >= 96 && z < 120 },
        { count: 22, contains: (x: number, z: number) => z >= 120 && z < 145 },
        { count: 24, contains: (x: number, z: number) => z >= 145 && z < 180 },
        { count: 14, contains: (x: number, z: number) => z >= 180 && z < 216 },
        { count: 8, contains: (x: number, z: number) => z >= 216 },
      ],
      waterTraffic: false,
      prefix: 'southern-citizen',
      regional: (p) => p.points[Math.floor(p.points.length / 2)][1] >= context.N - 2.5,
    });
    context.southernLife.update(0);
    const noe = NOE_VALLEY_BOUNDS,
      noeRoutes = clipLifeRoutes(context.worldTiles.routes, noe.north, noe.south).filter((r) =>
        r.points.every((p) => p[0] >= noe.west && p[0] <= noe.east),
      );
    context.noeValleyLife = createCityLife({
      ...context.pedestrianNavigation,
      visible: context.actorInView,
      routes: noeRoutes,
      surfaceType: surfaceTypeAt,
      walkable: (x: number, z: number) => context.landClearAt(x - 0.5, z - 0.5),
      lamps: context.objects.filter((o) => o.lamp).map((o) => o.lamp!),
      terrainHeight,
      groundHeight: characterGround,
      scale: context.MAP_SCALE,
      human: context.human,
      bicycle: context.bicycle,
      maxWalkers: 3,
      maxRiders: 0,
      waterTraffic: false,
      prefix: 'noe-parent',
      strollers: true,
    });
    context.noeValleyLife.update(0);

    context.squareLife = createCityLife({
      ...context.pedestrianNavigation,
      visible: context.actorInView,
      routes: [
        {
          name: contentText('world.generation.buildSteps.name-103', {}),
          kind: 'path',
          halfWidth: 0,
          points: [
            [60.4, 153.1] satisfies [number, number],
            [65.6, 153.1] satisfies [number, number],
          ],
        },
        {
          name: contentText('world.generation.buildSteps.name-104', {}),
          kind: 'path',
          halfWidth: 0,
          points: [
            [60.4, 155.6] satisfies [number, number],
            [65.6, 155.6] satisfies [number, number],
          ],
        },
        {
          name: contentText('world.generation.buildSteps.name-105', {}),
          kind: 'path',
          halfWidth: 0,
          points: [
            [60.5, 151.7] satisfies [number, number],
            [60.5, 155.7] satisfies [number, number],
          ],
        },
      ],
      surfaceType: (x: number, z: number) => (timesSquareWalkable(x, z) ? 'sidewalk' : 'building'),
      lamps: [],
      terrainHeight: () => TIMES_SQUARE.base + 0.01,
      groundHeight: characterGround,
      scale: context.MAP_SCALE,
      human: context.human,
      bicycle: context.bicycle,
      maxWalkers: 6,
      maxRiders: 0,
      waterTraffic: false,
      prefix: 'square-citizen',
      regional: true,
    });
    context.squareLife.update(0);

    context.streetTraffic = createStreetTraffic({
      routes: [
        ...context.worldTiles.routes,
        ...SOUTHERN_ROADS.map((r) => ({ ...r, points: r.points.map((p) => [...p]), kind: 'road' })),
      ],
      isRoad: (x: number, z: number) =>
        (z >= context.N ? airportSurfaceTypeAt(x, z) : surfaceTypeAt(x, z)) === 'road' &&
        context.landClearAt(x - 0.5, z - 0.5),
      ground: characterGround,
      robotaxiCount: 3,
      spawnPoints: [
        { x: 65, z: 27 },
        { x: 21.4, z: 58 },
        { x: 63, z: 70 },
        { x: 56.5, z: 140 },
        { x: 63, z: 42 },
        { x: 74.6, z: 101 },
        { x: 49.5, z: 150 },
      ],
    });
    setupTransit();
    context.cityLife = createCityLife({
      ...context.pedestrianNavigation,
      visible: context.actorInView,
      routes: clipLifeRoutes(context.worldTiles.routes, -Infinity, 78),
      surfaceType: surfaceTypeAt,
      lamps: context.objects.filter((o) => o.lamp).map((o) => o.lamp!),
      terrainHeight,
      groundHeight: characterGround,
      scale: context.MAP_SCALE,
      human: context.human,
      bicycle: context.bicycle,
    });
    context.cityLife.update(0);
    applyWorldEdits(context);
    if (context.headless && !context.bake) {
      // Placement is finished. The model keeps bounds and footprints;
      // navigation tests do not need to retain millions of vertex values.
      const retained = context.retainInteriors
        ? new Set(context.buildingModels.map((o) => o.mesh))
        : new Set();
      for (const mesh of new Set([
        context.sceneMesh,
        context.tahoeMesh,
        context.highwayMesh,
        ...context.objects.map((o) => o.mesh),
        ...context.buildingModels.map((o) => o.mesh),
      ]))
        if (mesh && !retained.has(mesh)) mesh.data = [];
      context.built = true;
      return;
    }
    if (context.headless) {
      context.built = true;
      return;
    }
    yield [91, 'Uploading the city to your graphics card…'] satisfies [number, string];
    context.sceneGPU = context.upload(context.sceneMesh, { spatial: true });
    context.lampGlow.setLights(context.streetLights, terrainHeight);
    context.gpuStats.triangles += context.lampGlow.stats.triangles;
    context.buildCityMap();
    context.prepareWayfinding();
    yield [97, 'Finishing textures and the minimap…'] satisfies [number, string];
    context.built = true;
    context.setupWorldMultiplayer();
    context.updateCamera();
    context.drawMini();
    context.updateBikeButton();
    context.updateSurfButton();
    context.updateAirshipButton();
    context.updateTahoeButton();
  }

  function positionBani() {
    const body = requiredValue(context.sightById('nia'), 'Missing authored entity: nia').object;
    if (!body?.character) throw new Error('Bani must have a seat inside Mazarine Coffee');
    Object.assign(context.niaCitizen, body.character, { interior: body.interior });
  }
  return {
    insidePolygon,
    alongStreet,
    occupy,
    pavingInArea,
    signNames,
    terrainHeight,
    airportWalkingHeight,
    characterGround,
    playerGround,
    naturalHeight,
    cutHousePlot,
    parcelFits,
    buildingPoint,
    surfaceTypeAt,
    canPlaceScenery,
    snapshotStaticWorld,
    build,
    buildForBrowser,
  };
}
