import type { PickTarget } from '../types/scene-state.ts';
import type { StreamRange } from '../types/world-stream.ts';
import { isPickTarget, hasPhysicalBounds } from '../picking.ts';
import { requiredValue } from '../types/assert.ts';
import type { WorldContext } from './scene.ts';
import { createUIJob } from '../ui/scheduler.ts';
import { characterPickMesh } from '../rendering/character-frame.ts';
import { serverConnected } from '../server-connection.ts';
import '../item-stats.ts';
import { GLASS_UV } from '../glazing.ts';
import {
  sub,
  dot,
  cross,
  unit,
  matrixMultiply,
  rayBox,
  rayTriangle,
  rayTriangleAt,
  cutawayWallMask,
} from '../geometry.ts';
import { AIRSHIP_TERMINAL, onAirportApron } from '../airship.ts';
import { PEQUOD } from '../jurassic-layout.ts';
import '../forward-roll.ts';
import { instituteHiddenSections, raycastInstituteFloor } from '../institute-interiors.ts';
import '../research-campuses.ts';
import { preferHouseStorage } from '../search-houses.ts';
import '../motorcycle.ts';
import { ROCKET_RIDER_CENTER } from '../rocket.ts';
import { nearTahoe, raycastTahoe, fitTahoeCamera } from '../tahoe.ts';
import { ILLUMINATI_CAVE } from '../map-instances.ts';
import '../characters.ts';
import { raycastNightlife } from '../nightlife.ts';
import type { Ray } from '../types/geometry.ts';

/** Runtime services for the browser scene.
 * Dependencies are explicit live scene bindings, preserving initialization
 * order without globals. This module only reads bindings when a method runs. */
export function createRuntime(context: WorldContext) {
  const refreshPanels = createUIJob(() => {
    context.multiplayerSettings?.update();
    context.duelMenu?.update();
    context.growthTicker?.update(context.multiplayer.state.finance);
    const drunkUI = context.$('sf-inebriation');
    if (drunkUI) {
      drunkUI.hidden = context.inebriation.state.percent <= 0;
      drunkUI.textContent = Math.ceil(context.inebriation.state.percent) + '% inebriated';
      drunkUI.title = 'Inebriation';
    }
  });
  let cameraAt: number | null = null;
  function updateCamera() {
    const cameraNow = performance.now(),
      dt = cameraAt === null ? 0 : Math.max(0, (cameraNow - cameraAt) / 1000);
    cameraAt = cameraNow;
    const previousTarget = context.camera.target;
    const angle = Math.PI / 4 + context.camera.yaw,
      sa = Math.sin(angle),
      ca = Math.cos(angle),
      sp = Math.sin(context.camera.pitch),
      cp = Math.cos(context.camera.pitch),
      distance = 27 / context.zoom;
    context.camera.right = [ca, 0, -sa] satisfies [number, number, number];
    context.camera.up = [-sa * sp, cp, -ca * sp] satisfies [number, number, number];
    context.camera.back = [sa * cp, sp, ca * cp] satisfies [number, number, number];
    context.camera.target = [
      context.player.x + 0.5,
      context.playerGround() +
        context.playerRocketHop().height +
        (context.surf.state.riding && context.surf.state.mode === 'surf'
          ? 0.23 + 0.67 * context.waveSurf.pose.stand
          : context.rocket.state.active
            ? ROCKET_RIDER_CENTER
            : 0.9),
      context.player.y + 0.5,
    ];
    if (
      previousTarget &&
      Math.hypot(...context.camera.target.map((v, i) => v - previousTarget[i])) < 8
    ) {
      const blend = 1 - Math.exp(-dt * 18);
      context.camera.target = context.camera.target.map(
        (v, i) => previousTarget[i] + (v - previousTarget[i]) * blend,
      );
    }
    context.camera.eye = context.camera.target.map((v, i) => v + context.camera.back[i] * distance);
    let focalScale = 1;
    if (nearTahoe(context.player.x + 0.5, context.player.y + 0.5, 360)) {
      const fit = fitTahoeCamera(
        context.camera.target,
        context.camera.back,
        distance,
        context.camera.terrainRise || 0,
      );
      context.camera.terrainRise = fit.rise;
      context.camera.eye = fit.eye;
      focalScale = fit.focalScale;
      context.camera.back = unit(sub(context.camera.eye, context.camera.target));
      context.camera.right = unit([context.camera.back[2], 0, -context.camera.back[0]]);
      context.camera.up = cross(context.camera.back, context.camera.right);
    } else context.camera.terrainRise = 0;
    const r = context.camera.right,
      u = context.camera.up,
      b = context.camera.back,
      e = context.camera.eye,
      view = new Float32Array([
        r[0],
        u[0],
        b[0],
        0,
        r[1],
        u[1],
        b[1],
        0,
        r[2],
        u[2],
        b[2],
        0,
        -dot(r, e),
        -dot(u, e),
        -dot(b, e),
        1,
      ]);
    context.camera.tan = Math.tan((Math.PI * 34) / 360) * focalScale;
    const f = 1 / context.camera.tan,
      near = 0.15,
      far = 850,
      proj = new Float32Array([
        f / (context.width / context.height),
        0,
        0,
        0,
        0,
        f,
        0,
        0,
        0,
        0,
        -(far + near) / (far - near),
        -1,
        0,
        0,
        (-2 * far * near) / (far - near),
        0,
      ] satisfies [
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
      ]);
    context.camera.matrix = matrixMultiply(proj, view);
  }

  function project(x: number, y: number, z: number) {
    const p = [x, y, z, 1] satisfies [number, number, number, number],
      m = context.camera.matrix,
      v = [0, 0, 0, 0] satisfies [number, number, number, number];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) v[r] += m[c * 4 + r] * p[c];
    return {
      x: ((v[0] / v[3] + 1) * context.width) / 2,
      y: ((1 - v[1] / v[3]) * context.height) / 2,
      depth: v[2] / v[3],
      distance: v[3],
    };
  }

  function setCamera(yaw = context.camera.yaw, pitch = context.camera.pitch) {
    context.camera.yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
    context.camera.pitch = Math.max((Math.PI * 24) / 180, Math.min((Math.PI * 65) / 180, pitch));
    context.camera.cos = Math.cos(context.camera.yaw);
    context.camera.sin = Math.sin(context.camera.yaw);
    context.camera.version++;
    context.hovered = null;
    context.$('sf-hover').hidden = true;
    updateCamera();
    context.drawMini(false);
  }

  function setZoom(value: number) {
    context.zoom = Math.max(0.55, Math.min(6.5, value));
    const slider = context.$('sf-zoom-slider');
    slider.value = String(Math.round(context.zoom * 100));
    slider.setAttribute('aria-valuetext', Math.round(context.zoom * 100) + '% zoom');
    updateCamera();
  }

  function resize() {
    context.width = innerWidth;
    context.height = innerHeight;
    context.dpr = Math.min(devicePixelRatio || 1, 1.5);
    for (const c of [context.canvas]) {
      c.width = Math.round(context.width * context.dpr);
      c.height = Math.round(context.height * context.dpr);
      c.style.width = context.width + 'px';
      c.style.height = context.height + 'px';
    }
    if (context.width < 600 && context.zoom === 1) setZoom(0.8);
    context.closeMenu();
    updateCamera();
    if (context.active && context.built) context.render(performance.now(), 0);
  }

  function update(dt: number, t: number) {
    if (!serverConnected(context.multiplayer)) return;
    if (context.capture.state.active) {
      context.multiplayerWorld?.beforeUpdate(dt, true);
      context.capture.update(dt);
      updateCamera();
      context.drawMini(false);
      return;
    }
    if (context.secretWorld && 'updatePresentation' in context.secretWorld)
      context.secretWorld.updatePresentation();
    context.multiplayerWorld?.beforeUpdate(dt);
    context.updateSitting(dt);
    refreshPanels(false);
    if (context.tabletService?.state.active) {
      context.tabletService.update();
      if (context.tabletService.state.active) {
        const pose = context.tabletService.state.pose!;
        context.player.x = pose.position.x - 0.5;
        context.player.y = pose.position.z - 0.5;
        context.player.path = [];
        context.player.speed = 0;
        context.player.motion = 0;
        if (pose.incoming) context.currentInterior = null;
      }
      context.updateAdventureUI(false);
      updateCamera();
      context.drawMini(false);
      return;
    }
    if (context.multiplayerWorld?.traversing) {
      updateCamera();
      context.drawMini(false);
      return;
    }
    if (context.rehabilitation.state.active) {
      context.rehabilitation.update(dt);
      updateCamera();
      context.drawMini(false);
      return;
    }

    const jailed = context.chase?.state.jailed;
    context.streetTraffic?.update(dt);
    context.slowBus?.update(dt);
    const blocked =
      !!context.duelMenu?.active ||
      !!context.bankMenu?.active ||
      context.aiInterview.visible ||
      !context.$('sf-help').hidden ||
      !context.$('sf-character').hidden ||
      !context.$('sf-context').hidden ||
      context.dialogue.active ||
      context.questMenu?.active;
    if (!blocked) context.waveTime += dt;
    if (!blocked && !context.chase?.state.jailed)
      context.expeditions.state.beams = context.expeditions.state.beams
        .map((beam) => ({ ...beam, ttl: beam.ttl - dt }))
        .filter((beam) => beam.ttl > 0);
    if (context.capture.state.active) {
      updateCamera();
      context.drawMini(false);
      return;
    }
    if (context.ahabNPC) {
      const ship = context.expeditions.ship;
      context.ahabNPC.x = ship.aboard ? ship.x - 1.45 : context.ahabNPC.shore!.x;
      context.ahabNPC.z = ship.aboard ? ship.z + 0.55 : context.ahabNPC.shore!.z;
      context.ahabNPC.base = ship.aboard
        ? PEQUOD.deck
        : context.characterGround(context.ahabNPC.x, context.ahabNPC.z);
    }

    if (
      context.surf.state.riding &&
      context.surf.state.mode === 'surf' &&
      !context.waveSurf.state.ride
    )
      context.waveSurf.update(blocked ? 0 : dt);
    if (
      context.forwardRoll.state.active &&
      (blocked || context.alienCombat || !context.canForwardRoll() || context.fishing.state.active)
    )
      context.forwardRoll.cancel();
    if (!context.skateboard.riding) context.skateTricks.cancel();
    context.skateTricks.update(blocked ? 0 : dt);
    if (context.approachingNPC && !context.action && !context.dialogue.active) context.releaseNPC();
    context.updateAdventureUI(false);
    if (
      context.alienCombat &&
      (context.bike.riding ||
        context.motorcycle?.state.riding ||
        context.surf.state.riding ||
        context.ferrari?.state.riding ||
        context.flying() ||
        context.rocket.state.active ||
        context.dialogue.active ||
        context.training ||
        context.rope.climbing ||
        context.sutroClimb.state.active ||
        context.tahoe.state.mode !== 'ground')
    ) {
      context.alienCombat = null;
      context.player.gesture = null;
    }
    context.skateDog?.update(
      dt,
      t,
      { x: context.player.x + 0.5, z: context.player.y + 0.5 },
      {
        paused: blocked,
        canGreet:
          !jailed &&
          !context.rocket.state.active &&
          !context.flying() &&
          !context.surf.state.riding &&
          !context.sutroClimb.state.active &&
          !context.rope.climbing &&
          context.tahoe.state.mode === 'ground',
      },
    );
    if (!blocked) {
      const turn = Number(context.keys.has('arrowright')) - Number(context.keys.has('arrowleft')),
        tilt = Number(context.keys.has('arrowup')) - Number(context.keys.has('arrowdown'));
      if (turn || tilt)
        setCamera(context.camera.yaw + turn * dt * 1.2, context.camera.pitch + tilt * dt * 0.8);
    }
    if (!context.player.serverRolling) context.forwardRoll.update(dt);
    if (
      !context.surf.state.riding &&
      !context.flying() &&
      !context.rocket.state.active &&
      !context.sutroClimb.state.active &&
      !context.secretWorld?.bomber.state.active
    )
      updatePlayerInterior(jailed);
    updateCamera();
    context.drawMini(false);
  }
  function updatePlayerInterior(jailed = false) {
    const institute = context.activeInstituteRoom();
    if (institute !== context.currentInstitute) {
      const previous = context.currentInstitute;
      context.currentInstitute = institute;
      if (institute) {
        context.closeReader();
        if (context.bike.riding) context.parkBike(institute.entry.x, institute.entry.y);
        if (context.motorcycle?.state.riding)
          context.motorcycle.park(institute.entry.x, institute.entry.y, context.player.angle);
        context.skateboard.riding = false;
        context.visited.add(institute.id);
        context.announce('You enter ' + institute.sight.label + '.', 'You');
      } else if (previous)
        context.announce('You leave ' + previous.sight.label + ' and return to the campus.', 'You');
    }
    const interior =
      jailed || context.surf.state.riding || context.flying()
        ? null
        : context.placeAt(context.player.x, context.player.y);
    if (interior !== context.currentInterior) {
      const previous = context.currentInterior;
      context.currentInterior = interior;
      if (previous && context.readerPlace === previous) context.closeReader();
      if (interior && context.bike.riding) context.parkBike(interior.entry.x, interior.entry.y);
      if (interior && context.motorcycle?.state.riding) {
        context.motorcycle.park(interior.entry.x, interior.entry.y, context.player.angle);
        context.player.speed = Math.min(context.player.speed, context.WALK_SPEED);
      }
      if (interior) context.enter(interior);
      else if (previous)
        context.announce('You leave ' + previous.label + ' and return to the street.', 'You');
    }
  }

  function mouseRay(sx: number, sy: number) {
    const nx =
        (((sx / context.width) * 2 - 1) * context.camera.tan * context.width) / context.height,
      ny = (1 - (sy / context.height) * 2) * context.camera.tan;
    return {
      origin: context.camera.eye,
      dir: unit(
        context.camera.right.map(
          (v, i) => v * nx + context.camera.up[i] * ny - context.camera.back[i],
        ),
      ),
    };
  }

  function terrainIntersection(ray: Ray) {
    if (context.secretWorld?.kind === 'illuminati' || context.secretWorld?.kind === 'kraken') {
      const floor =
          context.secretWorld.kind === 'illuminati' ? ILLUMINATI_CAVE.floor + 0.025 : 0.025,
        t = (floor - ray.origin[1]) / ray.dir[1];
      return t > 0 && Number.isFinite(t)
        ? { point: ray.origin.map((v, i) => v + ray.dir[i] * t), distance: t }
        : null;
    }
    if (context.chase?.state.jailed) {
      const t = (context.detention.base + 0.18 - ray.origin[1]) / ray.dir[1];
      return t > 0 && Number.isFinite(t)
        ? { point: ray.origin.map((v, i) => v + ray.dir[i] * t), distance: t }
        : null;
    }
    const countrysideHit = context.countryside?.raycast(ray),
      marinHit = context.marinLand?.raycast(ray),
      campusHit = context.esotericCampus?.raycast(ray),
      bridgeHit = context.goldenGate?.raycast(ray),
      highwayHit = context.regionalRoad?.raycast(ray),
      clubHit = context.nightclub
        ? raycastNightlife(ray, context.nightclub, context.terrainHeight)
        : null,
      instituteHit = context.activeInstituteRoom()
        ? raycastInstituteFloor(context.activeInstituteRoom()!, ray)
        : null,
      roadHit = [countrysideHit, marinHit, campusHit, bridgeHit, highwayHit, clubHit, instituteHit]
        .filter((hit) => hit !== null && hit !== undefined)
        .sort((a, b) => a.distance - b.distance)[0],
      southHit = context.southernTerrain?.raycast(ray);
    if (nearTahoe(context.player.x + 0.5, context.player.y + 0.5, 400)) {
      const hit = raycastTahoe(ray);
      if (hit) return roadHit && roadHit.distance < hit.distance ? roadHit : hit;
    }
    // Traverse terrain grid cells and intersect the actual rendered triangles.
    // This remains exact at shorelines and steep hills, where ray marching can skip a ridge.
    const o = ray.origin,
      d = ray.dir,
      water = (0.02 - o[1]) / d[1];
    let best = Math.min(
        water > 0 ? water : 220,
        roadHit?.distance || 220,
        southHit?.distance || 220,
      ),
      near = 0;
    const apron = (AIRSHIP_TERMINAL.base + 0.03 - o[1]) / d[1];
    if (apron > 0 && onAirportApron(o[0] + d[0] * apron, o[2] + d[2] * apron))
      best = Math.min(best, apron);
    let far = Math.min(220, best);
    for (const axis of [0, 2] satisfies [number, number]) {
      if (Math.abs(d[axis]) < 1e-9) {
        if (o[axis] < 0 || o[axis] > context.N)
          return best < 220 ? { point: o.map((v, i) => v + d[i] * best), distance: best } : null;
      } else {
        let a = (0 - o[axis]) / d[axis],
          b = (context.N - o[axis]) / d[axis];
        if (a > b) [a, b] = [b, a] satisfies [number, number];
        near = Math.max(near, a);
        far = Math.min(far, b);
      }
    }
    let x = Math.max(
        0,
        Math.min(
          context.TERRAIN_GRID - 1,
          Math.floor((o[0] + d[0] * (near + 1e-7)) * context.TERRAIN_RES),
        ),
      ),
      z = Math.max(
        0,
        Math.min(
          context.TERRAIN_GRID - 1,
          Math.floor((o[2] + d[2] * (near + 1e-7)) * context.TERRAIN_RES),
        ),
      );
    const sx = d[0] >= 0 ? 1 : -1,
      sz = d[2] >= 0 ? 1 : -1,
      deltaX = Math.abs(1 / context.TERRAIN_RES / d[0]),
      deltaZ = Math.abs(1 / context.TERRAIN_RES / d[2]);
    let nextX =
        Math.abs(d[0]) < 1e-9
          ? Infinity
          : ((sx > 0 ? x + 1 : x) / context.TERRAIN_RES - o[0]) / d[0],
      nextZ =
        Math.abs(d[2]) < 1e-9
          ? Infinity
          : ((sz > 0 ? z + 1 : z) / context.TERRAIN_RES - o[2]) / d[2],
      t = near;
    while (
      t <= far + 1e-7 &&
      t <= best &&
      x >= 0 &&
      z >= 0 &&
      x < context.TERRAIN_GRID &&
      z < context.TERRAIN_GRID
    ) {
      const a = [
          x / context.TERRAIN_RES,
          context.heights[z][x],
          z / context.TERRAIN_RES,
        ] satisfies [number, number, number],
        b = [
          (x + 1) / context.TERRAIN_RES,
          context.heights[z][x + 1],
          z / context.TERRAIN_RES,
        ] satisfies [number, number, number],
        c = [
          (x + 1) / context.TERRAIN_RES,
          context.heights[z + 1][x + 1],
          (z + 1) / context.TERRAIN_RES,
        ] satisfies [number, number, number],
        e = [
          x / context.TERRAIN_RES,
          context.heights[z + 1][x],
          (z + 1) / context.TERRAIN_RES,
        ] satisfies [number, number, number];
      for (const tri of [
        [a, c, b],
        [a, e, c],
      ]) {
        const hit = rayTriangle(ray, tri[0], tri[1], tri[2]);
        if (
          hit !== null &&
          hit < best &&
          context.insidePolygon(o[0] + d[0] * hit, o[2] + d[2] * hit, context.COAST)
        )
          best = hit;
      }
      if (nextX < nextZ) {
        t = nextX;
        nextX += deltaX;
        x += sx;
      } else {
        t = nextZ;
        nextZ += deltaZ;
        z += sz;
      }
    }
    return best < 220 ? { point: o.map((v, i) => v + d[i] * best), distance: best } : null;
  }

  function tileAt(sx: number, sy: number) {
    const ray = mouseRay(sx, sy),
      hit = terrainIntersection(ray);
    if (hit) return { x: hit.point[0] - 0.5, y: hit.point[2] - 0.5 };
    if (context.ferrari?.state.riding && ray.dir[1] < -1e-8) {
      const t = (context.ferrari.position.y - ray.origin[1]) / ray.dir[1];
      if (t > 0)
        return { x: ray.origin[0] + ray.dir[0] * t - 0.5, y: ray.origin[2] + ray.dir[2] * t - 0.5 };
    }
    return { x: NaN, y: NaN };
  }

  function pick(sx: number, sy: number) {
    if (
      context.pickedCache &&
      context.pickedCache.x === sx &&
      context.pickedCache.y === sy &&
      context.pickedCache.frame === context.frameID
    )
      return context.pickedCache.result;
    const ray = mouseRay(sx, sy),
      ground = terrainIntersection(ray);
    let distance = ground ? ground.distance + 0.12 : 220,
      result: PickTarget | null = null;
    const test = (o: PickTarget) => {
      const near = rayBox(ray, o.lo, o.hi);
      if (near === null || near > distance) return;
      const instituteHidden = o.researchRoom
          ? instituteHiddenSections(
              o.researchRoom,
              o.sections || [],
              context.camera.eye,
              o.researchRoom === context.activeInstituteRoom(),
            )
          : [],
        hiddenWalls =
          o.place && o.place === context.currentInterior && hasPhysicalBounds(o)
            ? cutawayWallMask(o, context.camera.eye)
            : 0;
      const ranges: StreamRange[] = context.worldStream
        ? context.worldStream.ranges(o.mesh, o.start, o.count)
        : [{ data: o.mesh.data, start: o.start, count: o.count, sourceStart: 0, localStart: 0 }];
      for (const range of ranges) {
        if (range.part && rayBox(ray, range.part.chunk.lo, range.part.chunk.hi) === null) continue;
        for (let vertex = range.start; vertex < range.start + range.count; vertex += 3) {
          const data = range.data,
            localVertex = range.localStart + vertex - range.sourceStart,
            i = (range.indices ? range.indices[localVertex] : localVertex) * 11;
          if (Math.abs(data[i + 9] - GLASS_UV) < 0.015) continue;
          if (instituteHidden.some((p) => vertex >= p.start && vertex < p.start + p.count))
            continue;
          if (o.place && o.place === context.currentInterior && hasPhysicalBounds(o)) {
            const hidden =
              (o.roof && o.roof.start <= vertex && vertex < o.roof.start + o.roof.count) ||
              (o.walls || []).some(
                (w) =>
                  hiddenWalls & (1 << w.side) && vertex >= w.start && vertex < w.start + w.count,
              );
            if (hidden) continue;
          }
          const t = rayTriangleAt(ray, data, localVertex * 11, 11, range.indices);
          if (
            t !== null &&
            (t < distance ||
              ((o.character || o.detailTarget || o.sight?.kind === 'bench') &&
                Math.abs(t - distance) < 1e-6))
          ) {
            distance = t;
            result = o;
          }
        }
      }
      for (const draw of o.characters || []) {
        const { data, indices } = characterPickMesh(draw);
        for (let i = 0; i < indices.length; i += 3) {
          const hit = rayTriangleAt(ray, data, i * 11, 11, indices);
          if (hit !== null && hit < distance) {
            distance = hit;
            result = o;
          }
        }
      }
    };
    if (!context.secretWorld || context.secretWorld.kind === 'world')
      for (const o of context.objects) if (isPickTarget(o)) test(o);
    for (const o of context.dynamicTargets) test(o);
    const storage = preferHouseStorage(ray, result, distance, context.currentInterior, [
      ...context.searchSites,
      ...context.loreSites,
    ]);
    if (isPickTarget(storage)) result = storage;
    context.pickedCache = { x: sx, y: sy, frame: context.frameID, result };
    return result;
  }

  function hitPlace(sx: number, sy: number) {
    return pick(sx, sy)?.place || null;
  }

  function hitCitizen(sx: number, sy: number) {
    const hit = pick(sx, sy);
    if (hit?.npc) return hit.npc;
    if (hit?.sight?.kind === 'guest') return context.niaCitizen;
    // A few screen pixels of tolerance make thin limbs easy to select.
    // Test visibility at the actor itself so the extra area never reaches
    // through a wall or a closed café roof.
    let closest = null,
      best = Infinity;
    for (const o of [
      ...context.dynamicTargets.filter((o) => o.npc),
      ...context.objects
        .filter(isPickTarget)
        .filter((o) => o.character && o.sight?.kind === 'guest'),
    ]) {
      if (o.interior && o.interior !== context.currentInterior) continue;
      const points = [];
      for (const x of [o.lo[0], o.hi[0]])
        for (const y of [o.lo[1], o.hi[1]])
          for (const z of [o.lo[2], o.hi[2]]) points.push(project(x, y, z));
      if (points.some((p) => p.distance <= 0)) continue;
      const left = Math.min(...points.map((p) => p.x)),
        right = Math.max(...points.map((p) => p.x)),
        top = Math.min(...points.map((p) => p.y)),
        bottom = Math.max(...points.map((p) => p.y)),
        padding = 5;
      if (
        sx < left - padding ||
        sx > right + padding ||
        sy < top - padding ||
        sy > bottom + padding
      )
        continue;
      const anchor = [
          (o.lo[0] + o.hi[0]) / 2,
          o.lo[1] + (o.hi[1] - o.lo[1]) * 0.62,
          (o.lo[2] + o.hi[2]) / 2,
        ],
        at = project(anchor[0], anchor[1], anchor[2]);
      // Aggregates such as campuses include walkable courtyards in their
      // bounds. Use the actual visible triangles, never that broad box,
      // to decide whether an actor's torso is behind a wall.
      if (pick(at.x, at.y) !== o) continue;
      const score = Math.hypot(sx - at.x, sy - at.y);
      if (score < best) {
        best = score;
        closest = o.npc || context.niaCitizen;
      }
    }
    return closest;
  }

  function hitSight(sx: number, sy: number) {
    const hit = pick(sx, sy);
    if (hit?.sight) return hit.sight;
    // Small vials and coins get a few screen pixels of tolerance, while
    // an actual visibility ray prevents selecting items through walls.
    let item = null,
      score = Infinity;
    for (const o of context.dynamicTargets)
      if (
        (
          ['loot', 'sunglasses', 'fishing', 'airship-rope'] satisfies [
            string,
            string,
            string,
            string,
          ]
        ).includes(o.sight?.kind || '')
      ) {
        const anchor = [
            (o.lo[0] + o.hi[0]) / 2,
            (o.lo[1] + o.hi[1]) / 2,
            (o.lo[2] + o.hi[2]) / 2,
          ] satisfies [number, number, number],
          at = project(...anchor),
          distance = Math.hypot(sx - at.x, sy - at.y);
        if (
          at.distance <= 0 ||
          distance >
            Math.max(
              (['fishing', 'airship-rope'] satisfies [string, string]).includes(o.sight?.kind || '')
                ? 28
                : 9,
              (project(o.hi[0], anchor[1], o.hi[2]).x - at.x) * 1.3,
            ) ||
          distance >= score ||
          pick(at.x, at.y) !== o
        )
          continue;
        item = o.sight;
        score = distance;
      }
    if (item) return item;
    if (hit || context.secretWorld?.kind !== 'world') return null;
    const tower = requiredValue(context.sightById('sutro'), 'Missing authored entity: sutro'),
      ray = mouseRay(sx, sy),
      near = isPickTarget(tower.object) ? rayBox(ray, tower.object.lo, tower.object.hi) : null;
    if (near !== null) {
      const ground = terrainIntersection(ray);
      if (!ground || near < ground.distance + 0.1) return tower;
    }
    const t = tileAt(sx, sy);
    if (context.pondValue(t.x + 0.5, t.y + 0.5) < 1.3) return context.sightById('ducks');
    if (context.palaceWater(t.x + 0.5, t.y + 0.5) < 1.2) return context.sightById('palace');
    return null;
  }

  function frame(t: number) {
    if (!context.active) return;
    const dt = Math.min((t - context.last) / 1000, 0.075);
    context.last = t;
    context.render(t, dt);
    context.raf = requestAnimationFrame(frame);
  }

  function startLoop() {
    cancelAnimationFrame(context.raf);
    context.last = performance.now();
    context.trainingLast = context.last;
    context.raf = requestAnimationFrame(frame);
  }

  async function setMode(on: boolean) {
    if (!on && context.bankMenu?.active) context.bankMenu.close();
    context.multiplayer.checkpoint(true);
    if (!on) context.debugConsole?.close();
    if (!on) {
      context.aiInterview?.close();
      context.forwardRoll.cancel();
    }
    if (on === context.active) return;
    context.active = on;
    context.connectionGate!.setActive(on);
    if (on) {
      context.scrollBefore = scrollY;
      context.world.hidden = false;
      document.body.classList.add('sf-mode');
      if (!context.built) {
        context.world.inert = true;
        if (!serverConnected(context.multiplayer)) {
          context.loading?.hide();
          return;
        }
        context.loading?.show();
        await context.loading?.stage(4, 'Connecting to your world…');
        await context.buildForBrowser();
        context.world.inert = true;
      }
      resize();
      updateCamera();
      context.render(performance.now(), 0);
      await context.loading?.done();
      context.world.inert = !serverConnected(context.multiplayer);
      context.canvas.focus({ preventScroll: true });
      startLoop();
      context.worldStream?.start();
    } else {
      context.setSitting(false);
      context.player.sitBlend = 0;
      context.fishing.cancel();
      context.parkMotorcycle(false);
      if (context.training) context.stopTraining();
      if (context.ferrari?.state.riding) context.parkFerrari();
      context.questMenu?.close();
      context.closeCharacter();
      context.setDancing(false);
      context.dialogue.close();
      const rocketEntry = context.rocket.state.active ? context.rocket.state.from!.entry : null;
      context.rocket.cancel();
      context.updateRocketControls();
      if (rocketEntry) Object.assign(context.player, rocketEntry);
      context.rope.reset();
      const landing = context.airship.cancel(),
        entry = context.sutroClimb.cancel();
      if (landing) {
        context.player.x = landing.x;
        context.player.y = landing.y;
      } else if (entry) {
        context.player.x = entry.x - 0.5;
        context.player.y = entry.z - 0.5;
      }
      context.updateClimbButton();
      cancelAnimationFrame(context.raf);
      context.keys.clear();
      context.pointers.clear();
      clearTimeout(context.pressTimer);
      context.gesture = false;
      context.hovered = null;
      context.currentInterior = null;
      context.readerPlace = null;
      context.world.classList.remove('sf-reading');
      context.$('sf-hover').hidden = true;
      context.player.path = [];
      context.player.speed = 0;
      context.action = null;
      context.closeMenu();
      context.$('sf-reader').hidden = true;
      context.$('sf-help').hidden = true;
      context.$('sf-reader-shade').hidden = true;
      context.playerSpeechUntil = 0;
      context.$('sf-player-speech').hidden = true;
      context.world.hidden = true;
      document.body.classList.remove('sf-mode');
      window.scrollTo(0, context.scrollBefore);
      context.$('sf-toggle').focus({ preventScroll: true });
    }
    context.$('sf-toggle').setAttribute('aria-pressed', String(on));
    context.$('sf-toggle-label').textContent = on ? 'Classic page' : 'Explore SF';
  }
  return {
    updateCamera,
    project,
    setCamera,
    setZoom,
    resize,
    update,
    mouseRay,
    tileAt,
    pick,
    hitPlace,
    hitCitizen,
    hitSight,
    startLoop,
    setMode,
  };
}
