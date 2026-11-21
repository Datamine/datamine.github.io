import type { TigerOptions, TigerState, TigerSnapshot, PursuitActor } from './types/zoo.ts';
import type { Point } from './types/geometry.ts';
// Navigation positions use the same logical tile coordinates as the player.
// Randomness is injected so dispatch and net attempts can be tested reliably.
export const ZOO_PURSUIT_SPEED = 4.6;
export function createTigerEncounter({
  player,
  home,
  exit,
  wardenStarts,
  routeTo,
  canCapture,
  canPursue = () => true,
  onDeath = () => {},
  onEvent = () => {},
  random = Math.random,
  speed = ZOO_PURSUIT_SPEED,
}: TigerOptions) {
  const tiger: PursuitActor = {
    ...home,
    path: [],
    angle: Math.PI,
    travel: 0,
    moving: false,
    repath: 0,
    target: null,
  };
  const state: TigerState = {
    phase: 'caged',
    elapsed: 0,
    gate: 0,
    tiger,
    wardens: [],
    dispatchAt: 0,
    attempts: 0,
    deaths: 0,
    grace: 0,
  };
  let transition = 0,
    transitionStart: Point | null = null,
    patrolDirection = 1,
    lastTarget: Point | null = null,
    dispatched = false;
  const roll = () => Math.max(0, Math.min(0.999999, random()));
  const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
  function move(actor: PursuitActor, budget: number) {
    actor.moving = false;
    while (budget > 1e-8 && actor.path.length) {
      const p = actor.path[0],
        dx = p.x - actor.x,
        dy = p.y - actor.y,
        d = Math.hypot(dx, dy);
      if (d < 1e-7) {
        actor.path.shift();
        continue;
      }
      const step = Math.min(budget, d);
      actor.x += (dx / d) * step;
      actor.y += (dy / d) * step;
      actor.angle = Math.atan2(dy, dx);
      actor.travel += step;
      actor.moving = true;
      budget -= step;
      if (step >= d - 1e-7) actor.path.shift();
    }
  }
  function follow(actor: PursuitActor, target: Point, dt: number, pace: number) {
    actor.repath -= dt;
    if (actor.repath <= 0) {
      if (
        !actor.target ||
        distance(actor.target, target) > 0.4 ||
        (!actor.path.length && distance(actor, target) > 0.3)
      ) {
        const path = routeTo(target.x, target.y, actor);
        if (path) actor.path = path;
        actor.target = { x: target.x, y: target.y };
      }
      actor.repath = 0.65 + (actor.index || 0) * 0.13;
    }
    move(actor, pace * dt);
  }
  function release() {
    if (state.phase !== 'caged') return false;
    Object.assign(state, {
      phase: 'opening',
      elapsed: 0,
      gate: 0,
      wardens: [],
      dispatchAt: 4 + roll() * 7,
      attempts: 0,
      deaths: 0,
      grace: 0,
    });
    transition = 0;
    transitionStart = { x: tiger.x, y: tiger.y };
    lastTarget = { x: player.x, y: player.y };
    dispatched = false;
    tiger.path = [];
    tiger.repath = 0;
    tiger.target = null;
    onEvent('released');
    return true;
  }
  function capture() {
    state.phase = 'returning';
    tiger.path = [];
    tiger.target = null;
    tiger.repath = 0;
    onEvent('captured');
  }
  function tick(dt: number) {
    state.elapsed += dt;
    state.grace = Math.max(0, state.grace - dt);
    for (const w of state.wardens) w.speechFor = Math.max(0, (w.speechFor || 0) - dt);
    if (state.phase === 'caged') {
      if (!tiger.path.length) {
        patrolDirection *= -1;
        tiger.path = [{ x: home.x, y: home.y + patrolDirection * 0.8 }];
      }
      move(tiger, 0.7 * dt);
      for (const w of state.wardens) follow(w, w.home, dt, speed * 0.8);
      state.wardens = state.wardens.filter((w) => distance(w, w.home) > 0.2);
      return;
    }
    if (state.phase === 'opening') {
      state.gate = Math.min(1, state.gate + dt / 0.7);
      if (state.gate >= 1 - 1e-8) {
        state.gate = 1;
        state.phase = 'escaping';
        transition = 0;
      }
      return;
    }
    if (state.phase === 'escaping' || state.phase === 'caging') {
      const inward = state.phase === 'caging',
        from = inward ? exit : transitionStart!,
        to = inward ? home : exit;
      transition = Math.min(1, transition + dt / 0.8);
      const before = { x: tiger.x, y: tiger.y };
      tiger.x = from.x + (to.x - from.x) * transition;
      tiger.y = from.y + (to.y - from.y) * transition;
      tiger.travel += distance(before, tiger);
      tiger.angle = Math.atan2(to.y - from.y, to.x - from.x);
      tiger.moving = transition < 1;
      if (transition >= 1 - 1e-8) {
        tiger.x = to.x;
        tiger.y = to.y;
        state.phase = inward ? 'closing' : 'loose';
        transition = 0;
      }
      return;
    }
    if (state.phase === 'closing') {
      state.gate = Math.max(0, state.gate - dt / 0.65);
      if (state.gate < 1e-8) {
        state.gate = 0;
        state.phase = 'caged';
        tiger.path = [];
        onEvent('caged');
      }
      return;
    }
    if (state.phase === 'loose') {
      if (canPursue()) lastTarget = { x: player.x, y: player.y };
      follow(tiger, lastTarget!, dt, speed);
      if (!dispatched && state.elapsed >= state.dispatchAt) {
        dispatched = true;
        state.wardens = wardenStarts.map((p, index) => ({
          ...p,
          home: { ...p },
          index,
          path: [],
          angle: 0,
          travel: 0,
          moving: false,
          repath: 0,
          target: null,
          pace: speed * (1.08 + roll() * 0.24),
          netAt: state.elapsed + 1 + roll() * 2,
        }));
        onEvent('dispatched');
      }
      for (const w of state.wardens) {
        follow(w, tiger, dt, state.elapsed > 75 ? speed * 1.65 : w.pace);
        if (distance(w, tiger) < 1 && canCapture(w, tiger) && state.elapsed >= w.netAt) {
          state.attempts++;
          w.netAt = state.elapsed + 1.5 + roll() * 3;
          if (roll() < 0.35 || state.elapsed > 75) {
            capture();
            break;
          }
          onEvent('missed', w);
        }
      }
      if (
        state.phase === 'loose' &&
        !state.grace &&
        canPursue() &&
        distance(tiger, player) < 0.66 &&
        canCapture(tiger, player)
      ) {
        state.deaths++;
        state.grace = 6;
        onDeath();
        return 'player-caught';
      }
    } else if (state.phase === 'returning') {
      follow(tiger, exit, dt, speed * 0.72);
      for (const w of state.wardens) follow(w, tiger, dt, speed * 0.8);
      if (distance(tiger, exit) < 0.05) {
        state.phase = 'caging';
        transition = 0;
      }
    }
    return null;
  }
  function update(dt: number) {
    let remaining = Math.max(0, dt);
    while (remaining > 1e-8) {
      const step = Math.min(0.05, remaining),
        event = tick(step);
      remaining -= step;
      if (event) return event;
    }
    return null;
  }
  function snapshot() {
    return {
      state: structuredClone(state),
      transition,
      transitionStart,
      patrolDirection,
      lastTarget,
      dispatched,
    };
  }
  function restore(saved: Partial<TigerSnapshot> | null | undefined) {
    if (
      !saved?.state ||
      !(
        ['caged', 'opening', 'escaping', 'closing', 'loose', 'returning', 'caging'] satisfies [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
        ]
      ).includes(saved.state.phase)
    )
      return false;
    const incoming = saved.state;
    if (!Number.isFinite(incoming.tiger?.x) || !Number.isFinite(incoming.tiger?.y)) return false;
    Object.assign(tiger, incoming.tiger, { path: [], repath: 0, target: null });
    Object.assign(state, incoming, {
      tiger,
      wardens: (incoming.wardens || []).map((w) => ({ ...w, path: [], repath: 0, target: null })),
    });
    transition = Math.max(0, Math.min(1, saved.transition || 0));
    transitionStart = saved.transitionStart || { ...home };
    patrolDirection = saved.patrolDirection === -1 ? -1 : 1;
    lastTarget = saved.lastTarget || { x: player.x, y: player.y };
    dispatched = saved.dispatched === true;
    return true;
  }
  return {
    state,
    release,
    update,
    snapshot,
    restore,
    get dangerous() {
      return state.phase === 'loose';
    },
  };
}
