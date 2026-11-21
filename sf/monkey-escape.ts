import { isFiniteNumber, isRecord } from './types/json.ts';
import type { RouteTo } from './types/controllers.ts';
import type { Point } from './types/geometry.ts';

import { ZOO_PURSUIT_SPEED } from './zoo-encounter.ts';

/** One ground-bound keeper follows the same tile graph as the tiger. Routes
 * retain their current progress when a new path is temporarily unavailable. */
export function createMonkeyPursuit({
  player,
  home,
  saved: savedInput = {},
  routeTo,
  canCapture,
  canPursue = () => true,
  onCaught = () => {},
  onSave = () => {},
  speed = ZOO_PURSUIT_SPEED,
}: {
  player: Point;
  home: Point;
  saved?: unknown;
  routeTo: RouteTo;
  canCapture: (actor: Point, player: Point) => boolean;
  canPursue?: () => boolean;
  onCaught?: () => void;
  onSave?: (value: Point) => void;
  speed?: number;
}) {
  const saved = isRecord(savedInput) ? savedInput : {};
  const actor = {
    x: isFiniteNumber(saved.x) ? saved.x : home.x,
    y: isFiniteNumber(saved.y) ? saved.y : home.y,
    angle: 0,
    travel: 0,
    moving: false,
    path: [] as Point[],
    repath: 0,
  };
  const state = { phase: 'idle', elapsed: 0, actor, speed };
  let target: Point | null = null,
    saveTime = 0;
  const save = () => {
    saveTime = 0;
    onSave({ x: actor.x, y: actor.y });
  };
  function start() {
    if (state.phase === 'chasing') return false;
    state.phase = 'chasing';
    state.elapsed = 0;
    actor.path = [];
    actor.repath = 0;
    target = { x: player.x, y: player.y };
    save();
    return true;
  }
  function stop() {
    if (state.phase === 'idle' || state.phase === 'returning') return;
    state.phase = 'returning';
    actor.path = [];
    actor.repath = 0;
    target = { ...home };
    save();
  }
  function tick(dt: number) {
    if (state.phase === 'idle' || dt <= 0) {
      actor.moving = false;
      return null;
    }
    state.elapsed += dt;
    saveTime += dt;
    if (state.phase === 'chasing' && canPursue()) target = { x: player.x, y: player.y };
    if (state.phase === 'returning') target = { ...home };
    actor.repath -= dt;
    if (actor.repath <= 0) {
      const path = target ? routeTo(target.x, target.y, actor) : null;
      if (path) actor.path = path;
      actor.repath = 0.45;
    }
    actor.moving = false;
    let budget = speed * dt;
    while (budget > 1e-8 && actor.path.length) {
      const p = actor.path[0],
        dx = p.x - actor.x,
        dy = p.y - actor.y,
        d = Math.hypot(dx, dy);
      if (d < 1e-8) {
        actor.path.shift();
        continue;
      }
      const step = Math.min(d, budget);
      actor.x += (dx / d) * step;
      actor.y += (dy / d) * step;
      actor.angle = Math.atan2(dy, dx);
      actor.travel += step;
      actor.moving = true;
      budget -= step;
      if (step >= d - 1e-8) actor.path.shift();
    }
    if (
      state.phase === 'chasing' &&
      canPursue() &&
      Math.hypot(actor.x - player.x, actor.y - player.y) < 0.66 &&
      canCapture(actor, player)
    ) {
      stop();
      onCaught();
      return 'caught';
    }
    if (state.phase === 'returning' && Math.hypot(actor.x - home.x, actor.y - home.y) < 0.08) {
      state.phase = 'idle';
      actor.path = [];
      actor.moving = false;
      save();
    }
    if (saveTime >= 2) save();
    return null;
  }
  function update(dt: number) {
    let remaining = Math.max(0, dt);
    if (!remaining) actor.moving = false;
    while (remaining > 1e-8) {
      const step = Math.min(0.05, remaining),
        event = tick(step);
      remaining -= step;
      if (event) return event;
    }
    return null;
  }
  return {
    state,
    home,
    start,
    stop,
    update,
    save,
    get active() {
      return state.phase === 'chasing';
    },
  };
}
