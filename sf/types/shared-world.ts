import type { Actor, RoamingRoute } from './world.ts';
import type { WorldPoint } from './geometry.ts';
import type { ServerPlayer, SimulationServices } from './server.ts';
import type { AirshipState } from '../airship.ts';
import type { ExpeditionLoot } from './expeditions.ts';
import type { WildernessActor } from './monsters.ts';
export interface SharedLoot extends ExpeditionLoot {
  owner: string | null;
  transfer?: boolean;
  unlockAt: number;
  wallExpiresAt?: number;
}
export interface SharedRaptor extends Actor {
  hp: number;
  max: number;
  phase: string;
  angle: number;
  path: WorldPoint[];
  repath: number;
  attackIn: number;
  prey: ServerPlayer | Actor | null;
  resetAt: number;
  release: number;
}
export type SavedNPC = Pick<Actor, 'id' | 'x' | 'z'> &
  Partial<Omit<Actor, 'roam'>> & {
    layout?: string;
    roam?: Pick<RoamingRoute, 'index' | 'pause' | 'stops'>;
  };
export interface SharedCow extends Actor {
  hp: number;
  max: number;
  home: WorldPoint;
  phase: number;
  motion: number;
  respawn: number;
  grazingVisit?: number;
  grazingPause?: number;
  grazingTarget?: WorldPoint | null;
}
export interface AirshipLease {
  resetAt: number;
  lastPrice: number;
  reservation: { owner: string; name: string; until: number } | null;
}
export interface SharedSavedState {
  clock?: number;
  lootSerial?: number;
  nextPeptideAt?: number;
  loot?: SharedLoot[];
  cows?: SharedCow[];
  raptor?: Partial<SharedRaptor>;
  npcs?: SavedNPC[];
  tiger?: Partial<import('./zoo.ts').TigerSnapshot>;
  airship?: Partial<AirshipState>;
  airshipLease?: Partial<AirshipLease>;
  wilderness?: (Pick<WildernessActor, 'id'> & Partial<WildernessActor>)[];
}
export type SharedWorldOptions = Pick<
  SimulationServices,
  'geometry' | 'players' | 'send' | 'dirty'
> &
  Partial<Pick<SimulationServices, 'routes' | 'random' | 'now'>> & {
    saved?: SharedSavedState;
    onAirshipReset?: (player: ServerPlayer) => void;
    onCombatDamage?: (player: ServerPlayer, damage: number) => void;
  };
