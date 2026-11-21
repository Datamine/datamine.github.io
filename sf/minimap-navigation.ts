import type { Point } from './types/geometry.ts';

/** Search quarter-tile centers in increasing square rings. Stop only when the
 * nearest possible unvisited point is farther than the best reachable point;
 * this preserves Euclidean nearest-point selection, including diagonals.
 * The player's position supplies a finite bound for clicks far out at sea. */
export function nearestMinimapPoint(
  from: Point,
  requested: Point,
  {
    eligible,
    reachable,
    step = 0.25,
    offset = -0.375,
    maxRadius = 128,
  }: {
    eligible: (point: Point) => boolean;
    reachable: (point: Point) => boolean;
    step?: number;
    offset?: number;
    maxRadius?: number;
  },
) {
  if (![from.x, from.y, requested.x, requested.y].every(Number.isFinite)) return null;
  if (eligible(requested) && reachable(requested)) return { ...requested };
  let result = eligible(from) ? { x: from.x, y: from.y } : null,
    best = result ? (from.x - requested.x) ** 2 + (from.y - requested.y) ** 2 : Infinity;
  const cx = Math.round((requested.x - offset) / step),
    cy = Math.round((requested.y - offset) / step),
    limit = Math.ceil(Math.min(maxRadius, Math.sqrt(best)) / step) + 1;
  const consider = (x: number, y: number) => {
    const point = { x: x * step + offset, y: y * step + offset },
      d = (point.x - requested.x) ** 2 + (point.y - requested.y) ** 2;
    if (d < best - 1e-10 && eligible(point) && reachable(point)) {
      result = point;
      best = d;
    }
  };
  for (let r = 0; r <= limit; r++) {
    if (!r) consider(cx, cy);
    else {
      for (let x = cx - r; x <= cx + r; x++) {
        consider(x, cy - r);
        consider(x, cy + r);
      }
      for (let y = cy - r + 1; y < cy + r; y++) {
        consider(cx - r, y);
        consider(cx + r, y);
      }
    }
    if (((r + 0.5) * step) ** 2 > best + 1e-10) break;
  }
  return result;
}
