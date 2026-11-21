import { isFiniteNumber, isRecord, isOneOf } from './types/json.ts';
import type { CharacterAppearance } from './characters.ts';

import { clothingSelection } from './clothing.ts';
import { hatById } from './hat-catalog.ts';
import { Mesh } from './geometry.ts';
import { drawCharacter } from './characters.ts';
import { drawKrakenCape } from './jurassic-models.ts';
import { HAIRSTYLES } from './config/hairstyles.ts';

export const CHARACTER_DEFAULTS = Object.freeze({
  gender: 'man',
  skin: '#bd9369',
  shirt: '#707b4b',
  pants: '#626955',
  hair: '#453a30',
  shoes: '#3c3d36',
  hairstyle: 'short',
  sunglasses: false,
  cape: false,
  back: 'none',
  neck: 'none',
  rocketBurnUntil: 0,
  hat: 'none',
  weapon: 'unarmed',
  boots: false,
  iceTop: false,
  icePants: false,
  torso: 'shirt',
  legs: 'trousers',
  cloakTop: false,
  cloakBottom: false,
  tinfoil: false,
});
export type CharacterSettings = {
  -readonly [K in keyof typeof CHARACTER_DEFAULTS]: (typeof CHARACTER_DEFAULTS)[K] extends string
    ? string
    : (typeof CHARACTER_DEFAULTS)[K] extends boolean
      ? boolean
      : number;
} & { gender: 'man' | 'woman' };
export function normalizeCharacter(input: unknown = {}): CharacterSettings {
  const value = isRecord(input) ? input : {};
  const result: CharacterSettings = { ...CHARACTER_DEFAULTS };
  for (const key of ['skin', 'shirt', 'pants', 'hair', 'shoes'] as const)
    if (typeof value[key] === 'string' && /^#[0-9a-f]{6}$/i.test(value[key]))
      result[key] = value[key];
  if (isOneOf(['man', 'woman'] as const, value.gender)) result.gender = value.gender;
  result.hairstyle =
    typeof value.hairstyle === 'string' &&
    HAIRSTYLES[result.gender].some((s) => s.id === value.hairstyle)
      ? value.hairstyle
      : HAIRSTYLES[result.gender][0].id;
  result.sunglasses = value?.sunglasses === true;
  result.back = isOneOf(
    ['none', 'backpack', 'new-year-rocket', 'cape'] satisfies [string, string, string, string],
    value.back,
  )
    ? value.back
    : value?.cape === true
      ? 'cape'
      : 'none';
  result.neck = value?.neck === 'clock-amulet' ? 'clock-amulet' : 'none';
  result.cape = result.back === 'cape';
  result.rocketBurnUntil = isFiniteNumber(value?.rocketBurnUntil)
    ? Math.max(0, value.rocketBurnUntil)
    : 0;
  result.hat = hatById(typeof value.hat === 'string' ? value.hat : undefined)?.id || 'none';
  result.weapon = isOneOf(
    ['unarmed', 'bayonet', 'battleaxe', 'railgun', 'akibo'] satisfies [
      string,
      string,
      string,
      string,
      string,
    ],
    value.weapon,
  )
    ? value.weapon
    : 'unarmed';
  result.boots = value?.boots === true;
  result.iceTop = value?.iceTop === true;
  result.icePants = value?.icePants === true;
  return Object.assign(result, clothingSelection(value));
}
export function characterAppearance(settings: CharacterSettings & { phone?: boolean }) {
  const female = settings.gender === 'woman';
  return {
    ...settings,
    railgun: settings.weapon === 'railgun',
    battleaxe: settings.weapon === 'battleaxe',
    akibo: settings.weapon === 'akibo',
    female,
    longHair: female && settings.hairstyle === 'long',
    backpack: settings.back === 'backpack',
  };
}

export function drawCharacterPreview(
  canvas: HTMLCanvasElement,
  settings: CharacterSettings & { phone?: boolean },
) {
  const ctx = canvas.getContext('2d'),
    m = new Mesh();
  if (!ctx) return;
  drawCharacter(
    m,
    0,
    0,
    0,
    Math.PI / 2 - 0.3,
    0,
    false,
    settings.skin,
    settings.shirt,
    characterAppearance(settings),
  );
  if (settings.cape) drawKrakenCape(m, 0, 0, 0, Math.PI / 2 - 0.3, 0, new Map());
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#383c36';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#222820';
  ctx.beginPath();
  ctx.ellipse(120, 216, 48, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  let top = 1;
  for (let i = 1; i < m.data.length; i += 11) top = Math.max(top, m.data[i]);
  const scale = Math.min(100, 195 / top),
    triangles = [];
  for (let i = 0; i < m.data.length; i += 33) {
    const points = ([0, 11, 22] satisfies [number, number, number]).map((k) => ({
      x: 120 + m.data[i + k] * scale,
      y: 215 - m.data[i + k + 1] * scale - m.data[i + k + 2] * scale * 0.2,
    }));
    triangles.push({
      points,
      depth: (m.data[i + 2] + m.data[i + 13] + m.data[i + 24]) / 3,
      color: m.data.slice(i + 6, i + 9),
      light:
        0.65 + Math.max(0, m.data[i + 3] * -0.4 + m.data[i + 4] * 0.7 + m.data[i + 5] * 0.5) * 0.35,
    });
  }
  triangles.sort((a, b) => a.depth - b.depth);
  for (const t of triangles) {
    ctx.fillStyle =
      'rgb(' + t.color.map((v) => Math.round(Math.min(1, v * t.light) * 255)).join(',') + ')';
    ctx.beginPath();
    t.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
  }
}

export function drawChatHead(canvas: HTMLCanvasElement, person: CharacterAppearance) {
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return;
  const settings = normalizeCharacter({
      ...person,
      gender: person.female ? 'woman' : person.gender,
      back: 'none',
    }),
    m = new Mesh();
  drawCharacter(m, 0, 0, 0, Math.PI / 2 + 0.16, 0, false, settings.skin, settings.shirt, {
    ...person,
    ...characterAppearance(settings),
    backpack: false,
    railgun: false,
    bayonet: false,
    battleaxe: false,
    akibo: false,
    motion: 0,
  });
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const triangles = [],
    scale = canvas.width / 0.64;
  for (let i = 0; i < m.data.length; i += 33) {
    if (Math.max(m.data[i + 1], m.data[i + 12], m.data[i + 23]) < 1.25) continue;
    const points = ([0, 11, 22] satisfies [number, number, number]).map(
      (k) =>
        [
          canvas.width / 2 + m.data[i + k] * scale,
          canvas.height * 0.1 +
            (1.86 - m.data[i + k + 1]) * scale -
            m.data[i + k + 2] * scale * 0.08,
        ] satisfies [number, number],
    );
    triangles.push({
      points,
      depth: (m.data[i + 2] + m.data[i + 13] + m.data[i + 24]) / 3,
      color: m.data.slice(i + 6, i + 9),
      light: 0.7 + Math.max(0, m.data[i + 4] * 0.6 + m.data[i + 5] * 0.6) * 0.3,
    });
  }
  triangles.sort((a, b) => a.depth - b.depth);
  for (const t of triangles) {
    ctx.fillStyle =
      'rgb(' + t.color.map((c) => Math.round(Math.min(1, c * t.light) * 255)).join(',') + ')';
    ctx.beginPath();
    t.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  }
}
