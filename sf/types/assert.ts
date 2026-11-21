/** Required authored references fail at their lookup, before dependent setup runs. */
export function requiredValue<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) throw new Error(message);
  return value;
}
