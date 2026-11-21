import { isFiniteNumber } from './types/json.ts';
import type {
  WildernessSpawn,
  WildernessPerson,
  WildernessActor,
  WildernessDrop,
  MonsterStats,
} from './types/monsters.ts';
import type { WorldPoint, Point } from './types/geometry.ts';
interface WildernessOptions<P extends WildernessPerson> {
  spawns?: readonly WildernessSpawn[];
  ground?: (x: number, z: number) => number;
  canTravel?: (from: WorldPoint, to: WorldPoint) => boolean;
  route?: (from: WildernessActor, to: WorldPoint) => WorldPoint[] | null | undefined;
  random?: () => number;
  onHit?: (event: { actor: WildernessActor; attacker: WildernessPerson; damage: number }) => void;
  onDrop?: (drop: WildernessDrop, attacker: WildernessPerson) => void;
  onDamage?: (person: P, amount: number, actor: WildernessActor) => void;
}
type WalkingMonster = MonsterStats & {
  speed: number;
  leash: number;
  interval: number;
  respawn: number;
};
import { EMF_WARRIOR } from './bolinas.ts';
import { GOBLIN_SPAWNS } from './goblin-town.ts';
import { ITEM_STATS } from './item-stats.ts';
import { MONSTER_STATS, rollMonsterDrops } from './monster-drops.ts';
import { rollWeaponDamage } from './combat.ts';
import {
  OUTLAW_SITE,
  LOST_PIRATE_SITE,
  LANDSHARK_SITE,
  TERMINATOR_SITE,
  BISON_SITE,
} from './wilderness-sites.ts';

/** Pet from a neighboring tile, with enough room for both models. Coordinates
 * here are world coordinates; navigation helpers use tile coordinates. */
export function besideBear(person: WorldPoint, bear: WorldPoint) {
  const distance = Math.hypot(person.x - bear.x, person.z - bear.z),
    dx = Math.abs(Math.floor(person.x) - Math.floor(bear.x)),
    dz = Math.abs(Math.floor(person.z) - Math.floor(bear.z));
  return distance >= 1.05 && distance <= 1.9 && Math.max(dx, dz) === 1;
}
export function bearPettingApproach({
  from,
  bear,
  free,
  canTravel,
  pathTo,
}: {
  from: Point;
  bear: WorldPoint;
  free: (x: number, y: number) => boolean;
  canTravel: (ax: number, ay: number, bx: number, by: number, ignore?: boolean) => boolean;
  pathTo: (x: number, y: number, from: Point) => unknown;
}) {
  const candidates = [];
  for (let dx = -1; dx <= 1; dx++)
    for (let dz = -1; dz <= 1; dz++) {
      const p = { x: Math.floor(bear.x) + dx, y: Math.floor(bear.z) + dz };
      if (
        besideBear({ x: p.x + 0.5, z: p.y + 0.5 }, bear) &&
        free(p.x, p.y) &&
        canTravel(p.x, p.y, bear.x - 0.5, bear.z - 0.5, true)
      )
        candidates.push(p);
    }
  candidates.sort(
    (a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y),
  );
  return candidates.find((p) => pathTo(p.x, p.y, from)) || null;
}

export function wildernessSpawns({ marin, tahoe }: { marin: Point; tahoe: WorldPoint }) {
  return [
    { id: 'marin-bear', combatKind: 'bear', x: marin.x + 0.5, z: marin.y + 0.5 },
    // Keep the giant group on the snowy walking route, about ten tiles
    // farther from the rocket landing than its previous village positions.
    ...[
      [-12, -11, 'snow-giant'] satisfies [number, number, string],
      [-14, -13, 'ice-giant'] satisfies [number, number, string],
      [-9, -14, 'snow-giant'] satisfies [number, number, string],
      [-8, -12, 'ice-giant'] satisfies [number, number, string],
    ].map(([dx, dz, combatKind], i) => ({
      id: 'tahoe-giant-' + i,
      combatKind,
      x: tahoe.x + dx,
      z: tahoe.z + dz,
    })),
    { ...OUTLAW_SITE },
    { ...LOST_PIRATE_SITE },
    { ...LANDSHARK_SITE },
    { ...TERMINATOR_SITE },
    { ...BISON_SITE },
    ...GOBLIN_SPAWNS,
    { ...EMF_WARRIOR },
    ...[
      [43.5, 17.25] satisfies [number, number],
      [40.5, 18.5] satisfies [number, number],
      [49.5, 19.5] satisfies [number, number],
      [46, 21] satisfies [number, number],
    ].map(([x, z], i) => ({ id: 'waterfront-seagull-' + i, combatKind: 'seagull', x, z })),
  ];
}
/** Shared simulation, also used unchanged in single player. No DOM, meshes,
 * sockets or inventory ownership live in this controller. */
export function createWilderness<P extends WildernessPerson = WildernessPerson>({
  spawns = [],
  ground = () => 0,
  canTravel = () => true,
  route = (a, b) => (canTravel(a, b) ? [b] : null),
  random = Math.random,
  onHit = () => {},
  onDrop = () => {},
  onDamage = () => {},
}: WildernessOptions<P> = {}) {
  let clock = 0;
  const statsByKind = new Map<string, WalkingMonster>();
  function walkingStats(kind: string): WalkingMonster {
    const cached = statsByKind.get(kind);
    if (cached) return cached;
    const stats = MONSTER_STATS[kind];
    if (
      !stats ||
      !isFiniteNumber(stats.speed) ||
      !isFiniteNumber(stats.leash) ||
      !isFiniteNumber(stats.interval) ||
      !isFiniteNumber(stats.respawn)
    )
      throw new Error('Invalid wilderness monster: ' + kind);
    const walking = stats as WalkingMonster;
    statsByKind.set(kind, walking);
    return walking;
  }
  const actors: WildernessActor[] = spawns.map((p, i) => {
    const s = walkingStats(p.combatKind);
    return {
      ...p,
      wilderness: true,
      label: s.name,
      level: s.level,
      height: s.height || (s.friendly ? 1.6 : 3.5),
      hp: s.hp,
      max: s.hp,
      base: ground(p.x, p.z),
      home: { x: p.x, z: p.z },
      angle: i,
      phase: 0,
      motion: 0,
      respawn: 0,
      enemy: null,
      path: [],
      repath: 0,
      attackAt: 0,
      affection: 0,
      description:
        s.description ||
        (p.combatKind === 'bear'
          ? 'A big bear with small ambitions: sunshine, a nap, and perhaps your sandwich.'
          : p.combatKind === 'snow-giant'
            ? 'An ancient snowdrift with fists. Its scarf is a small avalanche.'
            : 'A glacier has stood up, and it is not pleased about your carbon footprint.'),
    };
  });
  function strike(id: string, attacker: WildernessPerson) {
    const actor = actors.find((n) => n.id === id),
      weapon = ITEM_STATS[attacker.weapon || 'unarmed'] || ITEM_STATS.unarmed;
    if (!actor?.hp)
      return { ok: false, message: 'That creature is resting. Come back after it respawns.' };
    if (
      Math.hypot(actor.x - attacker.x, actor.z - attacker.z) >
      (weapon.range ?? ITEM_STATS.unarmed.range) + 0.01
    )
      return { ok: false, message: 'Move closer to the ' + actor.label.toLowerCase() + '.' };
    return damage(
      id,
      rollWeaponDamage(attacker.level, attacker.weapon, random, attacker.inebriation),
      attacker,
      true,
    );
  }
  function damage(id: string, amount: unknown, attacker: WildernessPerson, retaliate = false) {
    const actor = actors.find((n) => n.id === id);
    if (!actor?.hp || !isFiniteNumber(amount) || amount < 0) return { ok: false };
    if (actor.combatKind === 'emf-warrior' && attacker?.tinfoil !== true)
      return { ok: false, message: 'A wall of static forces you back.' };
    const hit = Math.min(actor.hp, Math.floor(amount));
    actor.hp -= hit;
    actor.enemy = retaliate ? attacker.id : null;
    actor.affection = 0;
    actor.repath = 0;
    actor.attackAt = Math.max(actor.attackAt, clock + 0.6);
    onHit({ actor, attacker, damage: hit });
    if (!actor.hp) {
      actor.enemy = null;
      actor.path = [];
      actor.motion = 0;
      actor.respawn = walkingStats(actor.combatKind).respawn;
      for (const drop of rollMonsterDrops(actor.combatKind, random))
        onDrop({ ...drop, x: actor.x, z: actor.z, base: actor.base + 0.025 }, attacker);
    }
    return { ok: true, damage: hit, hp: actor.hp, max: actor.max };
  }
  function pet(id: string, person: { z: number; x: number }) {
    const actor = actors.find((n) => n.id === id);
    if (
      actor?.combatKind !== 'bear' ||
      !actor.hp ||
      !besideBear(person, actor) ||
      !canTravel(person, actor)
    )
      return { ok: false, message: 'Stand beside the friendly bear to pet it.' };
    actor.enemy = null;
    actor.path = [];
    actor.motion = 0;
    actor.affection = 3;
    actor.angle = Math.atan2(person.z - actor.z, person.x - actor.x);
    return {
      ok: true,
      message:
        'You pet the bear. It leans into your hand and makes a very contented huff. What a nice bear.',
    };
  }
  function update(dt: unknown, people: readonly P[] = []) {
    if (!isFiniteNumber(dt) || dt <= 0) return;
    clock += dt;
    const byId = new Map(people.map((p) => [p.id, p]));
    for (const [i, actor] of actors.entries()) {
      const stats = walkingStats(actor.combatKind),
        inTerritory = (p: WorldPoint) =>
          !stats.territoryHalfWidth ||
          Math.max(Math.abs(p.x - actor.home.x), Math.abs(p.z - actor.home.z)) <=
            stats.territoryHalfWidth;
      actor.affection = Math.max(0, actor.affection - dt);
      if (!actor.hp) {
        actor.respawn = Math.max(0, actor.respawn - dt);
        if (!actor.respawn)
          Object.assign(actor, {
            hp: actor.max,
            x: actor.home.x,
            z: actor.home.z,
            base: ground(actor.home.x, actor.home.z),
            enemy: null,
            path: [],
          });
        continue;
      }
      let enemy: P | null = (actor.enemy === null ? undefined : byId.get(actor.enemy)) || null;
      if (
        (enemy && Math.hypot(enemy.x - actor.home.x, enemy.z - actor.home.z) > stats.leash) ||
        (enemy && !inTerritory(enemy))
      ) {
        actor.enemy = null;
        enemy = null;
      }
      if (!enemy) actor.enemy = null;
      if (!enemy && stats.aggression) {
        let closest = stats.aggression + 0.000001;
        for (const person of people) {
          const distance = stats.territoryHalfWidth
            ? Math.max(Math.abs(person.x - actor.home.x), Math.abs(person.z - actor.home.z))
            : Math.hypot(person.x - actor.x, person.z - actor.z);
          if (
            inTerritory(person) &&
            distance < closest &&
            Math.hypot(person.x - actor.home.x, person.z - actor.home.z) <= stats.leash
          ) {
            enemy = person;
            closest = distance;
          }
        }
        if (enemy) {
          actor.enemy = enemy.id;
          actor.repath = 0;
          actor.attackAt = Math.max(actor.attackAt, clock + 0.6);
        }
      }
      if (actor.affection && !enemy) {
        actor.path = [];
        actor.motion = 0;
        continue;
      }
      actor.repath -= dt;
      const direct = enemy && stats.pursuit === 'direct';
      const clear = (a: WorldPoint, b: WorldPoint) => {
        if (!inTerritory(b) || !canTravel(a, b)) return false;
        if (!stats.radius) return true;
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4,
            dx = Math.cos(angle) * stats.radius,
            dz = Math.sin(angle) * stats.radius;
          if (!canTravel({ x: a.x + dx, z: a.z + dz }, { x: b.x + dx, z: b.z + dz })) return false;
        }
        return true;
      };
      if (actor.repath <= 0) {
        actor.repath = enemy ? 0.6 : 1.5;
        const goal = enemy
          ? { x: enemy.x, z: enemy.z }
          : Math.hypot(actor.x - actor.home.x, actor.z - actor.home.z) >
              (stats.roamRadius || 1) + 0.25
            ? actor.home
            : {
                x: actor.home.x + Math.sin(clock * 0.17 + i) * (stats.roamRadius || 0.24),
                z:
                  actor.home.z +
                  Math.cos(clock * 0.2 + i) * (stats.roamRadius ? stats.roamRadius * 0.7 : 0.65),
              };
        actor.path = direct ? [] : route(actor, goal) || [];
      }
      const distance = enemy ? Math.hypot(enemy.x - actor.x, enemy.z - actor.z) : Infinity;
      let budget =
        enemy && distance < 1.35 ? 0 : dt * (enemy ? stats.speed : stats.roamSpeed || 0.45);
      actor.motion = 0;
      // Giants pursue in short direct steps rather than finding a route
      // around every obstacle. Their broader bodies stop beside trunks;
      // players can reposition around a tree to establish a safe shot.
      while (budget > 1e-8 && (direct || actor.path.length)) {
        const next = direct ? enemy! : actor.path[0],
          dx = next.x - actor.x,
          dz = next.z - actor.z,
          d = Math.hypot(dx, dz),
          step = Math.min(budget, d, direct ? Math.min(0.2, Math.max(0, d - 1.35)) : Infinity);
        if (step <= 1e-8) break;
        const end = { x: actor.x + (dx / d) * step, z: actor.z + (dz / d) * step };
        if (!clear(actor, end)) {
          actor.path = [];
          break;
        }
        actor.x = end.x;
        actor.z = end.z;
        actor.angle = Math.atan2(dz, dx);
        actor.motion = 1;
        actor.phase += step * (stats.walkStride ? (Math.PI * 2) / stats.walkStride : 4);
        budget -= step;
        if (!direct && d <= step + 1e-8) actor.path.shift();
      }
      actor.base = ground(actor.x, actor.z);
      if (
        enemy &&
        (stats.territoryHalfWidth
          ? inTerritory(enemy)
          : Math.hypot(enemy.x - actor.x, enemy.z - actor.z) < 1.6) &&
        clock >= actor.attackAt &&
        clear(actor, enemy)
      ) {
        actor.attackAt = clock + stats.interval;
        onDamage(enemy, stats.damage, actor);
      }
    }
  }
  function sync(records: readonly (Pick<WildernessActor, 'id'> & Partial<WildernessActor>)[] = []) {
    for (const p of records) {
      const actor = actors.find((n) => n.id === p.id);
      if (actor) Object.assign(actor, p, { path: [] });
    }
  }
  return {
    actors,
    strike,
    damage,
    pet,
    update,
    sync,
    snapshot: () => actors.map(({ path, home, ...actor }) => ({ ...actor, home: { ...home } })),
  };
}
