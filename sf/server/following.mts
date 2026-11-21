import { isFiniteNumber } from '../types/json.ts';
import type { Point } from '../types/geometry.ts';
interface FollowState {
  target: number;
  attack: boolean;
  route: Point[];
  replan: number;
  goalX: number;
  goalZ: number;
  checked?: Point;
  checkedRevision?: number;
}
import type { SimulationServices, ServerPlayer } from '../types/server.ts';
import { sameMapInstance } from '../map-instances.ts';
import { guildMayEnter } from './guild.mts';
import { ITEM_STATS } from '../item-stats.ts';
const FOLLOW_SPEED = 4.6,
  FOLLOW_RANGE = 1.2;
/** Routes and distance budgets belong to the fixed-step server. Neither
 * camera focus nor client pose packets advance a follower. */
export function createServerFollowing({
  players,
  geometry,
  routes,
  pvp,
  send,
  dirty,
  now = Date.now,
}: Pick<SimulationServices, 'players' | 'geometry' | 'routes' | 'pvp' | 'send' | 'dirty' | 'now'>) {
  const active = new Map<number, FollowState>();
  let elapsed = 0,
    cursor = 0;
  const pose = (p: ServerPlayer) => ({
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
  const available = (p: ServerPlayer) =>
    p &&
    p.transport.open &&
    p.hp > 0 &&
    !p.respawnAllowed &&
    !p.personalJailed &&
    !p.airship &&
    !p.grappling &&
    !p.parachute &&
    !p.bomberActive &&
    !p.tabletTeleport &&
    (p.instance?.kind || 'world') === 'world' &&
    (
      ['walk', 'dance', 'train', 'roll', 'sit'] satisfies [string, string, string, string, string]
    ).includes(p.mode);
  function stop(p: ServerPlayer, message = '') {
    const state = active.get(p.id);
    if (!state) return false;
    active.delete(p.id);
    p.following = null;
    p.moving = false;
    p.motion = 0;
    p.lastPoseAt = now();
    if (state.attack) pvp.stop(p);
    dirty(p);
    send(p, { type: 'following', target: null, position: pose(p), message });
    return true;
  }
  function validate(
    p: ServerPlayer,
    target: ServerPlayer | undefined,
    attack = false,
    groundCache: Map<number, number> | null = null,
  ) {
    if (!available(p)) return 'Stand on the ground before following another player.';
    if (
      !target ||
      target === p ||
      !target.transport.open ||
      !sameMapInstance(p, target) ||
      !target.hp ||
      target.respawnAllowed
    )
      return 'That player is no longer nearby.';
    let ground = groundCache?.get(target.id);
    if (ground === undefined) {
      ground = geometry.characterGround(target.x, target.z);
      groundCache?.set(target.id, ground);
    }
    if (
      !(
        [
          'walk',
          'bike',
          'motorcycle',
          'ferrari',
          'skateboard',
          'roll',
          'dance',
          'train',
          'sit',
        ] satisfies [string, string, string, string, string, string, string, string, string]
      ).includes(target.mode) ||
      Math.abs(target.y - ground) > 2.5
    )
      return 'You cannot follow them there.';
    if (attack && (!pvp.status(p).enabled || !pvp.status(target).enabled))
      return 'Both players must enable PvP.';
    return '';
  }
  function plan(p: { x: number; z: number }, target: { x: number; z: number }, range: number) {
    const origin = { x: p.x - 0.5, y: p.z - 0.5 },
      r = Math.min(0.9, range * 0.75),
      candidates = Array.from({ length: 12 }, (_, i) => ({
        x: target.x - 0.5 + Math.cos((i * Math.PI) / 6) * r,
        y: target.z - 0.5 + Math.sin((i * Math.PI) / 6) * r,
      }));
    candidates.push({ x: target.x - 0.5, y: target.z - 0.5 });
    candidates.sort(
      (a, b) =>
        Math.hypot(a.x - origin.x, a.y - origin.y) - Math.hypot(b.x - origin.x, b.y - origin.y),
    );
    for (const goal of candidates) {
      if (!geometry.landClearAt(goal.x, goal.y)) continue;
      const path = routes
        ? routes.pathTo(goal.x, goal.y, origin, true)
        : geometry.pathTo(goal.x, goal.y, origin, true);
      if (path) return path.map((p) => ({ ...p }));
    }
    return null;
  }
  function start(p: ServerPlayer, id: unknown, { attack = false } = {}) {
    const target = typeof id === 'number' ? players.get(id) : undefined,
      error = validate(p, target, attack);
    if (error || !target) return { ok: false, message: error };
    if (Math.hypot(p.x - target.x, p.z - target.z) > 38)
      return { ok: false, message: 'That player is too far away to follow.' };
    const range = attack ? ITEM_STATS[pvp.weaponFor(p)].range + 0.1 : FOLLOW_RANGE,
      route = Math.hypot(p.x - target.x, p.z - target.z) > range ? plan(p, target, range) : [];
    if (!route) return { ok: false, message: 'No walkable route to that player.' };
    pvp.stop(p);
    p.attack = null;
    p.mode = 'walk';
    p.following = target.id;
    active.set(p.id, {
      target: target.id,
      attack,
      route,
      replan: elapsed + 0.5 + (p.id % 10) * 0.05,
      goalX: Math.floor(target.x * 4),
      goalZ: Math.floor(target.z * 4),
    });
    dirty(p);
    send(p, { type: 'following', target: id, attack, position: pose(p) });
    return {
      ok: true,
      following: id,
      message: 'Following ' + target.name + '. Click the ground to stop.',
    };
  }
  function tick(dt: unknown) {
    if (!isFiniteNumber(dt) || dt <= 0) return;
    elapsed += dt;
    const groundCache = new Map<number, number>();
    const ids = [...active.keys()];
    let nextCursor = cursor;
    for (let i = 0; i < ids.length; i++) {
      const index = (cursor + i) % ids.length,
        id = ids[index],
        state = active.get(id);
      if (!state) continue;
      const p = players.get(id),
        target = players.get(state.target);
      if (!p) {
        active.delete(id);
        continue;
      }
      const error = validate(p, target, state.attack, groundCache);
      if (error || !target || Math.hypot(p.x - target.x, p.z - target.z) > 80) {
        stop(p, error || 'That player is no longer nearby.');
        continue;
      }
      const range = state.attack ? ITEM_STATS[pvp.weaponFor(p)].range + 0.1 : FOLLOW_RANGE,
        distance = Math.hypot(target.x - p.x, target.z - p.z),
        clear =
          !state.attack ||
          distance > range ||
          !geometry.lineClear ||
          geometry.lineClear({ ...p, base: p.y }, { ...target, base: target.y });
      if (distance <= range && (!state.attack || clear)) {
        p.moving = false;
        p.motion = 0;
        state.route = [];
        if (state.attack && p.pvpTarget !== target.id) pvp.attack(p, target.id);
        continue;
      }
      const gx = Math.floor(target.x * 4),
        gz = Math.floor(target.z * 4);
      if (
        elapsed >= state.replan &&
        (gx !== state.goalX || gz !== state.goalZ || !state.route.length) &&
        (!routes || routes.allowReplan())
      ) {
        nextCursor = (index + 1) % ids.length;
        const route = plan(p, target, range);
        state.replan = elapsed + 0.5;
        state.goalX = gx;
        state.goalZ = gz;
        if (route) state.route = route;
        else if (!state.route.length) {
          stop(p, 'No walkable route to that player.');
          continue;
        }
      }
      let budget = FOLLOW_SPEED * dt,
        traveled = 0;
      while (budget > 1e-8 && state.route.length) {
        const next = state.route[0],
          from = { x: p.x - 0.5, y: p.z - 0.5 },
          dx = next.x - from.x,
          dz = next.y - from.y,
          length = Math.hypot(dx, dz);
        if (length < 1e-8) {
          state.route.shift();
          continue;
        }
        const step = Math.min(budget, length),
          x = p.x + (dx / length) * step,
          z = p.z + (dz / length) * step,
          y = geometry.characterGround(x, z);
        // The tile map is immutable during play. Validate a new route edge
        // once, then consume its distance on subsequent ticks. A map
        // revision invalidates the cache if dynamic terrain is added.
        if (state.checked !== next || state.checkedRevision !== geometry.navigationRevision) {
          if (!geometry.canTravel!(from.x, from.y, next.x, next.y, true)) {
            stop(p, 'That route is blocked.');
            break;
          }
          state.checked = next;
          state.checkedRevision = geometry.navigationRevision;
        }
        if (!guildMayEnter(p, geometry, x, y, z)) {
          stop(p, 'The guild admits members only.');
          break;
        }
        Object.assign(p, {
          x,
          y,
          z,
          angle: Math.atan2(dz, dx),
          mode: 'walk',
          moving: true,
          motion: 1,
          lastPoseAt: now(),
        });
        traveled += step;
        budget -= step;
        if (length <= step + 1e-8) state.route.shift();
        if (Math.hypot(target.x - p.x, target.z - p.z) <= range) break;
      }
      if (!active.has(id)) continue;
      p.moving = traveled > 0;
      p.motion = p.moving ? 1 : 0;
      p.phase += traveled * Math.PI;
      if (traveled) dirty(p);
    }
    cursor = nextCursor;
  }
  return {
    start,
    stop,
    tick,
    active,
    owns: (p: Pick<ServerPlayer, 'id'>) => active.has(p.id),
    clear(p: ServerPlayer) {
      stop(p);
    },
  };
}
