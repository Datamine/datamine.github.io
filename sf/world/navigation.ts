import { hasPhysicalBounds, requiredPhysicalObject } from '../picking.ts';
import { isFiniteNumber } from '../types/json.ts';
import type { Actor } from '../types/world.ts';
import type { Point } from '../types/geometry.ts';
import type { WorldContext } from './scene.ts';
import { combatLineClear, combatApproach } from '../combat-navigation.ts';
import { ITEM_STATS } from '../item-stats.ts';
import { buildTileNavigation, navigationObstacles } from '../navigation.ts';
import { nearestMinimapPoint } from '../minimap-navigation.ts';
import { STARTUP_HQ } from '../airship.ts';
import { SAND_HILL_CAPITAL } from '../southern-layout.ts';
import { insideInstitute } from '../institute-interiors.ts';
import { TAHOE_COMBAT_TRUNKS, nearTahoe } from '../tahoe.ts';
import { insideGuild } from '../guild.ts';
import { CAVE_NAVIGATION } from '../map-instances.ts';

/** Navigation services for the browser scene.
 * Dependencies are explicit live scene bindings, preserving initialization
 * order without globals. This module only reads bindings when a method runs. */
export function createNavigation(context: WorldContext) {
  function isWalkable(x: unknown, y: unknown): boolean {
    if (!isFiniteNumber(x) || !isFiniteNumber(y)) return false;
    return !!(context.cityNavigation
      ? navFree(x + 0.5, y + 0.5)
      : Number.isInteger(x) &&
        Number.isInteger(y) &&
        x >= 0 &&
        y >= 0 &&
        x < context.N &&
        y < context.N &&
        context.landMask[y * context.N + x] &&
        !context.occupied[y * context.N + x]);
  }

  function placeAt(x: number, y: number) {
    return (
      context.places.find((p) => {
        const [u, v] = context.buildingPoint(p, x + 0.5, y + 0.5, true);
        return u > p.x && u < p.x + p.w && v > p.y && v < p.y + p.d;
      }) || null
    );
  }

  function instituteRoomAt(x: number, z: number) {
    return context.instituteRooms.find((room) => insideInstitute(room, x, z)) || null;
  }

  function activeInstituteRoom() {
    if (
      context.capture.state.active ||
      context.chase?.state.jailed ||
      context.rocket.state.active ||
      context.surf.state.riding ||
      context.flying() ||
      context.rope.climbing ||
      context.sutroClimb.state.active ||
      context.tahoe.state.mode !== 'ground' ||
      context.ferrari?.state.riding
    )
      return null;
    return instituteRoomAt(context.player.x + 0.5, context.player.y + 0.5);
  }

  function landClearAt(x: number, y: number): boolean {
    return context.countryside?.contains(x + 0.5, y + 0.5) ||
      context.marinLand?.contains(x + 0.5, y + 0.5) ||
      context.esotericCampus?.contains(x + 0.5, y + 0.5) ||
      context.goldenGate?.contains(x + 0.5, y + 0.5) ||
      context.regionalRoad?.contains(x + 0.5, y + 0.5)
      ? true
      : context.tahoe.contains(x + 0.5, y + 0.5)
        ? context.tahoe.walkable(x + 0.5, y + 0.5)
        : context.airship.contains(x + 0.5, y + 0.5)
          ? true
          : context.cityNavigation
            ? navFree(x + 0.5, y + 0.5)
            : isWalkable(Math.floor(x), Math.floor(y));
  }

  function clearAt(x: number, y: number): boolean {
    if (context.secretWorld?.kind === 'illuminati') return CAVE_NAVIGATION.free(x, y);
    return context.chase?.state.jailed
      ? context.detention.walkable(x + 0.5, y + 0.5)
      : landClearAt(x, y);
  }

  function canTravel(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    ignoreCustody = false,
  ): boolean {
    if (context.secretWorld?.kind === 'illuminati')
      return CAVE_NAVIGATION.segment({ x: ax, y: ay }, { x: bx, y: by });
    const endpointFree = ignoreCustody ? landClearAt : clearAt;
    if (!endpointFree(ax, ay) || !endpointFree(bx, by)) return false;
    if (
      context.countryside?.segment({ x: ax, y: ay }, { x: bx, y: by }) ||
      context.marinLand?.segment({ x: ax, y: ay }, { x: bx, y: by })
    )
      return true;
    if (
      context.esotericCampus?.segment({ x: ax, y: ay }, { x: bx, y: by }) ||
      context.goldenGate?.segment({ x: ax, y: ay }, { x: bx, y: by }) ||
      context.regionalRoad?.segment({ x: ax, y: ay }, { x: bx, y: by })
    )
      return true;
    if (context.tahoe.contains(ax + 0.5, ay + 0.5) || context.tahoe.contains(bx + 0.5, by + 0.5))
      return context.tahoe.segment({ x: ax, y: ay }, { x: bx, y: by });
    if (
      (ignoreCustody || !context.chase?.state.jailed) &&
      context.airship.segment({ x: ax, y: ay }, { x: bx, y: by })
    )
      return true;
    return context.cityNavigation?.segment({ x: ax, y: ay }, { x: bx, y: by }) || false;
  }

  function railgunLineClear(
    a: import('../combat-navigation.ts').CombatPoint,
    b: import('../combat-navigation.ts').CombatPoint,
  ): boolean {
    return combatLineClear(
      a,
      b,
      nearTahoe(a.x, a.z) ? [...context.objects, ...TAHOE_COMBAT_TRUNKS] : context.objects,
      context.characterGround,
    );
  }

  function creatureApproach(
    npc: Pick<Actor, 'x' | 'z'> & Partial<Actor>,
    weapon = context.playerWeapon(),
    from: Point = context.player,
  ): Point | null {
    return combatApproach({
      from,
      target: npc,
      range: ITEM_STATS[weapon].range!,
      free: landClearAt,
      ground: context.characterGround,
      lineClear: railgunLineClear,
      pathTo,
      canTravel,
    });
  }

  function merchantApproach(npc: Actor): Point | null {
    const approach = npc.approach;
    if (approach) return { ...approach };
    return npc.kind === 'capital'
      ? { ...SAND_HILL_CAPITAL.entry }
      : npc.kind === 'crew'
        ? { ...context.sightById(npc.siteId!)!.entry }
        : npc.kind === 'founder'
          ? { x: STARTUP_HQ.x - 0.5, y: 130.6 }
          : npc.kind === 'tax'
            ? { x: npc.x - 0.5, y: 131.6 }
            : nearestNavigation(
                npc.x - 0.5,
                npc.z - 0.5,
                2,
                (x: number, y: number) => Math.hypot(x + 0.5 - npc.x, y + 0.5 - npc.z) > 0.7,
              );
  }

  function motorcycleApproach(): Point | null {
    const p = context.motorcycle.state,
      candidates = [];
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8,
        x = p.x + Math.cos(a) * 0.9,
        y = p.y + Math.sin(a) * 0.9;
      if (clearAt(x, y) && canTravel(x, y, p.x, p.y)) candidates.push({ x, y });
    }
    return (
      candidates.sort(
        (a, b) =>
          Math.hypot(a.x - context.player.x, a.y - context.player.y) -
          Math.hypot(b.x - context.player.x, b.y - context.player.y),
      )[0] || { x: p.x, y: p.y }
    );
  }

  function sutroApproach(from: Point = context.player): Point | null {
    const tower = requiredPhysicalObject(
        context.sightById('sutro')!.object,
        'The Sutro tower footprint is missing.',
      ),
      cx = tower.x + tower.w / 2,
      cz = tower.y + tower.d / 2,
      region = navigationRegionAt(from.x, from.y);
    return nearestNavigation(
      cx - 0.5,
      cz - tower.d / 2 - 0.9 - 0.5,
      2,
      (x: number, y: number) =>
        y + 0.5 < cz - tower.d / 2 - 0.25 && navigationRegionAt(x, y) === region && !placeAt(x, y),
    );
  }

  function bunnyApproach(from: Point = context.player): Point | null {
    const b = context.bunny!.state,
      a = Math.atan2(from.y + 0.5 - b.z, from.x + 0.5 - b.x);
    const region = navigationRegionAt(from.x, from.y),
      valid = (x: number, y: number) => {
        const d = Math.hypot(x + 0.5 - b.x, y + 0.5 - b.z);
        return (
          d > 0.6 &&
          d < 0.85 &&
          !placeAt(x, y) &&
          navigationRegionAt(x, y) === region &&
          Math.abs(context.characterGround(x + 0.5, y + 0.5) - context.characterGround(b.x, b.z)) <
            0.22
        );
      };
    return (
      nearestNavigation(b.x + Math.cos(a) * 0.72 - 0.5, b.z + Math.sin(a) * 0.72 - 0.5, 1, valid) ||
      nearestNavigation(b.x - 0.5, b.z - 0.5, 0.9, valid)
    );
  }

  function officerRoute(tx: number, ty: number, from: { x: number; y: number }): Point[] | null {
    return context.surf.pursuitRoute(
      from,
      { x: tx, y: ty },
      {
        landPath: (to: Point, origin: Point | undefined) => pathTo(to.x, to.y, origin),
        clear: (p: { x: number; y: number }) => clearAt(p.x, p.y),
      },
    );
  }

  function regionalCitizenApproach(npc: {
    approach?: Point | null;
    x: number;
    z: number;
  }): Point | null {
    if (npc.approach) return { ...npc.approach };
    const candidates = [];
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8,
        x = npc.x - 0.5 + Math.cos(a),
        y = npc.z - 0.5 + Math.sin(a);
      if (clearAt(x, y) && context.airship.segment({ x, y }, { x: npc.x - 0.5, y: npc.z - 0.5 }))
        candidates.push({ x, y });
    }
    return (
      candidates.sort(
        (a, b) =>
          Math.hypot(a.x - context.player.x, a.y - context.player.y) -
          Math.hypot(b.x - context.player.x, b.y - context.player.y),
      )[0] || null
    );
  }

  function navFree(x: number, z: number): boolean {
    return !!context.cityNavigation?.free(x - 0.5, z - 0.5);
  }

  function buildNavigation() {
    context.cityNavigation = buildTileNavigation(context.worldTiles, {
      obstacles: navigationObstacles(context.objects),
    });
    for (const p of context.places) {
      const inside = nearestNavigation(
          p.inside.x,
          p.inside.y,
          2,
          (x: number, y: number) => placeAt(x, y) === p,
        ),
        entry = nearestNavigation(p.entry.x, p.entry.y, 2);
      if (!inside || !entry) throw new Error('Blocked doorway: ' + p.name);
      p.inside = inside;
      p.entry = entry;
    }
    const cafe = context.places.find((p) => p.id === 'links')!;
    for (const s of context.sights)
      if (s.kind !== 'bike') {
        const entry = nearestNavigation(
          s.entry.x,
          s.entry.y,
          4,
          (x: number, y: number) => s.kind !== 'guest' || placeAt(x, y) === cafe,
        );
        if (entry) s.entry = entry;
      }
    const spawn = cafe.entry;
    context.camera.yaw = -(cafe.rotation ?? 0) - Math.PI / 4;
    context.camera.cos = Math.cos(context.camera.yaw);
    context.camera.sin = Math.sin(context.camera.yaw);
    context.player.x = spawn.x;
    context.player.y = spawn.y;
    context.bike.x = spawn.x + 1;
    context.bike.y = spawn.y;
    const bikeSite = nearestNavigation(context.bike.x, context.bike.y, 2);
    if (bikeSite) {
      context.bike.x = bikeSite.x;
      context.bike.y = bikeSite.y;
    }
    context.cityNavigationObjectCount = context.objects.length;
  }

  function finalizeSceneryNavigation() {
    // Peninsula planting overlaps the southern city tiles. Compile those
    // late footprints before preparing any patrols, not just the scenery
    // that happened to exist at the first city build.
    const late = context.objects
      .slice(context.cityNavigationObjectCount)
      .filter(
        (o) =>
          o.navigationPolygons ||
          (!o.arch && o.solid && !o.character) ||
          (['townhomes', 'mansion'] satisfies [string, string]).includes(o.arch || ''),
      );
    context.cityNavigation = buildTileNavigation(context.worldTiles, {
      obstacles: [...context.cityNavigation.obstacles, ...navigationObstacles(late)],
    });
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
  }

  function nearestNavigation(
    x: number,
    y: number,
    radius = 3,
    predicate: (x: number, y: number) => boolean = () => true,
  ): Point | null {
    return context.cityNavigation.nearest(x, y, radius, predicate);
  }

  function pathTo(
    tx: number,
    ty: number,
    from: Point = context.player,
    ignoreCustody = false,
  ): Point[] | null {
    if (context.secretWorld?.kind === 'illuminati')
      return CAVE_NAVIGATION.path(from, { x: tx, y: ty });
    const base = (a: Point, b: Point) =>
      context.esotericCampus
        ? context.esotericCampus.path(a, b, (p, q) => basePathTo(q.x, q.y, p, ignoreCustody))
        : basePathTo(b.x, b.y, a, ignoreCustody);
    const path = context.marinLand
      ? context.marinLand.path(from, { x: tx, y: ty }, base)
      : base(from, { x: tx, y: ty });
    if (!context.headless && !context.guildStatus().member) {
      const site = context.places.find((p) => p.id === 'freemasons-guild');
      if (path?.some((p) => insideGuild(site, p.x + 0.5, p.y + 0.5))) return null;
    }
    return path ?? null;
  }

  function basePathTo(
    tx: number,
    ty: number,
    from: Point = context.player,
    ignoreCustody = false,
  ): Point[] | null {
    // Overlapping city/peninsula cells still use their connected city
    // graph, rather than being forced through a distant regional gate.
    if (context.cityNavigation?.connected(from, { x: tx, y: ty })) {
      const route = cityPathTo(tx, ty, from, ignoreCustody);
      if (route) return route;
    }
    if (context.regionalRoad) {
      const regionalPath = (a: { x: number; y: number }, b: { x: number; y: number }) =>
        context.regionalRoad.path(a, b, {
          cityPath: (p: { x: number; y: number }, q: { x: number; y: number }) =>
            context.airship.path(p, q, (to, origin) =>
              cityPathTo(to.x, to.y, origin, ignoreCustody),
            ),
          tahoePath: (p: { x: number; y: number }, q: { x: number; y: number }) =>
            context.tahoe.path(p, q) || null,
        });
      const journey = (a: Point, b: { x: number; y: number }) =>
        context.goldenGate
          ? context.goldenGate.path(a, b, { cityPath: regionalPath })
          : regionalPath(a, b);
      return context.countryside
        ? (context.countryside.path(from, { x: tx, y: ty }, journey) ?? null)
        : journey(from, { x: tx, y: ty });
    }
    if (
      context.tahoe.contains(from.x + 0.5, from.y + 0.5) ||
      context.tahoe.contains(tx + 0.5, ty + 0.5)
    )
      return context.tahoe.path(from, { x: tx, y: ty });
    return context.airship.path(from, { x: tx, y: ty }, (to, origin) =>
      cityPathTo(to.x, to.y, origin, ignoreCustody),
    );
  }

  function cityPathTo(
    tx: number,
    ty: number,
    from: Point = context.player,
    ignoreCustody = false,
  ): Point[] | null {
    const free = ignoreCustody ? landClearAt : clearAt;
    if (!free(tx, ty) || !free(from.x, from.y)) return null;
    return context.cityNavigation.path(from, { x: tx, y: ty });
  }

  function navigationRegionAt(x: number, y: number): number {
    if (context.airship.contains(x + 0.5, y + 0.5)) {
      x = context.airship.gate.x;
      y = context.airship.gate.y;
    }
    return context.cityNavigation?.regionAt(x, y) ?? -1;
  }

  function minimapTarget(
    x: number,
    y: number,
    from: Point = context.player,
    { sailing = context.surf.state.riding } = {},
  ): Point | null {
    if (context.ferrari?.state.riding) {
      const point = context.ferrari.destinationFor(x + 0.5, y + 0.5);
      return point ? { x: point.x - 0.5, y: point.z - 0.5 } : null;
    }
    if (context.secretWorld?.kind === 'illuminati')
      return CAVE_NAVIGATION.nearest(x, y, 40, (a, b) =>
        CAVE_NAVIGATION.connected(from, { x: a, y: b }),
      );
    if (context.secretWorld?.bomber.state.active) return { x, y };
    if (sailing)
      return nearestMinimapPoint(
        from,
        { x, y },
        {
          eligible: (p: { x: number; y: number }) => context.surf.water(p.x + 0.5, p.y + 0.5),
          reachable: (p) => !!context.surf.path(from, p),
        },
      );
    const origin = context.countryside?.contains(from.x + 0.5, from.y + 0.5)
      ? context.regionalRoad.gate('city')
      : context.marinLand?.contains(from.x + 0.5, from.y + 0.5)
        ? context.goldenGate.gate('city')
        : context.esotericCampus?.contains(from.x + 0.5, from.y + 0.5)
          ? context.regionalRoad.gate('city')
          : context.goldenGate?.contains(from.x + 0.5, from.y + 0.5)
            ? context.goldenGate.gate('city')
            : context.regionalRoad?.contains(from.x + 0.5, from.y + 0.5) ||
                context.tahoe.contains(from.x + 0.5, from.y + 0.5)
              ? context.regionalRoad.gate('city')
              : from;
    const region = navigationRegionAt(origin.x, origin.y);
    return nearestMinimapPoint(
      from,
      { x, y },
      {
        eligible: (p: { x: number; y: number }) => {
          if (
            context.countryside?.contains(p.x + 0.5, p.y + 0.5) ||
            context.marinLand?.contains(p.x + 0.5, p.y + 0.5) ||
            context.esotericCampus?.contains(p.x + 0.5, p.y + 0.5) ||
            context.goldenGate?.contains(p.x + 0.5, p.y + 0.5) ||
            context.regionalRoad?.contains(p.x + 0.5, p.y + 0.5) ||
            context.airship.contains(p.x + 0.5, p.y + 0.5)
          )
            return true;
          if (context.tahoe.contains(p.x + 0.5, p.y + 0.5))
            return context.tahoe.walkable(p.x + 0.5, p.y + 0.5);
          return (
            context.cityNavigation.free(p.x, p.y) &&
            context.cityNavigation.regionAt(p.x, p.y) === region
          );
        },
        reachable: (p) => !!pathTo(p.x, p.y, from),
      },
    );
  }
  return {
    isWalkable,
    placeAt,
    instituteRoomAt,
    activeInstituteRoom,
    landClearAt,
    clearAt,
    canTravel,
    railgunLineClear,
    creatureApproach,
    merchantApproach,
    motorcycleApproach,
    sutroApproach,
    bunnyApproach,
    officerRoute,
    regionalCitizenApproach,
    navFree,
    buildNavigation,
    finalizeSceneryNavigation,
    nearestNavigation,
    pathTo,
    cityPathTo,
    navigationRegionAt,
    minimapTarget,
  };
}
