import type { PersonalPursuits } from '../pursuit-presentation.ts';
import type { Appearance, EconomyState, InventoryLedger, PlayerDocument } from './content.ts';
import type { ActionReceipt } from './world.ts';
import type { MapInstance } from './server.ts';
import type { WorldPoint } from './geometry.ts';
export interface PoseCoordinates {
  x: number;
  y: number;
  z: number;
  angle: number;
  phase: number;
  motion: number;
  mode: string;
}
export interface NetworkPose extends PoseCoordinates {
  id: number;
  hp: number;
  max: number;
  gesture: string;
  moving: boolean;
  level: number;
  pvp: boolean;
}
export interface NetworkNPC {
  id: string;
  x: number;
  z: number;
  base?: number;
  angle: number;
  motion: number;
  phase: number;
  elapsed?: number;
  expeditionDead: boolean;
  hold: number;
  level: number;
  showStartedAt?: number;
}
export type PackedNPC = [
  id: string,
  x: number,
  z: number,
  base: number | null,
  angle: number,
  motion: number,
  phase: number,
  elapsed?: number | null,
  dead?: boolean | number,
  hold?: number,
  level?: number,
];
export interface InventorySnapshot extends InventoryLedger {
  purse: EconomyState;
  capacity: number;
  collection: string[];
  decorativeRocket: { readyAt: number; burningUntil: number; hopStartedAt: number };
  hp?: number;
  max?: number;
}
export interface CommandResult extends ActionReceipt {
  unchanged?: boolean;
  paid?: number;
  damage?: number;
  hp?: number;
  max?: number;
  interview?: { phase: string; score: number; remaining: number; problem: string | null };
  goal?: WorldPoint;
  purse?: EconomyState;
  award?: import('./content.ts').PendingAward;
  superseded?: boolean;
  burningUntil?: number;
  airship?: import('./finance.ts').AirshipRentalStatus;
  name?: string;
  autoName?: boolean;
  retryAt?: number;
  grapplingHook?: boolean;
  inventory?: InventorySnapshot;
  request?: number;
  action?: string;
}
export interface NetworkCreature extends WorldPoint {
  id: string;
  hp: number;
  max: number;
  angle?: number;
  base?: number;
  phase?: number | string;
  motion?: number;
  respawn?: number;
  enemy?: string | number | null;
  affection?: number;
  level?: number;
}
export interface AirshipSnapshot {
  active: boolean;
  phase: string;
  position: WorldPoint & { y: number };
  heading: number;
  speed: number;
  captain: number | null;
  passengers: number[];
  rope: {
    deployed: boolean;
    top: (WorldPoint & { y: number }) | null;
    bottom: (WorldPoint & { y: number }) | null;
    passenger?: (WorldPoint & { y: number; phase: string }) | null;
    passengerPaid?: boolean;
  };
  grapplers: { id: number; x: number; y: number; z: number }[];
  resetAt: number;
  lastPrice: number;
  rentalPrice: number;
  recallPrice: number;
  reservedFor?: number | null;
  reservedName?: string | null;
  reservedUntil?: number;
}
export interface SharedSnapshot {
  clock?: number;
  population?: number;
  peptideSpawnAt?: number;
  npcs?: NetworkNPC[];
  cows?: NetworkCreature[];
  wilderness?: NetworkCreature[];
  loot?: import('./expeditions.ts').ExpeditionLoot[];
  raptor?:
    (NetworkCreature & { phase: string; release: number; preyId: number | string | null }) | null;
  tiger?: ReturnType<typeof import('../zoo-encounter.ts').createTigerEncounter>['state'] | null;
  airship?: AirshipSnapshot | null;
}
export interface Position extends WorldPoint {
  y: number;
  angle?: number;
  hp?: number;
  mode?: string;
  phase?: number;
  motion?: number;
}
export interface Peer {
  id: number;
  name: string;
  appearance: Appearance;
  hp?: number;
  level?: number;
  pvp?: boolean;
  deathAt?: number;
  speech?: string;
  speechUntil?: number;
  samples: { time: number; pose: NetworkPose }[];
}
export interface PersonalSnapshot extends PersonalPursuits {
  training?: boolean;
  fishing?: { active: boolean; elapsed: number };
  delivery?: { position: import('./geometry.ts').Point; angle: number; travel: number } | null;
  pitch?: { id: string; remaining: number; chance: number; percent?: number } | null;
  ship?: ReturnType<typeof import('../jurassic.ts').createExpeditions>['ship'];
  kraken?: Partial<ReturnType<typeof import('../jurassic.ts').createExpeditions>['kraken']>;
  loot?: import('./expeditions.ts').ExpeditionLoot[];
  vehicle?: { mode: string; fuel?: number };
  travel?: {
    rocket: import('../rocket.ts').RocketState | null;
    tahoe: Partial<import('./movement.ts').MovementRuntime['tahoe']['state']> | null;
    sutro: import('./movement.ts').MovementRuntime['sutro']['state'] | null;
    bomber: { boost: boolean; rollElapsed: number | null } | null;
    surf: {
      wave: import('./movement.ts').MovementRuntime['wave']['state'];
      jump: import('./movement.ts').MovementRuntime['windsurf']['state']['jump'];
      clock: number;
    } | null;
  };
}
export interface MultiplayerState {
  following: number | null;
  connected: boolean;
  configured: boolean;
  id: number | null;
  name: string;
  renameAt: number;
  grapplingHook: boolean;
  population: number;
  world: SharedSnapshot | null;
  self: NetworkSelf | null;
  debug: boolean;
  status: string;
  latency: number;
  position?: Position;
  hp?: number;
  max?: number;
  inventory?: InventorySnapshot;
  returningCharacter?: boolean;
  autoName?: boolean;
  serverOffset?: number;
  pendingAwards?: import('./content.ts').PendingAward[];
  privateState?: Record<string, string>;
  instance?: MapInstance;
  level?: number;
  worldSampleAt?: number;
  personalSampleAt?: number;
  reloadOnWelcome?: boolean;
  pvpTarget?: number | null;
  playerState?: PlayerDocument;
  guild?: ReturnType<typeof import('../server/guild.mts').guildStatusFor>;
  illuminati?: boolean;
  bomber?: ReturnType<
    ReturnType<typeof import('../server/instances.mts').createServerInstances>['bomberStatus']
  >;
  bank?: ReturnType<typeof import('../server/banking.mts').bankSnapshotFor>;
  finance?: ReturnType<
    ReturnType<typeof import('../growth-equity.ts').createGrowthEquity>['snapshot']
  >;
  pvp?: { enabled: boolean; disableAt?: number };
  personal?: PersonalSnapshot;
}
export interface NetworkSelf extends PoseCoordinates {
  deck?: WorldPoint;
  grappling?: object;
}
interface ServerEnvelope {
  time?: number;
  sampleTime: number;
  playerState?: PlayerDocument;
  guild?: MultiplayerState['guild'];
  illuminati?: boolean;
  bomber?: MultiplayerState['bomber'];
  bank?: MultiplayerState['bank'];
  pvp?: MultiplayerState['pvp'];
  inventory?: InventorySnapshot;
  award?: import('./content.ts').PendingAward;
}
export interface WelcomeMessage extends ServerEnvelope {
  type: 'welcome';
  id: number;
  name: string;
  returningCharacter: boolean;
  autoName: boolean;
  renameAt: number;
  time: number;
  grapplingHook: boolean;
  debug: boolean;
  shared: SharedSnapshot;
  position: Position;
  pendingAwards: import('./content.ts').PendingAward[];
  privateState: Record<string, string>;
  instance?: MapInstance;
  level: number;
  inventory: InventorySnapshot;
}
export type ServerEvent = ServerEnvelope &
  (
    | WelcomeMessage
    | { type: 'connection'; connected: boolean; status: string }
    | { type: 'hitpoints'; hp: number; max: number }
    | { type: 'inventory'; inventory: InventorySnapshot }
    | { type: 'finance'; position: MultiplayerState['finance'] }
    | {
        type: 'world';
        state: SharedSnapshot;
        self?: NetworkSelf | null;
        patches?: Partial<
          Record<import('../world-deltas.ts').WorldKind, import('../world-deltas.ts').WorldPatch[]>
        >;
        removed?: Partial<Record<import('../world-deltas.ts').WorldKind, string[]>>;
      }
    | {
        type: 'playerState';
        fields?: [number, unknown][];
        state?: PersonalSnapshot;
        privateState?: Record<string, unknown>;
      }
    | { type: 'interest'; remove: number[]; enter: Omit<Peer, 'samples'>[] }
    | ({ type: 'result'; request: number } & CommandResult)
    | { type: 'pong'; clientTime: number }
    | { type: 'instance'; instance: MapInstance; position: Position }
    | {
        type: 'airshipReset';
        reason?: string;
        airship: AirshipSnapshot;
        position?: Position;
        message: string;
      }
    | {
        type: 'following';
        target: number | null;
        position: PoseCoordinates;
        attack?: boolean;
        message?: string;
      }
    | {
        type: 'pvpHit';
        attacker: number;
        target: number;
        damage: number;
        hp: number;
        max: number;
        weapon: string;
        from: Position;
        to: Position;
      }
    | {
        type: 'sharedHit';
        attacker: number;
        target: string;
        damage: number;
        hp: number;
        max: number;
        weapon: string;
        from: Position;
        to: Position;
      }
    | { type: 'caught'; source: string }
    | {
        type: 'damage';
        damage: number;
        hp: number;
        max: number;
        source?: string;
        attacker?: string | number;
      }
    | { type: 'pvpKill'; target: number; name: string; drops: string[] }
    | { type: 'say'; id: number; text: string }
    | {
        type: 'position';
        reason?: string;
        x: number;
        y: number;
        z: number;
        angle?: number;
        hp?: number;
      }
    | { type: 'detained'; position: Position }
    | { type: 'notice' | 'salesDecision'; message: string; id?: string }
    | { type: 'bombLaunched'; bomb: import('./aircraft.ts').BombFlight }
    | {
        type: 'bomberEjected';
        player: number;
        flight: import('./aircraft.ts').BomberDescent;
        crash: import('./aircraft.ts').BomberCrash;
      }
    | { type: 'bomberLanded'; message: string }
    | { type: 'duelOffer'; offer: import('./finance.ts').DuelOffer }
    | { type: 'duelClosed'; id: string; message: string }
    | { type: 'duelSettled'; winner: number; winnerName: string; stake: number }
    | { type: 'tabletTeleport'; flight: import('./teleport.ts').TabletFlight }
    | { type: 'tabletArrived'; position: Position; message: string }
    | { type: 'heartbeat' | 'interviewResult' | 'rehabilitating'; [key: string]: unknown }
  );
