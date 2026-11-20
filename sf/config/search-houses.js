/** Stable pseudo-random residential choices; never reroll on a page load.
 * Rewards are personal, once per character. Keep IDs stable for checkpoints. */
export const HOUSE_SEARCHES = Object.freeze(
  [
    {
      id: 'house-search-1',
      container: 'chest',
      label: 'Cedar chest',
      reward: { item: 'sandwich', amount: 3 },
    },
    {
      id: 'house-search-2',
      container: 'doghouse',
      label: 'Dog house',
      reward: { item: 'coins', amount: 25 },
    },
    {
      id: 'house-search-3',
      container: 'drawers',
      label: 'Chest of drawers',
      reward: { item: 'backpack', amount: 1 },
    },
    {
      id: 'house-search-4',
      container: 'laundry',
      label: 'Laundry basket',
      reward: { item: 'sandwich', amount: 3 },
    },
    {
      id: 'house-search-5',
      container: 'toolbox',
      label: 'Tool box',
      reward: { item: 'coins', amount: 50 },
    },
    {
      id: 'house-search-6',
      container: 'wardrobe',
      label: 'Wardrobe',
      reward: { item: 'new-year-rocket', amount: 1 },
    },
    {
      id: 'house-search-7',
      container: 'breadbox',
      label: 'Bread box',
      reward: { item: 'coins', amount: 75 },
    },
    {
      id: 'house-search-8',
      container: 'trunk',
      label: 'Travelling trunk',
      reward: { item: 'clock-amulet', amount: 1 },
    },
  ].map((s) => Object.freeze({ ...s, reward: Object.freeze(s.reward) })),
);
export const searchPlotKey = (p) => p.x.toFixed(4) + ',' + p.z.toFixed(4);
const searchHash = (text) => {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};
export function pickSearchHouseParcels(parcels) {
  const bands = [97, 114, 131, 148, 165, 182, 199, 220, 250];
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
      (a, b) =>
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
