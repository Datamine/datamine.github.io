interface FollowPosition {
  x: number;
  y: number;
  z: number;
  mode?: string;
}
interface FollowerOptions<T extends FollowPosition, P> {
  getSelf: () => FollowPosition;
  getTarget: (id: number) => T | null | undefined;
  routeTo: (target: T, range: number) => P[] | null | undefined;
  setPath: (points: P[]) => void;
  stopMoving: () => void;
  canFollow?: () => boolean;
  onStop?: (message: string) => void;
}
/** Replanning uses the existing tile graph and never teleports the follower. */
export function createPlayerFollower<T extends FollowPosition, P>({
  getSelf,
  getTarget,
  routeTo,
  setPath,
  stopMoving,
  canFollow = () => true,
  onStop = () => {},
}: FollowerOptions<T, P>) {
  const state = { target: null as (number | null) | null, range: 1.2, attack: false };
  let replan = 0,
    missing = 0,
    within = false;
  function stop(move = true) {
    const had = state.target !== null;
    state.target = null;
    state.attack = false;
    replan = 0;
    missing = 0;
    within = false;
    if (had && move) stopMoving();
    return had;
  }
  return {
    state,
    start(id: number | null, { range = 1.2, attack = false } = {}) {
      stop();
      state.target = id;
      state.range = range;
      state.attack = attack;
      replan = 0;
      return true;
    },
    stop,
    update(dt: number, onInRange: (target: T) => void = () => {}) {
      if (state.target === null) return;
      if (!canFollow()) {
        stop();
        onStop('Following stopped.');
        return;
      }
      const target = getTarget(state.target),
        self = getSelf();
      if (!target || target.mode === 'hidden' || target.mode === 'rocket') {
        missing += Math.max(0, dt);
        if (missing > 1) {
          stop();
          onStop('That player is no longer nearby.');
        }
        return;
      }
      missing = 0;
      if (
        Math.abs(target.y - self.y) > 3 ||
        (['airship', 'climb'] satisfies [string, string]).includes(target.mode || '')
      ) {
        stop();
        onStop('You cannot follow them there.');
        return;
      }
      const distance = Math.hypot(target.x - self.x, target.z - self.z);
      if (distance <= state.range) {
        stopMoving();
        if (!within) {
          within = true;
          onInRange(target);
        }
        replan = 0.25;
        return;
      }
      within = false;
      replan -= Math.max(0, dt);
      if (replan > 0) return;
      replan = 0.5;
      const route = routeTo(target, state.range);
      if (route) setPath(route);
      else {
        stop();
        onStop('No walkable route to that player.');
      }
    },
  };
}
