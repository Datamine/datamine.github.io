import { itemLoot } from './item-stats.ts';
import { MONSTER_STATS, MONSTER_DROPS } from './config/monster-drops.ts';
export { MONSTER_STATS, MONSTER_DROPS };

const dropRandom = (random: () => number) =>
  Math.max(0, Math.min(1 - Number.EPSILON, Number(random()) || 0));
export function rollMonsterDrops(kind: string, random = Math.random) {
  const drops = [];
  for (const rule of MONSTER_DROPS[kind] || []) {
    if (rule.oneIn > 1 && dropRandom(random) >= 1 / rule.oneIn) continue;
    const id =
      rule.item !== undefined
        ? rule.item
        : rule.choose[Math.floor(dropRandom(random) * rule.choose.length)];
    drops.push(itemLoot(id, rule.amount || 1));
  }
  return drops;
}
