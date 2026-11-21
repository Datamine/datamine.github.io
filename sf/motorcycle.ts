import { isFiniteNumber, isRecord } from './types/json.ts';

import type { Point } from './types/geometry.ts';
import type { Economy } from './types/controllers.ts';
import { pitchAroundPoint, transformMeshRange } from './rendering/mesh-transform.ts';
import { Mesh, pose } from './geometry.ts';

export const MOTORCYCLE_RENTAL_PRICE = 5,
  MOTORCYCLE_SPEED = 14;
export const MOTORCYCLE_EXAMINE =
  'A parked motorcycle with a gleaming tank and a neatly printed rental note: “5 coins.”';

export function createMotorcycle({
  home,
  saved: savedInput = {},
  onSave = () => {},
}: {
  home: Point;
  saved?: unknown;
  onSave?: (state: { rented: boolean; x: number; y: number; angle: number }) => void;
}) {
  const saved = isRecord(savedInput) ? savedInput : {};
  const state = {
    rented: saved.rented === true,
    riding: false,
    x: isFiniteNumber(saved.x) ? saved.x : home.x,
    y: isFiniteNumber(saved.y) ? saved.y : home.y,
    angle: isFiniteNumber(saved.angle) ? saved.angle : -Math.PI / 2,
    travel: 0,
  };
  let saveTime = 0;
  const save = () => {
    saveTime = 0;
    onSave({ rented: state.rented, x: state.x, y: state.y, angle: state.angle });
  };
  function rent(economy: Economy, { pursued = false } = {}) {
    if (state.rented) return { ok: false, message: 'Your motorcycle rental is already paid for.' };
    if (pursued)
      return {
        ok: false,
        message: 'The rental desk is closed while a pursuit is in progress.',
      };
    const result = economy.trade('motorcycle-rental');
    if (!result.ok) return result;
    state.rented = true;
    save();
    return {
      ok: true,
      message: 'You rent the motorcycle for 5 coins. Click it to ride, or use Motorcycle / M.',
    };
  }
  function mount() {
    if (!state.rented) return false;
    state.riding = true;
    save();
    return true;
  }
  function park(x: number, y: number, angle = state.angle) {
    Object.assign(state, { riding: false, x, y, angle });
    save();
  }
  function move(x: number, y: number, angle: number, distance: number, dt: number) {
    if (!state.riding) return;
    Object.assign(state, { x, y, angle });
    state.travel += distance;
    saveTime += dt;
    if (saveTime >= 2) save();
  }
  return { state, home, rent, mount, park, move, save };
}

let motorcycleBody: Mesh | null = null;
/** An original small road bike: fork, finned engine, tank, saddle and exhaust.
 * The body is cached; only the spokes rotate with distance traveled. */
export function drawMotorcycle(
  m: Mesh,
  x: number,
  z: number,
  base: number,
  angle: number,
  travel = 0,
) {
  if (!motorcycleBody) {
    const b = new Mesh(),
      chrome = '#b6c2bd',
      dark = '#364448',
      paint = '#507e82',
      metal = { metal: 0.4 };
    for (const a of [-0.63, 0.64] satisfies [number, number]) {
      b.sphere(a, 0.265, 0, 0.255, 0.255, 0.09, '#303b3e', 24, 12);
      for (const side of [-1, 1] satisfies [number, number]) {
        b.sphere(a, 0.265, side * 0.085, 0.16, 0.16, 0.012, chrome, 20, 8, metal);
        b.sphere(a, 0.265, side * 0.101, 0.1, 0.1, 0.012, dark, 16, 8);
      }
    }
    for (const side of [-1, 1] satisfies [number, number]) {
      b.rod(
        [-0.64, 0.27, side * 0.07] satisfies [number, number, number],
        [-0.26, 0.7, side * 0.11] satisfies [number, number, number],
        0.025,
        dark,
        10,
        metal,
      );
      b.rod(
        [-0.26, 0.7, side * 0.11] satisfies [number, number, number],
        [0.34, 0.63, side * 0.1] satisfies [number, number, number],
        0.027,
        dark,
        10,
        metal,
      );
      b.rod(
        [0.34, 0.63, side * 0.1] satisfies [number, number, number],
        [-0.22, 0.34, side * 0.1] satisfies [number, number, number],
        0.028,
        dark,
        10,
        metal,
      );
      b.rod(
        [-0.22, 0.34, side * 0.1] satisfies [number, number, number],
        [-0.64, 0.27, side * 0.07] satisfies [number, number, number],
        0.023,
        dark,
        10,
        metal,
      );
      b.rod(
        [0.64, 0.27, side * 0.065] satisfies [number, number, number],
        [0.43, 1.0, side * 0.1] satisfies [number, number, number],
        0.025,
        chrome,
        12,
        metal,
      );
      b.rod(
        [-0.62, 0.28, side * 0.09] satisfies [number, number, number],
        [-0.44, 0.68, side * 0.13] satisfies [number, number, number],
        0.029,
        chrome,
        12,
        metal,
      );
      for (let i = 0; i < 6; i++)
        b.sphere(
          -0.62 + i * 0.03,
          0.31 + i * 0.058,
          side * 0.09,
          0.037,
          0.012,
          0.037,
          chrome,
          10,
          4,
          metal,
        );
      b.rod(
        [0.07, 0.32, side * 0.12] satisfies [number, number, number],
        [0.07, 0.32, side * 0.23] satisfies [number, number, number],
        0.025,
        dark,
        10,
      );
    }
    b.box(-0.22, 0.35, -0.13, 0.35, 0.25, 0.26, '#7c8c89', metal);
    for (let i = 0; i < 6; i++)
      b.box(-0.19, 0.41 + i * 0.032, -0.155, 0.29, 0.012, 0.31, chrome, metal);
    b.sphere(0.17, 0.72, 0, 0.3, 0.145, 0.19, paint, 24, 12, metal);
    b.cylinder(0.17, 0.86, 0, 0.038, 0.014, chrome, 16, 0.038, metal);
    b.box(-0.48, 0.715, -0.15, 0.55, 0.075, 0.3, '#414743');
    b.sphere(-0.48, 0.755, 0, 0.12, 0.038, 0.15, '#414743', 16, 6);
    b.rod(
      [-0.75, 0.35, 0.22] satisfies [number, number, number],
      [0.12, 0.4, 0.22] satisfies [number, number, number],
      0.045,
      chrome,
      14,
      metal,
    );
    b.sphere(-0.76, 0.35, 0.22, 0.025, 0.04, 0.04, dark, 12, 6);
    b.rod(
      [0.43, 0.99, -0.23] satisfies [number, number, number],
      [0.43, 0.99, 0.23] satisfies [number, number, number],
      0.022,
      chrome,
      12,
      metal,
    );
    for (const side of [-1, 1] satisfies [number, number]) {
      b.rod(
        [0.43, 0.99, side * 0.17] satisfies [number, number, number],
        [0.43, 0.99, side * 0.28] satisfies [number, number, number],
        0.029,
        dark,
        10,
      );
      b.rod(
        [0.43, 1, side * 0.21] satisfies [number, number, number],
        [0.4, 1.21, side * 0.27] satisfies [number, number, number],
        0.009,
        chrome,
        8,
      );
      b.sphere(0.4, 1.23, side * 0.27, 0.035, 0.055, 0.018, chrome, 12, 8, metal);
    }
    b.sphere(0.57, 0.92, 0, 0.13, 0.12, 0.12, chrome, 20, 10, metal);
    b.sphere(0.68, 0.92, 0, 0.018, 0.087, 0.087, '#f8e8b4', 16, 8, { emissive: 0.5 });
    b.box(-0.67, 0.65, -0.08, 0.06, 0.06, 0.16, '#c86e57', { emissive: 0.25 });
    for (const axle of [-0.63, 0.64] satisfies [number, number])
      for (let i = 0; i < 12; i++) {
        const a = 0.15 + (i * Math.PI * 0.87) / 12,
          q = 0.15 + ((i + 1) * Math.PI * 0.87) / 12;
        b.quad(
          [axle + Math.cos(a) * 0.285, 0.265 + Math.sin(a) * 0.285, -0.105] satisfies [
            number,
            number,
            number,
          ],
          [axle + Math.cos(q) * 0.285, 0.265 + Math.sin(q) * 0.285, -0.105] satisfies [
            number,
            number,
            number,
          ],
          [axle + Math.cos(q) * 0.285, 0.265 + Math.sin(q) * 0.285, 0.105] satisfies [
            number,
            number,
            number,
          ],
          [axle + Math.cos(a) * 0.285, 0.265 + Math.sin(a) * 0.285, 0.105] satisfies [
            number,
            number,
            number,
          ],
          paint,
          metal,
        );
      }
    motorcycleBody = b;
  }
  const body = motorcycleBody;
  pose(m, x, base, z, angle, () => {
    for (const value of body.data) m.data.push(value);
    for (const axle of [-0.63, 0.64] satisfies [number, number])
      for (const side of [-1, 1] satisfies [number, number])
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4 + travel / 0.255;
          m.rod(
            [axle, 0.265, side * 0.116] satisfies [number, number, number],
            [axle + Math.cos(a) * 0.15, 0.265 + Math.sin(a) * 0.15, side * 0.116] satisfies [
              number,
              number,
              number,
            ],
            0.006,
            '#a7b7b3',
            4,
            { metal: 0.3 },
          );
        }
  });
}
export function pitchMotorcycleMesh(
  m: Mesh,
  start: number,
  x: number,
  base: number,
  z: number,
  angle: number,
  ground: (x: number, z: number) => number,
) {
  const fx = Math.cos(angle),
    fz = Math.sin(angle);
  const pitch = Math.atan2(
    ground(x + fx * 0.64, z + fz * 0.64) - ground(x - fx * 0.63, z - fz * 0.63),
    1.27,
  );
  transformMeshRange(m, start, pitchAroundPoint(x, base, z, angle, -pitch));
}
