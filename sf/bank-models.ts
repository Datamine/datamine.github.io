import type { InteriorBuilding } from './types/interiors.ts';
import type { LocalPlayer, SignAtlas } from './types/world.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';

export function drawCoffeeCup(m: Mesh, x: number, y: number, z: number, { steam = 0 } = {}) {
  m.cylinder(x, y, z, 0.06, 0.115, '#ece6ce', 16, 0.072);
  m.cylinder(x, y + 0.117, z, 0.061, 0.004, '#624733', 16, 0.061);
  for (let i = 0; i < 9; i++) {
    const a = (i * Math.PI * 2) / 9,
      b = ((i + 1) * Math.PI * 2) / 9;
    m.rod(
      [x + 0.068 + Math.cos(a) * 0.029, y + 0.061 + Math.sin(a) * 0.034, z] satisfies [
        number,
        number,
        number,
      ],
      [x + 0.068 + Math.cos(b) * 0.029, y + 0.061 + Math.sin(b) * 0.034, z] satisfies [
        number,
        number,
        number,
      ],
      0.009,
      '#ded5b8',
      6,
    );
  }
  if (steam > 0)
    for (let i = 0; i < 2; i++) {
      const offset = Math.sin(steam * 2 + i) * 0.014;
      m.rod(
        [x + i * 0.025 - 0.012, y + 0.14, z] satisfies [number, number, number],
        [x + i * 0.025 - 0.012 + offset, y + 0.23, z] satisfies [number, number, number],
        0.003,
        '#c9d5c9',
        4,
      );
    }
}
export function drawBankInterior(m: Mesh, b: InteriorBuilding, base: number) {
  const { x, y: z, w, d } = b;
  m.box(x + 0.12, base + 0.002, z + 0.12, w - 0.24, 0.014, d - 0.24, '#d4cdb3', 'stone');
  m.box(x + 0.2, base, z + 0.62, w - 0.95, 0.8, 0.36, '#376a51', 'wood');
  m.box(x + 0.16, base + 0.8, z + 0.58, w - 0.87, 0.065, 0.44, '#c6b68d', 'stone');
  for (let i = 0; i < 3; i++)
    m.box(x + 0.37 + i * 0.47, base + 0.87, z + 0.68, 0.29, 0.006, 0.18, '#e7dec3');
  m.box(x + w - 0.66, base, z + 0.22, 0.42, 1.34, 0.38, '#687970', { metal: 0.25 });
  m.box(x + w - 0.63, base + 0.2, z + 0.615, 0.36, 0.98, 0.012, '#84958a');
  m.cylinder(x + w - 0.45, base + 0.68, z + 0.64, 0.065, 0.018, '#d1c19b', 16, 0.065);
  m.rod(
    [x + w - 0.45, base + 0.68, z + 0.665],
    [x + w - 0.45, base + 0.78, z + 0.665],
    0.011,
    '#4c6257',
    8,
  );
  // A quiet coffee station, with a real cup and brass espresso fittings.
  m.box(x + 0.23, base, z + d - 0.75, 0.57, 0.64, 0.43, '#8f7959', 'wood');
  m.box(x + 0.2, base + 0.64, z + d - 0.78, 0.63, 0.045, 0.49, '#c9bd9a');
  m.box(x + 0.3, base + 0.69, z + d - 0.69, 0.28, 0.24, 0.22, '#a7b6a9', { metal: 0.35 });
  m.cylinder(x + 0.44, base + 0.93, z + d - 0.58, 0.075, 0.035, '#394f48', 12, 0.075);
  drawCoffeeCup(m, x + 0.62, base + 0.69, z + d - 0.47);
  for (let i = 0; i < 3; i++)
    m.sphere(
      x + w - 0.42,
      base + 0.15 + i * 0.14,
      z + d - 0.5,
      0.22,
      0.16,
      0.22,
      (['#658766', '#78936a', '#537555'] satisfies [string, string, string])[i],
      10,
      7,
    );
  m.cylinder(x + w - 0.42, base, z + d - 0.5, 0.14, 0.21, '#967554', 12, 0.12, 'stone');
  b.interiorObstacles = [
    [
      [x + 0.16, z + 0.58],
      [x + w - 0.67, z + 0.58],
      [x + w - 0.67, z + 1.02],
      [x + 0.16, z + 1.02],
    ],
    [
      [x + w - 0.7, z + 0.2],
      [x + w - 0.2, z + 0.2],
      [x + w - 0.2, z + 0.67],
      [x + w - 0.7, z + 0.67],
    ],
    [
      [x + 0.2, z + d - 0.8],
      [x + 0.86, z + d - 0.8],
      [x + 0.86, z + d - 0.27],
      [x + 0.2, z + d - 0.27],
    ],
  ];
}
export function drawBankBillboard(m: Mesh, b: InteriorBuilding, base: number, signs: SignAtlas) {
  const cx = b.x + b.w / 2,
    z = b.y + b.d * 0.57,
    width = b.w - 0.25,
    height = 0.98,
    y = base + 0.95,
    uv = signs.get('green-bank-roof');
  for (const side of [-1, 1] satisfies [number, number]) {
    const x = cx + side * width * 0.33;
    m.rod([x, base, z], [x, y + height, z], 0.045, '#536960', 10);
    m.rod([x, base, z - 0.55], [x, y + 0.1, z], 0.03, '#839487', 8);
  }
  m.box(
    cx - width / 2 - 0.045,
    y - 0.045,
    z - 0.06,
    width + 0.09,
    height + 0.09,
    0.12,
    '#c3cab5',
    'wood',
  );
  m.box(cx - width / 2, y, z + 0.065, width, height, 0.012, '#295a44');
  if (uv) {
    m.quad(
      [cx - width / 2, y, z + 0.079],
      [cx + width / 2, y, z + 0.079],
      [cx + width / 2, y + height, z + 0.079],
      [cx - width / 2, y + height, z + 0.079],
      '#ffffff',
      uv,
    );
    m.quad(
      [cx + width / 2, y, z - 0.125],
      [cx - width / 2, y, z - 0.125] satisfies [number, number, number],
      [cx - width / 2, y + height, z - 0.125] satisfies [number, number, number],
      [cx + width / 2, y + height, z - 0.125],
      '#ffffff',
      uv,
    );
  }
  for (const x of [cx - width * 0.3, cx + width * 0.3]) {
    m.rod([x, base + 0.1, z + 0.25], [x, base + 0.55, z + 0.5], 0.022, '#8b9a89', 8);
    m.box(x - 0.09, base + 0.51, z + 0.45, 0.18, 0.08, 0.13, '#b5c4ae');
  }
}
export function drawDrinkingCoffee(
  m: Mesh,
  player: Pick<LocalPlayer, 'x' | 'y' | 'angle'>,
  base: number,
  time: number,
  started: number,
  duration = 1600,
) {
  const t = Math.max(0, Math.min(1, (time - started) / duration)),
    lift = Math.sin(t * Math.PI);
  pose(m, player.x + 0.5, base, player.y + 0.5, player.angle - Math.PI / 2, () =>
    drawCoffeeCup(m, 0.18, 0.96 + lift * 0.36, 0.22, { steam: time * 0.001 }),
  );
}
