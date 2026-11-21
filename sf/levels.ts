import type { Actor } from './types/world.ts';
import { MONSTER_STATS } from './monster-drops.ts';
/** NPC difficulty is stable; a player's level is their actual strength. */
export function actorLevel(
  actor: Partial<
    Pick<
      Actor,
      | 'level'
      | 'alienId'
      | 'combatKind'
      | 'kind'
      | 'police'
      | 'label'
      | 'researcher'
      | 'expeditionRole'
    >
  > & { tiger?: boolean; networkPlayer?: boolean } = {},
) {
  if (actor.networkPlayer) return Math.max(1, Math.min(50, Number(actor.level) || 1));
  if (actor.alienId || actor.combatKind === 'spectre') return 6;
  const kind = actor.combatKind || actor.kind || '';
  if (MONSTER_STATS[kind]) return MONSTER_STATS[kind].level;
  if (kind === 'kraken') return 20;
  if (kind === 'raptor') return 8;
  if (kind === 'cow') return 2;
  if (kind === 'tiger' || actor.tiger || actor.police || actor.label === 'Police') return 10;
  if (actor.researcher || actor.kind === 'tax') return 3;
  if (actor.expeditionRole === 'ahab') return 6;
  return 1;
}
