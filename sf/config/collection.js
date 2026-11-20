import { ITEM_STATS } from './item-stats.js';
import { HAT_CATALOG } from './hats.js';
/** Discovery clues belong here; the wardrobe and houses never advertise rewards. */
const collectionClues = Object.freeze({
  backpack: 'A chest of drawers in a quiet home on Beachwood Avenue.',
  'new-year-rocket':
    'A wardrobe in the Southern garden lanes. Look toward the eastern end of the neighborhood.',
  'clock-amulet': 'A travelling trunk in a home in the South Grove neighborhood.',
});
export const COLLECTION_ITEMS = Object.freeze(
  [
    ...Object.entries(ITEM_STATS)
      .filter(([, item]) => item.slot !== 'hat' && item.pickup !== 'disintegrate')
      .map(([id, item]) => ({
        id,
        name: item.name,
        ...(collectionClues[id] ? { hint: collectionClues[id] } : {}),
      })),
    ...HAT_CATALOG.map((h) => ({ id: 'hat:' + h.id, name: h.name })),
    ...Object.entries({
      sunglasses: 'Sunglasses',
      skateboard: 'Skateboard',
      cape: 'Kraken cape',
      iphone: 'iPhone',
      coffee: 'Coffee',
      grain: 'Grain',
      fish: 'Live fish',
      sand: 'Ocean Beach sand',
      bouquet: 'Bouquet',
      letter: 'Conservation letter',
      software: 'Sales software',
      equity: 'Startup equity',
      growth: 'Growth equity',
      monkey: 'Monkey',
      certificate: 'Alien Evidence Certificate',
      permit: 'Alien permit',
      'fuel-can': 'Fuel can',
      'grappling-hook': 'Grappling hook',
    }).map(([id, name]) => ({ id, name })),
  ].map(Object.freeze),
);
