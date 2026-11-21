/** Front entrance faces San Bruno Avenue; the entire parcel rotates with it. */
export const ARMORY = Object.freeze({
  x: 65.2,
  z: 111.5,
  w: 3.2,
  d: 2.6,
  rotation: Math.PI / 2,
  entry: { x: 62.15, y: 111 },
});
export function inArmoryGrounds(x: number, z: number, margin = 0) {
  const dx = x - ARMORY.x,
    dz = z - ARMORY.z,
    c = Math.cos(ARMORY.rotation),
    s = Math.sin(ARMORY.rotation);
  return (
    Math.abs(dx * c + dz * s) < ARMORY.w / 2 + margin &&
    Math.abs(-dx * s + dz * c) < ARMORY.d / 2 + margin
  );
}
