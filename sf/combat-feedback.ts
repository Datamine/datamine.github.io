import { isFiniteNumber } from './types/json.ts';
export interface CombatHit {
  id: number;
  damage: number;
  ttl: number;
}
export interface FeedbackActor<T extends object> {
  target: T;
  hp: number;
  max: number;
  ttl: number;
  engaged: boolean;
  hits: CombatHit[];
}

export const COMBAT_BAR_SECONDS = 4,
  COMBAT_SPLAT_SECONDS = 1.15;

/** Simulation-time feedback shared by melee and ranged encounters. Actor
 * references keep bars and hits attached while either combatant moves. */
export function createCombatFeedback<T extends object = object>() {
  const actors = new Map<T, FeedbackActor<T>>();
  let serial = 0;
  function track(target: T, hp: number, max: number) {
    let actor = actors.get(target);
    if (!actor) {
      actor = { target, hp, max, ttl: 0, engaged: false, hits: [] };
      actors.set(target, actor);
    }
    actor.hp = Math.max(0, hp);
    actor.max = Math.max(1, max);
    return actor;
  }
  return {
    show(target: T, hp: number, max: number) {
      track(target, hp, max).ttl = COMBAT_BAR_SECONDS;
    },
    hit(target: T, damage: number, hp: number, max: number) {
      const actor = track(target, hp, max);
      actor.ttl = actor.hp ? COMBAT_BAR_SECONDS : COMBAT_SPLAT_SECONDS;
      actor.hits.push({
        id: ++serial,
        damage: Math.max(0, Math.floor(damage)),
        ttl: COMBAT_SPLAT_SECONDS,
      });
      if (actor.hits.length > 4) actor.hits.shift();
    },
    engage(entries: readonly { target: T; hp: number; max: number }[]) {
      for (const actor of actors.values()) actor.engaged = false;
      for (const { target, hp, max } of entries) track(target, hp, max).engaged = true;
    },
    update(dt: unknown) {
      if (!isFiniteNumber(dt) || dt <= 0) return;
      for (const [target, actor] of actors) {
        actor.ttl = Math.max(0, actor.ttl - dt);
        for (const hit of actor.hits) hit.ttl -= dt;
        actor.hits = actor.hits.filter((hit) => hit.ttl > 0);
        if (!actor.engaged && !actor.ttl && !actor.hits.length) actors.delete(target);
      }
    },
    entries() {
      return [...actors.values()].filter((actor) => actor.engaged || actor.ttl > 0);
    },
    clear() {
      actors.clear();
    },
  };
}

/** A small reusable DOM pool keeps readable pixel-sized bars independent of
 * camera angle, terrain, and zoom. No geometry or textures are rebuilt. */
export function createCombatOverlay(element: HTMLDivElement) {
  const pool: ReturnType<typeof make>[] = [];
  function make() {
    const root = document.createElement('div'),
      bar = document.createElement('div'),
      fill = document.createElement('span'),
      hits = document.createElement('div');
    root.className = 'sf-combat-actor';
    bar.className = 'sf-combat-bar';
    hits.className = 'sf-combat-hits';
    bar.append(fill);
    root.append(bar, hits);
    element.append(root);
    return { root, bar, fill, hits, splats: [] as HTMLSpanElement[] };
  }
  return {
    draw<T extends object>(
      entries: readonly FeedbackActor<T>[],
      anchor: (target: T) => { x: number; y: number; z: number },
      project: (
        x: number,
        y: number,
        z: number,
      ) => { x: number; y: number; distance: number; depth: number },
      width: number,
      height: number,
    ) {
      let used = 0;
      for (const actor of entries) {
        const a = anchor(actor.target),
          p = project(a.x, a.y, a.z);
        if (
          p.distance <= 0 ||
          p.depth > 1 ||
          p.x < -40 ||
          p.x > width + 40 ||
          p.y < -50 ||
          p.y > height + 50
        )
          continue;
        const view = pool[used] || (pool[used] = make());
        used++;
        view.root.hidden = false;
        view.root.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px)';
        view.fill.style.width = Math.min(100, (actor.hp / actor.max) * 100) + '%';
        view.bar.title = actor.hp + ' / ' + actor.max + ' HP';
        view.bar.dataset.hp = String(actor.hp);
        view.bar.dataset.max = String(actor.max);
        actor.hits.forEach((hit, i) => {
          let splat = view.splats[i];
          if (!splat) {
            splat = document.createElement('span');
            splat.className = 'sf-hitsplat';
            view.hits.append(splat);
            view.splats.push(splat);
          }
          const age = 1 - hit.ttl / COMBAT_SPLAT_SECONDS,
            lane = (hit.id % 3) - 1;
          splat.hidden = false;
          splat.textContent = String(hit.damage);
          splat.dataset.miss = String(hit.damage === 0);
          splat.style.transform =
            'translate(' + lane * 19 + 'px,' + (30 - age * 17 + (i % 2) * 9) + 'px)';
          splat.style.opacity = String(Math.min(1, hit.ttl / 0.22));
        });
        for (let i = actor.hits.length; i < view.splats.length; i++) view.splats[i].hidden = true;
      }
      for (let i = used; i < pool.length; i++) pool[i].root.hidden = true;
    },
  };
}
