import type { NameReservation } from './storage.ts';
/** Messages owned by the SQLite worker and its parent; values remain serialized JSON. */
export interface SQLiteOperations {
  get: { args: [key: string]; result: string | null };
  legacy: { args: []; result: { key: string; value: string }[] };
  batch: { args: [entries: [key: string, value: string][]]; result: boolean };
  names: { args: []; result: NameReservation[] };
  rename: {
    args: [owner: string, canonical: string, name: string, changed: number];
    result: boolean;
  };
  close: { args: []; result: boolean };
}
export type SQLiteRequest = {
  [K in keyof SQLiteOperations]: { id: number; method: K; args: SQLiteOperations[K]['args'] };
}[keyof SQLiteOperations];
export interface SQLiteResponse {
  id: number;
  result?: unknown;
  error?: string;
}
