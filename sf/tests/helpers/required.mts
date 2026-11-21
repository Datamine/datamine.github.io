import assert from 'node:assert/strict';
/** Make fixture assumptions explicit before inspecting optional runtime state. */
export function requiredFixture<T>(value?: T | void | null | undefined): T {
  assert.ok(value !== null && value !== undefined, 'Expected fixture value to be present.');
  return value as T;
}
