import { MP_ENTITY_INTERPOLATION_MS } from './multiplayer-protocol.js';

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
];
const TURN_FIELDS = new Set(['angle', 'heading']);

/** Render a short distance behind server time, with 50 ms of jitter headroom.
 * Keep actual samples instead of restarting an easing curve on every packet.
 * No extrapolation: a stalled connection cannot walk an actor through a wall. */
export function createSnapshotMotion({
  now = () => performance.now(),
  delayMs = MP_ENTITY_INTERPOLATION_MS + 50,
  maxSamples = 8,
} = {}) {
  let samples = [];
  function accept(source, time = now()) {
    const pose = {};
    for (const key of MOTION_FIELDS) if (Number.isFinite(source[key])) pose[key] = source[key];
    if (typeof source.moving === 'boolean') pose.moving = source.moving;
    const last = samples.at(-1),
      axis = 'z' in pose ? 'z' : 'y';
    const discontinuity =
      last &&
      (time < last.time ||
        time - last.time > 2000 ||
        Math.hypot(pose.x - last.pose.x, pose[axis] - last.pose[axis]) > 12 ||
        (Number.isFinite(pose.travel) && pose.travel < (last.pose.travel ?? pose.travel)));
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
      b = samples.at(-1);
    for (let i = 1; i < samples.length; i++)
      if (samples[i].time >= target) {
        a = samples[i - 1];
        b = samples[i];
        break;
      }
    const t = Math.max(0, Math.min(1, (target - a.time) / (b.time - a.time || 1))),
      pose = { ...b.pose };
    for (const key of MOTION_FIELDS)
      if (Number.isFinite(a.pose[key]) && Number.isFinite(b.pose[key])) {
        const delta = TURN_FIELDS.has(key)
          ? Math.atan2(Math.sin(b.pose[key] - a.pose[key]), Math.cos(b.pose[key] - a.pose[key]))
          : b.pose[key] - a.pose[key];
        pose[key] = a.pose[key] + delta * t;
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
  };
}

/** Apply metadata immediately, but sample movement only on the render clock.
 * Unchanged records in delta messages must not restart an actor's timeline. */
export function createActorMotionGroup(options = {}) {
  const tracks = new Map();
  function accept(id, target, source, time) {
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
    update(connected) {
      if (connected)
        for (const { target, motion } of tracks.values()) Object.assign(target, motion.sample());
    },
    retain(ids, prefix = '') {
      for (const id of tracks.keys())
        if (String(id).startsWith(prefix) && !ids.has(id)) tracks.delete(id);
    },
    clear() {
      tracks.clear();
    },
    get size() {
      return tracks.size;
    },
  };
}
