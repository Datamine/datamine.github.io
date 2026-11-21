import type { CharacterAppearance } from './characters.ts';
import type { AnimationFrame } from './types/animation.ts';
import type { PoseCoordinates, NetworkPose } from './types/network.ts';
import type { SignAtlas } from './types/world.ts';
import type { Appearance } from './types/content.ts';
import { drawBallChair } from './goblin-town.ts';
import { drawCharacter } from './characters.ts';
import { drawBicycle } from './bicycle-model.ts';
import { drawMotorcycle } from './motorcycle.ts';
import { drawFerrari } from './ferrari.ts';
import { drawPlayerSkateboard } from './skateboard.ts';
import { drawWindsurfer } from './windsurfing.ts';
import { drawWaveSurfer } from './surfing.ts';
import { drawSkiRider, drawGondolaCabin } from './tahoe.ts';
import { drawStealthBomber, drawParachute } from './illuminati-models.ts';
import { drawTabletTeleport } from './teleport-models.ts';
import { drawDrinkingCoffee } from './bank-models.ts';
import { drawKrakenCape, drawRailgun } from './jurassic-models.ts';
import { applyForwardRollMesh } from './forward-roll.ts';
import { collapseCharacterMesh } from './capture-animation.ts';
import { drawGymExercise } from './gym-exercises.ts';
import { rocketHopForPose } from './rocket-hop.ts';
import type { Mesh } from './geometry.ts';

/** The same models and rigs as the owner sees, driven only by network poses. */
export function drawRemotePlayer(
  m: Mesh,
  p: PoseCoordinates &
    Partial<Omit<NetworkPose, keyof PoseCoordinates>> & { appearance?: Appearance },
  time: number,
  {
    look,
    animation: a,
    ground = () => p.y,
    signs = new Map(),
    serverTime = Date.now(),
  }: {
    look: CharacterAppearance;
    animation: AnimationFrame;
    ground?: (x: number, z: number) => number;
    signs?: SignAtlas;
    serverTime?: number;
  },
) {
  if ((['hidden', 'rocket'] satisfies [string, string]).includes(p.mode)) return;
  const start = m.data.length,
    position = { x: p.x, y: p.y, z: p.z },
    dead = p.hp === 0,
    hop = rocketHopForPose(p, serverTime);
  const outfit = {
    ...look,
    cpuSkinning: p.mode === 'roll' || a.fall > 0,
    serverTime,
    time: time * 0.001,
    motion: dead ? 0 : a.motion,
    run: a.run,
    sitBlend: a.sitBlend,
    danceBlend: a.danceBlend,
    action: a.action || undefined,
    actionT: a.actionT,
  };
  if (hop.active)
    Object.assign(outfit, {
      action: 'rocket-hop',
      actionT: hop.progress,
      motion: outfit.motion * (1 - Math.sin(Math.PI * hop.progress)),
    });
  if (
    !(['walk', 'sit', 'bench', 'dance'] satisfies [string, string, string, string]).includes(
      p.mode,
    ) ||
    a.action === 'dance' ||
    dead
  )
    Object.assign(outfit, {
      railgun: false,
      akibo: false,
      battleaxe: false,
      bayonet: false,
      phone: false,
    });
  if (p.mode === 'bomber')
    drawStealthBomber(m, position, p.angle, { bank: p.phase, time, pilot: outfit });
  else if (p.mode === 'ski')
    drawSkiRider(m, { position, angle: p.angle, flipAngle: p.phase }, time, false, outfit);
  else if (p.mode === 'train')
    drawGymExercise(
      m,
      ({ curl: 'curls', squat: 'squats', press: 'press' } as Record<string, string>)[
        p.gesture || ''
      ] || 'bench',
      time,
      outfit,
    );
  else if (p.mode === 'surf') {
    if (p.gesture === 'paddle' || p.gesture === 'surfboard')
      drawWaveSurfer(
        m,
        p.x,
        p.z,
        p.y,
        p.angle,
        time,
        {
          stand: p.gesture === 'surfboard' ? 1 : 0,
          yaw: 0,
          roll: p.phase,
          pitch: 0,
          trickProgress: 0,
        },
        { appearance: outfit, moving: p.moving },
      );
    else
      drawWindsurfer(m, p.x, p.z, p.y, p.angle, time, {
        appearance: outfit,
        moving: p.moving,
        pitch: p.phase,
      });
  } else {
    const base =
      p.y +
      0.07 +
      hop.height +
      (p.mode === 'bike'
        ? 0.3
        : p.mode === 'motorcycle'
          ? 0.13
          : p.mode === 'skateboard'
            ? 0.155
            : p.mode === 'ferrari'
              ? 0.12
              : 0);
    const chair = p.mode === 'sit' && p.gesture === 'chair';
    if (chair) drawBallChair(m, p.x, base, p.z, p.angle);
    const mode = dead
      ? 'idle'
      : p.mode === 'bench' || p.mode === 'ferrari' || chair
        ? 'sit'
        : a.sitBlend > 0
          ? 'rest'
          : p.mode === 'bike'
            ? 'cycle'
            : p.mode === 'motorcycle'
              ? 'motorcycle'
              : p.mode === 'skateboard'
                ? 'skate'
                : p.mode === 'climb'
                  ? 'climb'
                  : p.mode === 'gondola' || p.mode === 'roll'
                    ? 'idle'
                    : p.moving
                      ? 'move'
                      : 'idle';
    drawCharacter(m, p.x, p.z, base, p.angle, p.phase, false, look.skin, look.shirt, {
      ...outfit,
      mode,
      height: p.mode === 'ferrari' ? 0.65 : 1,
      ground: (['walk', 'dance', 'sit'] satisfies [string, string, string]).includes(p.mode)
        ? hop.active
          ? (x: number, z: number) => ground(x, z) + hop.height
          : ground
        : null,
    });
    if (
      look.railgun &&
      !hop.active &&
      !dead &&
      !(
        ['roll', 'bike', 'motorcycle', 'skateboard', 'ferrari', 'climb', 'gondola'] satisfies [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
        ]
      ).includes(p.mode)
    )
      drawRailgun(m, p.x, base + 1.14, p.z, p.angle);
    if (p.mode === 'bike') drawBicycle(m, p.x, p.z, p.y + 0.055, p.angle, p.phase);
    if (p.mode === 'motorcycle')
      drawMotorcycle(m, p.x, p.z, p.y + 0.015, p.angle, p.phase / Math.PI);
    if (p.mode === 'ferrari')
      drawFerrari(
        m,
        { ...position, angle: p.angle },
        { occupied: true, travel: p.phase / Math.PI },
      );
    if (p.mode === 'skateboard')
      drawPlayerSkateboard(m, p.x, p.z, p.y + 0.015, p.angle, p.phase / Math.PI, ground);
    if (p.mode === 'gondola') drawGondolaCabin(m, position, p.angle);
    if (p.mode === 'roll')
      applyForwardRollMesh(m, start, p.x, base, p.z, p.angle, a.actionT, () => p.y);
  }
  if (p.mode === 'teleport')
    drawTabletTeleport(m, { position, base: ground(p.x, p.z), progress: a.actionT * 0.2 }, time);
  if (p.mode === 'parachute') drawParachute(m, position, p.angle, time);
  if (
    look.cape &&
    !(['bomber', 'roll', 'train', 'ferrari'] satisfies [string, string, string, string]).includes(
      p.mode,
    )
  )
    drawKrakenCape(m, p.x, p.z, p.y + 0.07, p.angle, time, signs);
  if (a.action === 'drink' && p.mode !== 'bomber')
    drawDrinkingCoffee(
      m,
      { x: p.x - 0.5, y: p.z - 0.5, angle: p.angle },
      p.y + 0.07,
      time,
      a.gestureStarted,
    );
  if (a.fall > 0) collapseCharacterMesh(m, start, p.x, p.y + 0.07, p.z, p.angle, a.fall);
}
