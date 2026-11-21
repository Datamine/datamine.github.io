import type { Mesh } from './geometry.ts';
import { tint } from './geometry.ts';
/** Details stay above the existing house floor and inside its street-facing
 * parcel: no extra foundation overlays or private paving across the curb. */
export function drawSouthernHouseDetails(
  m: Mesh,
  kind: string,
  p: {
    left: number;
    width: number;
    face: number;
    floor: number;
    H: number;
    door: number;
    dw: number;
    color: string;
    bx: number;
    bw: number;
    storeys?: number;
    shape?: number;
  },
) {
  const { left, width: w, face: z, floor: y, H, door, dw, color, bx, bw } = p,
    ivory = '#e8dbc2',
    metal = '#4e766b';
  if (kind === 'coastal') {
    for (let level = 0; level < (p.storeys || 1); level++)
      for (const side of [-1, 1] satisfies [number, number]) {
        const x = bx + side * (bw / 2 + 0.06);
        m.box(
          x - 0.035,
          y + 0.58 + level * 1.12,
          z + 0.03,
          0.07,
          0.54,
          0.045,
          side < 0 ? '#527b8c' : '#5b8f8a',
          'wood',
        );
        for (let j = 0; j < 4; j++)
          m.box(
            x - 0.027,
            y + 0.63 + level * 1.12 + j * 0.095,
            z + 0.078,
            0.054,
            0.013,
            0.009,
            ivory,
          );
      }
    m.box(bx - bw * 0.48, y + 0.43, z + 0.065, bw * 0.96, 0.09, 0.13, '#b48059', 'wood');
    for (let j = 0; j < 4; j++) {
      m.sphere(
        bx - bw * 0.36 + j * bw * 0.23,
        y + 0.56,
        z + 0.13,
        0.065,
        0.065,
        0.06,
        '#6f9b66',
        6,
        3,
      );
      m.sphere(
        bx - bw * 0.36 + j * bw * 0.23,
        y + 0.62,
        z + 0.13,
        0.027,
        0.025,
        0.027,
        j % 2 ? '#dea987' : '#d6c66e',
        6,
        3,
      );
    }
  } else if (kind === 'deco') {
    for (let tier = 0; tier < 3; tier++)
      m.box(
        left + 0.05 + tier * w * 0.09,
        y + H + 0.03 + tier * 0.075,
        z - 0.08,
        w - 0.1 - tier * w * 0.18,
        0.075,
        0.13,
        tier % 2 ? ivory : tint(color, 12),
        'stucco',
      );
    for (let rib = 0; rib < 3; rib++)
      m.box(
        door - 0.045 + rib * 0.036,
        y + 1.76,
        z + 0.028,
        0.016,
        Math.max(0.1, H - 1.8),
        0.038,
        ivory,
      );
    m.box(left + 0.03, y + 0.15, z + 0.018, w - 0.06, 0.16, 0.035, tint(color, -12), 'glazedTile');
    for (const side of [-1, 1] satisfies [number, number])
      m.rod(
        [bx + side * bw * 0.45, y + 1.22, z + 0.055],
        [bx + side * bw * 0.45, y + 1.36, z + 0.055],
        0.018,
        '#c5ae78',
        6,
        { metal: 0.25 },
      );
  } else if (kind === 'craftsman') {
    m.box(door - 0.07, y + 1.66, z - 0.01, dw + 0.14, 0.07, 0.23, '#c2a079', 'cedar');
    for (const x of [door - 0.055, door + dw + 0.055]) {
      m.box(x - 0.023, y + 0.22, z + 0.13, 0.046, 1.44, 0.046, ivory);
      m.box(x - 0.05, y + 0.18, z + 0.1, 0.1, 0.24, 0.1, '#9d876d', 'stone');
    }
    for (let x = left + 0.08; x < left + w - 0.05; x += 0.19)
      m.rod([x, y + H - 0.12, z + 0.035], [x, y + H - 0.04, z + 0.15], 0.014, '#c1a37b', 4);
    for (const side of [-1, 1] satisfies [number, number])
      m.rod(
        [bx + side * bw * 0.45, y + 0.52, z + 0.08],
        [bx + side * bw * 0.45, y + 0.37, z + 0.15],
        0.017,
        metal,
        4,
      );
  } else if (kind === 'mediterranean') {
    const r = dw * 0.57,
      cy = y + 1.45;
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 10,
        b = ((i + 1) * Math.PI) / 10,
        at = (t: number, rr: number) => [
          door + dw / 2 + Math.cos(t) * rr,
          cy + Math.sin(t) * rr,
          z + 0.135,
        ];
      m.quad(at(a, r), at(b, r), at(b, r + 0.035), at(a, r + 0.035), ivory, 'travertine');
    }
    m.box(left + 0.025, y + 0.15, z + 0.02, w - 0.05, 0.11, 0.026, '#8e9d91', 'glazedTile');
    for (let x = left + 0.1; x < left + w - 0.08; x += 0.22) {
      m.box(x, y + H - 0.06, z + 0.03, 0.13, 0.045, 0.14, '#ad7759', 'roofTile');
    }
    m.cylinder(left + w - 0.12, y + 0.17, z + 0.12, 0.075, 0.16, '#ba8159', 10, 0.105, 'limewash');
    m.sphere(left + w - 0.12, y + 0.4, z + 0.12, 0.12, 0.18, 0.11, '#748f57', 10, 5);
  } else if (kind === 'garden') {
    const x = left + w - 0.09;
    for (const u of [x - 0.05, x + 0.035] satisfies [number, number])
      m.rod([u, y + 0.18, z + 0.045], [u, y + 1.42, z + 0.045], 0.009, '#a3aa85', 4);
    for (let j = 0; j < 7; j++) {
      m.rod(
        [x - 0.05, y + 0.3 + j * 0.16, z + 0.045],
        [x + 0.035, y + 0.3 + j * 0.16, z + 0.045],
        0.007,
        '#a3aa85',
        4,
      );
      if (j % 2)
        m.sphere(
          x + 0.035 * Math.sin(j),
          y + 0.35 + j * 0.14,
          z + 0.065,
          0.07,
          0.1,
          0.035,
          (['#72955d', '#91a86c', '#a2b17c'] satisfies [string, string, string])[j % 3],
          6,
          3,
        );
    }
    for (const u of [left + 0.1, left + w - 0.14]) {
      m.cylinder(u, y + 0.15, z + 0.12, 0.06, 0.12, '#b98666', 10, 0.085);
      m.sphere(u, y + 0.35, z + 0.12, 0.085, 0.14, 0.075, '#7f9d67', 8, 4);
    }
  }
}
