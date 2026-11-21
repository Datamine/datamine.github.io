/** Both regions use material colors and world widths on the same minimap. */
export const MINIMAP_MATERIALS = Object.freeze({
  salt: '#dfdcc7',
  sea: '#456c72',
  water: '#568b85',
  grass: '#88a264',
  courtyard: '#a6ad87',
  scrub: '#a5a075',
  rock: '#b4b09b',
  sand: '#d8c89c',
  plaza: '#b9b59c',
  building: '#b2ac97',
  road: '#879083',
  path: '#c0ab7e',
  sidewalk: '#e2d6b6',
});
export const MINIMAP_BUILDING = '#aa9a7e';
export function minimapGroundColor(type: string, height = 0) {
  return type === 'grass' && height > 7
    ? '#91a16a'
    : (Object.hasOwn(MINIMAP_MATERIALS, type)
        ? MINIMAP_MATERIALS[type as keyof typeof MINIMAP_MATERIALS]
        : undefined) || MINIMAP_MATERIALS.plaza;
}
