import type { Material } from './types/geometry.ts';
export interface FacadeWindow {
  glow?: number;
  isX?: boolean;
  plane: number;
  along: number;
  y: number;
  w: number;
  h: number;
  far?: boolean;
  trim?: string;
  seed?: number;
  style?: string;
  bay?: boolean;
  transparent?: boolean;
  wallDepth?: number;
}
import type { Mesh } from './geometry.ts';
import { tint } from './geometry.ts';
import { windowAppearance } from './materials.ts';

/** Complete pane divisions, shared by houses, offices, and civic buildings.
 * Cross rails stop at mullions, so no bars end halfway across a pane. */
export function windowLayout(w: number, h: number, style = 'sash') {
  const bar = Math.min(0.025, w * 0.045, h * 0.035),
    vertical = style === 'industrial' ? ([w / 3, (w * 2) / 3] satisfies [number, number]) : [w / 2],
    cross =
      h *
      (style === 'office' || style === 'storefront' ? 0.76 : style === 'industrial' ? 0.64 : 0.5);
  const divisions = vertical.map((x) => ({ x: x - bar / 2, y: 0, w: bar, h })),
    cuts = [
      0,
      ...vertical.flatMap((x) => [x - bar / 2, x + bar / 2] satisfies [number, number]),
      w,
    ];
  for (let i = 0; i < cuts.length - 1; i += 2)
    divisions.push({ x: cuts[i], y: cross - bar / 2, w: cuts[i + 1] - cuts[i], h: bar });
  return { bar, divisions };
}

/** Glass sits behind a solid outer frame and shaded reveals, with a projecting
 * sill. The glazing uses the ambient room shader, never a tiled pane texture. */
export function drawFacadeWindow(
  m: Mesh,
  {
    isX = false,
    plane,
    along,
    y,
    w,
    h,
    far = false,
    trim = '#dedbd0',
    seed = 0,
    style = 'sash',
    bay = false,
    transparent = false,
    wallDepth = 0.1,
  }: FacadeWindow,
) {
  const out = far ? -1 : 1,
    offset = bay && !transparent ? 0.18 : 0,
    frame = Math.min(0.035, w * 0.09, h * 0.07),
    appearance = windowAppearance(isX ? plane : along, y, isX ? along : plane, seed);
  const point = (u: number, v: number, d: number) =>
    isX
      ? [plane + out * (d + offset), y + v, along + u]
      : [along + u, y + v, plane + out * (d + offset)];
  const face = (points: number[][], color: string, material: Material = null) => {
    if (isX !== far) points = [points[0], points[3], points[2], points[1]];
    m.quad(points[0], points[1], points[2], points[3], color, material);
  };
  const box = (
    u: number,
    v: number,
    ww: number,
    hh: number,
    front: number,
    depth: number,
    color: string,
    material: Material = null,
    reveal = -1,
    skip: number[] | undefined = [],
  ) => {
    const corners = [
      [u, v] satisfies [number, number],
      [u + ww, v] satisfies [number, number],
      [u + ww, v + hh] satisfies [number, number],
      [u, v + hh] satisfies [number, number],
    ];
    face(
      corners.map((p) => point(p[0], p[1], front)),
      color,
      material,
    );
    if (transparent)
      face(
        corners
          .slice()
          .reverse()
          .map((p) => point(p[0], p[1], front - depth)),
        color,
        material,
      );
    // The back is hidden against the wall. Shared mullion ends are hidden
    // against other rails, so neither needs triangles or competing caps.
    for (let i = 0; i < 4; i++)
      if (!skip.includes(i)) {
        const a = corners[i],
          b = corners[(i + 1) % 4];
        face(
          [
            point(...a, front - depth),
            point(...b, front - depth),
            point(...b, front),
            point(...a, front),
          ],
          i === reveal ? tint(color, -30) : color,
          material,
        );
      }
  };
  if (bay && !transparent)
    box(-frame * 2, -frame * 2, w + frame * 4, h + frame * 4, 0.005, offset, trim, 'wood');
  // Separate rails leave an actual open pocket instead of an opaque backing.
  box(-frame, -frame, frame, h + frame * 2, 0.07, 0.06, trim, null, 1);
  box(w, -frame, frame, h + frame * 2, 0.07, 0.06, trim, null, 3);
  box(0, -frame, w, frame, 0.07, 0.06, trim, null, 2);
  box(0, h, w, frame, 0.07, 0.06, trim, null, 0);
  const corners = [[0, 0] satisfies [number, number], [w, 0], [w, h], [0, h]];
  face(
    corners.map((p) => point(p[0], p[1], transparent ? -wallDepth / 2 : 0.013)),
    transparent ? '#b9d2d5' : appearance.color,
    transparent ? { glass: 0.1 } : appearance.material,
  );
  for (const part of windowLayout(w, h, style).divisions)
    box(
      part.x,
      part.y,
      part.w,
      part.h,
      0.05,
      0.018,
      style === 'industrial' ? '#667b75' : tint(trim, -10),
      null,
      -1,
      part.h === h ? ([0, 2] satisfies [number, number]) : ([1, 3] satisfies [number, number]),
    );
  box(-frame * 1.6, -frame - 0.035, w + frame * 3.2, 0.035, 0.115, 0.115, tint(trim, -7), 'stone');
  if (style === 'office')
    box(-frame * 1.3, h + frame, w + frame * 2.6, 0.035, 0.09, 0.08, trim, 'stone');
}
