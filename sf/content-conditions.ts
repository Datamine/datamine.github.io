import type { Condition } from './types/content.ts';
const forbidden = new Set(['__proto__', 'prototype', 'constructor'] satisfies [
  string,
  string,
  string,
]);
export function stateValue(state: unknown, path: string): unknown {
  if (typeof path !== 'string' || !path || path.split('.').some((part) => forbidden.has(part)))
    return undefined;
  let value: unknown = state;
  for (const part of path.split('.')) {
    if (
      value === null ||
      (typeof value !== 'object' && typeof value !== 'function') ||
      !Object.hasOwn(value, part)
    )
      return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}
/** Conditions describe visibility and never execute JavaScript or grant permissions. */
export function conditionMatches(condition: unknown, state: unknown, depth = 0): boolean {
  if (condition == null || condition === true) return true;
  if (
    condition === false ||
    depth > 32 ||
    typeof condition !== 'object' ||
    Array.isArray(condition)
  )
    return false;
  const test = condition as Record<string, unknown>;
  if (Array.isArray(test.all))
    return test.all.every((c: unknown) => conditionMatches(c, state, depth + 1));
  if (Array.isArray(test.any))
    return test.any.some((c: unknown) => conditionMatches(c, state, depth + 1));
  if (Object.hasOwn(test, 'not')) return !conditionMatches(test.not, state, depth + 1);
  if (typeof test.path !== 'string') return false;
  const value = stateValue(state, test.path);
  if (Object.hasOwn(test, 'eq')) return Object.is(value, test.eq);
  if (Object.hasOwn(test, 'ne')) return !Object.is(value, test.ne);
  if (Array.isArray(test.in)) return test.in.includes(value);
  if (Object.hasOwn(test, 'contains')) return Array.isArray(value) && value.includes(test.contains);
  if (typeof test.exists === 'boolean')
    return (value !== undefined && value !== null) === test.exists;
  if (typeof test.gte === 'number') return typeof value === 'number' && value >= test.gte;
  if (typeof test.gt === 'number') return typeof value === 'number' && value > test.gt;
  if (typeof test.lte === 'number') return typeof value === 'number' && value <= test.lte;
  if (typeof test.lt === 'number') return typeof value === 'number' && value < test.lt;
  if (test.count && typeof test.count === 'object')
    return (
      Array.isArray(value) &&
      conditionMatches({ ...test.count, path: 'length' }, { length: value.length }, depth + 1)
    );
  return false;
}
export function selectContentVariant<T extends { when?: Condition }>(
  variants: readonly T[],
  state: unknown,
): T | null {
  return (
    variants.find(
      (v) => v.when !== undefined && v.when !== true && conditionMatches(v.when, state),
    ) ||
    variants.find((v) => v.when === undefined || v.when === true) ||
    null
  );
}
