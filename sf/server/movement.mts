import { hasPhysicalBounds } from '../picking.ts';
import { isFiniteNumber, isRecord } from '../types/json.ts';
import type { MovementRuntime } from '../types/movement.ts';
import type { Point } from '../types/geometry.ts';

import type { SimulationServices, ServerPlayer } from '../types/server.ts';

import { nearestMinimapPoint } from '../minimap-navigation.ts';
import { GAMEPLAY } from '../config/gameplay.ts';
import { CAVE_NAVIGATION, ILLUMINATI_CAVE } from '../map-instances.ts';
import { guildMayEnter } from './guild.mts';
import { createStealthBomber, bomberCruiseHeight } from '../stealth-bomber.ts';
import { createFerrari } from '../ferrari.ts';
import { createFerrariCityRoads } from '../ferrari-roads.ts';
import { createRocketTravel, rocketCruiseSpeed } from '../rocket.ts';
import { createTahoe } from '../tahoe.ts';
import { SF_SPACEPORT } from '../southern-district.ts';
import { SF_FITNESS } from '../southern-layout.ts';
import { createSutroClimb } from '../sutro.ts';
import { CHARACTER_CLIPS } from '../characters.ts';
import { createSurfing } from '../surfing.ts';
import { createWindsurfing } from '../windsurfing.ts';
import { createWhales, WHALE_JUMP_LEAD_MS } from '../wildlife.ts';
import { nearbyServiceNPC } from '../interaction-access.ts';
import { FORWARD_ROLL_DURATION } from '../forward-roll.ts';

const json = (value: string | undefined): Record<string, unknown> => {
  try {
    const parsed: unknown = JSON.parse(value || '{}');
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
};
/** User destinations enter here. Routes, distance budgets, fuel, elevation and
 * vehicle clocks never come from a browser pose or browser elapsed time. */
export function createServerMovement({
  geometry,
  routes,
  players,
  send,
  dirty,
  now,
  following,
  clock = () => 0,
}: Pick<
  SimulationServices,
  'geometry' | 'routes' | 'players' | 'send' | 'dirty' | 'now' | 'following'
> & { clock?: () => number }) {
  const active = new Map<number, MovementRuntime>();
  const position = (p: ServerPlayer) => ({
    x: p.x,
    y: p.y,
    z: p.z,
    angle: p.angle,
    phase: p.phase,
    motion: p.motion,
    moving: p.moving,
    mode: p.mode,
    hp: p.hp,
  });
  function state(p: ServerPlayer) {
    let s = active.get(p.id);
    if (!s) {
      const bomber = createStealthBomber({
        ground: geometry.characterGround,
        now,
        cruiseHeight: () => bomberCruiseHeight(geometry.airship?.cruiseHeight),
        boostSpeed: () =>
          geometry.tahoe?.spaceport
            ? rocketCruiseSpeed(SF_SPACEPORT, geometry.tahoe.spaceport)
            : 140,
      });
      const ferrari = geometry.regionalRoad
        ? createFerrari(
            geometry.regionalRoad,
            json(p.profile.privateState['sf-ferrari-v1']),
            (v) => {
              p.profile.privateState['sf-ferrari-v1'] = JSON.stringify(v);
              dirty(p);
            },
            {
              cityDriving: createFerrariCityRoads({
                road: geometry.regionalRoad,
                traffic: () => geometry.streetTraffic || { nodes: [], edges: [] },
                ground: geometry.characterGround,
              }),
            },
          )
        : null;
      s = {
        route: [],
        mode: 'walk',
        speed: 0,
        boost: false,
        bomber,
        ferrari,
        rocket: createRocketTravel({ groundHeight: geometry.characterGround }),
        tahoeValue: null,
        get tahoe() {
          return (this.tahoeValue ??= createTahoe());
        },
        sutro: createSutroClimb(),
        checked: null,
        wave: createSurfing({
          water: (x: number, z: number) => !!geometry.surf?.water(x, z),
          segment: (a, b) =>
            !!geometry.surf?.segment(
              { x: a.x - 0.5, y: a.z - 0.5 },
              { x: b.x - 0.5, y: b.z - 0.5 },
            ),
        }),
        windsurf: createWindsurfing({
          scale: 1.5,
          isSea: (x: number, z: number) => !!geometry.surf?.water(x, z),
        }),
        whales: createWhales(),
      };
      active.set(p.id, s);
    }
    return s;
  }
  const available = (p: ServerPlayer) =>
    p.hp > 0 &&
    !p.respawnAllowed &&
    !p.detainAt &&
    !p.airship &&
    !p.grappling &&
    !p.parachute &&
    !p.tabletTeleport;
  function park(p: ServerPlayer, s: MovementRuntime) {
    if (s.mode === 'bike') p.profile.bicycle = { x: p.x - 0.5, y: p.z - 0.5 };
    if (s.mode === 'motorcycle')
      p.profile.privateState['sf-motorcycle-v1'] = JSON.stringify({
        ...json(p.profile.privateState['sf-motorcycle-v1']),
        x: p.x - 0.5,
        y: p.z - 0.5,
        angle: p.angle,
      });
    if (s.ferrari?.state.riding) s.ferrari.park();
  }
  function stop(p: ServerPlayer) {
    const s = state(p);
    s.route = [];
    s.speed = 0;
    p.moving = false;
    p.motion = 0;
    if (s.bomber.state.active) s.bomber.state.target = null;
    if (s.ferrari?.state.riding) s.ferrari.state.target = null;
  }
  function leaveSeat(p: ServerPlayer) {
    if (!p.seat) return;
    const exit = p.seat.exit;
    Object.assign(p, { x: exit.x, z: exit.z, y: geometry.characterGround(exit.x, exit.z) });
    p.seat = null;
  }
  function wake(p: ServerPlayer) {
    const s = state(p);
    if ((['sit', 'bench', 'dance'] satisfies [string, string, string]).includes(s.mode)) {
      leaveSeat(p);
      s.mode = 'walk';
      p.mode = 'walk';
    }
  }
  function leaveTraining(p: ServerPlayer) {
    if (!p.training) return;
    p.training = false;
    if (
      (['bench', 'curl', 'squat', 'press'] satisfies [string, string, string, string]).includes(
        p.gesture,
      )
    )
      p.gesture = '';
    const entry = SF_FITNESS.entry;
    Object.assign(p, {
      x: entry.x + 0.5,
      z: entry.y + 0.5,
      y: geometry.characterGround(entry.x + 0.5, entry.y + 0.5),
      mode: 'walk',
      moving: false,
      motion: 0,
    });
    const s = state(p);
    s.mode = 'walk';
    s.route = [];
    dirty(p);
  }
  function move(p: ServerPlayer, args: Record<string, unknown>) {
    if (!available(p)) return { ok: false, message: 'Finish your current journey first.' };
    const { x, z } = args;
    if (!isFiniteNumber(x) || !isFiniteNumber(z) || Math.abs(x) > 5000 || Math.abs(z) > 5000)
      return { ok: false, message: 'Invalid destination.' };
    leaveTraining(p);
    const s = state(p);
    following.stop(p);
    p.training = false;
    p.personalBattle = null;
    p.attack = null;
    if (p.bomberActive) {
      if (!s.bomber.state.active) s.bomber.board(position(p));
      return { ok: s.bomber.target(x, z) };
    }
    if (s.rocket.state.active || s.sutro.state.active)
      return { ok: false, message: 'Finish your journey first.' };
    if (s.tahoeValue?.state.mode === 'ski') return { ok: s.tahoe.steerTo(x, z) };
    if (s.tahoeValue?.state.mode === 'gondola')
      return { ok: false, message: 'Wait for the gondola.' };
    if (s.ferrari?.state.riding) {
      const ok = s.ferrari.driveTo(x, z),
        goal = s.ferrari.state.destination;
      return { ok, ...(ok ? { goal: { x: goal!.x, z: goal!.z } } : {}) };
    }
    if (s.wave.state.ride) return { ok: s.wave.steer(x, z) };
    if (p.seat) wake(p);
    const from = { x: p.x - 0.5, y: p.z - 0.5 },
      to = { x: x - 0.5, y: z - 0.5 },
      cave = p.instance?.kind === 'illuminati';
    if (
      s.route.length &&
      p.moveGoal?.x === x &&
      p.moveGoal?.z === z &&
      s.routeRevision === geometry.navigationRevision
    )
      return { ok: true, goal: { x, z } };
    const path = (goal: Point) =>
      p.personalJailed
        ? geometry.detention?.path(from, goal)
        : cave
          ? CAVE_NAVIGATION.path(from, goal)
          : s.mode === 'surf'
            ? geometry.surf?.path(from, goal)
            : routes
              ? routes.pathTo(goal.x, goal.y, from, true)
              : geometry.pathTo(goal.x, goal.y, from, true);
    let route = path(to),
      goal = { x, z };
    if (!route) {
      const snapped = nearestMinimapPoint(from, to, {
        step: 0.5,
        offset: 0,
        eligible: (point: { x: number; y: number }) =>
          p.personalJailed
            ? geometry.detention!.walkable(point.x + 0.5, point.y + 0.5)
            : cave
              ? CAVE_NAVIGATION.free(point.x, point.y)
              : s.mode === 'surf'
                ? !!geometry.surf?.water(point.x + 0.5, point.y + 0.5)
                : geometry.landClearAt(point.x, point.y),
        reachable: (point) => {
          const found = path(point);
          return (
            !!found &&
            (p.personalJailed ||
              cave ||
              found.every((n) =>
                guildMayEnter(
                  p,
                  geometry,
                  n.x + 0.5,
                  geometry.characterGround(n.x + 0.5, n.y + 0.5),
                  n.y + 0.5,
                ),
              ))
          );
        },
      });
      if (snapped) {
        route = path(snapped);
        goal = { x: snapped.x + 0.5, z: snapped.y + 0.5 };
      }
    }
    if (!route) {
      stop(p);
      return { ok: false, message: 'There is no reachable ground nearby.' };
    }
    if (
      !p.personalJailed &&
      !cave &&
      s.mode !== 'surf' &&
      route.some(
        (n) =>
          !guildMayEnter(
            p,
            geometry,
            n.x + 0.5,
            geometry.characterGround(n.x + 0.5, n.y + 0.5),
            n.y + 0.5,
          ),
      )
    )
      return { ok: false, message: 'The guild admits members only.' };
    wake(p);
    s.route = route.map((n) => ({ ...n }));
    s.routeRevision = geometry.navigationRevision;
    s.checked = null;
    if (p.gesture === 'chair') p.gesture = '';
    p.moveGoal = goal;
    p.mode = s.mode;
    p.moving = !!route.length;
    dirty(p);
    return { ok: true, goal };
  }
  function activity(p: ServerPlayer, args: Record<string, unknown>) {
    const s = state(p);
    let mode = args.mode;
    if (typeof mode !== 'string') return { ok: false };
    if (!available(p)) return { ok: false };
    if (p.training) leaveTraining(p);
    if (args.boost !== undefined) s.boost = args.boost === true;
    if (
      s.rocket.state.active ||
      (s.sutro.state.active && s.sutro.state.phase !== 'top') ||
      (s.tahoeValue && s.tahoeValue.state.mode !== 'ground')
    )
      return { ok: false, message: 'Finish your current journey first.' };
    if (
      mode === 'sit' &&
      (!(['walk', 'dance', 'sit', 'bench'] satisfies [string, string, string, string]).includes(
        p.mode,
      ) ||
        s.sutro.state.active)
    )
      return { ok: false, message: 'Find a safe place on foot before sitting.' };
    if (
      mode === 'sit' &&
      args.chair &&
      !p.inventory.economy.state.ownedEquipment.includes('ball-chair')
    )
      return { ok: false, message: 'You do not own a ball chair.' };
    if (mode === 'sit' && args.seat) {
      const site = geometry.sights?.find((n) => n.id === args.seat && n.kind === 'bench'),
        seat = site?.seat,
        exit = site ? { x: site.entry.x + 0.5, z: site.entry.y + 0.5 } : null;
      if (
        !seat ||
        !exit ||
        !site ||
        Math.hypot(p.x - exit.x, p.z - exit.z) > 1.15 ||
        !geometry.landClearAt(exit.x - 0.5, exit.z - 0.5) ||
        !geometry.canTravel!(p.x - 0.5, p.z - 0.5, exit.x - 0.5, exit.z - 0.5, true)
      )
        return { ok: false, message: 'Walk to the front of the bench first.' };
      if ([...players.values()].some((other) => other !== p && other.seat?.id === site.id))
        return { ok: false, message: 'Somebody is already sitting there.' };
      following.stop(p);
      park(p, s);
      stop(p);
      s.mode = 'bench';
      p.mode = 'bench';
      p.seat = { id: site.id, exit };
      Object.assign(p, {
        x: seat.x,
        z: seat.z,
        y: seat.base + seat.height - 0.51,
        angle: seat.angle,
      });
      return { ok: true };
    }
    if (p.bomberActive) return { ok: mode !== 'sit' };
    if (p.personalJailed && !(['walk', 'sit'] satisfies [string, string]).includes(mode))
      return { ok: false, message: 'You are detained.' };
    if (mode === 'walk' || mode === 'dance' || mode === 'roll' || mode === 'sit') {
      leaveSeat(p);
      following.stop(p);
      if (s.mode === 'surf' && p.surfShore) {
        s.wave.stop();
        s.windsurf.cancelJump();
        Object.assign(p, {
          x: p.surfShore.x + 0.5,
          z: p.surfShore.y + 0.5,
          y: geometry.characterGround(p.surfShore.x + 0.5, p.surfShore.y + 0.5),
        });
        p.surfShore = null;
      }
      if (mode === 'roll' && s.mode === 'roll' && now() < s.rollUntil!)
        return { ok: false, message: 'Finish your current roll first.' };
      park(p, s);
      s.mode = mode;
      stop(p);
      p.mode = mode;
      if (mode === 'sit' && args.chair) {
        p.gesture = 'chair';
        p.gestureUntil = 0;
      } else if (p.gesture === 'chair') p.gesture = '';
      if (
        (
          ['windsurf', 'paddle', 'surfboard', 'bench', 'curl', 'squat', 'press'] satisfies [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        ).includes(p.gesture)
      )
        p.gesture = '';
      if (mode === 'roll') {
        s.rollStartedAt! = now();
        s.rollUntil! = now() + FORWARD_ROLL_DURATION * 1000;
        p.phase = 0;
      }
      return { ok: true };
    }
    if (mode === 'bike') {
      const b = p.profile.bicycle || geometry.sights?.find((n) => n.kind === 'bike')?.entry;
      if (
        !b ||
        typeof b.x !== 'number' ||
        typeof b.y !== 'number' ||
        Math.hypot(p.x - b.x - 0.5, p.z - b.y - 0.5) > 3
      )
        return { ok: false, message: 'Walk to your bicycle.' };
    } else if (mode === 'skateboard') {
      if (!p.profile.playerState.quests.theyLive.skateboard)
        return { ok: false, message: 'Earn your skateboard first.' };
    } else if (mode === 'motorcycle') {
      const bike = json(p.profile.privateState['sf-motorcycle-v1']);
      if (
        !bike.rented ||
        typeof bike.x !== 'number' ||
        typeof bike.y !== 'number' ||
        Math.hypot(p.x - bike.x - 0.5, p.z - bike.y - 0.5) > 3
      )
        return { ok: false, message: 'Rent your motorcycle and walk to it first.' };
    } else if (mode === 'ferrari') {
      const car = s.ferrari;
      if (!car) return { ok: false };
      const at = car.position;
      if (Math.hypot(p.x - at.x, p.z - at.z) > 4)
        return { ok: false, message: 'Walk to your Ferrari.' };
      car.mount();
    } else if (mode === 'surf') {
      const launch = args.pacifica
        ? geometry.pacificaSurfSite
        : geometry.sights?.find((n) => n.kind === 'windsurf');
      if (!launch || Math.hypot(p.x - launch.entry.x - 0.5, p.z - launch.entry.y - 0.5) > 5)
        return { ok: false, message: 'Walk to a surf launch first.' };
      p.surfShore = { ...launch.entry };
      const water = args.pacifica ? geometry.pacificaSurfSite!.launch : geometry.surf?.state.launch;
      if (!water) return { ok: false };
      p.x = water.x + 0.5;
      p.z = water.y + 0.5;
      p.y = 0.1;
      s.surfKind = args.pacifica ? 'surf' : 'windsurf';
      s.windsurf.state.riding = true;
      if (args.pacifica) s.wave.start({ x: p.x, z: p.z });
    } else return { ok: false, message: 'That movement activity is unavailable.' };
    s.mode = mode;
    p.mode = mode;
    stop(p);
    dirty(p);
    return { ok: true };
  }
  function travel(p: ServerPlayer, args: Record<string, unknown>) {
    if (
      !available(p) ||
      p.personalJailed ||
      p.bomberActive ||
      (p.instance?.kind || 'world') !== 'world'
    )
      return { ok: false, message: 'Finish your current journey first.' };
    const s = state(p),
      near = (entry: Point | null | undefined) =>
        !!entry && Math.hypot(p.x - entry.x - 0.5, p.z - entry.y - 0.5) < 3;
    if (args.kind === 'catchWave') {
      if (s.mode !== 'surf' || s.surfKind !== 'surf') return { ok: false };
      return { ok: s.wave.catchWave({ x: p.x, z: p.z }, clock()) };
    }
    if (args.kind === 'surfTrick') return { ok: s.mode === 'surf' && s.wave.trick(args.id) };
    if (args.kind === 'surfJump') {
      if (
        s.mode !== 'surf' ||
        s.surfKind !== 'windsurf' ||
        !Number.isInteger(args.index) ||
        typeof args.index !== 'number' ||
        args.index < 0 ||
        args.index >= s.whales.count
      )
        return { ok: false };
      const target = s.whales.sample(clock() * 1000 + WHALE_JUMP_LEAD_MS, args.index);
      return { ok: s.windsurf.jumpOver({ x: p.x - 0.5, y: p.z - 0.5 }, target) };
    }
    if (
      s.rocket.state.active ||
      (s.sutro.state.active && args.kind !== 'descend') ||
      s.tahoeValue?.state.mode === 'gondola'
    )
      return { ok: false, message: 'Finish your current journey first.' };
    if (args.kind === 'rocket') {
      const sites = [
          { ...SF_SPACEPORT, id: 'sf-spaceport' },
          ...(geometry.tahoe?.spaceport
            ? [{ ...geometry.tahoe.spaceport, id: 'tahoe-spaceport' }]
            : []),
        ],
        attendant = nearbyServiceNPC(
          geometry,
          p,
          (n) => n.kind === 'crew' && sites.some((s) => s.id === n.siteId),
        );
      const from = sites.find((s) => s.id === attendant?.siteId),
        to = sites.find((n) => n !== from);
      if (!from || !to) return { ok: false, message: 'Visit the SpaceX attendant.' };
      const paid = p.inventory.economy.trade('rocket');
      if (!paid.ok) return paid;
      s.rocket.start(from, to, position(p));
      p.mode = 'hidden';
    } else if (args.kind === 'gondola') {
      const up = near(s.tahoe.baseEntry);
      if (!up && !near(s.tahoe.summitEntry))
        return { ok: false, message: 'Walk to the gondola station.' };
      s.tahoe.gondola(up);
      p.mode = 'gondola';
    } else if (args.kind === 'ski') {
      if (!near(s.tahoe.summitEntry) || !s.tahoe.state.rented || !s.tahoe.startSki())
        return { ok: false, message: 'Rent skis at the summit first.' };
      p.mode = 'ski';
    } else if (args.kind === 'sutro') {
      const tower = geometry.objects?.find((n) => n.sight?.id === 'sutro'),
        from = { x: p.x - 0.5, y: p.z - 0.5 };
      // The landmark's general visitor entry is on a different side of
      // the hill. Validate the very same reachable ladder as the client.
      const ladder = tower && geometry.approaches?.sutro?.(from);
      if (
        !ladder ||
        !tower ||
        !hasPhysicalBounds(tower) ||
        Math.hypot(from.x - ladder.x, from.y - ladder.y) > 1.8 ||
        Math.abs(p.y - geometry.characterGround(p.x, p.z)) > 1.2 ||
        !geometry.canTravel!(from.x, from.y, ladder.x, ladder.y, true)
      )
        return { ok: false, message: 'Walk to the Sutro service ladder.' };
      if (
        !s.sutro.begin(
          { x: tower.x + tower.w / 2, z: tower.y + tower.d / 2, base: tower.base ?? 0 },
          position(p),
        )
      )
        return { ok: false, message: 'You are already on the Sutro ladder.' };
      p.mode = 'climb';
    } else if (args.kind === 'skiFlip') {
      return { ok: s.tahoe.flip() };
    } else if (args.kind === 'descend') {
      if (!s.sutro.descend()) return { ok: false, message: 'You are not on Sutro Tower.' };
      s.mode = 'walk';
      p.mode = 'climb';
    } else return { ok: false, message: 'Unknown journey.' };
    if (
      (['rocket', 'gondola', 'sutro', 'ski'] satisfies [string, string, string, string]).includes(
        args.kind,
      )
    ) {
      following.stop(p);
      park(p, s);
      s.mode = 'walk';
      p.training = false;
      p.attack = null;
      p.personalBattle = null;
      s.travelReturn = position(p);
    }
    s.route = [];
    p.inventory.save();
    dirty(p);
    return { ok: true, ...(args.kind === 'rocket' ? { inventory: p.inventory.snapshot() } : {}) };
  }
  function tick(dt: number) {
    for (const p of players.values()) {
      const s = state(p);
      if (!available(p) || following.owns(p)) {
        s.route = [];
        continue;
      }
      if (p.bomberActive) {
        if (!s.bomber.state.active) s.bomber.board(position(p));
        s.bomber.update(dt, { boost: s.boost });
        Object.assign(p, s.bomber.state.position, {
          angle: s.bomber.state.heading,
          phase: s.bomber.state.bank + s.bomber.state.rollAngle,
          moving: s.bomber.state.speed > 0,
          motion: 0,
          mode: 'bomber',
        });
        continue;
      }
      if (s.bomber.state.active) s.bomber.stop();
      let v = null;
      if (s.rocket.state.active) {
        s.rocket.update(dt);
        const pose = s.rocket.state.pose!;
        v = { ...s.rocket.state.position, angle: pose.angle };
        p.phase = pose.phase;
        p.motion = pose.motion;
        p.moving = pose.motion > 1e-5;
        p.mode = s.rocket.state.active ? 'hidden' : 'walk';
      } else if (s.tahoeValue && s.tahoeValue.state.mode !== 'ground') {
        s.tahoe.update(dt);
        v = { ...s.tahoe.state.position, angle: s.tahoe.state.angle };
        p.mode =
          s.tahoe.state.mode === 'ski'
            ? 'ski'
            : s.tahoe.state.mode === 'ground'
              ? 'walk'
              : 'gondola';
        p.phase = s.tahoe.state.flipAngle || 0;
        p.motion = 0;
        p.moving = s.tahoe.state.mode !== 'ground';
      } else if (s.sutro.state.active) {
        const before = s.sutro.state.position!,
          event = s.sutro.update(dt),
          pose = s.sutro.state.pose!;
        v = { ...s.sutro.state.position, angle: pose.angle };
        p.moving = pose.motion > 0.00001;
        p.motion = pose.motion;
        p.phase =
          pose.mode === 'climb'
            ? (pose.ladderHeight * Math.PI * 2) / CHARACTER_CLIPS.climb.stride
            : p.phase +
              (Math.hypot(v.x! - before.x, v.z! - before.z) * Math.PI * 2) /
                CHARACTER_CLIPS.walk.stride;
        if (event === 'ground') s.mode = 'walk';
        p.mode =
          event === 'ground'
            ? 'walk'
            : s.sutro.state.phase === 'top' && s.mode === 'dance'
              ? 'dance'
              : 'climb';
      } else if (s.ferrari?.state.riding) {
        s.ferrari.update(dt);
        v = s.ferrari.position;
        p.mode = 'ferrari';
        p.moving = s.ferrari.state.speed > 0;
      }
      if (v) {
        if (p.mode === 'ferrari') {
          p.phase += Math.hypot(v.x! - p.x, v.z! - p.z) * Math.PI;
          p.motion = 0;
        }
        Object.assign(p, { x: v.x, y: v.y, z: v.z, angle: v.angle ?? p.angle });
        dirty(p);
        continue;
      }
      if (s.mode === 'surf') {
        p.gesture =
          s.surfKind === 'surf' ? (s.wave.state.ride ? 'surfboard' : 'paddle') : 'windsurf';
        p.gestureUntil = 0;
      }
      if (s.mode === 'surf' && s.windsurf.state.jump) {
        const jump = s.windsurf.state.jump,
          landed = s.windsurf.updateJump(dt);
        Object.assign(p, {
          x: jump.x + 0.5,
          z: jump.y + 0.5,
          y: 0.1 + jump.height,
          angle: jump.angle,
          phase: jump.pitch || 0,
          mode: 'surf',
          moving: !landed,
        });
        continue;
      }
      if (s.mode === 'surf' && s.surfKind === 'surf') {
        s.wave.update(dt);
        if (s.wave.state.ride && s.wave.state.position) {
          const at = s.wave.state.position;
          Object.assign(p, {
            x: at.x,
            z: at.z,
            y: 0.1 + s.wave.pose.height,
            angle: s.wave.state.angle,
            phase: s.wave.pose.roll || 0,
            mode: 'surf',
            moving: true,
          });
          continue;
        }
      }
      if (
        p.training ||
        p.personalBattle ||
        (['dance', 'sit', 'bench'] satisfies [string, string, string]).includes(s.mode)
      ) {
        p.moving = false;
        p.motion = 0;
        continue;
      }
      if (s.mode === 'roll' && now() > s.rollUntil!) {
        s.mode = 'walk';
        p.mode = 'walk';
      }
      let budget =
          dt *
          ((
            {
              walk: GAMEPLAY.walkSpeed,
              roll: GAMEPLAY.rollSpeed,
              bike: 8.2,
              skateboard: 7.6,
              motorcycle: 14,
              surf: 7.2,
            } as Record<string, number>
          )[s.mode] || GAMEPLAY.walkSpeed),
        moved = 0;
      while (budget > 1e-8 && s.route.length) {
        const n = s.route[0],
          dx = n.x + 0.5 - p.x,
          dz = n.y + 0.5 - p.z,
          d = Math.hypot(dx, dz),
          step = Math.min(budget, d);
        if (d < 1e-8) {
          s.route.shift();
          continue;
        }
        const from = { x: p.x - 0.5, y: p.z - 0.5 },
          cave = p.instance?.kind === 'illuminati';
        if (s.checked !== n) {
          const valid = p.personalJailed
            ? geometry.detention?.path(from, n)
            : cave
              ? CAVE_NAVIGATION.segment(from, n)
              : s.mode === 'surf'
                ? geometry.surf?.segment(from, n)
                : geometry.canTravel!(from.x, from.y, n.x, n.y, true);
          if (!valid) {
            s.route = [];
            break;
          }
          s.checked = n;
        }
        p.x += (dx / d) * step;
        p.z += (dz / d) * step;
        p.y = p.personalJailed
          ? geometry.detention!.base + 0.18
          : cave
            ? ILLUMINATI_CAVE.floor + 0.025
            : s.mode === 'surf'
              ? 0.1
              : geometry.characterGround(p.x, p.z);
        p.angle = Math.atan2(dz, dx);
        moved += step;
        budget -= step;
        if (d <= step + 1e-8) s.route.shift();
      }
      p.moving = moved > 0;
      p.motion = p.moving ? 1 : 0;
      p.phase =
        s.mode === 'roll'
          ? Math.min(1, Math.max(0, (now() - s.rollStartedAt!) / (FORWARD_ROLL_DURATION * 1000))) *
            Math.PI *
            2
          : s.mode === 'surf'
            ? 0
            : p.phase + moved * Math.PI;
      p.mode = p.training ? 'train' : s.mode;
      if (moved) dirty(p);
    }
  }
  return {
    move,
    activity,
    travel,
    tick,
    stop,
    wake,
    state,
    position,
    leaveTraining,
    savePosition(p: ServerPlayer, fallback: import('../types/server.ts').NetworkPosition) {
      if (p.seat)
        return {
          ...p.seat.exit,
          y: geometry.characterGround(p.seat.exit.x, p.seat.exit.z),
          angle: p.angle,
          hp: p.hp,
        };
      const s = active.get(p.id);
      if (s?.rocket.state.active) {
        const to = s.rocket.state.to!;
        return {
          x: to.entry.x + 0.5,
          z: to.entry.y + 0.5,
          y: to.base + 0.04,
          angle: p.angle,
          hp: p.hp,
        };
      }
      if (s?.sutro.state.active || (s?.tahoeValue && s.tahoeValue.state.mode !== 'ground'))
        return { ...(s.travelReturn || fallback), hp: p.hp };
      return fallback;
    },
    remove: (p: ServerPlayer) => {
      const s = active.get(p.id);
      if (s) park(p, s);
      active.delete(p.id);
    },
    barrelRoll: (p: ServerPlayer) => ({ ok: !!p.bomberActive && state(p).bomber.barrelRoll() }),
    clear: (p: ServerPlayer) => {
      leaveSeat(p);
      const s = active.get(p.id);
      if (s) park(p, s);
      stop(p);
      active.delete(p.id);
    },
  };
}
