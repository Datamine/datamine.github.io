import type { Actor } from './world.ts';
import type { WorldPoint } from './geometry.ts';
import type { ExpeditionProgress } from './content.ts';
import type { Economy, Health } from './controllers.ts';
export interface ExpeditionLoot extends WorldPoint {
  id: string;
  kind: string;
  lootKind: string;
  label: string;
  description: string;
  amount: number;
  expires: number;
  network?: boolean;
  base?: number;
  itemId?: string;
  hatId?: string;
  mine?: boolean;
  ship?: boolean;
  deck?: WorldPoint;
}
export interface ExpeditionBeam {
  from: WorldPoint & { y: number };
  to: WorldPoint & { y: number };
  ttl: number;
}
export interface ExpeditionEvent {
  type: string;
  message?: string | null;
  target?: Actor;
  damage?: number;
  hp?: number;
  max?: number;
}
export interface ExpeditionPrey extends WorldPoint {
  base?: number;
  eligible?: boolean;
  isPlayer?: boolean;
  label?: string;
  expeditionDead?: boolean;
  hold?: number;
}
export interface ExpeditionState extends ExpeditionProgress {
  armed: boolean;
  target: Actor | null;
  clock: number;
  cooldown: number;
  beams: ExpeditionBeam[];
  splats: { target: Actor; damage: number; ttl: number }[];
  loot: ExpeditionLoot[];
  victims: { npc: ExpeditionPrey; until: number }[];
  weapon?: string;
  spectreAttack?: number;
}
export interface ExpeditionOptions {
  saved?: Partial<ExpeditionProgress>;
  onSave?: (state: ExpeditionProgress) => void;
  health?: Health;
  economy?: Economy;
  food?: (amount: number) => unknown;
  hasBayonet?: () => boolean;
  level?: () => number;
  defense?: () => number;
  inebriation?: () => number;
  sharedWorld?: () => boolean;
  player?: () => ExpeditionPrey;
  pedestrians?: () => Actor[];
  routeTo?: (from: WorldPoint, to: WorldPoint) => WorldPoint[] | null | undefined;
  canTravel?: (from: WorldPoint, to: WorldPoint) => boolean;
  lineClear?: (from: WorldPoint, to: WorldPoint) => boolean;
  random?: () => number;
  onEvent?: (event: ExpeditionEvent) => void;
  consumeShot?: (weapon: string) => { ok: boolean; message?: string };
}
