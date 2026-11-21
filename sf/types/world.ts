import type { SceneObject } from './scene-state.ts';
import type { GeometryGPU } from './rendering.ts';
import type { PlacedBuilding, WallSection } from './buildings.ts';
import type { DetachedInterior, InstituteRoom, InteriorSection } from './interiors.ts';
import type { Mesh } from '../geometry.ts';
import type { Point, WorldPoint, NumericVector, TextureUV } from './geometry.ts';
import type { Appearance, TextValues } from './content.ts';
export type SignAtlas = Map<string, number[][]>;
export interface ActionReceipt {
  cooldown?: boolean;
  ok: boolean;
  message?: string;
  bonus?: number;
  healed?: number | boolean;
  pending?: boolean;
  after?: () => void;
  promise?: Promise<ActionReceipt>;
}
type TextField = 'intro' | 'question' | 'decline' | 'label' | 'receipt' | 'choice';
export type DialogueTextBindings = Partial<
  Record<`${TextField}TextValues`, TextValues | (() => TextValues)>
> &
  Partial<Record<`${TextField}TextId`, string>>;
export interface RuntimeChoice extends DialogueTextBindings {
  id?: string;
  contentNodeId?: string;
  actionId?: string;
  label: string;
  receipt?: string | null;
  repeat?: boolean;
  trade?: string | null;
  serverReceipt?: boolean;
  next?: RuntimeDialogue;
  accept?: (() => ActionReceipt | Promise<ActionReceipt> | void) | null;
  labelTextId?: string;
  labelTextValues?: TextValues | (() => TextValues);
  receiptTextId?: string;
  receiptTextValues?: TextValues | (() => TextValues);
  ambientConversation?: boolean;
}
export interface ContentEntity extends Appearance {
  id?: string;
  name?: string;
  named?: string;
  label?: string;
  level?: number;
  parrot?: boolean;
  dog?: boolean;
  baby?: boolean;
  police?: boolean;
  serviceTitle?: string;
  editorKey?: string;
  contentDefinitionId?: string;
  editorCategory?: 'npc' | 'object';
  editorDescription?: boolean;
  description?: string;
}
export type EditableEntity = Omit<ContentEntity, 'id'> & { id?: string | number };
export interface RuntimeDialogue extends ContentEntity, DialogueTextBindings {
  id?: string;
  name?: string;
  label?: string;
  intro?: string | (() => string);
  question?: string | (() => string);
  decline?: string;
  choices?: RuntimeChoice[];
  choice?: string | null;
  accept?: (() => ActionReceipt | Promise<ActionReceipt> | void) | null;
  trade?: string | null;
  receipt?: string | null;
  repeat?: boolean;
  skipIntro?: boolean;
  after?: () => void;
  ambientConversation?: boolean;
  contentResolved?: boolean;
  conversationId?: string;
  contentNodeId?: string;
  actionId?: string;
  editorKey?: string;
  serverReceipt?: boolean;
  introTextId?: string;
  introTextValues?: TextValues | (() => TextValues);
  questionTextId?: string;
  questionTextValues?: TextValues | (() => TextValues);
  declineTextId?: string;
  declineTextValues?: TextValues | (() => TextValues);
  choiceTextId?: string;
  choiceTextValues?: TextValues | (() => TextValues);
  receiptTextId?: string;
  receiptTextValues?: TextValues | (() => TextValues);
}
export interface RoamingRoute {
  points: (Point & { stop?: boolean })[];
  speed: number;
  index: number;
  pause: number;
  seed: number;
  stops: number;
  restAngle: number;
  approachAngle: number;
  home: Point;
  bounds: { west: number; east: number; north: number; south: number };
}
export interface Actor extends RuntimeDialogue {
  id: string;
  x: number;
  z: number;
  kind?: string;
  y?: number;
  base?: number;
  angle?: number;
  label: string;
  level?: number;
  max?: number;
  hp?: number;
  speed?: number;
  moving?: boolean;
  motion?: number;
  hold?: number;
  pause?: number;
  seed?: number;
  thinking?: boolean;
  waiting?: boolean;
  speech?: string;
  speechUntil?: number;
  index?: number;
  routeIndex?: number;
  points?: Point[] | number[][];
  roam?: RoamingRoute;
  stroller?: boolean;
  respawn?: number;
  height?: number;
  elapsed?: number;
  speechFor?: number;
  ts?: number;
  walk?: number;
  phase?: string | number;
  defeatAt?: number;
  recoverAt?: number;
  origin?: WorldPoint | number[];
  stops?: Point[] | number;
  shore?: WorldPoint;
  questRole?: string;
  combatKind?: string;
  alienId?: string;
  siteId?: string;
  expeditionRole?: string;
  neighborhoodService?: string | null;
  serviceTitle?: string;
  named?: string;
  localLine?: string;
  mode?: string;
  wilderness?: boolean;
  police?: boolean;
  child?: boolean;
  baby?: boolean;
  dog?: boolean;
  parrot?: boolean;
  keeper?: boolean;
  researcher?: boolean;
  estateResident?: boolean;
  rider?: boolean;
  dogSurfJudge?: boolean;
  rehabilitation?: boolean;
  medical?: boolean;
  dogWalker?: boolean;
  marketLine?: string;
  phone?: boolean;
  stationary?: boolean;
  seated?: boolean;
  fixedFacing?: boolean;
  regional?: boolean;
  socialActor?: boolean;
  networked?: boolean;
  networkPlayer?: false;
  networkVisible?: boolean;
  expeditionDead?: boolean;
  pvp?: boolean;
  alienHP?: number;
  interior?: Place | null;
  pool?: Pool;
  parent?: Actor;
  editorCategory?: 'npc' | 'object';
  contentDefinitionId?: string;
  description?: string;
  editorDescription?: boolean;
  approach?: Point | null;
  showStartedAt?: number;
  topHat?: boolean;
  club?: boolean;
  neighborhood?: boolean;
  neighborLine?: string;
  gesture?: Omit<ActorGesture, 'name'> & { name: string | null };
  lookAt?: WorldPoint;
  start?: () => void;
  stop?: () => void;
  duel?: () => void;
  follow?: () => void;
  unfollow?: () => void;
  examine?: () => void;
}
export interface RemoteActor extends Omit<Actor, 'id' | 'networkPlayer' | 'phase' | 'gesture'> {
  id: number;
  networkPlayer: true;
  phase?: number;
  gesture?: string;
  animation?: ReturnType<typeof import('../animation-presentation.ts').createActorAnimation>;
}
export type InteractiveActor = Actor | RemoteActor;
export type ActorMetadata = Omit<
  Partial<Actor>,
  'interior' | 'id' | 'gesture' | 'networkPlayer'
> & { id?: string | number; gesture?: Actor['gesture'] | string; networkPlayer?: boolean };
export interface Pool {
  x: number;
  z: number;
  w: number;
  d: number;
  center?: number[];
  base?: number;
  water?: number;
}
export interface Site {
  id: string;
  kind: string;
  label: string;
  entry: Point;
  name?: string;
  description?: string;
  x?: number;
  y?: number;
  z?: number;
  w?: number;
  d?: number;
  h?: number;
  base?: number;
  angle?: number;
  lo?: number[];
  hi?: number[];
  start?: number;
  count?: number;
  footprint?: number[][] | null;
  navigationPolygons?: number[][][];
  object?: SceneObject;
  interior?: DetachedInterior;
  mesh?: Mesh;
  solid?: boolean;
  mapPoint?: Point;
  editorKey?: string;
  editorCategory?: 'npc' | 'object';
  contentDefinitionId?: string;
  editorDescription?: boolean;
  details?: (Site & { section: string })[];
  bookId?: string;
  houseId?: string;
  index?: number;
  mobile?: boolean;
  solidParcels?: { x: number; z: number; w: number; d: number; angle?: number }[];
  source?: string;
  category?: string;
  color?: string;
  rotation?: number;
  localDoor?: number;
  localDoorZ?: number;
  inside?: Point;
  seat?: { x: number; z: number; base: number; height: number; angle: number };
  seats?: RenderedSite[];
  launch?: Point;
  approachReserved?: boolean;
  navigationAccess?: string;
  distance?: number;
  rented?: boolean;
  paid?: boolean;
  tigerLoose?: boolean;
  site?: import('../restaurants.ts').RestaurantSite;
  enterableInstitute?: boolean;
  hiddenFromDirectory?: boolean;
  worldLabel?: string;
  neighborhoodService?: string | null;
  minimapColor?: string;
  alwaysPopulated?: boolean;
  neighborLine?: string;
  lights?: unknown[];
  door?: unknown;
}
export type RenderedSite = Site & Required<Pick<Site, 'start' | 'count' | 'lo' | 'hi'>>;
export type InteractionSight = (
  | Site
  | import('./expeditions.ts').ExpeditionLoot
  | { id: string; kind: string; label: string; description?: string; index?: number }
) &
  Partial<Site>;
export type Place = PlacedBuilding & {
  kind?: string;
  interiorObstacles?: number[][][];
  entryOffset?: number;
  height?: number;
  model?: WorldObject;
  search?: unknown;
  editorKey?: string;
  editorCategory?: 'npc' | 'object';
  contentDefinitionId?: string;
  editorDescription?: boolean;
};

export interface WorldObject {
  x: number;
  y: number;
  w: number;
  d: number;
  h?: number;
  base?: number;
  rotation?: number;
  solid?: boolean;
  id?: string;
  kind?: string;
  label?: string;
  arch?: string;
  district?: string | null;
  street?: string;
  scenery?: string;
  suburbanStyle?: string | null;
  preserveGround?: boolean;
  mesh?: Mesh;
  start?: number;
  count?: number;
  lo?: number[];
  hi?: number[];
  sight?: Site | null;
  place?: Place | null;
  interior?: Place | null;
  footprint?: number[][] | null;
  navigationPolygons?: number[][][];
  character?: { x: number; z: number; base?: number; height?: number };
  characters?: unknown[];
  lamp?: StreetLamp;
  pool?: Pool | null;
  houses?: {
    door?: number;
    dw?: number;
    entry?: number;
    width?: number;
    H?: number;
    storeys?: number;
    roof?: string;
    color?: string;
    entryHeight?: number;
    floor?: number;
    frontRise?: number;
    foundationExposure?: number;
  }[];
  homes?: number;
  storeys?: number;
  roof?: VertexRange;
  walls?: WallSection[];
  gpu?: GeometryGPU;
  permanent?: VertexRange;
  extras?: VertexRange;
  roofDetails?: ReturnType<typeof import('../rooftops.ts').drawCommercialRoof> | null;
  researchRoom?: InstituteRoom;
  sections?: InteriorSection[];
  cutaway?: boolean;
  detailTarget?: boolean;
  pinned?: boolean;
  plot?: import('./parcels.ts').Parcel;
}
export interface StreetLamp {
  x: number;
  z: number;
  angle: number;
  style: number;
  street: string;
  kind?: string;
  block?: string;
  blocks?: string[];
}
export interface Street {
  name: string;
  kind?: string;
  points: number[][];
  halfWidth?: number;
  w?: number;
  planned?: boolean;
  regional?: boolean;
  route?: number[][];
  parts?: number[][][];
}
export interface VertexRange {
  start: number;
  count: number;
  lo?: NumericVector;
  hi?: NumericVector;
  uv?: TextureUV;
}

export interface ActorGesture {
  name: string;
  started: number;
  duration: number;
}
export interface LocalPlayer extends Point {
  sitting: boolean;
  sitBlend: number;
  path: Point[];
  moving: boolean;
  angle: number;
  speed: number;
  vx: number;
  vy: number;
  phase: number;
  motion: number;
  runBlend: number;
  gesture?: ActorGesture | null;
  dancing?: boolean;
  danceBlend?: number;
  ballChair?: boolean;
  benchSeat?: boolean;
  serverWorking?: boolean;
  serverEating?: boolean;
  serverRolling?: boolean;
  rollPending?: boolean;
}

export interface PositionedSite extends Site {
  x: number;
  z: number;
}
export interface FishingSite extends PositionedSite {
  water: WorldPoint;
  angle: number;
}
