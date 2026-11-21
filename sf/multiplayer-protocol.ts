import { isFiniteNumber, isRecord } from './types/json.ts';
import type { NetworkPose, PoseCoordinates, NetworkNPC, PackedNPC } from './types/network.ts';

import { GAMEPLAY } from './config/gameplay.ts';
export const MP_PROTOCOL = 4,
  MP_TICK_HZ = GAMEPLAY.simulationHz,
  MP_BROADCAST_HZ = GAMEPLAY.playerHz,
  MP_VIEW_RADIUS = GAMEPLAY.viewRadius,
  MP_MAX_NEIGHBORS = GAMEPLAY.maxNearbyPlayers;
export const MP_INTERPOLATION_MS = 1200 / GAMEPLAY.playerHz,
  MP_ENTITY_INTERPOLATION_MS = 1000 / GAMEPLAY.worldHz;
export const MP_MODES = Object.freeze([
  'walk',
  'bike',
  'ferrari',
  'motorcycle',
  'skateboard',
  'surf',
  'ski',
  'climb',
  'rocket',
  'airship',
  'roll',
  'dance',
  'train',
  'hidden',
  'bomber',
  'parachute',
  'teleport',
  'sit',
  'bench',
  'gondola',
]);
export const MP_GESTURES = Object.freeze([
  '',
  'attack',
  'flinch',
  'talk',
  'caught',
  'roll',
  'drink',
  'pet-bear',
  'work',
  'bench',
  'curl',
  'squat',
  'press',
  'paddle',
  'surfboard',
  'windsurf',
  'fish',
  'eat',
  'chair',
]);
export const MP_FRAME_HEADER = 12,
  MP_PLAYER_BYTES = 32;
export function unpackNetworkNPC(value: NetworkNPC | PackedNPC): NetworkNPC {
  return Array.isArray(value)
    ? {
        id: value[0],
        x: value[1],
        z: value[2],
        base: value[3] ?? undefined,
        angle: value[4],
        motion: value[5],
        phase: value[6],
        elapsed: value[7] ?? undefined,
        expeditionDead: !!value[8],
        hold: value[9] || 0,
        level: value[10] || 1,
      }
    : value;
}
export const MP_PRIVATE_KEYS = Object.freeze([
  'sf-character-v1',
  'sf-sunglasses-v1',
  'sf-strength-v1',
  'sf-ferrari-v1',
  'sf-hitpoints-v1',
  'sf-deli-v1',
  'sf-purse-v1',
  'sf-quests-v1',
  'sf-expeditions-v1',
  'sf-motorcycle-v1',
  'sf-monkey-keeper-v1',
  'sf-inebriation-v1',
  'sf-ai-lab-job-v1',
  'sf-tech-ventures-v1',
] satisfies [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
]);

/** Fixed-size little-endian movement packets. Identity/appearance and shared
 * state use infrequent JSON messages; textures and meshes never cross the wire. */
export function encodePlayerFrame(
  players: readonly (Pick<NetworkPose, 'id' | 'x' | 'y' | 'z' | 'angle' | 'mode'> &
    Partial<Omit<NetworkPose, 'pvp'>> & {
      profile?: { pvp?: { enabled?: boolean } | null };
      pvp?: boolean;
    })[],
  tick: number,
  time: number,
) {
  const buffer = new ArrayBuffer(MP_FRAME_HEADER + players.length * MP_PLAYER_BYTES),
    view = new DataView(buffer);
  view.setUint32(0, MP_PROTOCOL, true);
  view.setUint32(4, tick >>> 0, true);
  view.setUint32(8, time >>> 0, true);
  players.forEach((p, i) => {
    const o = MP_FRAME_HEADER + i * MP_PLAYER_BYTES;
    view.setUint32(o, p.id, true);
    view.setFloat32(o + 4, p.x, true);
    view.setFloat32(o + 8, p.z, true);
    view.setFloat32(o + 12, p.y, true);
    view.setFloat32(o + 16, p.angle, true);
    view.setFloat32(o + 20, p.phase || 0, true);
    view.setUint8(o + 24, Math.max(0, Math.min(255, Math.round((p.motion || 0) * 255))));
    view.setUint8(o + 25, Math.max(0, MP_MODES.indexOf(p.mode)));
    view.setUint8(o + 26, p.hp ?? 30);
    view.setUint8(o + 27, p.max ?? 30);
    view.setUint8(o + 28, Math.max(0, MP_GESTURES.indexOf(p.gesture || '')));
    view.setUint8(o + 29, p.moving ? 1 : 0);
    view.setUint8(o + 30, p.level || 1);
    view.setUint8(o + 31, p.profile?.pvp?.enabled || p.pvp === true ? 1 : 0);
  });
  return buffer;
}
export function decodePlayerFrame(buffer: ArrayBuffer | ArrayBufferView) {
  const view = ArrayBuffer.isView(buffer)
    ? new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new DataView(buffer);
  if (
    view.byteLength < MP_FRAME_HEADER ||
    (view.byteLength - MP_FRAME_HEADER) % MP_PLAYER_BYTES ||
    view.getUint32(0, true) !== MP_PROTOCOL
  )
    return null;
  const players = [];
  for (let o = MP_FRAME_HEADER; o < view.byteLength; o += MP_PLAYER_BYTES) {
    const p = {
      id: view.getUint32(o, true),
      x: view.getFloat32(o + 4, true),
      z: view.getFloat32(o + 8, true),
      y: view.getFloat32(o + 12, true),
      angle: view.getFloat32(o + 16, true),
      phase: view.getFloat32(o + 20, true),
      motion: view.getUint8(o + 24) / 255,
      mode: MP_MODES[view.getUint8(o + 25)] || 'walk',
      hp: view.getUint8(o + 26),
      max: view.getUint8(o + 27),
      gesture: MP_GESTURES[view.getUint8(o + 28)] || '',
      moving: !!view.getUint8(o + 29),
      level: view.getUint8(o + 30) || 1,
      pvp: !!view.getUint8(o + 31),
    };
    if (
      !([p.x, p.y, p.z, p.angle, p.phase] satisfies [number, number, number, number, number]).every(
        Number.isFinite,
      )
    )
      return null;
    players.push(p);
  }
  return { tick: view.getUint32(4, true), time: view.getUint32(8, true), players };
}
export function sanitizePrivateState(input: unknown) {
  if (!isRecord(input)) return {};
  const result: Record<string, string> = {};
  let bytes = 0;
  for (const key of MP_PRIVATE_KEYS) {
    const value = input[key];
    if (typeof value !== 'string' || value.length > 16384) continue;
    try {
      const parsed = JSON.parse(value);
      if (key === 'sf-inebriation-v1') {
        if (!isFiniteNumber(parsed) || parsed < 0 || parsed > 100) continue;
      } else if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;
    } catch {
      continue;
    }
    bytes += value.length;
    if (bytes > 65536) break;
    result[key] = value;
  }
  return result;
}
export function validNetworkPose(input: unknown): input is PoseCoordinates {
  if (!isRecord(input)) return false;
  const p = input as Partial<PoseCoordinates>;
  return (
    p &&
    [p.x, p.z, p.y, p.angle, p.phase, p.motion].every(Number.isFinite) &&
    Math.abs(p.x!) < 10000 &&
    Math.abs(p.z!) < 10000 &&
    p.y! >= -10 &&
    p.y! <= 2000 &&
    Math.abs(p.phase!) < 1e8 &&
    p.motion! >= 0 &&
    p.motion! <= 1 &&
    typeof p.mode === 'string' &&
    MP_MODES.includes(p.mode)
  );
}
