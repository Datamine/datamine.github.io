interface MinimapActor {
  x: number;
  z: number;
  hp?: number;
  hidden?: boolean;
  kind?: string;
  questRole?: string;
  neighborhoodService?: string | null;
  id?: string;
}
interface MinimapContext {
  merchants?: readonly MinimapActor[];
  cityLife?: MinimapLife | null;
  southernLife?: MinimapLife | null;
  noeValleyLife?: MinimapLife | null;
  specialNPCLife?: MinimapLife | null;
  squareLife?: MinimapLife | null;
  socialLife?: MinimapLife | null;
  esotericCampus?: { life?: MinimapLife | null } | null;
  southernNeighborhood?: { residents: readonly MinimapActor[] } | null;
  restaurantDiners?: readonly MinimapActor[];
  wilderness?: { actors: readonly MinimapActor[] } | null;
  expeditions?: { cows: readonly MinimapActor[] } | null;
  chase?: { state: { officers: readonly { x: number; y: number }[] } } | null;
}
interface MinimapLife {
  people: readonly MinimapActor[];
}
import { isFiniteNumber } from './types/json.ts';
const shopKinds = new Set([
  'chef',
  'grain',
  'founder',
  'secondary',
  'gpu-buyer',
  'capital',
  'stockbroker',
  'fuel-attendant',
  'hiking-supplier',
  'tablet-wizard',
  'banker',
  'haberdasher',
  'deli',
  'burger-clerk',
  'in-n-out-clerk',
  'bartender',
  'software-vendor',
  'tim-apple',
  'robotaxi-sales',
  'motorcycle-clerk',
  'lift',
  'battery-seller',
]);
/** All layers share the same actor sources and use live rendered positions. */
export function minimapActors(context: MinimapContext) {
  return [
    ...new Set([
      ...(context.merchants || []),
      ...(
        [
          'cityLife',
          'southernLife',
          'noeValleyLife',
          'specialNPCLife',
          'squareLife',
          'socialLife',
        ] as const
      ).flatMap((key) => context[key]?.people || []),
      ...(context.esotericCampus?.life?.people || []),
      ...(context.southernNeighborhood?.residents || []),
      ...(context.restaurantDiners || []),
      ...(context.wilderness?.actors || []),
      ...(context.expeditions?.cows || []),
      ...(context.chase?.state.officers || []).map((n): MinimapActor => ({
        ...n,
        x: n.x + 0.5,
        z: n.y + 0.5,
      })),
    ]),
  ].filter(
    (n) =>
      isFiniteNumber(n.x) && isFiniteNumber(n.z) && (n.hp === undefined || n.hp > 0) && !n.hidden,
  );
}
export function minimapShops<T extends MinimapActor>(actors: readonly T[]) {
  return actors.filter(
    (n) =>
      shopKinds.has(n.kind ?? '') ||
      n.questRole === 'armorer' ||
      n.neighborhoodService ||
      n.id === 'bolinas-grocer',
  );
}
