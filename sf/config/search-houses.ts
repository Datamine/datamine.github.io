import type { Parcel } from '../types/parcels.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from '../content-runtime.ts';
/** Stable pseudo-random residential choices; never reroll on a page load.
 * Rewards are personal, once per character. Keep IDs stable for checkpoints. */
export const HOUSE_SEARCHES = Object.freeze(
  [
    {
      id: 'house-search-1',
      container: 'chest',
      label: contentText('config.search-houses.module.label-1', {}),
      reward: { item: 'sandwich', amount: 3 },
    },
    {
      id: 'house-search-2',
      container: 'doghouse',
      label: contentText('config.search-houses.module.label-2', {}),
      reward: { item: 'coins', amount: 25 },
    },
    {
      id: 'house-search-3',
      container: 'drawers',
      label: contentText('config.search-houses.module.label-3', {}),
      reward: { item: 'backpack', amount: 1 },
    },
    {
      id: 'house-search-4',
      container: 'laundry',
      label: contentText('config.search-houses.module.label-4', {}),
      reward: { item: 'sandwich', amount: 3 },
    },
    {
      id: 'house-search-5',
      container: 'toolbox',
      label: contentText('config.search-houses.module.label-5', {}),
      reward: { item: 'coins', amount: 50 },
    },
    {
      id: 'house-search-6',
      container: 'wardrobe',
      label: contentText('config.search-houses.module.label-6', {}),
      reward: { item: 'new-year-rocket', amount: 1 },
    },
    {
      id: 'house-search-7',
      container: 'breadbox',
      label: contentText('config.search-houses.module.label-7', {}),
      reward: { item: 'coins', amount: 75 },
    },
    {
      id: 'house-search-8',
      container: 'trunk',
      label: contentText('config.search-houses.module.label-8', {}),
      reward: { item: 'clock-amulet', amount: 1 },
    },
  ].map((s) => Object.freeze({ ...s, reward: Object.freeze(s.reward) })),
);
export const searchPlotKey = (p: { x: number; z: number }) => p.x.toFixed(4) + ',' + p.z.toFixed(4);
const searchHash = (text: string) => {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};
export function pickSearchHouseParcels<T extends Parcel>(parcels: readonly T[]) {
  const bands = [97, 114, 131, 148, 165, 182, 199, 220, 250] satisfies [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  return HOUSE_SEARCHES.map((s, i) => {
    const choices = parcels.filter(
      (p) =>
        p.z >= bands[i] &&
        p.z < bands[i + 1] &&
        p.w >= 2.5 &&
        p.w <= 4.5 &&
        p.d >= 2.3 &&
        p.d <= 3.8 &&
        !p.shop &&
        !p.office,
    );
    choices.sort(
      (a: { x: number; z: number }, b: { x: number; z: number }) =>
        searchHash(s.id + searchPlotKey(a)) - searchHash(s.id + searchPlotKey(b)) ||
        searchPlotKey(a).localeCompare(searchPlotKey(b)),
    );
    if (!choices.length) throw Error('No residential parcel for ' + s.id);
    return choices[0];
  });
}
export const SEARCH_ROCKET = Object.freeze({
  burnMs: 10000,
  cooldownMs: 60000,
  jumpMs: 1100,
  jumpHeight: 1.7,
});
