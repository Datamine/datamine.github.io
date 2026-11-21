// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import type { CharacterAppearance } from './characters.ts';
import { drawCharacter, sampleCharacterPose } from './characters.ts';
import { SF_FITNESS } from './southern-layout.ts';
import { drawBenchPress } from './adventure-sites.ts';
import type { Mesh } from './geometry.ts';

export const GYM_EXERCISES = Object.freeze(
  [
    { id: 'bench', label: contentText('gym-exercises.module.label-1', {}), action: 'bench' },
    { id: 'curls', label: contentText('gym-exercises.module.label-2', {}), action: 'curl' },
    { id: 'squats', label: contentText('gym-exercises.module.label-3', {}), action: 'squat' },
    { id: 'press', label: contentText('gym-exercises.module.label-4', {}), action: 'press' },
  ].map((value) => Object.freeze(value)),
);
export function gymExercise(id: string | null) {
  return GYM_EXERCISES.find((e) => e.id === id) || GYM_EXERCISES[0];
}
export function gymExercisePosition(id: string) {
  const g = SF_FITNESS;
  return id === 'bench' ? { ...g.bench } : { x: g.x, z: g.z + 1 };
}

/** Weights follow the same animated hand joints as the character mesh. Every
 * exercise uses the existing strength XP clock, so the twenty-minute curve
 * does not change when the player changes equipment. */
export function drawGymExercise(
  m: Mesh,
  id: string | null,
  time: number,
  appearance: CharacterAppearance | undefined,
  { reduced = false }: { reduced?: boolean } | undefined = {},
) {
  const exercise = gymExercise(id);
  if (exercise.id === 'bench') {
    drawBenchPress(m, time, appearance, { reduced });
    return;
  }
  const p = gymExercisePosition(exercise.id),
    base = SF_FITNESS.base + 0.07,
    beat = reduced ? 0 : time * 0.0026;
  drawCharacter(m, p.x, p.z, base, Math.PI / 2, 0, false, appearance?.skin, appearance?.shirt, {
    ...appearance,
    mode: 'idle',
    action: exercise.action,
    time: beat,
    backpack: false,
  });
  const pose = sampleCharacterPose('idle', 0, { action: exercise.action, time: beat }),
    hand = (id: number) => ({
      x: p.x + pose.joints[id * 3],
      y: base + pose.joints[id * 3 + 1],
      z: p.z + pose.joints[id * 3 + 2],
    });
  const left = hand(6),
    right = hand(9);
  if (exercise.id === 'squats') {
    const x = (left.x + right.x) / 2,
      y = (left.y + right.y) / 2,
      z = (left.z + right.z) / 2;
    m.rod(
      [x - 0.76, y, z] satisfies [number, number, number],
      [x + 0.76, y, z] satisfies [number, number, number],
      0.022,
      '#bac4c9',
      10,
    );
    for (const side of [-1, 1] satisfies [number, number])
      m.sphere(x + side * 0.62, y, z, 0.045, 0.16, 0.16, '#35434e', 18, 10);
  } else
    for (const h of [left, right]) {
      m.rod(
        [h.x - 0.16, h.y, h.z] satisfies [number, number, number],
        [h.x + 0.16, h.y, h.z] satisfies [number, number, number],
        0.022,
        '#bcc7cc',
        10,
      );
      for (const side of [-1, 1] satisfies [number, number])
        m.sphere(h.x + side * 0.12, h.y, h.z, 0.035, 0.095, 0.095, '#35434e', 16, 8);
    }
}
