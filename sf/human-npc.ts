import { CHARACTER_CLIPS, drawCharacter } from './characters.ts';
import type { Mesh } from './geometry.ts';
import type { CharacterAppearance } from './characters.ts';
import type { Appearance } from './types/content.ts';
interface HumanActor extends Appearance {
  x: number;
  z?: number;
  y?: number;
  base?: number;
  angle?: number;
  phase?: number | string;
  motion?: number;
  moving?: boolean;
  seated?: boolean;
  stationary?: boolean;
  roam?: object;
}
interface HumanPose {
  angle: number;
  phase: number;
  motion: number;
  run: number;
  mode: string;
}
interface HumanSampleOptions {
  x?: number;
  z?: number;
  angle?: number;
  phase?: number;
  motion?: number;
  run?: number;
  mode?: string;
  seated?: boolean;
  stationary?: boolean;
  reduced?: boolean;
}
interface HumanDrawOptions extends HumanSampleOptions {
  base?: number;
  skin?: string;
  shirt?: string;
  appearance?: CharacterAppearance;
  draw?: typeof drawCharacter;
}
interface AnimatorState {
  x: number;
  z: number;
  time: number;
  phase: number;
  angle: number;
  motion: number;
  run: number;
  view: HumanPose;
}

const tau = Math.PI * 2;
const clamp = (n: number) => Math.max(0, Math.min(1, Number(n) || 0));

/** Render-only locomotion shared by every human NPC. Distance comes from the
 * interpolated position, so packet gait clocks cannot restart or reverse a step.
 * No extrapolation, routes, or authoritative actor fields are changed here. */
export function createHumanNPCAnimator() {
  const actors = new WeakMap<HumanActor, AnimatorState>();
  return {
    sample(
      npc: HumanActor,
      time: number,
      {
        x = npc.x,
        z = npc.z ?? npc.y!,
        angle = npc.angle || 0,
        phase = typeof npc.phase === 'number' ? npc.phase : 0,
        motion = npc.motion ?? Number(!!npc.moving),
        run = 0,
        mode,
        seated = npc.seated === true,
        stationary = npc.stationary === true && !npc.roam && !npc.moving,
        reduced = false,
      }: HumanSampleOptions = {},
    ) {
      let state = actors.get(npc);
      const distance = state ? Math.hypot(x - state.x, z - state.z) : 0,
        elapsed = state ? (time - state.time) / 1000 : 0,
        reset = !state || elapsed < 0 || elapsed > 0.5 || distance > 4,
        walking = !mode || mode === 'move' || mode === 'idle',
        resting = stationary || (seated && (!mode || mode === 'sit' || mode === 'rest'));
      if (!state || reset) {
        state = {
          x,
          z,
          time,
          phase,
          angle,
          motion: resting ? 0 : clamp(motion),
          run: clamp(run),
          view: { angle: 0, phase: 0, motion: 0, run: 0, mode: 'idle' },
        };
        actors.set(npc, state);
      } else if (elapsed > 0) {
        const blend = 1 - Math.exp(-elapsed * 14),
          target = resting ? 0 : walking ? clamp(distance / elapsed / 0.2) : clamp(motion);
        state.motion += (target - state.motion) * blend;
        if (state.motion < 0.0001) state.motion = 0;
        state.run += (clamp(run) - state.run) * blend;
        if (walking && !resting) {
          const stride =
            CHARACTER_CLIPS.walk.stride +
            (CHARACTER_CLIPS.run.stride - CHARACTER_CLIPS.walk.stride) * state.run;
          state.phase += Math.min(distance / stride, elapsed * (state.run > 0.5 ? 2.2 : 3)) * tau;
        } else state.phase = phase;
        state.angle +=
          Math.atan2(Math.sin(angle - state.angle), Math.cos(angle - state.angle)) * blend;
        Object.assign(state, { x, z, time });
      }
      return Object.assign(state.view, {
        angle: reduced ? angle : state.angle,
        phase: reduced ? 0 : state.phase,
        motion: reduced ? 0 : state.motion,
        run: reduced ? 0 : state.run,
        mode: mode || (seated ? 'sit' : state.motion > 0 ? 'move' : 'idle'),
      });
    },
  };
}

const animator = createHumanNPCAnimator();
/** Specialized actions and clothing stay with their domain renderer. Walking,
 * turning, start/stop blending, and reduced motion have one implementation. */
export function drawHumanNPC(
  m: Mesh,
  npc: HumanActor,
  time: number,
  {
    x = npc.x,
    z = npc.z ?? npc.y!,
    base = npc.base || 0,
    angle = npc.angle || 0,
    phase = typeof npc.phase === 'number' ? npc.phase : 0,
    seated = npc.seated === true,
    skin = npc.skin,
    shirt = npc.shirt,
    reduced = false,
    stationary = npc.stationary === true && !npc.roam && !npc.moving,
    appearance = {},
    draw = drawCharacter,
  }: HumanDrawOptions = {},
) {
  const pose = animator.sample(npc, time, {
    x,
    z,
    angle,
    phase,
    seated,
    stationary,
    reduced,
    motion: appearance.motion ?? npc.motion ?? Number(!!npc.moving),
    run: appearance.run,
    mode: appearance.mode,
  });
  return draw(m, x, z, base, pose.angle, pose.phase, seated, skin, shirt, {
    ...appearance,
    ...pose,
    time: reduced ? 0 : (appearance.time ?? time * 0.001),
  });
}
