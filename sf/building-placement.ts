import type { DestinationBuilding } from './types/buildings.ts';
import type { Place } from './types/world.ts';
import { requiredValue } from './types/assert.ts';
/** Destination metadata becomes a placed building after entrances are authored. */
export function requirePlacedBuilding(input: DestinationBuilding | undefined): Place {
  const building = requiredValue(input, 'Authored building is missing');
  const entry = requiredValue(building.entry, 'Building entrance ' + building.id),
    inside = requiredValue(building.inside, 'Building interior ' + building.id),
    localDoor = requiredValue(building.localDoor, 'Building door ' + building.id);
  return Object.assign(building, { entry, inside, localDoor });
}
