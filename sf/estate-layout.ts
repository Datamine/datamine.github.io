export const ESTATE_DISTRICT = Object.freeze({ west: 54, east: 80, north: 117, south: 147 });
export function inEstateDistrict(x: number, z: number) {
  const b = ESTATE_DISTRICT;
  return x > b.west && x < b.east && z > b.north && z < b.south;
}
export function estateGroundColor(color: string, x: number, z: number) {
  const b = ESTATE_DISTRICT,
    t =
      Math.max(0, Math.min(1, Math.min(x - b.west, b.east - x, z - b.north, b.south - z) / 3)) *
      0.78,
    target = [67, 102, 69] satisfies [number, number, number];
  return (
    '#' +
    ([0, 1, 2] satisfies [number, number, number])
      .map((_, i) =>
        Math.round(parseInt(color.slice(1 + i * 2, 3 + i * 2), 16) * (1 - t) + target[i] * t)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
