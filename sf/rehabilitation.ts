// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
import { configuredDialogue } from './dialogue-config.ts';
import type { Appearance } from './types/content.ts';
import type { WorldPoint } from './types/geometry.ts';
import type { Actor, LocalPlayer } from './types/world.ts';

export const REHABILITATION_DURATION = 4.8;
export function createRehabilitation(onComplete: () => void) {
  const state = { active: false, elapsed: 0 };
  return {
    state,
    start() {
      if (state.active) return false;
      state.active = true;
      state.elapsed = 0;
      return true;
    },
    update(dt: number) {
      if (!state.active) return;
      state.elapsed += Math.max(0, dt);
      if (state.elapsed >= REHABILITATION_DURATION) {
        state.active = false;
        onComplete();
      }
    },
    cancel() {
      state.active = false;
      state.elapsed = 0;
    },
    get beam() {
      return state.active && state.elapsed >= 1.35 && state.elapsed < 3.65;
    },
  };
}
export function detentionStaff(site: WorldPoint) {
  return [
    {
      id: 'rehabilitation-specialist',
      label: contentText('rehabilitation.detentionStaff.label-1', {}),
      name: contentText('rehabilitation.detentionStaff.name-2', {}),
      rehabilitation: true,
      x: site.x + 3.05,
      z: site.z + 0.4,
      skin: '#bf9777',
      shirt: '#f3f2e9',
      hair: '#5b4c41',
      coat: true,
      medical: true,
      height: 1.95,
      angle: Math.PI,
    },
  ];
}
export function rehabilitationDialogue(npc: Partial<Actor> | undefined, start: () => void) {
  return configuredDialogue('rehabilitation', npc, { begin: () => ({ ok: true, after: start }) });
}

export function scrambleAppearance(current: Appearance, random = Math.random) {
  const palettes = {
      skin: ['#bd9369', '#9d7254', '#d1ae8b', '#79563f'] satisfies [string, string, string, string],
      shirt: ['#a44c7b', '#498c9b', '#e1b45a', '#567c58', '#8462ac'] satisfies [
        string,
        string,
        string,
        string,
        string,
      ],
      pants: ['#4a5478', '#916a48', '#b8afa0', '#476b67'] satisfies [
        string,
        string,
        string,
        string,
      ],
      hair: ['#352e2b', '#bd9568', '#7a4f38', '#b4b3ad'] satisfies [string, string, string, string],
      shoes: ['#4d3d3a', '#b1a98e', '#455d6b'] satisfies [string, string, string],
    },
    result: Appearance = {
      ...current,
      gender: current.gender === 'woman' ? 'man' : 'woman',
      hairstyle: current.gender === 'woman' ? 'short' : 'long',
    };
  for (const [key, colors] of Object.entries(palettes) as [keyof typeof palettes, string[]][]) {
    const available = colors.filter((c) => c !== current[key]);
    result[key] =
      available[Math.min(available.length - 1, Math.floor(random() * available.length))];
  }
  return result;
}

export function drawRehabilitationLaser(
  m: Mesh,
  player: Pick<LocalPlayer, 'x' | 'y'>,
  base: number,
  rehab: ReturnType<typeof createRehabilitation>,
  time: number,
) {
  if (!rehab.state.active) return;
  const t = rehab.state.elapsed,
    lower = Math.min(1, t / 1.2),
    y = base + 8 - lower * 2.2;
  pose(m, player.x + 0.5, y, player.y + 0.5, 0, () => {
    m.cylinder(0, 0, 0, 0.4, 0.25, '#e3e8e8', 24, 0.48, { metal: 0.3 });
    m.cylinder(0, -0.2, 0, 0.22, 0.22, '#758a96', 20, 0.34, { metal: 0.35 });
    m.sphere(0, -0.22, 0, 0.12, 0.06, 0.12, '#bca5f1', 20, 8, { emissive: 0.65 });
    m.rod(
      [0, 0.2, 0] satisfies [number, number, number],
      [1.3, 0.8, 0] satisfies [number, number, number],
      0.12,
      '#82939b',
      12,
    );
    m.rod(
      [1.3, 0.8, 0] satisfies [number, number, number],
      [1.3, 5, 0] satisfies [number, number, number],
      0.1,
      '#b7c3c9',
      12,
    );
  });
  if (rehab.beam) {
    const head = [player.x + 0.5, base + 1.65, player.y + 0.5] satisfies [number, number, number],
      tip = [player.x + 0.5, y - 0.22, player.y + 0.5] satisfies [number, number, number],
      pulse = 0.04 + Math.sin(time * 0.06) ** 2 * 0.025;
    m.rod(head, tip, pulse, '#bb9cf4', 12, { emissive: 0.85 });
    m.rod(head, tip, pulse * 0.38, '#f1e8ff', 8, { emissive: 1 });
    m.sphere(...head, 0.16, 0.16, 0.16, '#d1b6fc', 16, 8, { emissive: 0.8 });
    for (let i = 0; i < 7; i++) {
      const a = time * 0.003 + (i * Math.PI * 2) / 7;
      m.rod(
        head,
        [
          head[0] + Math.cos(a) * 0.45,
          head[1] + Math.sin(a * 2) * 0.18,
          head[2] + Math.sin(a) * 0.45,
        ] satisfies [number, number, number],
        0.01,
        '#bbd9fa',
        4,
        { emissive: 0.8 },
      );
    }
  }
}
