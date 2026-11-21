// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { RAIL_PIT } from './southern-district.ts';
import { AIRSHIP_TERMINAL } from './airship.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
export const RAIL_WORKER = Object.freeze({
  id: 'rail-lunch-worker',
  kind: 'rail-worker',
  label: contentText('rail-works.module.label-1', {}),
  name: contentText('rail-works.module.name-2', {}),
  x: RAIL_PIT.east + 1,
  z: RAIL_PIT.north + 1,
  base: AIRSHIP_TERMINAL.base + 0.04,
  skin: '#aa7d5b',
  shirt: '#d58c36',
  hair: '#726451',
  cap: true,
  seated: true,
  regional: true,
  angle: Math.PI / 2,
  height: 1.75,
  approach: { x: RAIL_PIT.east + 0.5, y: RAIL_PIT.north + 2 },
  description: contentText('rail-works.module.description-3', {}),
});
export function railWorkerDialogue() {
  return {
    ...RAIL_WORKER,
    repeat: true,
    intro: contentText('rail-works.railWorkerDialogue.intro-5', {}),
    question: contentText('rail-works.railWorkerDialogue.question-6', {}),
    decline: contentText('rail-works.railWorkerDialogue.decline-7', {}),
    choices: [
      {
        label: contentText('rail-works.railWorkerDialogue.label-9', {}),
        next: {
          intro: contentText('rail-works.railWorkerDialogue.intro-11', {}),
          question: contentText('rail-works.railWorkerDialogue.question-12', {}),
          choices: [
            {
              label: contentText('rail-works.railWorkerDialogue.label-14', {}),
              receipt: contentText('rail-works.railWorkerDialogue.receipt-15', {}),
              contentNodeId: 'rail-works.railWorkerDialogue.node-13',
              labelTextId: 'rail-works.railWorkerDialogue.label-14',
              labelTextValues: {},
              receiptTextId: 'rail-works.railWorkerDialogue.receipt-15',
              receiptTextValues: {},
            },
            {
              label: contentText('rail-works.railWorkerDialogue.label-17', {}),
              receipt: contentText('rail-works.railWorkerDialogue.receipt-18', {}),
              contentNodeId: 'rail-works.railWorkerDialogue.node-16',
              labelTextId: 'rail-works.railWorkerDialogue.label-17',
              labelTextValues: {},
              receiptTextId: 'rail-works.railWorkerDialogue.receipt-18',
              receiptTextValues: {},
            },
            {
              label: contentText('rail-works.railWorkerDialogue.label-20', {}),
              receipt: contentText('rail-works.railWorkerDialogue.receipt-21', {}),
              contentNodeId: 'rail-works.railWorkerDialogue.node-19',
              labelTextId: 'rail-works.railWorkerDialogue.label-20',
              labelTextValues: {},
              receiptTextId: 'rail-works.railWorkerDialogue.receipt-21',
              receiptTextValues: {},
            },
          ],
          contentNodeId: 'rail-works.railWorkerDialogue.node-10',
          introTextId: 'rail-works.railWorkerDialogue.intro-11',
          introTextValues: {},
          questionTextId: 'rail-works.railWorkerDialogue.question-12',
          questionTextValues: {},
        },
        contentNodeId: 'rail-works.railWorkerDialogue.node-8',
        labelTextId: 'rail-works.railWorkerDialogue.label-9',
        labelTextValues: {},
      },
      {
        label: contentText('rail-works.railWorkerDialogue.label-23', {}),
        receipt: contentText('rail-works.railWorkerDialogue.receipt-24', {}),
        contentNodeId: 'rail-works.railWorkerDialogue.node-22',
        labelTextId: 'rail-works.railWorkerDialogue.label-23',
        labelTextValues: {},
        receiptTextId: 'rail-works.railWorkerDialogue.receipt-24',
        receiptTextValues: {},
      },
    ],
    contentNodeId: 'rail-works.railWorkerDialogue.node-4',
    introTextId: 'rail-works.railWorkerDialogue.intro-5',
    introTextValues: {},
    questionTextId: 'rail-works.railWorkerDialogue.question-6',
    questionTextValues: {},
    declineTextId: 'rail-works.railWorkerDialogue.decline-7',
    declineTextValues: {},
  };
}

export function drawRailWorks(m: Mesh, ground: (x: number, z: number) => number) {
  const p = RAIL_PIT,
    x = p.west + 1.1,
    z = p.north + 1.7;
  drawExcavator(m, { x, y: p.floor + 0.07, z, angle: -0.35 });
  // The lunch bench and open sandwich tin sit safely beyond the pit fence.
  const n = RAIL_WORKER,
    h = ground(n.x, n.z);
  for (const dx of [-0.37, 0.37] satisfies [number, number])
    m.box(n.x + dx, h, n.z - 0.17, 0.06, 0.48, 0.34, '#69766c');
  m.box(n.x - 0.49, h + 0.47, n.z - 0.23, 0.98, 0.08, 0.46, '#ac8a5a', 'wood');
  m.box(n.x + 0.42, h + 0.55, n.z + 0.13, 0.25, 0.06, 0.23, '#a2aba3', { metal: 0.2 });
  m.box(n.x + 0.45, h + 0.62, n.z + 0.15, 0.18, 0.04, 0.18, '#e2c98e');
}

/** Shared tracked excavator, used by both construction sites. */
export function drawExcavator(
  m: Mesh,
  { x, y, z, angle = 0 }: { x: number; y: number; z: number; angle?: number },
) {
  pose(m, x, y, z, angle, () => {
    // Tracked undercarriage, rotating cab, articulated boom, and open bucket.
    for (const side of [-1, 1] satisfies [number, number]) {
      m.box(side * 0.39 - 0.12, 0, -0.53, 0.24, 0.21, 1.02, '#3e4844', { metal: 0.2 });
      for (let j = 0; j < 7; j++)
        m.box(side * 0.39 - 0.13, 0.025, -0.52 + j * 0.145, 0.26, 0.035, 0.08, '#69736b');
      for (const zz of [-0.35, 0.32] satisfies [number, number])
        m.cylinder(side * 0.39, 0.04, zz, 0.1, 0.16, '#7b8171', 12);
    }
    m.cylinder(0, 0.21, 0, 0.26, 0.1, '#6b7161', 20);
    m.box(-0.43, 0.31, -0.41, 0.86, 0.32, 0.78, '#dbac3e', { metal: 0.2 });
    m.box(-0.35, 0.63, -0.39, 0.45, 0.66, 0.52, '#e2b748');
    m.box(-0.3, 0.75, -0.415, 0.36, 0.43, 0.02, '#6f9c9c', 'glass');
    m.box(-0.37, 1.29, -0.42, 0.5, 0.06, 0.59, '#e2bc5c');
    m.box(0.14, 0.62, -0.35, 0.23, 0.1, 0.51, '#b19743');
    m.rod(
      [0.17, 0.62, 0.12] satisfies [number, number, number],
      [0.24, 1.54, 0.7] satisfies [number, number, number],
      0.085,
      '#e1b243',
      12,
      { metal: 0.2 },
    );
    m.rod(
      [0.24, 1.54, 0.7] satisfies [number, number, number],
      [0.24, 0.81, 1.26] satisfies [number, number, number],
      0.067,
      '#cba33e',
      12,
      { metal: 0.2 },
    );
    m.rod(
      [0.24, 0.78, 0.24] satisfies [number, number, number],
      [0.24, 1.43, 0.67] satisfies [number, number, number],
      0.027,
      '#bdc6bd',
      10,
      { metal: 0.5 },
    );
    m.rod(
      [0.24, 1.34, 0.81] satisfies [number, number, number],
      [0.24, 0.9, 1.2] satisfies [number, number, number],
      0.023,
      '#c0c6bb',
      10,
      { metal: 0.5 },
    );
    m.box(0.02, 0.58, 1.17, 0.46, 0.22, 0.39, '#60665a', { metal: 0.3 });
    for (let j = 0; j < 4; j++) m.box(0.04 + j * 0.12, 0.53, 1.43, 0.045, 0.08, 0.16, '#8f927b');
  });
}
