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
  ],
  cows: ['x', 'z', 'base', 'angle', 'hp', 'max', 'respawn', 'phase', 'motion'],
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
  ],
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
  ],
});
export function worldRecord(kind, record) {
  return WORLD_FIELDS[kind].map((key) => {
    const v = record[key];
    return typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) / 100 : (v ?? null);
  });
}
export function worldPatch(id, next, previous) {
  let mask = 0;
  const values = [];
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
export function applyWorldPatches(maps, patches = {}, removed = {}) {
  for (const kind of Object.keys(WORLD_FIELDS)) {
    const map = (maps[kind] ??= new Map());
    for (const id of removed[kind] || []) map.delete(id);
    for (const patch of patches[kind] || []) {
      const [id, mask] = patch,
        record = { ...(map.get(id) || { id }) };
      let j = 2;
      WORLD_FIELDS[kind].forEach((key, i) => {
        if (mask & (1 << i)) {
          const value = patch[j++];
          if (value === null) delete record[key];
          else record[key] = value;
        }
      });
      if (kind === 'loot') record.network = true;
      map.set(id, record);
    }
  }
  return Object.fromEntries(Object.entries(maps).map(([kind, map]) => [kind, [...map.values()]]));
}
