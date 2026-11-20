import { clothingSelection } from './clothing.js';
import { hatById } from './hat-catalog.js';
import { Mesh } from './geometry.js';
import { drawCharacter } from './characters.js';
import { drawKrakenCape } from './jurassic-models.js';
import { HAIRSTYLES } from './config/hairstyles.js';

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
  iceTop: false,
  icePants: false,
  torso: 'shirt',
  legs: 'trousers',
  cloakTop: false,
  cloakBottom: false,
});
export function normalizeCharacter(value = {}) {
  const result = { ...CHARACTER_DEFAULTS };
  for (const key of ['skin', 'shirt', 'pants', 'hair', 'shoes'])
    if (/^#[0-9a-f]{6}$/i.test(value?.[key])) result[key] = value[key];
  if (['man', 'woman'].includes(value?.gender)) result.gender = value.gender;
  result.hairstyle = HAIRSTYLES[result.gender].some((s) => s.id === value?.hairstyle)
    ? value.hairstyle
    : HAIRSTYLES[result.gender][0].id;
  result.sunglasses = value?.sunglasses === true;
  result.back = ['none', 'backpack', 'new-year-rocket', 'cape'].includes(value?.back)
    ? value.back
    : value?.cape === true
      ? 'cape'
      : 'none';
  result.neck = value?.neck === 'clock-amulet' ? 'clock-amulet' : 'none';
  result.cape = result.back === 'cape';
  result.rocketBurnUntil = Number.isFinite(value?.rocketBurnUntil)
    ? Math.max(0, value.rocketBurnUntil)
    : 0;
  result.hat = hatById(value?.hat)?.id || 'none';
  result.weapon = ['unarmed', 'bayonet', 'battleaxe', 'railgun', 'akibo'].includes(value?.weapon)
    ? value.weapon
    : 'unarmed';
  result.iceTop = value?.iceTop === true;
  result.icePants = value?.icePants === true;
  return Object.assign(result, clothingSelection(value));
}
export function characterAppearance(settings) {
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

export function drawCharacterPreview(canvas, settings) {
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
    const points = [0, 11, 22].map((k) => ({
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
