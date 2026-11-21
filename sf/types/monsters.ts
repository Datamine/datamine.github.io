import type { Appearance } from './content.ts';
import type { Actor } from './world.ts';
import type { WorldPoint } from './geometry.ts';
export interface MonsterStats {
  name: string;
  level: number;
  hp: number;
  damage: number;
  interval?: number;
  respawn?: number;
  speed?: number;
  leash?: number;
  roamRadius?: number;
  roamSpeed?: number;
  height?: number;
  model?: string;
  appearance?: Appearance;
  description?: string;
  friendly?: boolean;
  quest?: boolean;
  aggression?: number;
  pursuit?: string;
  radius?: number;
  walkStride?: number;
  territoryHalfWidth?: number;
  enrageAt?: number;
  enrageDamageBonus?: number;
  enrageInterval?: number;
}
export type DropRule = { oneIn: number; amount?: number } & (
  { item: string; choose?: never } | { choose: readonly string[]; item?: never }
);
/** Preserve required fields for known monsters and optional fields for dynamic lookups. */
export function defineMonsterStats<T extends Record<string, MonsterStats>>(
  definitions: T,
): Readonly<{ [K in keyof T]: T[K] & Partial<MonsterStats> }> &
  Readonly<Record<string, MonsterStats>> {
  return Object.freeze(definitions);
}
export interface WildernessSpawn extends WorldPoint {
  id: string;
  combatKind: string;
}
export interface WildernessPerson extends WorldPoint {
  id: string | number;
  owner?: string | null;
  y?: number;
  base?: number;
  angle?: number;
  gesture?: string;
  gestureUntil?: number;
  weapon?: string;
  level?: number;
  inebriation?: number;
  tinfoil?: boolean;
}
export interface WildernessActor extends Actor {
  wilderness: true;
  combatKind: string;
  hp: number;
  max: number;
  level: number;
  height: number;
  base: number;
  home: WorldPoint;
  angle: number;
  phase: number;
  motion: number;
  respawn: number;
  enemy: string | number | null;
  path: WorldPoint[];
  repath: number;
  attackAt: number;
  affection: number;
  description: string;
}
export interface WildernessDrop extends WorldPoint {
  base: number;
  lootKind: string;
  amount: number;
  label: string;
  description: string;
  itemId?: string;
  hatId?: string;
}
