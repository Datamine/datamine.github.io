import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
import { drawFacadeWindow } from './windows.ts';
import { drawCommercialRoof } from './rooftops.ts';

/** Prewar masonry office tower: ordered bays, framed glazing on all four
 * elevations, a stone base, and a stepped cornice instead of flat blue slots. */
export function drawBrickOfficeTower(m: Mesh, cx: number, base: number, cz: number) {
  pose(m, cx, base, cz, 0, () => {
    const brick = '#a0806a',
      stone = '#c9c7b6';
    m.box(-0.8, 0, -0.8, 1.6, 0.16, 1.6, '#aaa99a', 'stone');
    m.box(-0.72, 0.16, -0.72, 1.44, 5.2, 1.44, brick, 'brick');
    for (let side = 0; side < 4; side++) {
      const isX = side >= 2,
        far = side % 2 === 0,
        plane = far ? -0.72 : 0.72;
      for (let floor = 0; floor < 6; floor++)
        for (let column = 0; column < 3; column++)
          drawFacadeWindow(m, {
            isX,
            plane,
            along: -0.56 + column * 0.42,
            y: 0.4 + floor * 0.78,
            w: 0.27,
            h: 0.55,
            far,
            trim: stone,
            seed: side * 13 + floor * 7 + column,
            style: floor ? 'office' : 'storefront',
          });
      for (const u of [-0.7, 0.65] satisfies [number, number]) {
        if (isX) m.box(plane - (far ? 0.045 : 0), 0.2, u, 0.045, 5.13, 0.05, '#b49a7f', 'brick');
        else m.box(u, 0.2, plane - (far ? 0.045 : 0), 0.05, 5.13, 0.045, '#b49a7f', 'brick');
      }
    }
    for (const [y, w, h, color] of [
      [0.18, 1.5, 0.08, stone] satisfies [number, number, number, string],
      [1.08, 1.5, 0.055, stone] satisfies [number, number, number, string],
      [5.18, 1.51, 0.075, stone] satisfies [number, number, number, string],
      [5.29, 1.61, 0.09, '#d7cfb9'] satisfies [number, number, number, string],
      [5.39, 1.69, 0.065, stone] satisfies [number, number, number, string],
    ])
      m.box(-w / 2, y, -w / 2, w, h, w, color, 'stone');
    drawCommercialRoof(m, {
      x: -0.73,
      y: 5.455,
      z: -0.73,
      w: 1.46,
      d: 1.46,
      seed: cx * 0.7 + cz * 0.3,
      parapets: false,
    });
    for (const x of [-0.79, 0.735] satisfies [number, number])
      m.box(x, 5.46, -0.79, 0.055, 0.18, 1.58, stone);
    for (const z of [-0.79, 0.735] satisfies [number, number])
      m.box(-0.735, 5.46, z, 1.47, 0.18, 0.055, stone);
  });
}
