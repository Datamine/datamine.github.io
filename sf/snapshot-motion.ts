interface MotionOptions {
  now?: () => number;
  delayMs?: number;
  maxSamples?: number;
}
type MotionField = (typeof MOTION_FIELDS)[number];
type MotionPose = Partial<Record<MotionField, number>> & { moving?: boolean };
interface MotionSample {
  time: number;
  pose: MotionPose;
}
// CONTENT-BINDINGS-MIGRATED
import { MP_ENTITY_INTERPOLATION_MS } from './multiplayer-protocol.ts';

// Presentation only. Never interpolate HP, inventory, targets or route nodes.
const MOTION_FIELDS = [
  'x',
  'y',
  'z',
  'base',
  'angle',
  'heading',
  'phase',
  'travel',
  'motion',
  'elapsed',
  'gate',
  'release',
] as const;
const TURN_FIELDS = new Set(['angle', 'heading'] satisfies [string, string]);

/** Render a short distance behind server time, with 50 ms of jitter headroom.
 * Keep actual samples instead of restarting an easing curve on every packet.
 * No extrapolation: a stalled connection cannot walk an actor through a wall. */
export function createSnapshotMotion({
  now = () => performance.now(),
  delayMs = MP_ENTITY_INTERPOLATION_MS + 50,
  maxSamples = 8,
}: MotionOptions = {}) {
  let samples: MotionSample[] = [];
  function accept(source: object, time = now()) {
    const fields = source as Record<string, unknown>,
      pose: MotionPose = {};
    for (const key of MOTION_FIELDS) {
      const value = fields[key];
      if (typeof value === 'number' && Number.isFinite(value)) pose[key] = value;
    }
    if (typeof fields.moving === 'boolean') pose.moving = fields.moving;
    const last = samples.at(-1),
      axis = 'z' in pose ? 'z' : 'y';
    const discontinuity =
      last &&
      (time < last.time ||
        time - last.time > 2000 ||
        Math.hypot(
          Number(pose.x) - Number(last.pose.x),
          Number(pose[axis]) - Number(last.pose[axis]),
        ) > 12 ||
        (typeof pose.travel === 'number' &&
          Number.isFinite(pose.travel) &&
          pose.travel < (last.pose.travel ?? pose.travel)));
    if (discontinuity) samples = [];
    if (samples.at(-1)?.time === time) samples.pop();
    samples.push({ time, pose });
    if (samples.length > maxSamples) samples.shift();
  }
  function sample(time = now()) {
    if (!samples.length) return null;
    const target = time - delayMs;
    while (samples.length > 2 && samples[1].time <= target) samples.shift();
    let a = samples[0],
      b = samples.at(-1)!;
    for (let i = 1; i < samples.length; i++)
      if (samples[i].time >= target) {
        a = samples[i - 1];
        b = samples[i];
        break;
      }
    const t = Math.max(0, Math.min(1, (target - a.time) / (b.time - a.time || 1))),
      pose = { ...b.pose };
    for (const key of MOTION_FIELDS) {
      const from = a.pose[key],
        to = b.pose[key];
      if (
        typeof from === 'number' &&
        typeof to === 'number' &&
        Number.isFinite(from) &&
        Number.isFinite(to)
      ) {
        const delta = TURN_FIELDS.has(key)
          ? Math.atan2(Math.sin(to - from), Math.cos(to - from))
          : to - from;
        pose[key] = from + delta * t;
      }
    }
    if (typeof b.pose.moving === 'boolean')
      pose.moving = t < 1 ? a.pose.moving || b.pose.moving : b.pose.moving;
    return pose;
  }
  return {
    accept,
    sample,
    clear() {
      samples = [];
    },
    get size() {
      return samples.length;
    },
    contentNodeId: 'snapshot-motion.createSnapshotMotion.node-1',
  };
}

/** Apply metadata immediately, but sample movement only on the render clock.
 * Unchanged records in delta messages must not restart an actor's timeline. */
export function createActorMotionGroup(options: MotionOptions = {}) {
  const tracks = new Map<
    string | number,
    { target: object; source?: object; motion: ReturnType<typeof createSnapshotMotion> }
  >();
  function accept(id: string | number, target: object, source: object, time: number) {
    let entry = tracks.get(id);
    if (entry?.source === source && entry.target === target) return;
    if (!entry || entry.target !== target) {
      entry = { target, motion: createSnapshotMotion(options) };
      tracks.set(id, entry);
    }
    entry.source = source;
    entry.motion.accept(source, time);
    Object.assign(target, source, entry.motion.sample());
  }
  return {
    accept,
    update(connected: boolean) {
      if (connected)
        for (const { target, motion } of tracks.values()) Object.assign(target, motion.sample());
    },
    retain(ids: ReadonlySet<string | number>, prefix = '') {
      for (const id of tracks.keys())
        if (String(id).startsWith(prefix) && !ids.has(id)) tracks.delete(id);
    },
    clear() {
      tracks.clear();
    },
    get size() {
      return tracks.size;
    },
    contentNodeId: 'snapshot-motion.createActorMotionGroup.node-2',
  };
}
