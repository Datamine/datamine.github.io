import type { InteractionSight, Site } from './types/world.ts';
import type { ExpeditionLoot } from './types/expeditions.ts';
export function hasSiteEntry(sight: InteractionSight): sight is Site {
  return !!sight.entry && typeof sight.entry.x === 'number' && typeof sight.entry.y === 'number';
}
export function isLootTarget(sight: InteractionSight): sight is ExpeditionLoot & Partial<Site> {
  return sight.kind === 'loot' && 'lootKind' in sight;
}
