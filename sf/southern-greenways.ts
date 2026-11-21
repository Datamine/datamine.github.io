// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
/** A small residential lane finishes the southwest edge without extending the
 * traffic grid into the cow pasture or the technology campuses. */
export const SOUTHERN_GREENWAYS = Object.freeze([
  {
    name: contentText('southern-greenways.module.name-1', {}),
    halfWidth: 0.3,
    points: [
      [18, 167.5] satisfies [number, number],
      [18, 169.1] satisfies [number, number],
      [38, 169.1] satisfies [number, number],
      [38, 167.5] satisfies [number, number],
    ],
  },
  {
    name: contentText('southern-greenways.module.name-2', {}),
    halfWidth: 0.3,
    points: [
      [18, 169.1] satisfies [number, number],
      [18, 175] satisfies [number, number],
      [30.3, 175] satisfies [number, number],
      [30.3, 172.7] satisfies [number, number],
      [38.7, 172.7] satisfies [number, number],
      [38.7, 169.1] satisfies [number, number],
      [38, 169.1] satisfies [number, number],
    ],
  },
]);
export const COASTAL_GARDEN_HOMES = Object.freeze(
  ([20, 23.5, 27, 30.5, 34, 37] satisfies [number, number, number, number, number, number]).map(
    (x, i) =>
      Object.freeze({
        x,
        z: 170.85,
        w: i === 5 ? 2.5 : 3.05,
        d: 2.4,
        rotation: Math.PI,
        district: i % 2 ? 'craftsman' : 'coastal',
        seed: 0.16 + i * 0.127,
        street: 'Coastal garden lane',
      }),
  ),
);
