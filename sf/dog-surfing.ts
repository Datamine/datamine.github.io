import type { Actor, SignAtlas } from './types/world.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
import { westernCoastX } from './coastline.ts';
import { drawSurfboard } from './surfing.ts';
import { drawWalkingDog } from './companions.ts';
import { drawPlaque } from './southern-district.ts';

export const DOG_SURFING = Object.freeze({
  z: 129,
  roundSeconds: 48,
  names: ['Biscuit', 'Nori', 'Captain Pickles'] satisfies [string, string, string],
});
export function dogSurfingRound(seconds: number) {
  const round = Math.floor(seconds / DOG_SURFING.roundSeconds),
    elapsed =
      ((seconds % DOG_SURFING.roundSeconds) + DOG_SURFING.roundSeconds) % DOG_SURFING.roundSeconds,
    scores = DOG_SURFING.names.map((name, i) => ({
      name,
      score: 7 + ((round * 7 + i * 3) % 30) / 10,
    }));
  const winner = scores.reduce((a, b) => (a.score >= b.score ? a : b));
  return { round, elapsed, scores, winner, judging: elapsed >= 36 };
}
export function dogSurfingDialogue(npc: Partial<Actor>, seconds: number) {
  const race = dogSurfingRound(seconds);
  return {
    ...npc,
    repeat: true,
    intro: race.judging
      ? contentText('dog-surfing.dogSurfingDialogue.intro-2.yes', {
          v0: race.scores.map((s) => s.name + ': ' + s.score.toFixed(1)).join(' · '),
          v1: race.winner.name,
        })
      : contentText('dog-surfing.dogSurfingDialogue.intro-2.no', {}),
    choices: [
      {
        label: contentText('dog-surfing.dogSurfingDialogue.label-5', {}),
        receipt: contentText('dog-surfing.dogSurfingDialogue.receipt-6', {}),
        contentNodeId: 'dog-surfing.dogSurfingDialogue.node-4',
        labelTextId: 'dog-surfing.dogSurfingDialogue.label-5',
        labelTextValues: {},
        receiptTextId: 'dog-surfing.dogSurfingDialogue.receipt-6',
        receiptTextValues: {},
      },
      {
        label: contentText('dog-surfing.dogSurfingDialogue.label-8', {}),
        receipt: contentText('dog-surfing.dogSurfingDialogue.receipt-9', {}),
        contentNodeId: 'dog-surfing.dogSurfingDialogue.node-7',
        labelTextId: 'dog-surfing.dogSurfingDialogue.label-8',
        labelTextValues: {},
        receiptTextId: 'dog-surfing.dogSurfingDialogue.receipt-9',
        receiptTextValues: {},
      },
    ],
    decline: contentText('dog-surfing.dogSurfingDialogue.decline-3', {}),
    contentNodeId: 'dog-surfing.dogSurfingDialogue.node-1',
    introTextId: race.judging
      ? 'dog-surfing.dogSurfingDialogue.intro-2.yes'
      : 'dog-surfing.dogSurfingDialogue.intro-2.no',
    introTextValues: race.judging
      ? {
          v0: race.scores.map((s) => s.name + ': ' + s.score.toFixed(1)).join(' · '),
          v1: race.winner.name,
        }
      : {},
    declineTextId: 'dog-surfing.dogSurfingDialogue.decline-3',
    declineTextValues: {},
  };
}
export function drawDogSurfingBeach(
  m: Mesh,
  ground: (x: number, z: number) => number,
  signs: SignAtlas,
) {
  const z = DOG_SURFING.z,
    x = westernCoastX(z) + 1.1,
    y = ground(x, z);
  for (const dz of [-2, 2] satisfies [number, number]) {
    m.rod(
      [x, y, z + dz] satisfies [number, number, number],
      [x, y + 1.7, z + dz] satisfies [number, number, number],
      0.035,
      '#a98c62',
      8,
    );
    m.tri(
      [x, y + 1.7, z + dz] satisfies [number, number, number],
      [x, y + 1.35, z + dz] satisfies [number, number, number],
      [x + 0.7, y + 1.55, z + dz] satisfies [number, number, number],
      dz < 0 ? '#e07f91' : '#6ac0c1',
    );
  }
  drawPlaque(m, signs, 'PACIFICA DOG SURFING', x, y + 1.3, z, 2.1, 0.26, true);
  m.box(x - 0.45, y, z + 2.3, 0.9, 0.65, 0.45, '#547f86', 'wood');
  m.cylinder(x, y + 0.65, z + 2.5, 0.15, 0.2, '#d7b75f', 16, 0.08, { metal: 0.6 });
}
export function drawDogSurfingCompetition(m: Mesh, seconds: number) {
  const race = dogSurfingRound(seconds),
    z = DOG_SURFING.z;
  for (let i = 0; i < 3; i++) {
    const progress = Math.min(1, race.elapsed / 36),
      zz = z - 2 + i * 2,
      x = westernCoastX(zz) - 2.5 - (1 - progress) * 5,
      bob = Math.sin(seconds * 2 + i) * 0.08,
      angle = Math.sin(seconds + i) * 0.08;
    pose(m, x, 0.09 + bob, zz, angle, () =>
      drawSurfboard(m, (['#e3a366', '#73b5bb', '#b28fbd'] satisfies [string, string, string])[i]),
    );
    drawWalkingDog(
      m,
      {
        x,
        z: zz,
        angle,
        phase: 0,
        moving: false,
        color: (['#b28958', '#e3d5bd', '#5b5b56'] satisfies [string, string, string])[i],
      },
      seconds * 1000,
      () => 0.24 + bob,
    );
    // A small life vest adds a splash of competition color.
    pose(m, x, 0.24 + bob, zz, angle, () =>
      m.box(
        -0.15,
        0.42,
        -0.16,
        0.3,
        0.07,
        0.32,
        (['#d46c57', '#63a2b6', '#d4ab48'] satisfies [string, string, string])[i],
      ),
    );
  }
}
