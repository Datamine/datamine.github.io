/** Existing residential plot immediately west of Sand Hill Road. */
export const WIZARD_HOUSE = Object.freeze({ x: 32, z: 133.2, w: 4.8, d: 2.7 });
export function isWizardHousePlot(plot: { x: number; z: number }) {
  return Math.abs(plot.x - WIZARD_HOUSE.x) < 0.01 && Math.abs(plot.z - WIZARD_HOUSE.z) < 0.01;
}
