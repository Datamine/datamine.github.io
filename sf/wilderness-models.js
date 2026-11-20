import { pose } from './geometry.js';
import { MONSTER_STATS } from './monster-drops.js';
import { drawCharacter } from './characters.js';
import { drawBison } from './bison-model.js';

/** A four-beat walk: each planted paw travels backward by exactly the
 * distance covered by the body, then lifts and swings forward to its next step. */
export function sampleBearWalk(phase, motion = 1) {
  const stride = MONSTER_STATS.bear.walkStride,
    stance = 0.68,
    reach = stride * stance * 0.5;
  const paws = [];
  for (const side of [-1, 1])
    for (const end of [-1, 1]) {
      const offset = (side === -1 ? 0 : 0.5) + (end === -1 ? 0.25 : 0),
        cycle = (((phase / (Math.PI * 2) + offset) % 1) + 1) % 1;
      const contact = cycle < stance,
        u = contact ? cycle / stance : (cycle - stance) / (1 - stance);
      const swing = u * u * (3 - 2 * u),
        z = (contact ? reach - 2 * reach * u : -reach + 2 * reach * swing) * motion;
      paws.push({
        side,
        end,
        x: side * 0.3,
        y: 0.1 + (contact ? 0 : Math.sin(Math.PI * u) * 0.18) * motion,
        z: end * 0.39 + z,
        contact,
      });
    }
  return {
    paws,
    bob: (1 - Math.cos(phase * 2)) * 0.012 * motion,
    sway: Math.sin(phase) * 0.026 * motion,
    headBob: Math.sin(phase * 2 - 0.45) * 0.018 * motion,
  };
}

export function drawWildMonster(m, actor, time = 0) {
  const stats = MONSTER_STATS[actor.combatKind];
  if (stats.model === 'bison') {
    drawBison(m, actor, time);
    return;
  }
  if (stats.model === 'shark') {
    drawLandshark(m, actor);
    return;
  }
  if (stats.model === 'terminator') {
    drawCharacter(
      m,
      actor.x,
      actor.z,
      actor.base,
      actor.angle,
      actor.phase || 0,
      false,
      '#b3bfc0',
      '#333c41',
      {
        coat: true,
        backpack: false,
        akibo: true,
        hair: '#283034',
        pants: '#454d50',
        sunglasses: true,
        motion: actor.motion || 0,
        time: time * 0.001,
      },
    );
    pose(m, actor.x, actor.base, actor.z, actor.angle - Math.PI / 2, () => {
      m.sphere(-0.055, 1.6, 0.153, 0.036, 0.022, 0.018, '#ff4139', 12, 7, { emissive: 0.9 });
    });
    return;
  }
  if (stats.model === 'human') {
    const look = stats.appearance;
    drawCharacter(
      m,
      actor.x,
      actor.z,
      actor.base,
      actor.angle,
      actor.phase || 0,
      false,
      look.skin,
      look.shirt,
      {
        ...look,
        backpack: false,
        motion: actor.motion || 0,
        mode: actor.motion ? 'move' : 'idle',
        time: time * 0.001,
      },
    );
    return;
  }
  const bear = actor.combatKind === 'bear',
    ice = actor.combatKind === 'ice-giant',
    motion = actor.motion || 0,
    phase = actor.phase || 0;
  pose(m, actor.x, actor.base, actor.z, actor.angle + (bear ? -Math.PI / 2 : Math.PI / 2), () => {
    if (bear) {
      const fur = '#80604a',
        light = '#af8a63',
        walk = sampleBearWalk(phase, motion),
        bob = walk.bob,
        sway = walk.sway;
      const affection = actor.affection ? Math.sin(time * 0.006) * 0.035 : 0,
        head = walk.headBob + affection;
      m.sphere(sway, 0.79 + bob, 0, 0.47, 0.49, 0.67, fur, 16, 10, 'stucco');
      m.sphere(sway * 0.7, 1.03 + bob + head, 0.43, 0.38, 0.4, 0.38, fur, 16, 10, 'stucco');
      m.sphere(sway * 0.7, 0.96 + bob + head, 0.72, 0.23, 0.17, 0.18, light, 14, 8);
      m.sphere(sway * 0.7, 1.02 + bob + head, 0.86, 0.1, 0.07, 0.06, '#303634', 12, 7);
      for (const side of [-1, 1]) {
        m.sphere(side * 0.25 + sway * 0.7, 1.37 + bob + head, 0.41, 0.13, 0.15, 0.1, fur, 12, 7);
        m.sphere(
          side * 0.25 + sway * 0.7,
          1.38 + bob + head,
          0.49,
          0.075,
          0.085,
          0.016,
          light,
          10,
          6,
        );
        m.sphere(
          side * 0.16 + sway * 0.7,
          1.15 + bob + head,
          0.73,
          0.035,
          0.036,
          0.022,
          '#282d29',
          10,
          6,
        );
        m.sphere(
          side * 0.17 + sway * 0.7,
          1.16 + bob + head,
          0.747,
          0.009,
          0.009,
          0.008,
          '#efe6d2',
          8,
          5,
        );
      }
      for (const paw of walk.paws) {
        const shoulder = [paw.side * 0.3 + sway, 0.67 + bob, paw.end * 0.39],
          knee = [paw.x, 0.33 + (paw.y - 0.1) * 0.5, paw.z - 0.055],
          ankle = [paw.x, paw.y + 0.04, paw.z];
        m.sphere(...shoulder, 0.18, 0.24, 0.2, fur, 12, 7, 'stucco');
        m.rod(shoulder, knee, 0.14, fur, 10);
        m.sphere(...knee, 0.145, 0.17, 0.155, fur, 12, 7, 'stucco');
        m.rod(knee, ankle, 0.115, fur, 10);
        m.sphere(paw.x, paw.y, paw.z + 0.06, 0.17, 0.1, 0.22, '#614a3d', 12, 7);
      }
      m.sphere(sway, 0.85 + bob, -0.62, 0.13, 0.13, 0.13, fur, 10, 6);
    } else {
      const skin = ice ? '#9dcfdf' : '#d1ddd8',
        shade = ice ? '#5b94b9' : '#8fabb5',
        frost = '#e1f3ee';
      m.sphere(0, 1.85, 0, 0.7, 0.94, 0.43, skin, 16, 11, 'stucco');
      m.sphere(0, 2.83, 0.03, 0.39, 0.47, 0.32, skin, 14, 10);
      for (const side of [-1, 1]) {
        const stride = Math.sin(phase + side * Math.PI) * motion * 0.25,
          hand = [side * 0.91, 1.1 + stride, 0.08];
        m.rod([side * 0.31, 1.21, 0], [side * 0.35, 0.58, -stride], 0.23, shade, 12);
        m.rod([side * 0.35, 0.58, -stride], [side * 0.36, 0.16, stride], 0.2, skin, 12);
        m.sphere(side * 0.36, 0.15, stride + 0.12, 0.23, 0.16, 0.34, shade, 12, 7);
        m.sphere(side * 0.64, 2.36, 0, 0.35, 0.39, 0.31, frost, 12, 8);
        m.rod([side * 0.66, 2.3, 0], [side * 0.91, 1.75, -stride], 0.22, skin, 12);
        m.rod([side * 0.91, 1.75, -stride], hand, 0.18, shade, 12);
        m.sphere(...hand, 0.23, 0.25, 0.21, skin, 12, 7);
        m.sphere(side * 0.13, 2.9, 0.315, 0.06, 0.035, 0.022, '#4b7488', 10, 5, { emissive: 0.22 });
        for (let i = 0; i < 3; i++) {
          const x = side * (0.5 + i * 0.13),
            y = 2.55 - i * 0.03;
          m.tri(
            [x - 0.1, y, -0.1],
            [x + 0.1, y, -0.1],
            [x + side * 0.12, y + 0.43 - i * 0.06, 0],
            frost,
          );
          m.tri(
            [x + 0.1, y, 0.1],
            [x - 0.1, y, 0.1],
            [x + side * 0.12, y + 0.43 - i * 0.06, 0],
            skin,
          );
        }
      }
      m.sphere(0, 2.72, 0.35, 0.09, 0.11, 0.1, shade, 12, 6);
      for (let i = 0; i < 5; i++) {
        const x = (i - 2) * 0.07;
        m.tri(
          [x - 0.045, 2.68, 0.3],
          [x + 0.045, 2.68, 0.3],
          [x, 2.32 - Math.abs(i - 2) * 0.05, 0.25],
          frost,
        );
      }
      if (ice) {
        m.rod([1.04, 0.1, 0.15], [1.04, 1.28, 0.15], 0.055, shade, 10);
        m.sphere(1.04, 1.45, 0.15, 0.17, 0.38, 0.17, '#a7e1ec', 6, 4, { emissive: 0.1 });
      } else m.sphere(-0.94, 1.08, 0.17, 0.32, 0.32, 0.3, '#d8e6df', 12, 8, 'stucco');
    }
  });
}

/** A horizontal shark mesh, facing +X like the authoritative movement vector.
 * Its pectoral fins shuffle on land while the forked tail swings behind it. */
function drawLandshark(m, actor) {
  const motion = actor.motion || 0,
    phase = actor.phase || 0,
    bob = Math.sin(phase * 2) * 0.035 * motion;
  const back = '#647f8c',
    side = '#90a6ad',
    belly = '#dce1d4',
    dark = '#293e49';
  pose(m, actor.x, actor.base, actor.z, actor.angle, () => {
    const profiles = [
      [-1.25, 0.1, 0.11],
      [-0.95, 0.22, 0.24],
      [-0.5, 0.37, 0.36],
      [0, 0.42, 0.4],
      [0.52, 0.35, 0.34],
      [0.92, 0.25, 0.26],
      [1.23, 0.13, 0.15],
      [1.42, 0.045, 0.055],
    ];
    const at = (p, i) => {
      const a = (i * Math.PI) / 12;
      return [p[0], 0.66 + Math.cos(a) * p[1] + bob, Math.sin(a) * p[2]];
    };
    for (let j = 1; j < profiles.length; j++)
      for (let i = 0; i < 24; i++) {
        const y = Math.cos(((i + 0.5) * Math.PI) / 12),
          color = y < -0.2 ? belly : y > 0.5 ? back : side;
        m.quad(
          at(profiles[j - 1], i),
          at(profiles[j - 1], i + 1),
          at(profiles[j], i + 1),
          at(profiles[j], i),
          color,
        );
      }
    for (const [p, reverse] of [
      [profiles[0], false],
      [profiles.at(-1), true],
    ])
      for (let i = 0; i < 24; i++) {
        const a = at(p, i),
          b = at(p, i + 1);
        m.tri([p[0], 0.66 + bob, 0], reverse ? b : a, reverse ? a : b, side);
      }
    const fin = (a, b, c, color = back) => {
      const thickness = 0.024,
        A = [a[0], a[1] + bob, a[2] - thickness],
        B = [b[0], b[1] + bob, b[2] - thickness],
        C = [c[0], c[1] + bob, c[2] - thickness],
        D = [a[0], a[1] + bob, a[2] + thickness],
        E = [b[0], b[1] + bob, b[2] + thickness],
        F = [c[0], c[1] + bob, c[2] + thickness];
      m.tri(A, B, C, color);
      m.tri(D, F, E, color);
      m.quad(A, D, E, B, color);
      m.quad(B, E, F, C, color);
      m.quad(C, F, D, A, color);
    };
    fin([-0.55, 0.96, 0], [0.38, 1.02, 0], [-0.18, 1.64, 0]);
    for (const s of [-1, 1]) {
      const step = Math.sin(phase + (s * Math.PI) / 2) * motion;
      fin(
        [0.25, 0.44, s * 0.29],
        [-0.55, 0.4, s * 0.28],
        [-0.35 + step * 0.16, 0.07 + Math.max(0, step) * 0.14, s * 0.83],
        side,
      );
      fin([-0.72, 0.46, s * 0.18], [-1, 0.45, s * 0.16], [-0.91, 0.26, s * 0.43], back);
      // Eyes, tiny highlights, and five recessed gill slits.
      m.sphere(0.86, 0.77 + bob, s * 0.235, 0.045, 0.043, 0.018, '#162a32', 12, 7);
      m.sphere(0.875, 0.783 + bob, s * 0.251, 0.011, 0.012, 0.005, '#f6f0d8', 8, 5);
      for (let i = 0; i < 5; i++)
        m.rod(
          [0.42 - i * 0.09, 0.77 + bob, s * (0.35 + i * 0.012)],
          [0.38 - i * 0.09, 0.49 + bob, s * (0.32 + i * 0.009)],
          0.012,
          dark,
          5,
        );
      // Crescent mouth, with small individual ivory teeth.
      m.tri(
        [0.7, 0.48 + bob, s * 0.26],
        [1.29, 0.55 + bob, s * 0.11],
        [1, 0.35 + bob, s * 0.18],
        dark,
      );
      for (let i = 0; i < 5; i++) {
        const x = 0.8 + i * 0.075,
          z = s * (0.24 - i * 0.022),
          y = 0.49 + i * 0.007 + bob;
        m.tri([x - 0.022, y, z], [x + 0.022, y, z], [x + 0.008, y - 0.07, z], belly);
      }
    }
    const tail = Math.sin(phase) * 0.18 * motion;
    fin([-1.21, 0.73, 0], [-1.95, 1.43, tail], [-1.64, 0.68, tail]);
    fin([-1.21, 0.62, 0], [-1.64, 0.68, tail], [-1.86, 0.2, tail]);
  });
}
