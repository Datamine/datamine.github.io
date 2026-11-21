/** Storage adapters detach JSON checkpoints; no live simulation objects escape. */
export interface NameReservation {
  owner: string;
  canonical: string;
  name: string;
  changed: number;
}
export type StorageEntry = readonly [key: string, value: unknown];
export interface GameplayStore {
  kind?: string;
  inMemory?: boolean;
  status?: string;
  version?: number;
  persistedVersion?: number;
  get(key: string): Promise<unknown>;
  batch(entries: readonly StorageEntry[]): Promise<unknown>;
  names(): Promise<NameReservation[]>;
  rename(owner: string, canonical: string, name: string, changed: number): Promise<unknown>;
  markChanged?: () => void;
  complete?: () => void;
  close?: () => Promise<void>;
}
export interface GameCheckpoint {
  schema: 1;
  id: string;
  status: 'active' | 'completed';
  version: number;
  savedAt?: number;
  records: StorageEntry[];
  names: NameReservation[];
}
export interface CheckpointStore extends GameplayStore {
  destroy?: () => void;
  leaseHealthy?: boolean;
  loadGames(): Promise<GameCheckpoint[]>;
  saveGame(id: string, snapshot: GameCheckpoint): Promise<unknown>;
  loadLegacy?: () => Promise<{ records: StorageEntry[]; names: NameReservation[] }>;
  close(): Promise<void>;
}

export interface RamGameStore extends GameplayStore {
  kind: 'ram';
  inMemory: true;
  status: GameCheckpoint['status'];
  version: number;
  persistedVersion: number;
  markChanged: () => void;
  complete: () => void;
  close: () => Promise<void>;
}
