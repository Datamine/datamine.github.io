/** Versioned field tables are shared by server and browser. Record IDs plus
 * bit masks replace repeated JSON property names. Removed interests are
 * explicit, so a client never accumulates every NPC it has ever encountered. */
export const WORLD_FIELDS = Object.freeze({
  npcs: [
    'x',
    'z',
    'base',
    'angle',
    'motion',
    'phase',
    'elapsed',
    'expeditionDead',
    'hold',
    'level',
    'showStartedAt',
  ] as const,
  cows: ['x', 'z', 'base', 'angle', 'hp', 'max', 'respawn', 'phase', 'motion'] as const,
  wilderness: [
    'x',
    'z',
    'base',
    'angle',
    'phase',
    'motion',
    'hp',
    'max',
    'respawn',
    'enemy',
    'affection',
    'level',
  ] as const,
  loot: [
    'kind',
    'lootKind',
    'x',
    'z',
    'base',
    'amount',
    'label',
    'description',
    'itemId',
    'hatId',
    'mine',
    'expires',
    'ship',
    'deck',
  ] as const,
});
export type WorldKind = keyof typeof WORLD_FIELDS;
export const WORLD_KINDS = Object.keys(WORLD_FIELDS) as WorldKind[];
export interface WorldCollections {
  npcs: import('./types/network.ts').NetworkNPC;
  cows: import('./types/network.ts').NetworkCreature;
  wilderness: import('./types/network.ts').NetworkCreature;
  loot: import('./types/expeditions.ts').ExpeditionLoot;
}
export type WorldMaps = Partial<{ [K in WorldKind]: Map<string, WorldCollections[K]> }>;
export type WorldPatch = [id: string, mask: number, ...values: unknown[]];
export function worldRecord(kind: WorldKind, record: object) {
  const source = record as Record<string, unknown>;
  return WORLD_FIELDS[kind].map((key) => {
    const value = source[key];
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.round(value * 100) / 100
      : (value ?? null);
  });
}
export function worldPatch(
  id: string,
  next: readonly unknown[],
  previous: readonly unknown[] | undefined | null,
): WorldPatch | null {
  let mask = 0;
  const values: unknown[] = [];
  for (let i = 0; i < next.length; i++)
    if (
      !previous ||
      (next[i] && typeof next[i] === 'object'
        ? JSON.stringify(next[i]) !== JSON.stringify(previous[i])
        : next[i] !== previous[i])
    ) {
      mask |= 1 << i;
      values.push(next[i]);
    }
  return mask ? [id, mask, ...values] : null;
}
export function worldCollection<K extends WorldKind>(
  maps: WorldMaps,
  kind: K,
): Map<string, WorldCollections[K]> {
  const existing = maps[kind];
  if (existing) return existing;
  const collection = new Map<string, WorldCollections[K]>();
  Object.assign(maps, { [kind]: collection });
  return collection;
}
export function applyWorldPatches(
  maps: WorldMaps,
  patches: Partial<Record<WorldKind, WorldPatch[]>> = {},
  removed: Partial<Record<WorldKind, string[]>> = {},
) {
  for (const kind of WORLD_KINDS) {
    const map = worldCollection(maps, kind);
    for (const id of removed[kind] || []) map.delete(id);
    for (const [id, mask, ...values] of patches[kind] || []) {
      const record = { ...(map.get(id) || { id }) } as Record<string, unknown>;
      let index = 0;
      WORLD_FIELDS[kind].forEach((key, field) => {
        if (mask & (1 << field)) {
          const value = values[index++];
          if (value === null) delete record[key];
          else record[key] = value;
        }
      });
      if (kind === 'loot') record.network = true;
      // A new interest sends the complete field mask; subsequent packets patch that record.
      map.set(id, record as unknown as WorldCollections[WorldKind]);
    }
  }
  return Object.fromEntries(
    WORLD_KINDS.map((kind) => [kind, [...worldCollection(maps, kind).values()]]),
  ) as { [K in WorldKind]: WorldCollections[K][] };
}
