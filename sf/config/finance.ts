/** Fictional coin markets and consensual coin flips; shared display/balance rules. */
export const GROWTH_EQUITY = Object.freeze({
  batches: Object.freeze([1000, 5000, 10000] satisfies [number, number, number]),
  fee: 0.05,
  seconds: 180,
  volatility: 0.025,
  maxPrincipal: 1000000,
  minMultiple: 0.4,
  maxMultiple: 1.8,
});
export const DUEL_RULES = Object.freeze({ offerSeconds: 60, maxStake: 1000000000 });
