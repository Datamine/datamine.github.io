import { isFiniteNumber } from './types/json.ts';
import type { Economy } from './types/controllers.ts';
import type { Mesh } from './geometry.ts';
import { transformMeshRange } from './rendering/mesh-transform.ts';

/** Percentage, not frame count: one point wears off every three active seconds. */
export function createInebriation(saved = 0, onChange: (value0: number) => void = () => {}) {
  const state = { percent: Number.isFinite(saved) ? Math.max(0, Math.min(100, saved)) : 0 };
  let stored = Math.floor(state.percent);
  function set(value: number) {
    state.percent = Math.max(0, Math.min(100, value));
    stored = Math.floor(state.percent);
    onChange(state.percent);
  }
  return {
    state,
    set,
    drink(economy: Economy) {
      if (state.percent >= 100)
        return {
          ok: false,
          message: 'The bartender suggests a glass of water. You are already 100% inebriated.',
        };
      const result = economy.trade('beer');
      if (!result.ok) return result;
      set(Math.min(100, state.percent + 10));
      return {
        ok: true,
        message: 'A cold beer, one coin. You are ' + Math.round(state.percent) + '% inebriated.',
      };
    },
    update(
      dt: unknown,
      {
        gainPerSecond = 0,
        sitting = false,
      }: { sitting?: boolean; gainPerSecond?: number } | undefined = {},
    ) {
      if (!isFiniteNumber(dt) || dt <= 0) return;
      const rate =
        Number.isFinite(gainPerSecond) && gainPerSecond > 0
          ? gainPerSecond
          : -(sitting ? 2 : 1) / 3;
      state.percent = Math.max(0, Math.min(100, state.percent + dt * rate));
      if (Math.floor(state.percent) !== stored) {
        stored = Math.floor(state.percent);
        onChange(state.percent);
      }
    },
    get intensity() {
      return state.percent / 100;
    },
  };
}

export function swayCharacter(
  m: Mesh,
  start: number,
  x: number,
  base: number,
  z: number,
  time: number,
  intensity: number,
) {
  const a = Math.sin(time * 0.0015) * 0.11 * intensity,
    b = Math.cos(time * 0.0011) * 0.065 * intensity;
  const matrix = new Float64Array([
    1,
    0,
    0,
    0,
    a,
    1,
    b,
    0,
    0,
    0,
    1,
    0,
    -a * base,
    0,
    -b * base,
    1,
  ] satisfies [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ]);
  transformMeshRange(m, start, matrix, { normalizeNormals: true });
}
