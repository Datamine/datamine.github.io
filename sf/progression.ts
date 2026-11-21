// CONTENT-BINDINGS-MIGRATED
import { GAMEPLAY } from './config/gameplay.ts';
import { PROGRESSION } from './config/progression.ts';
const skillWeights = Array.from({ length: PROGRESSION.maxLevel - 1 }, (_, i) => (i + 1) ** 1.7),
  skillWeightSum = skillWeights.slice(0, 9).reduce((a, b) => a + b, 0);
export const SKILL_THRESHOLDS = Object.freeze([
  0,
  ...skillWeights.map((_, i) =>
    Math.round(
      (GAMEPLAY.strengthLevel10XP * skillWeights.slice(0, i + 1).reduce((a, b) => a + b, 0)) /
        skillWeightSum,
    ),
  ),
]);
export function skillStatus(value: unknown) {
  const xp = Number.isFinite(Number(value))
    ? Math.max(0, Math.min(SKILL_THRESHOLDS.at(-1)!, Number(value)))
    : 0;
  let level = 1;
  while (level < PROGRESSION.maxLevel && xp >= SKILL_THRESHOLDS[level]) level++;
  const low = SKILL_THRESHOLDS[level - 1],
    high = SKILL_THRESHOLDS[level] ?? low;
  return {
    level,
    xp,
    percent: level === PROGRESSION.maxLevel ? 100 : (100 * (xp - low)) / (high - low),
    next: level === PROGRESSION.maxLevel ? null : level + 1,
    contentNodeId: 'progression.skillStatus.node-1',
  };
}
export const hitpointMaximum = (xp: number | undefined) =>
  PROGRESSION.baseHitpoints + (skillStatus(xp).level - 1) * PROGRESSION.hitpointsPerLevel;
