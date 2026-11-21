import type { WallOpening } from './types/interiors.ts';
import type { Color, Material } from './types/geometry.ts';
import type { Mesh } from './geometry.ts';

/** Wall coordinates are horizontal along the facade, elevation, and depth.
 * The very same opening rectangles place the glazing and remove the masonry.
 * Reveals have thickness; no opaque face is left behind a pane. */
export function drawPiercedWall(
  m: Mesh,
  {
    isX = false,
    plane,
    along,
    y,
    w,
    h,
    depth = 0.1,
    far = false,
    color,
    material = 'stone',
    openings = [],
  }: {
    isX?: boolean;
    plane: number;
    along: number;
    y: number;
    w: number;
    h: number;
    depth?: number;
    far?: boolean;
    color: Color;
    material?: Material;
    openings?: readonly WallOpening[];
  },
) {
  const out = far ? -1 : 1,
    point = (u: number, v: number, t: number) =>
      isX ? [plane - out * t, v, u] : [u, v, plane - out * t];
  const face = (poly: number[][], back = false) => {
    if ((isX !== far) !== back) poly = poly.slice().reverse();
    m.quad(poly[0], poly[1], poly[2], poly[3], color, material);
  };
  const holes = openings
    .filter((o) => o.x < along + w && o.x + o.w > along && o.y < y + h && o.y + o.h > y)
    .map((o) => ({
      ...o,
      left: Math.max(along, o.x),
      right: Math.min(along + w, o.x + o.w),
      bottom: Math.max(y, o.y),
      top: Math.min(y + h, o.y + o.h),
    }));
  const xs = [...new Set([along, along + w, ...holes.flatMap((o) => [o.left, o.right])])].sort(
      (a, b) => a - b,
    ),
    ys = [...new Set([y, y + h, ...holes.flatMap((o) => [o.bottom, o.top])])].sort((a, b) => a - b);
  const solid = (i: number, j: number) =>
    i >= 0 &&
    i < xs.length - 1 &&
    j >= 0 &&
    j < ys.length - 1 &&
    !holes.some(
      (o) =>
        (xs[i] + xs[i + 1]) / 2 > o.left &&
        (xs[i] + xs[i + 1]) / 2 < o.right &&
        (ys[j] + ys[j + 1]) / 2 > o.bottom &&
        (ys[j] + ys[j + 1]) / 2 < o.top,
    );
  for (let i = 0; i < xs.length - 1; i++)
    for (let j = 0; j < ys.length - 1; j++)
      if (solid(i, j)) {
        const a = [xs[i], ys[j]],
          b = [xs[i + 1], ys[j]],
          c = [xs[i + 1], ys[j + 1]],
          d = [xs[i], ys[j + 1]],
          corners = [a, b, c, d];
        if (!solid(i - 1, j)) {
          let end = i + 1;
          while (solid(end, j)) end++;
          const strip = [
            [xs[i], ys[j]],
            [xs[end], ys[j]],
            [xs[end], ys[j + 1]],
            [xs[i], ys[j + 1]],
          ];
          face(strip.map((p) => point(p[0], p[1], 0)));
          face(
            strip.map((p) => point(p[0], p[1], depth)),
            true,
          );
        }
        for (const [k, neighbor] of [
          [0, [i, j - 1] satisfies [number, number]],
          [1, [i + 1, j] satisfies [number, number]],
          [2, [i, j + 1] satisfies [number, number]],
          [3, [i - 1, j] satisfies [number, number]],
        ] satisfies [number, [number, number]][])
          if (!solid(neighbor[0], neighbor[1])) {
            const a = corners[k],
              b = corners[(k + 1) % 4];
            face([
              point(a[0], a[1], 0),
              point(a[0], a[1], depth),
              point(b[0], b[1], depth),
              point(b[0], b[1], 0),
            ]);
          }
      }
  // The rectangular cut bounds each arch. Fill only its upper spandrels,
  // using exactly the same polygon stations as the arched glazing.
  for (const o of holes.filter((o) => o.arch || o.ellipse)) {
    const r = o.w / 2,
      ry = o.ellipse ? o.h / 2 : r,
      shoulder = o.ellipse ? o.y + ry : o.y + o.h - r,
      segments = o.segments || 12;
    for (const sign of o.ellipse ? ([1, -1] satisfies [number, number]) : [1])
      for (let i = 0; i < segments; i++) {
        const a = (i * Math.PI) / segments,
          b = ((i + 1) * Math.PI) / segments,
          pa = [o.x + r + Math.cos(a) * r, shoulder + sign * Math.sin(a) * ry],
          pb = [o.x + r + Math.cos(b) * r, shoulder + sign * Math.sin(b) * ry];
        const edge = sign > 0 ? o.y + o.h : o.y,
          poly = [pa, [pa[0], edge], [pb[0], edge], pb];
        if (sign < 0) poly.reverse();
        face(poly.map((p) => point(p[0], p[1], 0)));
        face(
          poly.map((p) => point(p[0], p[1], depth)),
          true,
        );
        face([
          point(pb[0], pb[1], 0),
          point(pb[0], pb[1], depth),
          point(pa[0], pa[1], depth),
          point(pa[0], pa[1], 0),
        ]);
      }
  }
}
