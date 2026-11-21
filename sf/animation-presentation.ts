import type { AnimationPose, AnimationFrame } from './types/animation.ts';
/** Display-only timelines. These never advance movement, cooldowns or rewards. */
export const GESTURE_SECONDS = Object.freeze({
  attack: 0.45,
  flinch: 0.43,
  talk: 0.9,
  drink: 1.6,
  eat: 0.9,
  pet: 1.5,
  'pet-bear': 1.5,
  work: 2.2,
  steal: 0.9,
  caught: 2,
});
const animationClamp = (v: number) => Math.max(0, Math.min(1, v));
export function createActorAnimation() {
  let last: number | null = null,
    motion = 0,
    run = 0,
    sit = 0,
    dance = 0,
    gesture = '',
    started = 0,
    source = '',
    deathAt: number | null = null;
  const view: Partial<AnimationFrame> = {};
  return {
    trigger(name: string, time: number) {
      gesture = name;
      source = name;
      started = time;
    },
    sample(pose: AnimationPose, time: number): AnimationFrame {
      const dt = last === null ? 0 : Math.max(0, Math.min(0.1, (time - last) / 1000)),
        first = last === null;
      last = time;
      const target = pose.hp === 0 ? 0 : animationClamp(pose.motion || 0),
        walking = (['walk', 'roll'] satisfies [string, string]).includes(pose.mode),
        resting = pose.mode === 'sit',
        dancing = pose.mode === 'dance';
      if (first) {
        motion = target;
        run = walking && pose.moving ? 1 : 0;
        sit = resting ? 1 : 0;
        dance = dancing ? 1 : 0;
      } else {
        const blend = 1 - Math.exp(-dt * 16);
        motion += (target - motion) * blend;
        run += ((walking && pose.moving ? 1 : 0) - run) * blend;
        sit += Math.max(-dt / 0.45, Math.min(dt / 0.45, Number(resting) - sit));
        dance += Math.max(-dt / 0.25, Math.min(dt / 0.25, Number(dancing) - dance));
      }
      const incoming = pose.gesture || '';
      if (incoming !== source) {
        source = incoming;
        if (GESTURE_SECONDS[incoming as keyof typeof GESTURE_SECONDS]) {
          gesture = incoming;
          started = time;
        }
      }
      if (pose.hp === 0) {
        deathAt ??= time;
      } else deathAt = null;
      const elapsed = Math.max(0, (time - started) / 1000),
        duration = GESTURE_SECONDS[gesture as keyof typeof GESTURE_SECONDS] || 0;
      if (elapsed >= duration) gesture = '';
      let action = gesture || null,
        actionT = duration ? animationClamp(elapsed / duration) : 1;
      if (dance > 0) {
        action = 'dance';
        actionT = 1;
      }
      if (pose.mode === 'teleport') {
        action = 'teleport';
        actionT = animationClamp((time - (view.mode === 'teleport' ? view.modeAt! : time)) / 550);
      }
      if (pose.mode === 'parachute') {
        action = 'parachute';
        actionT = 1;
      }
      if (pose.mode === 'roll') {
        action = 'forward-roll';
        actionT = animationClamp(pose.phase! / (Math.PI * 2));
      }
      if (pose.gesture === 'fish') {
        action = 'fish';
        actionT = (time / 3200) % 1;
      }
      if (action === 'caught') actionT = animationClamp(elapsed / 0.5);
      if (deathAt !== null) {
        action = 'caught';
        actionT = animationClamp((time - deathAt) / 500);
      }
      if (view.mode !== pose.mode) view.modeAt = time;
      Object.assign(view, {
        mode: pose.mode,
        motion,
        run,
        sitBlend: sit,
        danceBlend: dance,
        action,
        actionT,
        gestureStarted: started,
        fall:
          deathAt !== null
            ? animationClamp((time - deathAt - 650) / 850)
            : action === 'caught'
              ? animationClamp((time - started - 650) / 850)
              : 0,
      });
      return view as AnimationFrame;
    },
  };
}
