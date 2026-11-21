import type { PlayerProfile } from './profile.ts';
import type { Appearance } from './content.ts';
import type { Point, WorldPoint } from './geometry.ts';

export type WorldModel = ReturnType<typeof import('../world/model.ts').createWorldModel>;
export type ServerGeometry = Pick<
  WorldModel,
  'spawn' | 'pathTo' | 'characterGround' | 'landClearAt'
> &
  Partial<
    Omit<
      WorldModel,
      | 'spawn'
      | 'pathTo'
      | 'characterGround'
      | 'landClearAt'
      | 'wilderness'
      | 'expeditions'
      | 'places'
      | 'streetTraffic'
      | 'placeAt'
    >
  > & {
    streetTraffic?: Pick<WorldModel['streetTraffic'], 'nodes' | 'edges'> &
      Partial<Pick<WorldModel['streetTraffic'], 'cars'>>;
    placeAt?: (x: number, y: number) => Pick<import('./world.ts').Place, 'id'> | null;
    wilderness?: { actors: import('./monsters.ts').WildernessSpawn[] };
    expeditions?: { ship: { home: WorldPoint | null } } & Partial<
      Pick<WorldModel['expeditions'], 'cows' | 'raptor' | 'kraken'>
    >;
    places?: (Pick<import('./world.ts').Place, 'id' | 'x' | 'y' | 'w' | 'd'> &
      Partial<import('./world.ts').Place>)[];
    hospital?: Point;
    nearestGround?: (x: number, z: number) => WorldPoint | null;
    navigationRevision?: number;
  };
export interface PlayerTransport {
  open: boolean;
  bufferedAmount: number;
  send(value: string | ArrayBuffer): void;
  close(code?: number, reason?: string): void;
  cork?: () => void;
  uncork?: () => void;
}
export interface NetworkPosition {
  x: number;
  y: number;
  z: number;
  angle?: number;
  hp?: number;
}
export interface MapInstance {
  id: string;
  kind: string;
  layer: number;
  bounds?: { west: number; east: number; north: number; south: number };
}
export interface ServerPlayer {
  id: number;
  owner: string;
  profile: PlayerProfile;
  inventory: ReturnType<typeof import('../server/inventory.mts').createInventoryAccount>;
  transport: PlayerTransport;
  name: string;
  nameChanged: number;
  appearance: Appearance;
  x: number;
  y: number;
  z: number;
  angle: number;
  hp: number;
  max: number;
  hitpointsXP: number;
  level: number;
  mode: string;
  phase: number;
  motion: number;
  moving: boolean;
  gesture: string;
  gestureUntil?: number;
  revision: number;
  seen: Map<number, number>;
  sharedVersions: Map<string, number>;
  npcVersions: Map<string, number>;
  lastPoseAt: number;
  shotAt: number;
  attack: string | null;
  airship: boolean;
  deck: WorldPoint | null;
  grappling:
    | ({ from: NetworkPosition; elapsed: number; duration: number } & (
        { down: true; to: NetworkPosition } | { down?: false }
      ))
    | null;
  queue: Promise<unknown>;
  messages: number;
  rateAt: number;
  lastCheckpoint: number;
  lastSeen: number;
  instance: MapInstance;
  following?: number | null;
  attackWeapon?: string;
  base?: number;
  bomberActive?: boolean;
  damagePending?: boolean;
  componentVersions?: Map<string, number>;
  entityVersions?: Partial<
    Record<import('../world-deltas.ts').WorldKind, Map<string, readonly unknown[]>>
  >;
  globalVersions?: Record<string, string>;
  poseVersions?: Map<number, number>;
  privateVersions?: Record<string, string>;
  inventoryVersion?: string;
  population?: number;
  sentStateRevision?: number;
  presentationRevision?: number;
  lastSentAt?: number;
  financeSignature?: string;
  spokeAt?: number;
  nextSandAt?: number;
  detainAt?: number;
  rehabilitateAt?: number;
  respawnAllowed?: boolean;
  respawnReadyAt?: number;
  personalJailed?: boolean;
  pvpDying?: boolean;
  pvpNextHit?: number;
  pvpProtectedUntil?: number;
  pvpTarget?: number | null;
  training?: boolean;
  talkingTo?: string | null;
  deathTask?: Promise<unknown>;
  instanceReturn?: NetworkPosition | null;
  seat?: { id: string; exit: WorldPoint } | null;
  surfShore?: Point | null;
  deckTarget?: WorldPoint | null;
  moveGoal?: WorldPoint | null;
  tabletTeleport?: import('./teleport.ts').TabletFlight | null;
  parachute?:
    | (ReturnType<typeof import('../stealth-bomber.ts').createBomberDescent> & {
        startedAt: number;
      })
    | null;
  pendingActions?: number;
  pendingMove?: { superseded: boolean } | null;
  personalBattle?: boolean | null;
}
export interface SimulationServices {
  geometry: ServerGeometry;
  players: Map<number, ServerPlayer>;
  now: () => number;
  random: () => number;
  dirty: (player: ServerPlayer) => void;
  send: (player: ServerPlayer, message: object | string | ArrayBuffer) => void;
  routes: ReturnType<typeof import('../server/routes.mts').createRoutePlanner>;
  shared: ReturnType<typeof import('../server/shared-world.mts').createSharedWorld>;
  pvp: ReturnType<typeof import('../server/pvp.mts').createPvpCombat>;
  following: ReturnType<typeof import('../server/following.mts').createServerFollowing>;
  movement: ReturnType<typeof import('../server/movement.mts').createServerMovement>;
  instances: ReturnType<typeof import('../server/instances.mts').createServerInstances>;
  personal: ReturnType<typeof import('../server/player-state.mts').createPlayerState>;
}
