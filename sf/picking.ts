import { isRecord } from './types/json.ts';
import type { PickTarget } from './types/scene-state.ts';
import type { WorldObject } from './types/world.ts';
/** Render targets may be actor meshes without a physical collision footprint. */
export function isPickTarget<T>(value: T | null | undefined): value is T & PickTarget {
  return (
    isRecord(value) &&
    !!value.mesh &&
    value.start !== undefined &&
    value.count !== undefined &&
    !!value.lo &&
    !!value.hi
  );
}
export function hasPhysicalBounds<T extends WorldObject | PickTarget>(
  value: T,
): value is T & WorldObject {
  return (
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    typeof value.w === 'number' &&
    typeof value.d === 'number'
  );
}

export function requiredPhysicalObject(
  value: WorldObject | PickTarget | null | undefined,
  message: string,
): WorldObject {
  if (!value || !hasPhysicalBounds(value)) throw new Error(message);
  return value;
}
