import type {
  AlienProgress,
  Appearance,
  ContentBundle,
  PlayerDocument,
  TextValues,
} from './content.ts';
export interface PreviewProfile {
  label: string;
  monkey?: string;
  raptor?: string;
  theyLive?: Partial<AlienProgress>;
  inside?: boolean;
  equipment?: boolean;
  training?: boolean;
  climbing?: boolean;
  rented?: boolean;
  aboard?: boolean;
  victory?: boolean;
  krakenReward?: boolean;
  guildMember?: boolean;
  guildVisits?: number;
  initiated?: boolean;
  hired?: boolean;
  iphoneOwned?: boolean;
  iphoneEquipped?: boolean;
  robotaxiOwned?: boolean;
  pitch?: boolean;
  letter?: number;
  lettersDelivered?: number;
  funded?: boolean;
  hatsOwned?: boolean;
  airshipActive?: boolean;
  prepaid?: boolean;
  reserved?: boolean;
  judging?: boolean;
  jailed?: boolean;
  tigerLoose?: boolean;
}
export type SerializedTextField = 'intro' | 'question' | 'label' | 'receipt' | 'decline';
export type SerializedBindings = Partial<
  Record<SerializedTextField, { id: string; values: TextValues }>
>;
export interface SerializedChoice {
  id: string | null;
  action: string | null;
  textBindings: SerializedBindings;
  label: string;
  receipt: string;
  trade: string | null;
  binding: string | null;
  serverReceipt: boolean;
  sharedPool: boolean;
  next: SerializedDialogue | null;
}
export interface SerializedDialogue {
  id?: string | null;
  textBindings?: SerializedBindings;
  intro: string;
  question: string;
  decline: string;
  repeat: boolean;
  skipIntro: boolean;
  sharedPool: boolean;
  choices: SerializedChoice[];
}
export interface InspectionAction {
  id: string | null;
  label: string;
  disabled: boolean;
}
export interface InspectionActionVariant {
  states: string[];
  actions: InspectionAction[];
}
export interface InspectionDialogueVariant {
  states: string[];
  dialogue: SerializedDialogue | null;
  speech: string;
  panel: string | null;
}
export interface InspectionRecord {
  key: string;
  id: string;
  name: string;
  group: 'npc' | 'object';
  kind: string;
  source: string;
  position: { x?: number; z?: number };
  description?: string;
  appearance?: (Appearance & { chef?: boolean }) | null;
  actions: InspectionActionVariant[];
  dialogues: InspectionDialogueVariant[];
}

export type PreviewEntity = Omit<Partial<import('./world.ts').Actor>, 'interior' | 'start'> &
  Partial<Omit<import('./world.ts').Site, 'interior' | 'start'>> & {
    interior?: import('./world.ts').Place | import('./interiors.ts').DetachedInterior;
  };
export interface InspectionTarget {
  key: string;
  id: string;
  name: string;
  group: 'npc' | 'object';
  kind: string;
  source: string;
  actor: boolean;
  entity: PreviewEntity;
  position: { x?: number; z?: number };
}
export interface PreviewWorld {
  places: readonly PreviewEntity[];
  sights: readonly PreviewEntity[];
  merchants: readonly PreviewEntity[];
  parrots: readonly PreviewEntity[];
  jailStaff: readonly PreviewEntity[];
  restaurantDiners: readonly PreviewEntity[];
  lives: readonly { people: readonly PreviewEntity[] }[];
  airship: { home: { x: number; z: number } };
  spawn: { x: number; y: number };
  expeditions: { cows: readonly PreviewEntity[]; raptor?: PreviewEntity; kraken?: PreviewEntity };
  secretStairs?: PreviewEntity;
  caveExitSite?: PreviewEntity;
  bomberSite?: PreviewEntity;
  keeperNPC?: PreviewEntity;
  zoo?: { state: { tiger: { x: number; y: number } }; dangerous: boolean };
  streetTraffic?: { cars: readonly { x: number; z: number; sight: PreviewEntity }[] };
  slowBus?: { bus: { x: number; z: number; sight: PreviewEntity } };
  whales?: { count: number; sample: (time: number, index: number) => { x: number; z: number } };
  southernNeighborhood?: { residents: readonly PreviewEntity[] };
  socialLife?: { people: readonly PreviewEntity[] };
  wilderness?: { actors: readonly PreviewEntity[] };
}

export type ContentFile = 'entities' | 'dialogues' | 'texts';
export type EditorPath = readonly (string | number)[];
export interface SourceBinding {
  file: ContentFile;
  path: readonly string[];
  kind: string;
  values: TextValues;
  value?: unknown;
}
export interface BoundRecord {
  bindings: Record<string, SourceBinding>;
  name?: string;
}
export interface EditorChoice {
  id: string;
  label: string;
  condition: string;
  binding?: string;
  trade?: string;
  serverReceipt?: boolean;
  receipt?: string;
  next?: EditorDialogueNode;
  sharedPool?: boolean;
}
export interface EditorDialogueNode {
  id?: string;
  intro?: string;
  question?: string;
  decline?: string;
  repeat?: boolean;
  skipIntro?: boolean;
  choices?: EditorChoice[];
  sharedPool?: boolean;
  choice?: string;
  receipt?: string;
}
export interface EditorAction {
  id: string;
  binding: string;
  disabled?: boolean;
  label: string;
  condition: string;
}
export interface EditorMenu {
  id: string;
  states: string[];
  condition: string;
  actions: EditorAction[];
}
export interface EditorVariant {
  id: string;
  states: string[];
  condition: string;
  dialogue?: EditorDialogueNode;
  speech?: string;
  panel?: string | null;
}
export interface EditorRecord extends BoundRecord {
  key: string;
  id: string;
  definitionId: string;
  kind: string;
  source: string;
  name: string;
  group: 'npc' | 'object';
  description: string;
  position: ContentBundle['entities']['placements'][string]['position'];
  appearance?: Appearance;
  actions: EditorMenu[];
  dialogues: EditorVariant[];
}
export interface SharedEditorRecord extends BoundRecord {
  id: string;
  title: string;
  dialogue: EditorDialogueNode;
}
export interface EditorCatalog {
  schema: 2;
  fingerprint: string | undefined;
  records: EditorRecord[];
  sharedDialogue: SharedEditorRecord[];
  playerState: PlayerDocument;
}
export interface DraftChange {
  record: string;
  name?: string;
  path: (string | number)[];
  before: string;
  after: string;
}
export type Drafts = Record<string, DraftChange>;
export interface EditorSaveJob {
  id: string;
  phase: 'done';
  saved: boolean;
  changes: DraftChange[];
  catalogFingerprint: string;
  message: string;
}

export interface WriterStatus {
  available: boolean;
  busy: boolean;
  token: string | null;
  job: EditorSaveJob | { phase: 'error'; message: string } | null;
  file?: string;
}
