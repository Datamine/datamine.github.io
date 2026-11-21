import { ITEM_STATS } from './item-stats.ts';
import { HAT_CATALOG } from './hats.ts';
export const COLLECTION_ITEMS = Object.freeze(
  [
    ...Object.entries(ITEM_STATS)
      .filter(([, item]) => item.slot !== 'hat' && item.pickup !== 'disintegrate')
      .map(([id, item]) => ({
        id,
        name: item.name,
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
  ].map((value) => Object.freeze(value)),
);
