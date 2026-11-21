import type { Vec2 } from './types/geometry.ts';
interface SeaShore {
  polygon: readonly (readonly number[])[];
  width: number;
}
interface SeaBounds {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}
import { marinElevation } from './geography.ts';
import type { Mesh } from './geometry.ts';

import { WATER_LEVEL } from './water-tiles.ts';

/** One sea surface, with shared-vertex depths rather than overlapping ribbons.
 * Only vertices near a coast need distance calculations. Deep-water cells merge
 * into row spans; the static mesh stays small and adds no rendering pass. */
export function createSeaSurface(m: Mesh, shores: readonly SeaShore[], step = 0.6) {
  const all = shores.flatMap((s) => s.polygon),
    margin = Math.max(...shores.map((s) => s.width)) + step * 2;
  const minX = Math.floor((Math.min(...all.map((p) => p[0])) - margin) / step) * step,
    minZ = Math.floor((Math.min(...all.map((p) => p[1])) - margin) / step) * step;
  const nx = Math.ceil((Math.max(...all.map((p) => p[0])) + margin - minX) / step),
    nz = Math.ceil((Math.max(...all.map((p) => p[1])) + margin - minZ) / step),
    stride = nx + 1;
  const depths = new Float32Array(stride * (nz + 1));
  depths.fill(1);
  for (const { polygon, width } of shores)
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i],
        b = polygon[(i + 1) % polygon.length],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        len = dx * dx + dz * dz;
      const x0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - width - minX) / step)),
        x1 = Math.min(nx, Math.ceil((Math.max(a[0], b[0]) + width - minX) / step));
      const z0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - width - minZ) / step)),
        z1 = Math.min(nz, Math.ceil((Math.max(a[1], b[1]) + width - minZ) / step));
      for (let z = z0; z <= z1; z++)
        for (let x = x0; x <= x1; x++) {
          const wx = minX + x * step,
            wz = minZ + z * step,
            t = Math.max(0, Math.min(1, ((wx - a[0]) * dx + (wz - a[1]) * dz) / (len || 1))),
            depth = Math.hypot(wx - a[0] - dx * t, wz - a[1] - dz * t) / width;
          depths[z * stride + x] = Math.min(depths[z * stride + x], depth);
        }
    }
  const rows = [];
  let quads = 0;
  for (let z = 0; z < nz; z++) {
    const row = [];
    for (let x = 0; x < nx;) {
      const deep = (xx: number) =>
        (
          [
            depths[z * stride + xx],
            depths[z * stride + xx + 1],
            depths[(z + 1) * stride + xx],
            depths[(z + 1) * stride + xx + 1],
          ] satisfies [number, number, number, number]
        ).every((d) => d === 1);
      let end = x + 1;
      if (deep(x)) while (end < nx && deep(end)) end++;
      row.push([x, end] satisfies [number, number]);
      quads++;
      x = end;
    }
    rows.push(row);
  }
  for (let z = 0; z < nz; z++)
    for (const [x, end] of rows[z]) {
      const x0 = minX + x * step,
        x1 = minX + end * step,
        z0 = minZ + z * step,
        z1 = minZ + (z + 1) * step;
      if (end - x > 1) {
        // Keep every neighboring row's edge vertex. A long triangle edge
        // over fine cells otherwise leaves visible subpixel cracks (T joins).
        const cuts = (row: number[][]) =>
          [...new Set([x, end, ...(row || []).flat().filter((v) => v > x && v < end)])].sort(
            (a, b) => a - b,
          );
        const polygon = [
          ...cuts(rows[z + 1]).map(
            (v) => [minX + v * step, WATER_LEVEL, z1] satisfies [number, number, number],
          ),
          ...cuts(rows[z - 1])
            .reverse()
            .map((v) => [minX + v * step, WATER_LEVEL, z0] satisfies [number, number, number]),
        ];
        const center = [(x0 + x1) / 2, WATER_LEVEL, (z0 + z1) / 2] satisfies [
          number,
          number,
          number,
        ];
        for (let i = 0; i < polygon.length; i++)
          m.tri(center, polygon[i], polygon[(i + 1) % polygon.length], '#ffffff', { water: 1 });
      } else {
        const start = m.data.length;
        m.quad(
          [x0, WATER_LEVEL, z0] satisfies [number, number, number],
          [x0, WATER_LEVEL, z1] satisfies [number, number, number],
          [x1, WATER_LEVEL, z1] satisfies [number, number, number],
          [x1, WATER_LEVEL, z0] satisfies [number, number, number],
          '#ffffff',
          { water: 1 },
        );
        const a = depths[z * stride + x],
          b = depths[(z + 1) * stride + x],
          c = depths[(z + 1) * stride + end],
          d = depths[z * stride + end];
        for (const [vertex, depth] of (
          [a, b, c, a, c, d] satisfies [number, number, number, number, number, number]
        ).entries())
          m.data[start + vertex * 11 + 10] = depth;
      }
    }
  return { minX, minZ, maxX: minX + nx * step, maxZ: minZ + nz * step, quads };
}

/** Fill the view beyond the static sea without a coplanar overlap or an outer
 * sailing limit. All four possible pieces meet its deep-water boundary exactly. */
export function drawOffshoreSea(m: Mesh, bounds: SeaBounds, x: number, z: number, radius: number) {
  const x0 = x - radius,
    x1 = x + radius,
    z0 = z - radius,
    z1 = z + radius;
  const rect = (a: number, b: number, c: number, d: number) => {
    if (c - a > 1e-8 && d - b > 1e-8)
      m.quad(
        [a, WATER_LEVEL, b] satisfies [number, number, number],
        [a, WATER_LEVEL, d] satisfies [number, number, number],
        [c, WATER_LEVEL, d] satisfies [number, number, number],
        [c, WATER_LEVEL, b] satisfies [number, number, number],
        '#ffffff',
        { water: 1 },
      );
  };
  rect(x0, z0, x1, Math.min(z1, bounds.minZ));
  rect(x0, Math.max(z0, bounds.maxZ), x1, z1);
  const top = Math.max(z0, bounds.minZ),
    bottom = Math.min(z1, bounds.maxZ);
  rect(x0, top, Math.min(x1, bounds.minX), bottom);
  rect(Math.max(x0, bounds.maxX), top, x1, bottom);
}

export function decorateHeadlands(m: Mesh, outline: readonly (readonly number[])[], scale: number) {
  const height = (x: number, z: number) => marinElevation(x / scale, z / scale);
  for (let edge = 0; edge < outline.length; edge++) {
    const a = outline[edge],
      b = outline[(edge + 1) % outline.length];
    if (Math.max(a[1], b[1]) < -22 * scale) continue;
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]),
      steps = Math.ceil(length / 0.65);
    for (let i = 0; i < steps; i++) {
      const p = [a[0] + ((b[0] - a[0]) * i) / steps, a[1] + ((b[1] - a[1]) * i) / steps],
        q = [a[0] + ((b[0] - a[0]) * (i + 1)) / steps, a[1] + ((b[1] - a[1]) * (i + 1)) / steps],
        h = height(p[0], p[1]),
        hh = height(q[0], q[1]);
      for (let layer = 0; layer < 3; layer++) {
        const low = layer / 3,
          high = (layer + 1) / 3;
        m.quad(
          [p[0], 0.02 + (h - 0.02) * low, p[1]],
          [q[0], 0.02 + (hh - 0.02) * low, q[1]],
          [q[0], 0.02 + (hh - 0.02) * high, q[1]],
          [p[0], 0.02 + (h - 0.02) * high, p[1]],
          (['#747e72', '#8a8c74', '#a19e7c'] satisfies [string, string, string])[layer],
          'stone',
        );
      }
    }
  }
  function ribbon(points: readonly Vec2[], width: number, color: string) {
    const p = points.map(([x, z]) => [x * scale, z * scale] satisfies [number, number]);
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1],
        b = p[i],
        len = Math.hypot(b[0] - a[0], b[1] - a[1]),
        nx = (-(b[1] - a[1]) / len) * width,
        nz = ((b[0] - a[0]) / len) * width,
        steps = Math.ceil(len / 0.3);
      for (let j = 0; j < steps; j++) {
        const at = (t: number, side: number) => {
          const x = a[0] + (b[0] - a[0]) * t + nx * side,
            z = a[1] + (b[1] - a[1]) * t + nz * side;
          return [x, height(x, z) + 0.025, z];
        };
        m.quad(
          at(j / steps, -1),
          at((j + 1) / steps, -1),
          at((j + 1) / steps, 1),
          at(j / steps, 1),
          color,
          'dirt',
        );
      }
    }
  }
  ribbon(
    [
      [19, 2] satisfies [number, number],
      [20, 0.3] satisfies [number, number],
      [20.5, -1.2] satisfies [number, number],
      [19.8, -2.8] satisfies [number, number],
      [17.8, -4.2] satisfies [number, number],
      [15.4, -4.5] satisfies [number, number],
      [13, -3.5] satisfies [number, number],
      [11.4, -2] satisfies [number, number],
      [9.1, -0.8] satisfies [number, number],
    ],
    0.14,
    '#b4ac90',
  );
  ribbon(
    [
      [15.4, -4.5] satisfies [number, number],
      [14, -5] satisfies [number, number],
      [13.5, -6.6] satisfies [number, number],
      [12, -8.5] satisfies [number, number],
      [9, -9] satisfies [number, number],
      [7, -7.2] satisfies [number, number],
    ],
    0.065,
    '#c2b28f',
  );
  ribbon(
    [
      [19.8, -2.8] satisfies [number, number],
      [22, -4] satisfies [number, number],
      [24.5, -6] satisfies [number, number],
      [25, -8.5] satisfies [number, number],
    ],
    0.06,
    '#bcb08a',
  );
  const lightX = 8.7 * scale,
    lightZ = -0.55 * scale,
    base = height(lightX, lightZ);
  m.box(lightX - 0.35, base - 0.05, lightZ - 0.23, 0.7, 0.12, 0.46, '#aaa78f', 'stone');
  m.box(lightX - 0.26, base + 0.07, lightZ - 0.18, 0.52, 0.28, 0.36, '#e0dfcd', 'stucco');
  m.box(lightX - 0.29, base + 0.35, lightZ - 0.2, 0.58, 0.05, 0.4, '#8a8272', 'roof');
  m.cylinder(lightX + 0.13, base + 0.38, lightZ, 0.085, 0.3, '#e8e2c9', 20);
  m.cylinder(lightX + 0.13, base + 0.68, lightZ, 0.105, 0.12, '#e9d6a3', 20, 0.1, {
    emissive: 0.6,
  });
  m.cylinder(lightX + 0.13, base + 0.8, lightZ, 0.13, 0.11, '#987d63', 16, 0);
  const batteryX = 18 * scale,
    batteryZ = 1.75 * scale,
    h = height(batteryX, batteryZ);
  m.box(batteryX - 0.55, h, batteryZ - 0.3, 1.1, 0.14, 0.6, '#9f9e89', 'concrete');
  for (const x of [-0.4, 0.4] satisfies [number, number])
    m.box(batteryX + x - 0.09, h + 0.14, batteryZ - 0.16, 0.18, 0.18, 0.32, '#8b9180', 'concrete');
  const lake = [6.9 * scale, -6.5 * scale] satisfies [number, number],
    level = 1.04;
  for (let i = 0; i < 48; i++) {
    const a = (i * Math.PI) / 24,
      b = ((i + 1) * Math.PI) / 24;
    m.tri(
      [lake[0], level, lake[1]] satisfies [number, number, number],
      [
        lake[0] + Math.cos(a) * 1.12 * scale,
        level,
        lake[1] + Math.sin(a) * 0.55 * scale,
      ] satisfies [number, number, number],
      [
        lake[0] + Math.cos(b) * 1.12 * scale,
        level,
        lake[1] + Math.sin(b) * 0.55 * scale,
      ] satisfies [number, number, number],
      '#7b9d91',
      { water: 2 },
    );
  }
}
