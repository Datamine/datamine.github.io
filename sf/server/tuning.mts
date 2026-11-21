/** Server scheduling and bounded caches; gameplay balance stays in sf/config. */
export const SERVER_TUNING = Object.freeze({
  actionSliceMs: 4,
  actionsPerTurn: 64,
  maxPendingActionsPerPlayer: 32,
  routeCacheEntries: 4096,
  routeCachePoints: 65536,
  routeCacheTtlMs: 2000,
  routeCoreTtlMs: 30000,
  followReplansPerTick: 256,
  followReplanMs: 4,
});
