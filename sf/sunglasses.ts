import { requiredValue } from './types/assert.ts';
type Navigation = ReturnType<typeof import('./navigation.ts').buildTileNavigation>;
import { isRecord } from './types/json.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
import type { Site, LocalPlayer } from './types/world.ts';

export const SUNGLASSES_BEACH_TARGET = Object.freeze({ x: 8.9, y: 42 });

/** Ownership is inventory; the wear preference lives with character settings. */
export function createSunglasses(
  savedInput: unknown = {},
  onChange: (value0: { owned: boolean }) => void = () => {},
) {
  const saved = isRecord(savedInput) ? savedInput : {};

  const state = { owned: saved?.owned === true };
  function pickUp() {
    if (state.owned) return { ok: false, message: 'You already picked up the sunglasses.' };
    state.owned = true;
    onChange({ ...state });
    return {
      ok: true,
      message:
        'You pick up the sunglasses. Open Character (C) to wear them. Some things are easier to see through dark lenses.',
    };
  }
  return { state, pickUp };
}

/** Select a connected sand cell from the actual tile graph, not screen pixels. */
export function beachSunglassesSite(
  navigation: Navigation,
  { scale = 1.5, from }: { scale: number; from: LocalPlayer },
) {
  const region = navigation.regionAt(from.x, from.y),
    entry = navigation.nearest(
      SUNGLASSES_BEACH_TARGET.x * scale - 0.5,
      SUNGLASSES_BEACH_TARGET.y * scale - 0.5,
      6,
      (x: number, y: number) =>
        navigation.regionAt(x, y) === region && navigation.describe(x, y).type === 'sand',
    );
  if (!entry) throw new Error('Sunglasses need a reachable sand tile on Ocean Beach');
  return {
    id: 'beach-sunglasses',
    kind: 'sunglasses',
    label: contentText('sunglasses.beachSunglassesSite.label-1', {}),
    entry,
    x: entry.x + 0.5,
    z: entry.y + 0.5,
    description: contentText('sunglasses.beachSunglassesSite.description-2', {}),
  };
}

/** A pair of folded wayfarers lies directly on the sand. */
export function drawDroppedSunglasses(
  m: Mesh,
  site: Pick<Site, 'x' | 'z'>,
  base: number,
  time = 0,
  { reduced = false }: { reduced?: boolean } = {},
) {
  pose(
    m,
    requiredValue(site.x, 'sunglasses x'),
    base + 0.045,
    requiredValue(site.z, 'sunglasses z'),
    0.3,
    () => {
      for (const side of [-1, 1] satisfies [number, number]) {
        const cx = side * 0.17,
          outline = [
            [-0.13, -0.105] satisfies [number, number],
            [0.12, -0.105] satisfies [number, number],
            [0.14, 0.055] satisfies [number, number],
            [0.09, 0.11] satisfies [number, number],
            [-0.09, 0.11] satisfies [number, number],
            [-0.14, 0.055] satisfies [number, number],
          ].map(([x, z]) => [cx + x, 0.012, z] satisfies [number, number, number]);
        for (let i = 1; i < outline.length - 1; i++)
          m.tri(outline[0], outline[i + 1], outline[i], '#2b3e3a', { metal: 0.18 });
        for (let i = 0; i < outline.length; i++)
          m.rod(outline[i], outline[(i + 1) % outline.length], 0.018, '#202725', 6);
        m.rod(
          [side * 0.31, 0.015, -0.07] satisfies [number, number, number],
          [side * 0.25, 0.055, -0.25] satisfies [number, number, number],
          0.014,
          '#202725',
          6,
        );
        m.rod(
          [side * 0.25, 0.055, -0.25] satisfies [number, number, number],
          [side * 0.04, 0.055, -0.23] satisfies [number, number, number],
          0.013,
          '#202725',
          6,
        );
        m.rod(
          [cx - 0.065, 0.018, -0.07] satisfies [number, number, number],
          [cx - 0.015, 0.018, -0.07] satisfies [number, number, number],
          0.006,
          '#a0bab5',
          4,
        );
      }
      m.rod(
        [-0.045, 0.025, -0.045] satisfies [number, number, number],
        [0.045, 0.025, -0.045] satisfies [number, number, number],
        0.014,
        '#202725',
        8,
      );
      const glint = reduced ? 0.6 : Math.max(0, Math.sin(time * 0.002)) ** 12;
      if (glint > 0.1) {
        const x = 0.23,
          z = 0.07,
          size = 0.045 * glint;
        m.rod(
          [x - size, 0.065, z] satisfies [number, number, number],
          [x + size, 0.065, z] satisfies [number, number, number],
          0.006,
          '#f3e5af',
          4,
          { emissive: 0.75 },
        );
        m.rod(
          [x, 0.065, z - size] satisfies [number, number, number],
          [x, 0.065, z + size] satisfies [number, number, number],
          0.006,
          '#f3e5af',
          4,
          { emissive: 0.75 },
        );
      }
    },
  );
}
