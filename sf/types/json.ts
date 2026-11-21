/** Narrow untrusted JSON once at the boundary; downstream code uses domain contracts. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
export function parseJSON(value: string): unknown {
  return JSON.parse(value) as unknown;
}
/** Array membership that also narrows values read from JSON. */
export function isOneOf<const T>(values: readonly T[], value: unknown): value is T {
  return (values as readonly unknown[]).includes(value);
}
/** Native numeric predicates with the narrowing contract used by JSON readers. */
export function isFiniteNumber(value: unknown): value is number {
  return Number.isFinite(value);
}
export function isSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value);
}
