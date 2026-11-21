import type { SkinnedMesh } from './types/rendering.ts';
import type { Appearance } from './types/content.ts';
import { drawWearableAccessories } from './wearable-models.ts';
import { hatById } from './hat-catalog.ts';
import { ITEM_STATS } from './item-stats.ts';
import { getHatGeometry } from './hat-models.ts';
import type { Mesh } from './geometry.ts';
import { rgb } from './geometry.ts';
import { sampleForwardRoll } from './forward-roll.ts';
import { rocketHopPose } from './rocket-hop.ts';
export interface CharacterFoot {
  point: number[];
  pitch: number;
  contact: boolean;
}
export interface CharacterPose {
  matrices: Float32Array;
  joints: Float32Array;
  rotations: number[][];
  feet: CharacterFoot[];
}
export interface CharacterAppearance extends Appearance {
  phase?: number;
  mode?: string;
  action?: string;
  motion?: number;
  run?: number;
  time?: number;
  actionT?: number;
  danceBlend?: number;
  sitBlend?: number;
  ground?: ((x: number, z: number) => number) | null;
  waiting?: { tap: number; watch: number; rightWrist: number[]; leftWrist: number[] } | null;
  curly?: boolean;
  phone?: boolean;
  carryingFish?: boolean;
  pushingStroller?: boolean;
  railgun?: boolean;
  akibo?: boolean;
  topHat?: boolean;
  chef?: boolean;
  backpack?: boolean;
  uniform?: boolean;
  alien?: boolean;
  bayonet?: boolean;
  battleaxe?: boolean;
  trim?: string;
  bag?: string;
  gilded?: boolean;
  height?: number;
  headOnly?: boolean;
  serverTime?: number;
  cpuSkinning?: boolean;
  pose?: CharacterPose;
}
export interface CharacterMesh extends SkinnedMesh {
  deformed: Float32Array;
  headIndices?: number[];
}

type Rig = number | ((p: number[]) => number[]);

// Original meshes and clips. Research notes: sf/README.md. The joint groups,
// indexed bind mesh and reusable poses follow the approach of classic clients;
// no RuneScape models, cache data or animation frames are included.
export const CHARACTER_CLIPS = Object.freeze({
  walk: { stride: 0.92, stance: 0.56, lift: 0.15, hip: 0.855, arm: 0.34 },
  run: { stride: 2, stance: 0.35, lift: 0.32, hip: 0.795, arm: 0.62 },
  swim: {},
  cycle: { stride: Math.PI * 0.62 },
  climb: { stride: 0.56, stance: 0.6, lift: 0.1 },
  sit: {},
  surf: {},
  skate: { stride: 2.4 },
  motorcycle: {},
  idle: {},
});
export const CHARACTER_BONES = Object.freeze({
  pelvis: 0,
  spine: 1,
  chest: 2,
  head: 3,
  leftArm: 4,
  leftForearm: 5,
  leftHand: 6,
  rightArm: 7,
  rightForearm: 8,
  rightHand: 9,
  leftThigh: 10,
  leftShin: 11,
  leftFoot: 12,
  rightThigh: 13,
  rightShin: 14,
  rightFoot: 15,
});
const CHAR_BIND = [
  [0, 0.88, 0] satisfies [number, number, number],
  [0, 1.06, 0] satisfies [number, number, number],
  [0, 1.27, 0] satisfies [number, number, number],
  [0, 1.45, 0] satisfies [number, number, number],
  [-0.245, 1.32, 0] satisfies [number, number, number],
  [-0.245, 1.01, 0] satisfies [number, number, number],
  [-0.245, 0.735, 0] satisfies [number, number, number],
  [0.245, 1.32, 0] satisfies [number, number, number],
  [0.245, 1.01, 0] satisfies [number, number, number],
  [0.245, 0.735, 0] satisfies [number, number, number],
  [-0.11, 0.88, 0] satisfies [number, number, number],
  [-0.11, 0.47, 0] satisfies [number, number, number],
  [-0.11, 0.09, 0] satisfies [number, number, number],
  [0.11, 0.88, 0] satisfies [number, number, number],
  [0.11, 0.47, 0] satisfies [number, number, number],
  [0.11, 0.09, 0] satisfies [number, number, number],
];
const CHAR_SLOT = {
  skin: 0,
  shirt: 1,
  pants: 2,
  hair: 3,
  shoe: 4,
  trim: 5,
  eye: 6,
  white: 7,
  metal: 8,
  belt: 9,
  bag: 10,
  hat: 11,
  hatTrim: 12,
  hatGem: 13,
  phoneBody: 14,
  phoneScreen: 15,
  phoneGlyph: 16,
};
const CHAR_TAU = Math.PI * 2;
const charClamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const charMix = (a: number, b: number, t: number) => a + (b - a) * t;
const charUnit = (v: number[]) => {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
};
const charCross = (a: number[], b: number[]) =>
  [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] satisfies [
    number,
    number,
    number,
  ];
const charSub = (a: number[], b: number[]) => a.map((v, i) => v - b[i]);
const charDot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function charEuler(x = 0, y = 0, z = 0) {
  const a = Math.cos(x),
    b = Math.sin(x),
    c = Math.cos(y),
    d = Math.sin(y),
    e = Math.cos(z),
    f = Math.sin(z);
  return [
    e * c,
    e * d * b - f * a,
    e * d * a + f * b,
    f * c,
    f * d * b + e * a,
    f * d * a - e * b,
    -d,
    c * b,
    c * a,
  ] satisfies [number, number, number, number, number, number, number, number, number];
}
function charMultiply(a: number[], b: number[]) {
  const r = new Array(9);
  for (let y = 0; y < 3; y++)
    for (let x = 0; x < 3; x++)
      r[y * 3 + x] = a[y * 3] * b[x] + a[y * 3 + 1] * b[x + 3] + a[y * 3 + 2] * b[x + 6];
  return r;
}
function charRotate(r: number[], p: number[]) {
  return [
    r[0] * p[0] + r[1] * p[1] + r[2] * p[2],
    r[3] * p[0] + r[4] * p[1] + r[5] * p[2],
    r[6] * p[0] + r[7] * p[1] + r[8] * p[2],
  ] satisfies [number, number, number];
}
function charFrame(out: CharacterPose, id: number, p: number[], r: number[]) {
  const k = id * 12,
    b = CHAR_BIND[id];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) out.matrices[k + row * 4 + col] = r[row * 3 + col];
    out.matrices[k + row * 4 + 3] =
      p[row] - r[row * 3] * b[0] - r[row * 3 + 1] * b[1] - r[row * 3 + 2] * b[2];
    out.joints[id * 3 + row] = p[row];
  }
  out.rotations[id] = r;
}
function charJoint(out: CharacterPose, id: number) {
  return Array.from(out.joints.subarray(id * 3, id * 3 + 3));
}
function charChild(out: CharacterPose, id: number, parent: number, rotation: number[]) {
  const r = out.rotations[parent],
    offset = charRotate(r, charSub(CHAR_BIND[id], CHAR_BIND[parent])),
    p = charJoint(out, parent).map((v, i) => v + offset[i]);
  charFrame(out, id, p, charMultiply(r, rotation));
}
function charSegment(out: CharacterPose, id: number, start: number[], end: number[]) {
  const y = charUnit(charSub(start, end)),
    ref =
      Math.abs(y[2]) > 0.95
        ? ([0, 1, 0] satisfies [number, number, number])
        : ([0, 0, 1] satisfies [number, number, number]),
    x = charUnit(charCross(y, ref)),
    z = charCross(x, y);
  charFrame(out, id, start, [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]] satisfies [
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
}
function charIK(start: number[], target: number[], a: number, b: number, pole: number[]) {
  const v = charSub(target, start),
    length = Math.hypot(...v),
    d = charClamp(length, Math.abs(a - b) + 0.0001, a + b - 0.0001),
    axis = charUnit(v);
  let across = charSub(
    pole,
    axis.map((n) => n * charDot(pole, axis)),
  );
  if (Math.hypot(...across) < 0.0001)
    across = charCross(axis, [1, 0, 0] satisfies [number, number, number]);
  across = charUnit(across);
  const along = (a * a - b * b + d * d) / (2 * d),
    height = Math.sqrt(Math.max(0, a * a - along * along));
  return {
    knee: start.map((n, i) => n + axis[i] * along + across[i] * height),
    end: start.map((n, i) => n + axis[i] * d),
  };
}
function charHermite(a: number, b: number, da: number, db: number, t: number) {
  const t2 = t * t,
    t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * a + (t3 - 2 * t2 + t) * da + (-2 * t3 + 3 * t2) * b + (t3 - t2) * db
  );
}
function charStep(f: number, stride: number, stance: number, lift: number) {
  const reach = (stride * stance) / 2;
  if (f < stance)
    return {
      z: reach - stride * f,
      y: 0.1,
      pitch: charMix(-0.12, 0.18, f / stance),
      contact: true,
    };
  const t = (f - stance) / (1 - stance),
    travel = stride * (1 - stance);
  const turn = (0.3 / stance) * (1 - stance);
  return {
    z: charHermite(-reach, reach, -travel, -travel, t),
    y: 0.1 + Math.sin(Math.PI * t) ** 2 * lift,
    pitch: charHermite(0.18, -0.12, turn, turn, t) + 0.22 * Math.sin(Math.PI * t) ** 2,
    contact: false,
  };
}
export function createCharacterPose(): CharacterPose {
  return {
    matrices: new Float32Array(16 * 12),
    joints: new Float32Array(16 * 3),
    rotations: new Array(16),
    feet: [],
  };
}

/** Feet are pose targets. Two-bone IK preserves limb lengths and planted
 * contacts, including on slopes, instead of stretching cylinders between tips. */
export function sampleCharacterPose(
  mode = 'idle',
  phase = 0,
  options: CharacterAppearance = {},
  out = createCharacterPose(),
) {
  const motion = charClamp(options.motion ?? (mode === 'move' || mode === 'climb' ? 1 : 0), 0, 1),
    run = charClamp(options.run ?? 0, 0, 1),
    time = options.time || 0;
  const cycle = (((phase / CHAR_TAU) % 1) + 1) % 1,
    walk = CHARACTER_CLIPS.walk,
    jog = CHARACTER_CLIPS.run;
  const stride = charMix(walk.stride, jog.stride, run),
    stance = charMix(walk.stance, jog.stance, run),
    lift = charMix(walk.lift, jog.lift, run);
  let hip = charMix(0.86, charMix(walk.hip, jog.hip, run), motion),
    rootX = 0,
    rootZ = 0,
    lean = 0.025,
    roll = 0,
    twist = 0;
  const gesture = options.action,
    gestureT = charClamp(options.actionT || 0, 0, 1),
    gestureWeight = gestureT === 0 || gestureT === 1 ? 0 : Math.sin(Math.PI * gestureT);
  const danceBeat = time * 7.2,
    rollTuck = gesture === 'forward-roll' ? sampleForwardRoll(gestureT).tuck : 0;
  const danceWeight = charClamp(options.danceBlend ?? 1, 0, 1);
  const hop = gesture === 'rocket-hop' ? rocketHopPose(gestureT) : null;
  const rest = mode === 'rest' ? charClamp(options.sitBlend ?? 1, 0, 1) : 0,
    restEase = rest * rest * (3 - 2 * rest);
  const feet: CharacterFoot[] = [];
  for (let side = 0; side < 2; side++) {
    const f = (cycle + side * 0.5) % 1,
      step = charStep(f, stride, stance, lift),
      sign = side ? 1 : -1,
      climbing =
        mode === 'climb'
          ? charStep(
              f,
              CHARACTER_CLIPS.climb.stride,
              CHARACTER_CLIPS.climb.stance,
              CHARACTER_CLIPS.climb.lift,
            )
          : null;
    let x = sign * 0.11,
      y = charMix(0.1, step.y, motion),
      z = step.z * motion,
      pitch = step.pitch * motion,
      danceLift = 0;
    if (mode === 'cycle') {
      x = sign * 0.13;
      y = 0.11 + Math.sin(-phase + side * Math.PI) * 0.17;
      z = 0.01 + Math.cos(-phase + side * Math.PI) * 0.17;
      pitch = -0.1;
    } else if (mode === 'motorcycle') {
      x = sign * 0.18;
      y = 0.16;
      z = 0.08;
      pitch = 0;
    } else if (mode === 'sit') {
      y = 0.1;
      z = 0.36;
      pitch = 0;
    } else if (mode === 'rest') {
      x = charMix(x, sign * 0.19, restEase);
      y = charMix(y, 0.1, restEase);
      z = charMix(z, 0.49, restEase);
      pitch = charMix(pitch, -0.07, restEase);
    } else if (mode === 'skate') {
      x = side ? 0.08 : -0.13;
      y = 0.1;
      z = side ? -0.24 : 0.22;
      pitch = 0;
      if (side && motion) {
        const push = Math.max(0, Math.sin(phase));
        y -= push * 0.2;
        z -= push * 0.25;
        x += push * 0.15;
      }
    } else if (mode === 'surf') {
      x = side ? -0.1 : -0.27;
      y = 0.1;
      z = side ? 0.17 : -0.18;
      pitch = 0;
    } else if (mode === 'surfboard') {
      x = sign * 0.13;
      y = 0.1;
      z = side ? -0.3 : 0.28;
      pitch = 0;
    } else if (climbing) {
      y = charMix(0.1, 0.25 + climbing.z, motion);
      z = charMix(0, 0.2 - (climbing.y - 0.1), motion);
      pitch = -0.1 * motion;
    }
    if (rollTuck) {
      x = charMix(x, sign * 0.13, rollTuck);
      y = charMix(y, 0.29, rollTuck);
      z = charMix(z, 0.22, rollTuck);
      pitch = charMix(pitch, -0.6, rollTuck);
    }
    if (hop) {
      y += hop.air * 0.1;
      z += hop.air * 0.05;
      pitch -= hop.air * 0.16;
    }
    if (gesture === 'squat') x = sign * 0.16;
    if (gesture === 'skate-trick') {
      y += 0.17 * gestureWeight;
      z = side ? -0.2 : 0.22;
      pitch = -0.1 * gestureWeight;
    }
    if (gesture === 'dance') {
      const beat = danceBeat + side * Math.PI;
      danceLift = Math.max(0, Math.sin(beat));
      x = charMix(x, sign * (0.16 + 0.09 * danceLift), danceWeight);
      y = charMix(y, 0.1 + 0.23 * danceLift ** 2, danceWeight);
      z = charMix(z, 0.045 * Math.cos(beat) + 0.18 * danceLift, danceWeight);
      pitch = charMix(pitch, -0.23 * danceLift, danceWeight);
    }
    if (options.ground && (mode === 'idle' || mode === 'move' || mode === 'rest')) {
      y += options.ground(x, z);
      pitch -= charClamp(
        Math.atan((options.ground(x, z + 0.14) - options.ground(x, z - 0.1)) / 0.24),
        -0.35,
        0.35,
      );
    }
    if (mode === 'move')
      y += Math.sin(Math.abs(step.pitch * motion)) * (step.pitch > 0 ? 0.22 : 0.09);
    if (options.waiting && side) {
      y += options.waiting.tap * 0.045;
      pitch -= options.waiting.tap * 0.16;
    }
    feet.push({
      point: [x, y, z] satisfies [number, number, number],
      pitch,
      contact:
        gesture === 'dance'
          ? danceLift < 1e-6
          : climbing
            ? !motion || climbing.contact
            : mode !== 'move' || !motion || step.contact,
    });
  }
  if (mode === 'cycle') {
    hip = 0.57;
    rootZ = -0.16;
    lean = 0.44;
  } else if (mode === 'motorcycle') {
    hip = 0.6;
    rootZ = -0.09;
    lean = 0.24;
  } else if (mode === 'sit') {
    hip = 0.57;
    lean = 0.035;
  } else if (mode === 'rest') {
    hip = charMix(0.86, 0.22, restEase);
    rootZ = -0.07 * restEase;
    lean = 0.025 + 0.11 * restEase;
  } else if (mode === 'skate') {
    hip = 0.79;
    lean = 0.12;
    twist = 0.27;
  } else if (mode === 'surf') {
    hip = 0.8;
    rootX = 0.035;
    rootZ = -0.025;
    lean = 0.12;
    roll = -0.12;
  } else if (mode === 'surfboard') {
    hip = 0.73;
    lean = 0.1;
    twist = 0.5;
    roll = Math.sin(time * 2) * 0.035;
  } else if (mode === 'climb') {
    hip = charMix(0.86, 0.84, motion);
    rootZ = -0.02 * motion;
    lean = 0.12 * motion;
    roll = Math.sin(phase) * 0.018 * motion;
  } else {
    const half = (cycle * 2) % 1;
    // A continuous rise and fall avoids a sharp body jolt at each footfall.
    const runBounce = 0.03 * (1 - Math.cos(half * CHAR_TAU));
    const bounce = charMix(0.016 * Math.sin(cycle * CHAR_TAU * 2), runBounce, run);
    hip += bounce * motion + 0.0025 * Math.sin(time * 1.7) * (1 - motion);
    rootX = Math.sin(cycle * CHAR_TAU) * 0.009 * motion;
    roll = Math.sin(cycle * CHAR_TAU) * 0.035 * motion;
    twist = Math.sin(cycle * CHAR_TAU) * 0.055 * motion;
    lean += run * motion * 0.14;
  }
  lean += 0.009 * Math.sin(time * 1.7) * (1 - motion);
  if (rollTuck) {
    hip -= 0.24 * rollTuck;
    lean += 0.65 * rollTuck;
    twist *= 1 - rollTuck;
    roll *= 1 - rollTuck;
  }
  if (hop) {
    hip -= hop.tuck;
    lean += hop.tuck * 0.3;
  }
  if (gesture === 'attack') twist += 0.18 * gestureWeight;
  if (gesture === 'pet') {
    hip -= 0.34 * gestureWeight;
    lean += 0.28 * gestureWeight;
    rootZ += 0.1 * gestureWeight;
  }
  if (gesture === 'pet-bear') {
    hip -= 0.08 * gestureWeight;
    lean += 0.14 * gestureWeight;
    rootZ += 0.06 * gestureWeight;
  }
  if (gesture === 'flinch') {
    lean -= 0.15 * gestureWeight;
    hip -= 0.02 * gestureWeight;
  }
  if (gesture === 'skate-trick') {
    hip -= 0.16 * gestureWeight;
    lean = 0.08;
    twist = 0.2;
  }
  if (gesture === 'dance') {
    // Alternating knee lifts and broad arm pumps over a double-time bounce.
    // Shift weight toward the planted leg; IK keeps every limb connected.
    hip = charMix(hip, 0.78 + 0.065 * Math.cos(danceBeat * 2), danceWeight);
    rootX = charMix(rootX, Math.sin(danceBeat) * 0.095, danceWeight);
    rootZ = charMix(rootZ, 0.035 * Math.sin(danceBeat * 2), danceWeight);
    twist = charMix(twist, Math.sin(danceBeat) * 0.34, danceWeight);
    roll = charMix(roll, Math.cos(danceBeat) * 0.1, danceWeight);
    lean = charMix(lean, 0.06 + 0.055 * Math.sin(danceBeat * 2), danceWeight);
  }
  if (gesture === 'squat') {
    const depth = (1 + Math.sin(time)) / 2;
    hip -= depth * 0.27;
    lean = 0.04 + depth * 0.18;
    rootZ = -depth * 0.035;
  }
  // Lower the pelvis when a downhill foot needs more reach. All contacts
  // remain attached to the terrain instead of dangling above the road.
  const pelvisRotation = charEuler(0, twist, roll);
  for (const [side, foot] of feet.entries()) {
    const offset = charRotate(pelvisRotation, [side ? 0.11 : -0.11, 0, 0]),
      horizontal = Math.hypot(foot.point[0] - rootX - offset[0], foot.point[2] - rootZ - offset[2]);
    hip = Math.min(
      hip,
      foot.point[1] + Math.sqrt(Math.max(0.05, 0.788 ** 2 - horizontal ** 2)) - offset[1],
    );
  }
  charFrame(out, 0, [rootX, hip, rootZ] satisfies [number, number, number], pelvisRotation);
  charChild(out, 1, 0, charEuler(lean * 0.6, 0, 0));
  charChild(out, 2, 1, charEuler(lean * 0.4, -twist * 0.7, 0));
  charChild(
    out,
    3,
    2,
    charEuler(
      (options.waiting?.watch || 0) * 0.38 -
        lean * 0.35 +
        (gesture === 'dance' ? 0.07 * Math.sin(danceBeat * 2) * danceWeight : 0),
      gesture === 'dance'
        ? charMix(
            0.035 * Math.sin(time * 0.65) * (1 - motion),
            0.12 * Math.sin(danceBeat),
            danceWeight,
          )
        : 0.035 * Math.sin(time * 0.65) * (1 - motion),
      0,
    ),
  );
  for (let side = 0; side < 2; side++) {
    const thigh = side ? 13 : 10,
      shin = thigh + 1,
      footBone = thigh + 2,
      offset = charRotate(out.rotations[0], charSub(CHAR_BIND[thigh], CHAR_BIND[0])),
      start = charJoint(out, 0).map((v, i) => v + offset[i]);
    const leg = charIK(start, feet[side].point, 0.41, 0.38, [0, 0, 1] satisfies [
      number,
      number,
      number,
    ]);
    charSegment(out, thigh, start, leg.knee);
    charSegment(out, shin, leg.knee, leg.end);
    charFrame(out, footBone, leg.end, charEuler(feet[side].pitch, side ? -0.045 : 0.045, 0));
    feet[side].point = leg.end;
  }
  for (let side = 0; side < 2; side++) {
    const arm = side ? 7 : 4,
      forearm = arm + 1,
      hand = arm + 2,
      sign = side ? 1 : -1;
    const shoulder = charRotate(out.rotations[2], charSub(CHAR_BIND[arm], CHAR_BIND[2])).map(
      (v, i) => v + out.joints[2 * 3 + i],
    );
    let wrist: number[] | null = null,
      pole: number[] | null = null;
    if (options.waiting) wrist = side ? options.waiting.rightWrist : options.waiting.leftWrist;
    else if (rollTuck)
      wrist = [sign * 0.17, charMix(0.77, 0.61, rollTuck), 0.33 * rollTuck] satisfies [
        number,
        number,
        number,
      ];
    else if (gesture === 'parachute')
      wrist = [sign * 0.34, 1.7, 0.1] satisfies [number, number, number];
    else if (gesture === 'teleport') {
      const raise = charClamp(options.actionT || 0, 0, 1);
      wrist = [sign * charMix(0.24, 0.36, raise), charMix(0.81, 1.92, raise), 0.1] satisfies [
        number,
        number,
        number,
      ];
    } else if (gesture === 'drink')
      wrist = side
        ? ([0.18, 0.96 + gestureWeight * 0.36, 0.22] satisfies [number, number, number])
        : ([-0.18, 0.81, 0.06] satisfies [number, number, number]);
    else if (gesture === 'bottle-post')
      wrist = side
        ? ([
            0.16,
            0.94 + 0.12 * Math.sin(gestureT * Math.PI * 2),
            0.24 + 0.22 * Math.cos(gestureT * Math.PI * 2),
          ] satisfies [number, number, number])
        : ([-0.17, 1.0, 0.33] satisfies [number, number, number]);
    else if (gesture === 'ponder')
      wrist = side
        ? ([0.1, 1.34, 0.18] satisfies [number, number, number])
        : ([-0.16, 0.96, 0.12] satisfies [number, number, number]);
    else if (gesture === 'fish')
      wrist = [sign * 0.13, 0.97 + 0.13 * Math.sin(gestureT * Math.PI), 0.4] satisfies [
        number,
        number,
        number,
      ];
    else if (gesture === 'curl')
      wrist = [
        sign * 0.28,
        0.78 + (0.44 * (1 + Math.sin(time))) / 2,
        0.18 + 0.06 * Math.cos(time),
      ] satisfies [number, number, number];
    else if (gesture === 'press')
      wrist = [sign * 0.27, 1.25 + (0.46 * (1 + Math.sin(time))) / 2, 0.12] satisfies [
        number,
        number,
        number,
      ];
    else if (gesture === 'squat')
      wrist = [sign * 0.33, 1.3 - (0.27 * (1 + Math.sin(time))) / 2, -0.11] satisfies [
        number,
        number,
        number,
      ];
    else if (gesture === 'bench')
      wrist = [sign * 0.28, 1.3, 0.28 + 0.12 * Math.sin(time)] satisfies [number, number, number];
    else if (gesture === 'dance') {
      const beat = danceBeat + side * Math.PI;
      const upper = charMultiply(out.rotations[2], charEuler(0, 0, sign * 0.055)),
        lower = charMultiply(upper, charEuler(-0.12, 0, 0)),
        elbow = charRotate(upper, [0, -0.31, 0] satisfies [number, number, number]).map(
          (v, i) => v + shoulder[i],
        ),
        rest = charRotate(lower, [0, -0.275, 0] satisfies [number, number, number]).map(
          (v, i) => v + elbow[i],
        );
      const target = [
        sign * (0.33 + 0.105 * (1 + Math.cos(beat))),
        1.22 + 0.4 * Math.sin(beat),
        0.1 + 0.2 * Math.cos(beat),
      ] satisfies [number, number, number];
      wrist = rest.map((v, i) => charMix(v, target[i], danceWeight));
      pole = elbow.map((v, i) =>
        charMix(
          v - shoulder[i],
          ([sign * 0.7, -0.5, -0.15] satisfies [number, number, number])[i],
          danceWeight,
        ),
      );
    } else if (gesture === 'skate-trick')
      wrist = [sign * (0.36 + 0.2 * gestureWeight), 1.02 + 0.15 * gestureWeight, 0.06] satisfies [
        number,
        number,
        number,
      ];
    else if (gesture === 'caught') {
      const raise = charClamp(options.actionT || 0, 0, 1);
      wrist = [
        sign * charMix(0.24, 0.35, raise),
        charMix(0.81, 1.7, raise),
        charMix(0.04, 0.12, raise),
      ] satisfies [number, number, number];
    } else if (options.akibo)
      wrist = [sign * 0.24, 1.14, 0.46 - gestureWeight * 0.07] satisfies [number, number, number];
    else if (options.railgun)
      wrist = [
        side ? 0.11 : -0.12,
        1.05,
        side ? 0.21 - gestureWeight * 0.06 : 0.49 - gestureWeight * 0.06,
      ];
    else if (side && options.phone) wrist = [0.23, 1.06, 0.24] satisfies [number, number, number];
    else if (!side && options.carryingFish)
      wrist = [-0.3, 0.86, 0.12] satisfies [number, number, number];
    else if (options.pushingStroller)
      wrist = [sign * 0.23, 0.94, 0.34] satisfies [number, number, number];
    else if (mode === 'swim')
      wrist = [
        sign * (0.38 + 0.1 * Math.sin(time * 1.8)),
        1.12 + 0.045 * Math.cos(time * 1.8),
        0.13 + 0.11 * Math.cos(time * 1.8),
      ] satisfies [number, number, number];
    else if (mode === 'paddle')
      wrist = [
        sign * 0.32,
        1.03 + 0.14 * Math.sin(time * 3 + side * Math.PI),
        0.12 + 0.18 * Math.cos(time * 3 + side * Math.PI),
      ] satisfies [number, number, number];
    else if (mode === 'surfboard')
      wrist = [sign * 0.43, 1.03 + 0.04 * Math.sin(time * 2), side ? 0.2 : -0.05];
    else if (mode === 'skate')
      wrist = [sign * 0.36, 0.9 + Math.sin(phase) * sign * 0.04, 0.1] satisfies [
        number,
        number,
        number,
      ];
    else if (mode === 'motorcycle')
      wrist = [sign * 0.21, 0.83, 0.4] satisfies [number, number, number];
    else if (mode === 'cycle') wrist = [sign * 0.18, 0.73, 0.4] satisfies [number, number, number];
    else if (mode === 'rest')
      wrist = [
        sign * charMix(0.24, 0.2, restEase),
        charMix(0.8, 0.47, restEase),
        charMix(0.04, 0.25, restEase),
      ] satisfies [number, number, number];
    else if (mode === 'sit') wrist = [sign * 0.15, 0.81, 0.34] satisfies [number, number, number];
    else if (mode === 'surf') wrist = [-0.3, side ? 1.12 : 1.04, side ? 0.38 : 0.1];
    else if (mode === 'climb') {
      const step = charStep(
        (cycle + (side ? 0 : 0.5)) % 1,
        CHARACTER_CLIPS.climb.stride,
        CHARACTER_CLIPS.climb.stance,
        CHARACTER_CLIPS.climb.lift,
      );
      wrist = [
        sign * charMix(0.22, 0.13, motion),
        charMix(0.77, 1.4 + step.z, motion),
        charMix(0.04, 0.26 - (step.y - 0.1) * 0.6, motion),
      ] satisfies [number, number, number];
    }
    if (wrist) {
      if (gesture === 'eat' && side)
        wrist = wrist.map((v, i) =>
          charMix(v, ([0.1, 1.34, 0.19] satisfies [number, number, number])[i], gestureWeight),
        );
      const limb = charIK(
        shoulder,
        wrist,
        0.31,
        0.275,
        pole || ([sign * 0.7, -0.5, -0.15] satisfies [number, number, number]),
      );
      charSegment(out, arm, shoulder, limb.knee);
      charSegment(out, forearm, limb.knee, limb.end);
      charFrame(out, hand, limb.end, charEuler(-1.05, 0, side ? 0.12 : -0.12));
    } else {
      const swing = Math.cos(cycle * CHAR_TAU) * sign * charMix(walk.arm, jog.arm, run) * motion;
      const upper = charMultiply(out.rotations[2], charEuler(swing, 0, sign * 0.055));
      const elbow = charRotate(upper, [0, -0.31, 0] satisfies [number, number, number]).map(
        (v, i) => v + shoulder[i],
      );
      const bend =
        -0.12 -
        run * 0.95 * motion -
        0.1 * Math.max(0, -Math.cos(cycle * CHAR_TAU) * sign) * motion;
      const lower = charMultiply(upper, charEuler(bend, 0, 0)),
        end = charRotate(lower, [0, -0.275, 0] satisfies [number, number, number]).map(
          (v, i) => v + elbow[i],
        );
      if (
        (side === 1 || hop) &&
        !(gesture === 'attack' && (options.railgun || options.akibo)) &&
        gestureWeight > 0 &&
        (
          ['attack', 'steal', 'talk', 'eat', 'pet', 'pet-bear', 'work', 'rocket-hop'] satisfies [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        ).includes(gesture || '')
      ) {
        const target = hop
          ? ([sign * 0.36, 1, 0.12] satisfies [number, number, number])
          : gesture === 'eat'
            ? ([0.1, 1.34, 0.19] satisfies [number, number, number])
            : gesture === 'work'
              ? ([
                  0.1,
                  0.78 + Math.sin(time * 12) * 0.06,
                  0.43 + Math.sin(time * 12) * 0.08,
                ] satisfies [number, number, number])
              : gesture === 'pet-bear'
                ? ([
                    0.1,
                    0.94 + Math.sin(time * 9) * 0.025,
                    0.53 + Math.sin(time * 9) * 0.045,
                  ] satisfies [number, number, number])
                : gesture === 'pet'
                  ? ([
                      0.1,
                      0.48,
                      0.45 + Math.sin((options.actionT || 0) * Math.PI * 6) * 0.04,
                    ] satisfies [number, number, number])
                  : gesture === 'attack'
                    ? ([0.12, 1.23, 0.52] satisfies [number, number, number])
                    : gesture === 'steal'
                      ? ([0.12, 1.01, 0.43] satisfies [number, number, number])
                      : ([0.2, 1.18, 0.26] satisfies [number, number, number]);
        const goal = end.map((v, i) => charMix(v, target[i], gestureWeight)),
          limb = charIK(shoulder, goal, 0.31, 0.275, [sign * 0.7, -0.3, -0.1] satisfies [
            number,
            number,
            number,
          ]);
        charSegment(out, arm, shoulder, limb.knee);
        charSegment(out, forearm, limb.knee, limb.end);
        charFrame(out, hand, limb.end, charEuler(-gestureWeight, 0, 0));
      } else {
        charFrame(out, arm, shoulder, upper);
        charFrame(out, forearm, elbow, lower);
        charFrame(out, hand, end, lower);
      }
    }
  }
  out.feet = feet;
  return out;
}

class CharacterMeshBuilder {
  vertices: number[];
  indices: number[];
  bonesA: number[];
  bonesB: number[];
  weights: number[];
  slots: number[];
  shades: number[];
  lookup: Map<string, number>;
  constructor() {
    this.vertices = [];
    this.indices = [];
    this.bonesA = [];
    this.bonesB = [];
    this.weights = [];
    this.slots = [];
    this.shades = [];
    this.lookup = new Map();
  }
  tri(a: number[], b: number[], c: number[], slot: number, influence: Rig, tone = 1) {
    const normal = charUnit(charCross(charSub(b, a), charSub(c, a)));
    for (const p of [a, b, c]) {
      const rig =
        typeof influence === 'function'
          ? influence(p)
          : ([influence, influence, 0] satisfies [number, number, number]);
      const key =
        p
          .concat(normal)
          .map((v) => v.toFixed(6))
          .join(',') +
        ',' +
        rig.join(',') +
        ',' +
        slot +
        ',' +
        tone;
      let id = this.lookup.get(key);
      if (id === undefined) {
        id = this.bonesA.length;
        this.lookup.set(key, id);
        this.vertices.push(...p, ...normal);
        this.bonesA.push(rig[0]);
        this.bonesB.push(rig[1]);
        this.weights.push(rig[2]);
        this.slots.push(slot);
        this.shades.push(tone);
      }
      this.indices.push(id);
    }
  }
  quad(a: number[], b: number[], c: number[], d: number[], slot: number, rig: Rig, tone = 1) {
    this.tri(a, b, c, slot, rig, tone);
    this.tri(a, c, d, slot, rig, tone);
  }
  loft(rings: number[][], slot: number, rig: Rig, segments = 8, cap = true) {
    const at = (r: number[], i: number) => {
      const a = (i * CHAR_TAU) / segments;
      return [r[0] + Math.sin(a) * r[3], r[1], r[2] + Math.cos(a) * r[4]] satisfies [
        number,
        number,
        number,
      ];
    };
    for (let j = 0; j < rings.length - 1; j++)
      for (let i = 0; i < segments; i++)
        this.quad(
          at(rings[j], i),
          at(rings[j], i + 1),
          at(rings[j + 1], i + 1),
          at(rings[j + 1], i),
          slot,
          rig,
        );
    if (cap)
      for (let i = 0; i < segments; i++) {
        const a = rings[0],
          b = rings[rings.length - 1];
        this.tri(a.slice(0, 3), at(a, i + 1), at(a, i), slot, rig);
        this.tri(b.slice(0, 3), at(b, i), at(b, i + 1), slot, rig);
      }
  }
  box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    slot: number,
    rig: Rig,
    tone = 1,
  ) {
    const a = [x, y, z] satisfies [number, number, number],
      b = [x + w, y, z] satisfies [number, number, number],
      c = [x + w, y, z + d] satisfies [number, number, number],
      e = [x, y, z + d] satisfies [number, number, number],
      A = [x, y + h, z] satisfies [number, number, number],
      B = [x + w, y + h, z] satisfies [number, number, number],
      C = [x + w, y + h, z + d] satisfies [number, number, number],
      E = [x, y + h, z + d] satisfies [number, number, number];
    this.quad(a, b, c, e, slot, rig, tone);
    this.quad(A, E, C, B, slot, rig, tone);
    this.quad(e, c, C, E, slot, rig, tone);
    this.quad(b, a, A, B, slot, rig, tone);
    this.quad(a, e, E, A, slot, rig, tone);
    this.quad(c, b, B, C, slot, rig, tone);
  }
  finish(): CharacterMesh {
    return {
      vertices: new Float32Array(this.vertices),
      indices: new Uint16Array(this.indices),
      bonesA: new Uint8Array(this.bonesA),
      bonesB: new Uint8Array(this.bonesB),
      weights: new Float32Array(this.weights),
      slots: new Uint8Array(this.slots),
      shades: new Float32Array(this.shades),
      deformed: new Float32Array(this.vertices.length),
    };
  }
}
const charMeshCache = new Map<string, CharacterMesh>();
function charBlend(a: number, b: number, t: number) {
  return [a, b, charClamp(t, 0, 1)] satisfies [number, number, number];
}
function charTorsoRig(p: number[]) {
  return p[1] < 1.12
    ? charBlend(0, 1, (p[1] - 0.91) / 0.21)
    : charBlend(1, 2, (p[1] - 1.12) / 0.19);
}
function charBuildMesh({
  female,
  longHair,
  curly,
  hairstyle,
  cap,
  topHat,
  chef,
  backpack,
  coat,
  uniform,
  sunglasses,
  alien,
  bayonet,
  battleaxe,
  akibo,
  boots,
  iceTop,
  icePants,
  tinfoil,
  cloakTop,
  cloakBottom,
  hat,
  phone,
}: CharacterAppearance) {
  const m = new CharacterMeshBuilder(),
    S = CHAR_SLOT,
    waist = female ? 0.142 : 0.164,
    shoulder = female ? 0.222 : 0.238;
  if (cloakTop)
    m.loft(
      [
        [0, 0.72, 0, 0.29, 0.2] satisfies [number, number, number, number, number],
        [0, 0.94, 0, 0.275, 0.19] satisfies [number, number, number, number, number],
        [0, 1.13, 0, 0.29, 0.19] satisfies [number, number, number, number, number],
        [0, 1.31, 0, 0.32, 0.17] satisfies [number, number, number, number, number],
        [0, 1.39, 0, 0.105, 0.08] satisfies [number, number, number, number, number],
      ],
      S.shirt,
      charTorsoRig,
      12,
    );
  else
    m.loft(
      [
        [0, coat ? 0.78 : 0.87, 0, 0.18, 0.119],
        [0, 0.96, 0, waist, 0.112],
        [0, 1.1, 0, waist + 0.017, 0.125] satisfies [number, number, number, number, number],
        [0, 1.25, 0, shoulder, 0.137],
        [0, 1.34, 0, shoulder * 0.94, 0.115] satisfies [number, number, number, number, number],
        [0, 1.39, 0, 0.1, 0.078] satisfies [number, number, number, number, number],
      ],
      S.shirt,
      charTorsoRig,
      8,
    );
  m.loft(
    [
      [0, 0.82, 0, 0.167, 0.106] satisfies [number, number, number, number, number],
      [0, 0.9, 0, 0.172, 0.119] satisfies [number, number, number, number, number],
      [0, 0.95, 0, 0.16, 0.11] satisfies [number, number, number, number, number],
    ],
    S.pants,
    0,
    8,
  );
  if (!cloakBottom) {
    m.loft(
      [
        [0, 0.89, 0, 0.176, 0.121] satisfies [number, number, number, number, number],
        [0, 0.935, 0, 0.17, 0.116] satisfies [number, number, number, number, number],
      ],
      S.belt,
      0,
      8,
    );
    m.box(-0.027, 0.897, 0.12, 0.054, 0.031, 0.012, S.metal, 0);
  }
  // Collar, a placket and sleeve cuffs add readable clothing planes.
  if (!cloakTop) {
    m.quad(
      [-0.1, 1.39, 0.07] satisfies [number, number, number],
      [0, 1.27, 0.14] satisfies [number, number, number],
      [-0.042, 1.31, 0.142] satisfies [number, number, number],
      [-0.14, 1.35, 0.1] satisfies [number, number, number],
      S.trim,
      2,
    );
    m.quad(
      [0.1, 1.39, 0.07] satisfies [number, number, number],
      [0.14, 1.35, 0.1] satisfies [number, number, number],
      [0.042, 1.31, 0.142] satisfies [number, number, number],
      [0, 1.27, 0.14] satisfies [number, number, number],
      S.trim,
      2,
    );
    m.box(-0.011, 1.0, 0.126, 0.022, 0.24, 0.012, S.trim, charTorsoRig, 0.78);
    for (const y of [1.06, 1.15, 1.24] satisfies [number, number, number])
      m.box(-0.009, y, 0.143, 0.018, 0.018, 0.008, S.metal, charTorsoRig, 0.7);
  }
  m.loft(
    [
      [0, 1.37, 0, 0.061, 0.06] satisfies [number, number, number, number, number],
      [0, 1.49, 0, 0.057, 0.057] satisfies [number, number, number, number, number],
    ],
    S.skin,
    (p: number[]) => charBlend(2, 3, (p[1] - 1.39) / 0.08),
    8,
  );
  for (let side = 0; side < 2; side++) {
    const x = side ? 0.11 : -0.11,
      thigh = side ? 13 : 10,
      shin = thigh + 1,
      foot = thigh + 2;
    const legRig = (p: number[]) => charBlend(thigh, shin, (0.55 - p[1]) / 0.15);
    m.loft(
      [
        [x, 0.1, 0, 0.065, 0.075],
        [x, 0.18, -0.005, 0.071, 0.077],
        [x, 0.38, -0.006, 0.079, 0.087],
        [x, 0.47, 0, 0.081, 0.092],
        [x, 0.55, 0.008, 0.091, 0.106],
        [x, 0.75, 0.003, 0.101, 0.108],
        [x, 0.9, 0, 0.097, 0.099],
      ],
      S.pants,
      legRig,
      8,
    );
    if (boots) {
      m.loft(
        [
          [x, 0.12, 0, 0.08, 0.09],
          [x, 0.38, 0, 0.091, 0.1],
          [x, 0.49, 0, 0.09, 0.1],
        ],
        S.shoe,
        shin,
        8,
      );
      for (const y of [0.23, 0.34, 0.43] satisfies [number, number, number]) {
        m.box(x - 0.095, y, -0.08, 0.19, 0.025, 0.17, S.belt, shin);
        m.box(x - 0.05, y - 0.005, 0.095, 0.065, 0.04, 0.018, S.metal, shin);
      }
      m.box(x - 0.072, 0.04, 0.13, 0.144, 0.045, 0.065, S.metal, foot);
    }
    // A beveled, forward-facing shoe with a distinct heel and toe.
    m.loft(
      [
        [x, 0.015, 0.061, 0.077, 0.144],
        [x, 0.045, 0.068, 0.08, 0.154],
        [x, 0.107, 0.038, 0.071, 0.12],
        [x, 0.145, -0.007, 0.064, 0.073],
      ],
      S.shoe,
      foot,
      8,
    );
    m.box(x - 0.069, 0.013, -0.065, 0.138, 0.018, 0.25, S.belt, foot);
    m.box(x - 0.044, 0.113, 0.056, 0.088, 0.014, 0.042, S.trim, foot, 0.65);
    const arm = side ? 7 : 4,
      forearm = arm + 1,
      hand = arm + 2,
      ax = side ? 0.245 : -0.245;
    const armRig = (p: number[]) =>
      p[1] > 1.27
        ? charBlend(arm, 2, (p[1] - 1.27) / 0.14)
        : charBlend(arm, forearm, (1.09 - p[1]) / 0.15);
    m.loft(
      cloakTop
        ? [
            [ax, 0.73, 0, 0.09, 0.105],
            [ax, 0.86, 0, 0.115, 0.115],
            [ax, 1.04, 0, 0.14, 0.135],
            [ax, 1.22, 0, 0.15, 0.145],
            [ax, 1.36, 0, 0.1, 0.095],
          ]
        : [
            [ax, 0.75, 0, 0.052, 0.061],
            [ax, 0.84, 0, 0.057, 0.063],
            [ax, 0.98, 0, 0.066, 0.067],
            [ax, 1.035, 0, 0.069, 0.072],
            [ax, 1.2, 0, 0.082, 0.081],
            [ax, 1.32, 0, 0.09, 0.086],
            [ax, 1.38, 0, 0.053, 0.056],
          ],
      S.shirt,
      armRig,
      cloakTop ? 10 : 8,
    );
    m.loft(
      [
        [ax, 0.731, 0, cloakTop ? 0.09 : 0.055, cloakTop ? 0.105 : 0.063],
        [ax, 0.77, 0, cloakTop ? 0.1 : 0.056, cloakTop ? 0.11 : 0.063],
      ],
      cloakTop ? S.shirt : S.trim,
      forearm,
      8,
    );
    m.loft(
      [
        [ax, 0.615, 0.016, 0.044, 0.037],
        [ax, 0.65, 0.022, 0.051, 0.045],
        [ax, 0.72, 0.006, 0.044, 0.04],
        [ax, 0.75, 0, 0.036, 0.033],
      ],
      S.skin,
      hand,
      6,
    );
    m.box(ax + (side ? -0.053 : 0.031), 0.65, 0.005, 0.022, 0.048, 0.033, S.skin, hand, 0.94);
  }
  // Smaller head, cheek and jaw contours, separate ears, and a modeled nose.
  m.loft(
    [
      [0, 1.46, 0.015, 0.069, 0.072] satisfies [number, number, number, number, number],
      [0, 1.5, 0.007, 0.104, 0.101] satisfies [number, number, number, number, number],
      [0, 1.59, 0, 0.123, 0.111] satisfies [number, number, number, number, number],
      [0, 1.68, -0.006, 0.112, 0.105] satisfies [number, number, number, number, number],
      [0, 1.727, -0.014, 0.074, 0.074] satisfies [number, number, number, number, number],
    ],
    S.skin,
    3,
    10,
  );
  if (alien) {
    // The human disguise becomes an articulated skull, with deep eye
    // sockets, cheek ridges, exposed teeth and a narrow nasal opening.
    for (const side of [-1, 1] satisfies [number, number]) {
      const x = side * 0.055;
      m.box(x - 0.036, 1.579, 0.105, 0.072, 0.051, 0.024, S.eye, 3, 0.7);
      m.loft(
        [
          [side * 0.086, 1.542, 0.102, 0.033, 0.028] satisfies [
            number,
            number,
            number,
            number,
            number,
          ],
          [side * 0.1, 1.569, 0.101, 0.039, 0.025] satisfies [
            number,
            number,
            number,
            number,
            number,
          ],
        ],
        S.white,
        3,
        6,
      );
      m.box(x - 0.037, 1.635, 0.096, 0.074, 0.021, 0.031, S.skin, 3, 1.12);
    }
    m.tri(
      [0, 1.583, 0.14] satisfies [number, number, number],
      [-0.018, 1.548, 0.142] satisfies [number, number, number],
      [0.018, 1.548, 0.142] satisfies [number, number, number],
      S.eye,
      3,
    );
    m.box(-0.052, 1.496, 0.113, 0.104, 0.039, 0.02, S.eye, 3, 0.7);
    for (let i = 0; i < 7; i++)
      m.box(-0.047 + i * 0.014, 1.503, 0.135, 0.01, 0.023, 0.008, S.white, 3);
    m.loft(
      [
        [0, 1.46, 0.03, 0.065, 0.071] satisfies [number, number, number, number, number],
        [0, 1.49, 0.023, 0.08, 0.089] satisfies [number, number, number, number, number],
      ],
      S.skin,
      3,
      8,
    );
  } else {
    for (const side of [-1, 1] satisfies [number, number]) {
      m.loft(
        [
          [side * 0.12, 1.54, 0, 0.018, 0.023] satisfies [number, number, number, number, number],
          [side * 0.126, 1.58, 0, 0.024, 0.026] satisfies [number, number, number, number, number],
          [side * 0.118, 1.62, -0.003, 0.018, 0.02] satisfies [
            number,
            number,
            number,
            number,
            number,
          ],
        ],
        S.skin,
        3,
        6,
      );
      const x = side * 0.047;
      m.box(x - 0.019, 1.601, 0.107, 0.038, 0.018, 0.008, S.white, 3, 0.86);
      m.box(x - 0.007, 1.6, 0.116, 0.014, 0.019, 0.006, S.eye, 3);
      m.box(x - 0.025, 1.632, 0.103, 0.047, 0.011, 0.014, S.hair, 3, 0.9);
    }
    m.tri(
      [-0.024, 1.6, 0.111] satisfies [number, number, number],
      [0, 1.536, 0.168] satisfies [number, number, number],
      [0.024, 1.6, 0.111] satisfies [number, number, number],
      S.skin,
      3,
      1.04,
    );
    m.tri(
      [-0.024, 1.6, 0.111] satisfies [number, number, number],
      [-0.022, 1.536, 0.119] satisfies [number, number, number],
      [0, 1.536, 0.168] satisfies [number, number, number],
      S.skin,
      3,
      0.93,
    );
    m.tri(
      [0.024, 1.6, 0.111] satisfies [number, number, number],
      [0, 1.536, 0.168] satisfies [number, number, number],
      [0.022, 1.536, 0.119] satisfies [number, number, number],
      S.skin,
      3,
      0.98,
    );
    m.box(-0.026, 1.516, 0.108, 0.052, 0.008, 0.009, S.belt, 3, 0.9);
  }
  if (sunglasses) {
    for (const side of [-1, 1] satisfies [number, number]) {
      const x = side * 0.061;
      m.box(x - 0.052, 1.575, 0.122, 0.104, 0.064, 0.018, S.eye, 3, 0.65);
      m.box(x - 0.042, 1.584, 0.142, 0.084, 0.045, 0.005, S.eye, 3, 1.15);
      m.box(side < 0 ? -0.132 : 0.117, 1.61, -0.035, 0.015, 0.016, 0.17, S.eye, 3, 0.7);
      m.box(x - 0.031, 1.615, 0.149, 0.025, 0.006, 0.003, S.white, 3, 0.5);
    }
    m.box(-0.014, 1.609, 0.141, 0.028, 0.014, 0.014, S.eye, 3, 0.6);
  }
  // Hair is a fitted polygon cap. Longer styles have side and back locks.
  const crop = hairstyle === 'crop';
  m.loft(
    [
      [0, 1.655, -0.024, 0.124, 0.104] satisfies [number, number, number, number, number],
      [0, 1.713, -0.022, 0.112, 0.102] satisfies [number, number, number, number, number],
      [0, crop ? 1.733 : 1.758, -0.024, 0.076, 0.075],
      [0, crop ? 1.742 : 1.773, -0.027, 0.016, 0.02],
    ],
    S.hair,
    3,
    10,
  );
  m.box(-0.108, 1.626, -0.106, 0.216, 0.077, 0.035, S.hair, 3);
  if (longHair || curly) {
    m.loft(
      [
        [0, 1.37, -0.079, 0.116, 0.052] satisfies [number, number, number, number, number],
        [0, 1.51, -0.071, 0.133, 0.063] satisfies [number, number, number, number, number],
        [0, 1.65, -0.04, 0.131, 0.079] satisfies [number, number, number, number, number],
      ],
      S.hair,
      3,
      10,
      false,
    );
    for (const side of [-1, 1] satisfies [number, number])
      m.loft(
        [
          [side * 0.112, curly ? 1.35 : 1.4, -0.027, 0.035, 0.055],
          [side * 0.132, 1.48, -0.019, curly ? 0.053 : 0.036, 0.06],
          [side * 0.13, 1.63, -0.022, 0.035, 0.059] satisfies [
            number,
            number,
            number,
            number,
            number,
          ],
        ],
        S.hair,
        3,
        curly ? 7 : 6,
      );
  }
  if (hairstyle === 'side-part') {
    m.loft(
      [
        [-0.035, 1.7, 0.025, 0.1, 0.075] satisfies [number, number, number, number, number],
        [-0.025, 1.77, 0.01, 0.1, 0.07] satisfies [number, number, number, number, number],
        [0.015, 1.806, -0.005, 0.065, 0.045] satisfies [number, number, number, number, number],
      ],
      S.hair,
      3,
      10,
    );
    m.quad(
      [-0.115, 1.708, 0.05] satisfies [number, number, number],
      [0.09, 1.705, 0.073] satisfies [number, number, number],
      [0.065, 1.659, 0.108] satisfies [number, number, number],
      [-0.1, 1.646, 0.095] satisfies [number, number, number],
      S.hair,
      3,
      0.93,
    );
  }
  if (hairstyle === 'short-curls')
    for (let i = 0; i < 12; i++) {
      const a = i * 2.39996,
        r = 0.034 + Math.sqrt(i / 12) * 0.066,
        x = Math.cos(a) * r,
        z = -0.025 + Math.sin(a) * r,
        y = 1.72 + Math.sqrt(Math.max(0, 1 - (r * r) / 0.014)) * 0.055;
      m.loft(
        [
          [x, y - 0.025, z, 0.035, 0.033] satisfies [number, number, number, number, number],
          [x, y + 0.022, z, 0.043, 0.038] satisfies [number, number, number, number, number],
          [x, y + 0.047, z, 0.018, 0.019] satisfies [number, number, number, number, number],
        ],
        S.hair,
        3,
        7,
      );
    }
  if (hairstyle === 'bob') {
    m.loft(
      [
        [0, 1.463, -0.067, 0.126, 0.066] satisfies [number, number, number, number, number],
        [0, 1.52, -0.054, 0.144, 0.082] satisfies [number, number, number, number, number],
        [0, 1.66, -0.025, 0.132, 0.105] satisfies [number, number, number, number, number],
      ],
      S.hair,
      3,
      12,
      false,
    );
    for (const side of [-1, 1] satisfies [number, number])
      m.loft(
        [
          [side * 0.119, 1.47, 0.002, 0.036, 0.052] satisfies [
            number,
            number,
            number,
            number,
            number,
          ],
          [side * 0.137, 1.59, -0.005, 0.037, 0.067] satisfies [
            number,
            number,
            number,
            number,
            number,
          ],
          [side * 0.113, 1.69, 0.005, 0.034, 0.056] satisfies [
            number,
            number,
            number,
            number,
            number,
          ],
        ],
        S.hair,
        3,
        8,
      );
  }
  if (hairstyle === 'ponytail') {
    m.loft(
      [
        [0, 1.21, -0.19, 0.035, 0.034] satisfies [number, number, number, number, number],
        [0.018, 1.38, -0.24, 0.066, 0.073] satisfies [number, number, number, number, number],
        [0, 1.58, -0.2, 0.072, 0.079] satisfies [number, number, number, number, number],
        [0, 1.68, -0.105, 0.051, 0.042] satisfies [number, number, number, number, number],
      ],
      S.hair,
      3,
      10,
    );
    m.box(-0.055, 1.594, -0.172, 0.11, 0.035, 0.07, S.trim, 3);
  }
  if (hairstyle === 'braid') {
    for (let i = 0; i < 8; i++) {
      const y = 1.2 + i * 0.056,
        x = (i % 2 ? 1 : -1) * 0.018,
        z = -0.155 - i * 0.008,
        r = 0.032 + i * 0.002;
      m.loft(
        [
          [x, y - 0.025, z, r * 0.6, r * 0.6] satisfies [number, number, number, number, number],
          [x, y, z, r, r] satisfies [number, number, number, number, number],
          [x, y + 0.032, z, r * 0.6, r * 0.6] satisfies [number, number, number, number, number],
        ],
        S.hair,
        3,
        7,
      );
    }
    m.box(-0.027, 1.187, -0.177, 0.054, 0.026, 0.05, S.trim, 3);
  }
  if (cap && !hat) {
    m.loft(
      [
        [0, 1.698, -0.019, 0.13, 0.116] satisfies [number, number, number, number, number],
        [0, 1.75, -0.023, 0.116, 0.109] satisfies [number, number, number, number, number],
        [0, 1.78, -0.025, 0.076, 0.073] satisfies [number, number, number, number, number],
      ],
      uniform ? S.pants : S.shirt,
      3,
      10,
    );
    m.box(-0.1, 1.696, 0.06, 0.2, 0.024, 0.13, uniform ? S.pants : S.shirt, 3, 0.8);
    if (uniform) m.box(-0.022, 1.728, 0.103, 0.044, 0.03, 0.014, S.metal, 3);
  }
  if (topHat && !hat) {
    m.loft(
      [
        [0, 1.755, -0.02, 0.21, 0.17] satisfies [number, number, number, number, number],
        [0, 1.79, -0.02, 0.21, 0.17] satisfies [number, number, number, number, number],
      ],
      S.hair,
      3,
      16,
    );
    m.loft(
      [
        [0, 1.79, -0.02, 0.13, 0.11] satisfies [number, number, number, number, number],
        [0, 2.1, -0.02, 0.145, 0.12] satisfies [number, number, number, number, number],
      ],
      S.hair,
      3,
      16,
    );
    m.loft(
      [
        [0, 1.8, -0.02, 0.133, 0.113] satisfies [number, number, number, number, number],
        [0, 1.87, -0.02, 0.137, 0.116] satisfies [number, number, number, number, number],
      ],
      S.metal,
      3,
      16,
    );
  }
  if (chef && !hat) {
    m.loft(
      [
        [0, 1.71, -0.02, 0.13, 0.12] satisfies [number, number, number, number, number],
        [0, 1.81, -0.02, 0.14, 0.12] satisfies [number, number, number, number, number],
        [0, 1.9, -0.02, 0.19, 0.16] satisfies [number, number, number, number, number],
        [0, 2.02, -0.02, 0.17, 0.15] satisfies [number, number, number, number, number],
        [0, 2.055, -0.02, 0.06, 0.06] satisfies [number, number, number, number, number],
      ],
      S.white,
      3,
      16,
    );
    for (const side of [-1, 1] satisfies [number, number])
      for (let row = 0; row < 3; row++)
        m.box(side * 0.07 - 0.012, 1.08 + row * 0.085, 0.138, 0.024, 0.024, 0.012, S.belt, 2);
  }
  if (hat && getHatGeometry(hat)) {
    const model = getHatGeometry(hat)!,
      data = model.mesh.data;
    for (let i = 0; i < data.length; i += 33) {
      const points = ([0, 11, 22] satisfies [number, number, number]).map((k) => [
        data[i + k],
        data[i + k + 1] + 1.715,
        data[i + k + 2] - 0.02,
      ]);
      m.tri(
        points[0],
        points[1],
        points[2],
        ([S.hat, S.hatTrim, S.hatGem] satisfies [number, number, number])[model.channels[i / 33]],
        3,
      );
    }
  }
  if (phone) {
    m.box(0.2, 0.64, 0.038, 0.09, 0.18, 0.016, S.phoneBody, 9);
    m.box(0.207, 0.656, 0.056, 0.076, 0.14, 0.004, S.phoneScreen, 9);
    for (let i = 0; i < 4; i++)
      m.box(
        0.214,
        0.677 + i * 0.024,
        0.061,
        0.052 - (i % 2) * 0.016,
        0.006,
        0.002,
        S.phoneGlyph,
        9,
      );
    m.box(0.233, 0.787, 0.062, 0.026, 0.005, 0.002, S.phoneBody, 9);
  }
  if (backpack) {
    m.loft(
      [
        [0, 1.0, -0.19, 0.145, 0.06] satisfies [number, number, number, number, number],
        [0, 1.13, -0.205, 0.157, 0.085] satisfies [number, number, number, number, number],
        [0, 1.27, -0.185, 0.125, 0.065] satisfies [number, number, number, number, number],
      ],
      S.bag,
      1,
      8,
    );
    for (const side of [-1, 1] satisfies [number, number])
      m.box(side * 0.147 - 0.017, 1.01, 0.116, 0.034, 0.27, 0.02, S.bag, charTorsoRig, 0.8);
    m.box(-0.09, 1.04, -0.294, 0.18, 0.1, 0.025, S.bag, 1, 0.85);
  }
  if (bayonet) {
    m.box(0.223, 0.59, -0.027, 0.044, 0.18, 0.055, S.belt, 9);
    m.box(0.177, 0.765, -0.039, 0.136, 0.018, 0.078, S.metal, 9);
    m.box(0.232, 0.783, -0.012, 0.027, 0.27, 0.033, S.metal, 9);
    m.tri(
      [0.232, 1.053, -0.012] satisfies [number, number, number],
      [0.259, 1.053, -0.012] satisfies [number, number, number],
      [0.245, 1.15, 0.004] satisfies [number, number, number],
      S.white,
      9,
    );
    m.tri(
      [0.259, 1.053, 0.021] satisfies [number, number, number],
      [0.232, 1.053, 0.021] satisfies [number, number, number],
      [0.245, 1.15, 0.004] satisfies [number, number, number],
      S.metal,
      9,
    );
  }
  if (akibo)
    for (const side of [-1, 1] satisfies [number, number]) {
      const x = side * 0.245,
        hand = side < 0 ? 6 : 9;
      m.box(x - 0.036, 0.38, -0.03, 0.072, 0.32, 0.09, S.metal, hand);
      m.box(x - 0.025, 0.56, -0.08, 0.05, 0.12, 0.08, S.belt, hand);
      m.box(x - 0.025, 0.365, -0.02, 0.05, 0.028, 0.07, S.eye, hand);
      m.box(x - 0.012, 0.36, 0.057, 0.024, 0.04, 0.01, S.white, hand);
    }
  if (battleaxe) {
    m.box(0.224, 0.48, -0.022, 0.044, 0.83, 0.045, S.bag, 9);
    m.loft(
      [
        [0.245, 1.12, 0, 0.035, 0.04] satisfies [number, number, number, number, number],
        [0.245, 1.28, 0, 0.045, 0.05] satisfies [number, number, number, number, number],
      ],
      S.metal,
      9,
      8,
    );
    for (const sign of [-1, 1] satisfies [number, number]) {
      const x = 0.245;
      m.quad(
        [x, 1.28, -0.025] satisfies [number, number, number],
        [x + sign * 0.25, 1.39, -0.025] satisfies [number, number, number],
        [x + sign * 0.3, 1.12, -0.025] satisfies [number, number, number],
        [x, 1.17, -0.025] satisfies [number, number, number],
        S.metal,
        9,
      );
      m.quad(
        [x, 1.17, 0.025] satisfies [number, number, number],
        [x + sign * 0.3, 1.12, 0.025] satisfies [number, number, number],
        [x + sign * 0.25, 1.39, 0.025] satisfies [number, number, number],
        [x, 1.28, 0.025] satisfies [number, number, number],
        S.metal,
        9,
      );
      m.quad(
        [x + sign * 0.25, 1.39, -0.025] satisfies [number, number, number],
        [x + sign * 0.3, 1.12, -0.025] satisfies [number, number, number],
        [x + sign * 0.3, 1.12, 0.025] satisfies [number, number, number],
        [x + sign * 0.25, 1.39, 0.025] satisfies [number, number, number],
        S.white,
        9,
      );
    }
  }
  if (cloakBottom) {
    const drape = (p: number[]) =>
      charBlend(0, p[0] < 0 ? 12 : 15, Math.max(0, Math.min(1, (0.86 - p[1]) / 0.79)));
    m.loft(
      [
        [0, 0.065, 0, 0.41, 0.29] satisfies [number, number, number, number, number],
        [0, 0.23, 0, 0.39, 0.28] satisfies [number, number, number, number, number],
        [0, 0.49, 0, 0.31, 0.23] satisfies [number, number, number, number, number],
        [0, 0.77, 0, 0.23, 0.16] satisfies [number, number, number, number, number],
        [0, 0.92, 0, 0.18, 0.125] satisfies [number, number, number, number, number],
      ],
      S.pants,
      drape,
      16,
    );
  }
  if (tinfoil) {
    m.loft(
      [
        [0, 1.77, 0, 0.16, 0.15] satisfies [number, number, number, number, number],
        [0, 1.92, 0, 0.15, 0.14] satisfies [number, number, number, number, number],
        [0, 2.12, 0, 0.008, 0.008] satisfies [number, number, number, number, number],
      ],
      S.shirt,
      3,
      8,
    );
    for (const y of [1, 1.12, 1.24] satisfies [number, number, number])
      m.tri(
        [-0.13, y, 0.155] satisfies [number, number, number],
        [0.13, y + 0.02, 0.155] satisfies [number, number, number],
        [0, y + 0.08, 0.17] satisfies [number, number, number],
        S.trim,
        2,
      );
  }
  if (iceTop) {
    m.loft(
      [
        [0, 0.97, 0, 0.17, 0.132] satisfies [number, number, number, number, number],
        [0, 1.16, 0, 0.21, 0.15] satisfies [number, number, number, number, number],
        [0, 1.31, 0, 0.235, 0.146] satisfies [number, number, number, number, number],
      ],
      S.shirt,
      charTorsoRig,
      8,
      false,
    );
    for (const side of [-1, 1] satisfies [number, number]) {
      const x = side * 0.24,
        rig = side > 0 ? 7 : 4;
      m.loft(
        [
          [x, 1.25, 0, 0.1, 0.1] satisfies [number, number, number, number, number],
          [x, 1.37, 0, 0.13, 0.12] satisfies [number, number, number, number, number],
          [x, 1.45, 0, 0.045, 0.045] satisfies [number, number, number, number, number],
        ],
        S.trim,
        rig,
        6,
      );
      m.tri(
        [x - 0.065, 1.37, 0.1] satisfies [number, number, number],
        [x + 0.065, 1.37, 0.1] satisfies [number, number, number],
        [x, 1.57, 0.06] satisfies [number, number, number],
        S.white,
        rig,
      );
    }
    for (const x of [-0.075, 0, 0.075] satisfies [number, number, number])
      m.tri(
        [x - 0.025, 1.1, 0.154] satisfies [number, number, number],
        [x + 0.025, 1.1, 0.154] satisfies [number, number, number],
        [x, 1.27, 0.16] satisfies [number, number, number],
        S.white,
        2,
      );
  }
  if (icePants)
    for (const side of [-1, 1] satisfies [number, number]) {
      const x = side * 0.11,
        rig = side > 0 ? 14 : 11;
      m.loft(
        [
          [x, 0.2, 0.015, 0.079, 0.094] satisfies [number, number, number, number, number],
          [x, 0.47, 0.022, 0.09, 0.113] satisfies [number, number, number, number, number],
          [x, 0.57, 0.018, 0.065, 0.09] satisfies [number, number, number, number, number],
        ],
        S.pants,
        rig,
        6,
      );
      m.tri(
        [x - 0.05, 0.42, 0.127] satisfies [number, number, number],
        [x + 0.05, 0.42, 0.127] satisfies [number, number, number],
        [x, 0.61, 0.11] satisfies [number, number, number],
        S.white,
        rig,
      );
    }
  if (uniform) {
    m.box(-0.13, 1.214, 0.137, 0.071, 0.086, 0.018, S.metal, 2);
    m.box(0.07, 1.14, 0.14, 0.09, 0.065, 0.012, S.pants, 2, 0.8);
  }
  return m.finish();
}
export function getCharacterMesh(appearance: CharacterAppearance = {}) {
  const flags = {
    phone: !!appearance.phone,
    hat: hatById(appearance.hat)?.id || '',
    female: !!appearance.female,
    hairstyle: appearance.hairstyle || '',
    longHair: !!appearance.longHair,
    curly: appearance.hairstyle === 'curly',
    cap: !!appearance.cap,
    topHat: !!appearance.topHat,
    chef: !!appearance.chef,
    backpack: appearance.backpack !== false,
    coat: !!appearance.coat,
    uniform: !!appearance.uniform,
    sunglasses: !!appearance.sunglasses,
    alien: !!appearance.alien,
    bayonet: !!appearance.bayonet,
    battleaxe: !!appearance.battleaxe,
    akibo: !!appearance.akibo,
    boots: !!appearance.boots,
    iceTop: !!appearance.iceTop,
    tinfoil: !!appearance.tinfoil,
    icePants: !!appearance.icePants,
    cloakTop: !!appearance.cloakTop,
    cloakBottom: !!appearance.cloakBottom,
  };
  const key = Object.values(flags)
    .map((v) => (typeof v === 'boolean' ? Number(v) : v))
    .join('|');
  if (!charMeshCache.has(key)) charMeshCache.set(key, charBuildMesh(flags));
  return charMeshCache.get(key)!;
}
const charScratch = createCharacterPose(),
  characterPalettes = new Map<string, Float32Array>();
/** Color changes reuse the same geometry. The fourth channel is a surface
 * kind: 0 cloth/skin, 1 metal, 2 phone glow. Cache palettes separately. */
export function characterPalette(appearance: CharacterAppearance, skin: string, shirt: string) {
  const hat = hatById(appearance.hat),
    colors = [
      appearance.alien ? '#a4b797' : skin,
      appearance.tinfoil
        ? '#c5d0d2'
        : appearance.cloakTop
          ? '#1b1e23'
          : appearance.iceTop
            ? ITEM_STATS['ice-top'].color
            : shirt,
      appearance.tinfoil
        ? '#b1bec2'
        : appearance.cloakBottom
          ? '#181b20'
          : appearance.icePants
            ? ITEM_STATS['ice-pants'].color
            : appearance.pants || '#626955',
      appearance.hair || '#453a30',
      appearance.boots ? '#171a21' : appearance.shoes || '#3c3d36',
      appearance.iceTop ? ITEM_STATS['ice-top'].trim : appearance.trim || '#c9c7b4',
      '#282c29',
      '#e1dfca',
      '#c7aa67',
      '#45483c',
      appearance.bag || '#886d4b',
      ...(hat?.colors || (['#888888', '#aaaaaa', '#cccccc'] satisfies [string, string, string])),
      '#485961',
      '#91bdc5',
      '#e4ece1',
    ];
  const key =
    colors.join('|') +
    '|' +
    Number(!!appearance.gilded) +
    Number(!!appearance.tinfoil) * 2 +
    '|' +
    Number(!!hat?.metal) +
    '|' +
    Number(!!hat?.trimMetal) +
    '|' +
    Number(!!hat?.gem);
  if (characterPalettes.has(key)) return characterPalettes.get(key)!;
  const palette = new Float32Array(17 * 4);
  for (let slot = 0; slot < 17; slot++) {
    palette.set(rgb(colors[slot]), slot * 4);
    const gilded =
      (appearance.gilded &&
        (
          [CHAR_SLOT.shirt, CHAR_SLOT.pants, CHAR_SLOT.metal] satisfies [number, number, number]
        ).includes(slot)) ||
      (appearance.tinfoil &&
        (
          [CHAR_SLOT.shirt, CHAR_SLOT.pants, CHAR_SLOT.trim] satisfies [number, number, number]
        ).includes(slot)) ||
      (hat &&
        ((slot === CHAR_SLOT.hat && hat.metal) ||
          (slot === CHAR_SLOT.hatTrim && hat.trimMetal) ||
          slot === CHAR_SLOT.hatGem));
    palette[slot * 4 + 3] = gilded ? 1 : slot === CHAR_SLOT.phoneScreen ? 2 : 0;
  }
  if (characterPalettes.size >= 256)
    characterPalettes.delete(characterPalettes.keys().next().value!);
  characterPalettes.set(key, palette);
  return palette;
}
export function characterIndices(mesh: CharacterMesh, headOnly = false) {
  if (!headOnly) return mesh.indices;
  if (!mesh.headIndices) {
    mesh.headIndices = [];
    for (let i = 0; i < mesh.indices.length; i += 3) {
      const triangle = mesh.indices.subarray(i, i + 3);
      if (triangle.every((id) => mesh.bonesA[id] === 3 && mesh.bonesB[id] === 3))
        mesh.headIndices.push(...triangle);
    }
  }
  return mesh.headIndices;
}

/** Submit the cached bind mesh and a small pose to the GPU batch. Ordinary
 * Mesh instances retain the CPU reference for previews, tests and rare rolls. */
export function drawCharacter(
  m: Mesh,
  x: number,
  z: number,
  base: number,
  angle = 0,
  phase = 0,
  seated = false,
  skin = '#bd9369',
  shirt = '#707b4b',
  appearance: CharacterAppearance = {},
) {
  // These clips need both hands. Stowed equipment must not replace their
  // handlebars, ladder grips, exercise poses or board-balancing arms.
  if (
    (
      ['cycle', 'motorcycle', 'skate', 'surf', 'surfboard', 'paddle', 'climb', 'swim'] satisfies [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    ).includes(appearance.mode || '') ||
    (
      [
        'bench',
        'curl',
        'squat',
        'press',
        'teleport',
        'parachute',
        'forward-roll',
        'dance',
        'rocket-hop',
      ] satisfies [string, string, string, string, string, string, string, string, string]
    ).includes(appearance.action || '')
  )
    appearance = {
      ...appearance,
      railgun: false,
      akibo: false,
      battleaxe: false,
      bayonet: false,
      phone: false,
    };
  const mesh = getCharacterMesh(appearance),
    height = appearance.height || 1,
    co = Math.cos(angle),
    si = Math.sin(angle);
  const mode = appearance.mode || (seated ? 'sit' : phase ? 'move' : 'idle');
  const sampleGround = appearance.ground;
  const ground =
    sampleGround && (mode === 'idle' || mode === 'move' || mode === 'rest')
      ? (lx: number, lz: number) =>
          (sampleGround!(x + lx * si + lz * co, z - lx * co + lz * si) - base) / height - 0.015
      : null;
  const pose =
      appearance.pose ||
      sampleCharacterPose(
        mode,
        phase,
        {
          motion: appearance.motion,
          run: appearance.run,
          sitBlend: appearance.sitBlend,
          danceBlend: appearance.danceBlend,
          time: appearance.time,
          action: appearance.action,
          actionT: appearance.actionT,
          carryingFish: appearance.carryingFish,
          pushingStroller: appearance.pushingStroller,
          railgun: appearance.railgun,
          akibo: appearance.akibo,
          phone: appearance.phone,
          ground,
        },
        charScratch,
      ),
    mat = pose.matrices,
    v = mesh.vertices,
    work = mesh.deformed;
  const palette = characterPalette(appearance, skin, shirt),
    indices = characterIndices(mesh, appearance.headOnly);
  const cpu =
    appearance.cpuSkinning ||
    (['caught', 'forward-roll'] satisfies [string, string]).includes(appearance.action || '');
  if (m.characters && !cpu) {
    m.characters.add(m, mesh, mat, palette, { x, z, base, angle, height, indices });
    drawWearableAccessories(m, appearance, mat, {
      x,
      z,
      base,
      angle,
      height,
      time: appearance.time || 0,
    });
    return;
  }
  for (let id = 0; id < mesh.bonesA.length; id++) {
    const i = id * 6,
      a = mesh.bonesA[id] * 12,
      b = mesh.bonesB[id] * 12,
      w = mesh.weights[id],
      q = 1 - w;
    for (let row = 0; row < 3; row++) {
      const A = a + row * 4,
        B = b + row * 4;
      work[i + row] =
        (mat[A] * v[i] + mat[A + 1] * v[i + 1] + mat[A + 2] * v[i + 2] + mat[A + 3]) * q +
        (mat[B] * v[i] + mat[B + 1] * v[i + 1] + mat[B + 2] * v[i + 2] + mat[B + 3]) * w;
      work[i + 3 + row] =
        (mat[A] * v[i + 3] + mat[A + 1] * v[i + 4] + mat[A + 2] * v[i + 5]) * q +
        (mat[B] * v[i + 3] + mat[B + 1] * v[i + 4] + mat[B + 2] * v[i + 5]) * w;
    }
  }
  for (const id of indices) {
    const i = id * 6,
      px = work[i],
      py = work[i + 1] * height,
      pz = work[i + 2],
      nx = work[i + 3],
      ny = work[i + 4] / height,
      nz = work[i + 5],
      slot = mesh.slots[id] * 4,
      shade = mesh.shades[id],
      surface = palette[slot + 3];
    m.data.push(
      x + px * si + pz * co,
      base + py,
      z - px * co + pz * si,
      nx * si + nz * co,
      ny,
      -nx * co + nz * si,
      palette[slot] * shade,
      palette[slot + 1] * shade,
      palette[slot + 2] * shade,
      surface === 1 ? -1.4 : surface === 2 ? -1.25 : -1,
      surface === 1 ? 0.4 : surface === 2 ? 0.22 : -1,
    );
  }
  drawWearableAccessories(m, appearance, mat, {
    x,
    z,
    base,
    angle,
    height,
    time: appearance.time || 0,
    cpu: true,
  });
}
