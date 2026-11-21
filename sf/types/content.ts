import type { Point, WorldPoint } from './geometry.ts';

export type JSONPrimitive = string | number | boolean | null;
export type JSONValue = JSONPrimitive | JSONObject | JSONValue[];
export interface JSONObject {
  [key: string]: JSONValue;
}
export type NumericComparison =
  { eq: number } | { gt: number } | { gte: number } | { lt: number } | { lte: number };
export type Condition =
  | boolean
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | ({ path: string } & (
      | { eq: JSONPrimitive }
      | { ne: JSONPrimitive }
      | { in: JSONPrimitive[] }
      | { contains: JSONPrimitive }
      | { exists: boolean }
      | NumericComparison
      | { count: NumericComparison }
    ));
export type TextSpec =
  string | { text: string } | { select: { when: Condition; text: TextSpec }[]; default: TextSpec };
export interface TextBinding {
  path?: string;
  default?: JSONPrimitive;
  value?: JSONPrimitive;
}
export interface TextRecord {
  template: string;
  bindings?: Record<string, TextBinding>;
}
export type TextValues = Record<
  string,
  JSONPrimitive | undefined | (() => JSONPrimitive | undefined)
>;
export interface MenuAction {
  id: string;
  action: string;
  label: TextSpec;
  disabled?: boolean;
  when?: Condition;
}
export interface MenuVariant {
  id: string;
  states: string[];
  placements: string[];
  actions: MenuAction[];
  when?: Condition;
}
export interface EntityDefinition {
  id: string;
  name: string;
  category: 'npc' | 'object';
  kind: string;
  description: TextSpec;
  menus: MenuVariant[];
  dialogues: string[];
  capabilities: string[];
}
export interface EntityPlacement {
  id: string;
  definition: string;
  actor: boolean;
  source: string;
  position: Partial<WorldPoint>;
  description?: TextSpec;
  appearance?: Appearance;
  level?: number;
}
export interface DialogueChoice {
  id: string;
  label: TextSpec;
  receipt?: TextSpec;
  action?: string;
  trade?: string;
  next?: string;
  shared?: boolean;
  serverReceipt?: boolean;
  when?: Condition;
}
export interface DialogueNode {
  id: string;
  intro: TextSpec;
  question: TextSpec;
  decline: TextSpec;
  repeat: boolean;
  skipIntro: boolean;
  choices: DialogueChoice[];
}
export interface DialogueVariant {
  id: string;
  states: string[];
  placements: string[];
  when?: Condition;
  root?: string;
  nodes?: Record<string, DialogueNode>;
  sampleValues?: Record<string, TextValues>;
  shared?: boolean;
  speech?: string;
  panel?: string | null;
}
export interface SharedChoice {
  id: string;
  text: string;
  next: string;
  when?: Condition;
}
export interface SharedNode {
  id: string;
  speaker?: string;
  text: string;
  end?: boolean;
  choices?: SharedChoice[];
}
export interface SharedConversation {
  id: string;
  title?: string;
  start: string;
  nodes: Record<string, SharedNode>;
  source_files?: string[];
  source_directory?: string;
}
export interface ServiceNode {
  id?: string;
  intro?: TextSpec;
  question?: TextSpec;
  decline?: TextSpec;
  choice?: TextSpec;
  label?: TextSpec;
  receipt?: TextSpec;
  choices?: ServiceNode[];
  next?: ServiceNode;
  action?: string;
  args?: JSONValue[];
  trade?: string;
  repeat?: boolean;
  skipIntro?: boolean;
}
export type LegacyServiceNode = Omit<
  ServiceNode,
  'intro' | 'question' | 'decline' | 'choice' | 'label' | 'receipt' | 'choices' | 'next'
> &
  Partial<Record<'intro' | 'question' | 'decline' | 'choice' | 'label' | 'receipt', string>> & {
    choices?: LegacyServiceChoice[];
    next?: LegacyServiceNode;
  };
export type LegacyServiceChoice = Omit<LegacyServiceNode, 'label'> & { label: string };
export interface ContentBundle {
  revision?: string;
  entities: {
    schema: 1;
    definitions: Record<string, EntityDefinition>;
    placements: Record<string, EntityPlacement>;
  };
  dialogues: {
    schema: 1;
    variants: Record<string, DialogueVariant>;
    shared: Record<string, SharedConversation>;
    services: Record<string, ServiceNode>;
  };
  texts: { schema: 1; texts: Record<string, TextRecord> };
}
export interface Appearance {
  gender?: string;
  skin?: string;
  shirt?: string;
  pants?: string;
  hair?: string;
  shoes?: string;
  hairstyle?: string;
  sunglasses?: boolean;
  cape?: boolean;
  back?: string;
  neck?: string;
  rocketBurnUntil?: number;
  rocketHopAt?: number;
  hat?: string;
  weapon?: string;
  boots?: boolean;
  iceTop?: boolean;
  icePants?: boolean;
  torso?: string;
  legs?: string;
  cloakTop?: boolean;
  cloakBottom?: boolean;
  tinfoil?: boolean;
  female?: boolean;
  longHair?: boolean;
  coat?: boolean;
  cap?: boolean;
}
export interface EconomyState {
  coins: number;
  equity: number;
  grain: number;
  bouquets: number;
  fuelCans: number;
  fish: number;
  sand: number;
  saltLetters: number;
  saltLettersDelivered: number;
  ownedHats: string[];
  iphoneOwned: boolean;
  iphoneEquipped: boolean;
  robotaxiOwned: boolean;
  softwareCopies: number;
  incomeQuarters: number;
  ownedEquipment: string[];
}
export type MonkeyStage = 'not-started' | 'accepted' | 'carrying' | 'completed';
export type RaptorStage = 'not-started' | 'escaped' | 'carrying' | 'completed';
export interface AlienProgress {
  started: boolean;
  evidence: boolean;
  permit: boolean;
  bayonet: boolean;
  defeated: string[];
  completed: boolean;
  skateboard: boolean;
}
export interface ExpeditionProgress {
  raptor: RaptorStage;
  railgun: boolean;
  equipped: boolean;
  krakenStarted: boolean;
  krakenDefeated: boolean;
  krakenReward: boolean;
  cape: boolean;
}
export interface GuildProgress {
  version?: number;
  visits: number;
  member: boolean;
  lastVisitAt?: number | null;
  rank?: number;
  peptides?: number;
  initiated?: boolean;
}
export interface InventoryLedger {
  epoch: number;
  revision: number;
  sandwiches: number;
  deliveryPending: boolean;
  peptides: number;
  bisonHides: number;
  coffee: number;
  akimboAmmo: number;
  railgunCharge: number;
  railgunBatteries: number;
  tablets: Record<string, number>;
}
export interface SavedPosition extends Point {
  z?: number;
  mode?: string;
  instance?: string;
  height?: number;
  base?: number;
  angle?: number;
  hp?: number;
}
export interface PendingAward {
  id: string | number;
  kind?: string;
  amount?: number;
  hatId?: string;
  inventory?: import('./network.ts').InventorySnapshot;
}
export interface VehicleState {
  owned?: boolean;
  riding?: boolean;
  rented?: boolean;
  fuel?: number;
  x?: number;
  y?: number;
  z?: number;
  angle?: number;
  distance?: number;
  [key: string]: JSONValue | undefined;
}
export interface PlayerDocument {
  schema: 2;
  appearance: Appearance;
  position: SavedPosition | null;
  skills: {
    strength: { xp: number; funded: boolean };
    hitpoints: { hp: number; max: number; xp: number };
  };
  inventory: {
    economy: EconomyState;
    ledger: InventoryLedger | null;
    sunglasses: { owned: boolean };
    grapplingHook: boolean;
    collection: string[];
  };
  quests: {
    monkey: { stage: MonkeyStage };
    theyLive: AlienProgress;
    expeditions: ExpeditionProgress;
    illuminatus: { guild: GuildProgress | null; initiated: boolean; bomberOwned: boolean };
  };
  vehicles: {
    ferrari: VehicleState;
    motorcycle: VehicleState;
    bicycle: JSONObject | null;
    bomber: { bombReadyAt: number };
  };
  activities: {
    delivery: JSONObject;
    monkeyKeeper: JSONObject;
    laborReadyAt: Record<string, number>;
    [key: string]: JSONValue;
  };
  conditions: {
    inebriation: number;
    jailed: boolean;
    police: JSONObject | null;
    deathPending: boolean;
  };
  employment: { aiLab: { hired: boolean; bestScore: number } };
  business: { tech: JSONObject };
  finance: {
    bank: { balance: number; updatedAt: number } | null;
    growth: import('./finance.ts').GrowthPosition | null;
  };
  social: { pvp: { enabled: boolean; disableAt: number } | null };
  progress: { houseSearches: string[] };
  rewards: { pending: PendingAward[]; serial: number };
  equipment: { decorativeRocket: { readyAt: number; burnUntil: number; hopAt: number } };
  migration: { legacyKeys: string[]; unknownPrivateState: Record<string, unknown> };
}
