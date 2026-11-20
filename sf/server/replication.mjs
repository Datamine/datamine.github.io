import { MP_VIEW_RADIUS, MP_MAX_NEIGHBORS, MP_PRIVATE_KEYS } from '../multiplayer-protocol.js';
import { WORLD_FIELDS, worldRecord, worldPatch } from '../world-deltas.js';
import { sameMapInstance } from '../map-instances.js';
import { SpatialIndex } from './spatial-index.mjs';
import { GAMEPLAY } from '../config/gameplay.js';
import { createPlayerFrames } from './player-frames.mjs';

const compact = (value) =>
  JSON.stringify(value, (_key, v) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) / 100 : v,
  );
/** 10 Hz player deltas, 5 Hz shared/private deltas. Encode shared source
 * records once; per-client work is bounded by nearby-interest caps. */
export function createReplication({ players, shared, personal, send, publicPlayer, now, metrics }) {
  const kinds = Object.keys(WORLD_FIELDS),
    playerIndex = new SpatialIndex(),
    frames = createPlayerFrames(),
    metadata = new Map(),
    watchers = new Map(),
    members = new Map(),
    sourceValues = Object.fromEntries(kinds.map((k) => [k, new Map()])),
    indices = Object.fromEntries(kinds.map((k) => [k, new SpatialIndex()]));
  let nextWorld = 0;
  function broadcast(tick) {
    const start = performance.now(),
      entityFrame = shared.clock + 1e-8 >= nextWorld;
    if (entityFrame) nextWorld = shared.clock + 1 / GAMEPLAY.worldHz;
    playerIndex.rebuild(
      [...players.values()].filter((p) => (p.instance?.kind || 'world') === 'world'),
    );
    frames.capture(players.values());
    for (const [id, peer] of members)
      if (!players.has(id)) {
        for (const target of peer.seen.keys()) watchers.get(target)?.delete(id);
        members.delete(id);
        watchers.delete(id);
      }
    for (const id of metadata.keys()) if (!players.has(id)) metadata.delete(id);
    const identity = (peer) => {
      let record = metadata.get(peer.id);
      if (!record || record.revision !== peer.revision || record.level !== peer.level) {
        record = { revision: peer.revision, level: peer.level, value: publicPlayer(peer) };
        metadata.set(peer.id, record);
      }
      return record.value;
    };
    const world = entityFrame ? shared.snapshot() : null,
      packed = {},
      globals = {};
    if (world) {
      for (const kind of kinds) {
        const records = world[kind] || [],
          previous = sourceValues[kind],
          next = new Map();
        indices[kind].rebuild(records);
        packed[kind] = new Map();
        for (const n of records) {
          let values = worldRecord(kind, n),
            old = previous.get(n.id);
          if (old && !worldPatch(n.id, values, old)) values = old;
          next.set(n.id, values);
          packed[kind].set(n.id, { record: n, values, patches: new Map() });
        }
        sourceValues[kind] = next;
      }
      for (const key of ['raptor', 'tiger', 'airship', 'peptideSpawnAt']) {
        const text = compact(world[key]);
        globals[key] = { text, value: JSON.parse(text) };
      }
    }
    for (const p of players.values()) {
      if (!members.has(p.id)) members.set(p.id, p);
      if (p.transport.bufferedAmount > 262144) {
        metrics.slowClients++;
        continue;
      }
      // Delta-only replication may legitimately be silent in an empty
      // area. Browser WebSockets hide protocol-level ping/pong, so keep
      // the application's six-second connection watchdog informed too.
      if (now() - (p.lastSentAt ?? now()) >= 2000) send(p, { type: 'heartbeat' });
      p.transport.cork?.();
      try {
        const visible = [],
          seen = p.seen,
          enter = [],
          remove = [];
        for (const [id, revision] of seen) {
          const peer = players.get(id);
          if (
            !peer ||
            !sameMapInstance(p, peer) ||
            peer.mode === 'hidden' ||
            (peer.x - p.x) ** 2 + (peer.z - p.z) ** 2 > MP_VIEW_RADIUS ** 2
          ) {
            seen.delete(id);
            watchers.get(id)?.delete(p.id);
            remove.push(id);
            continue;
          }
          visible.push(peer);
          if (revision !== peer.revision) {
            enter.push(identity(peer));
            seen.set(id, peer.revision);
          }
        }
        if (visible.length < MP_MAX_NEIGHBORS && (p.instance?.kind || 'world') === 'world')
          for (const peer of playerIndex.near(p.x, p.z, MP_VIEW_RADIUS, MP_MAX_NEIGHBORS, p)) {
            if (visible.length >= MP_MAX_NEIGHBORS) break;
            if (!seen.has(peer.id)) {
              visible.push(peer);
              seen.set(peer.id, peer.revision);
              enter.push(identity(peer));
              let observers = watchers.get(peer.id);
              if (!observers) watchers.set(peer.id, (observers = new Set()));
              observers.add(p.id);
            }
          }
        if (enter.length || remove.length) send(p, { type: 'interest', enter, remove });
        p.poseVersions ??= new Map();
        const changed = [];
        // Self is authoritative too. Hidden only excludes peers, never the
        // owner's own position. Stationary players need no repeated packet.
        visible.push(p);
        for (const peer of visible) {
          const version = frames.version(peer.id);
          if (p.poseVersions.get(peer.id) !== version) {
            changed.push(peer);
            p.poseVersions.set(peer.id, version);
          }
        }
        for (const id of remove) p.poseVersions.delete(id);
        if (changed.length) {
          send(p, frames.encode(changed, tick, now()));
          metrics.frames++;
        }
        if (!entityFrame) continue;
        p.entityVersions ??= {};
        p.globalVersions ??= {};
        const patches = {},
          removed = {},
          state = {};
        const publicWorld = (p.instance?.kind || 'world') === 'world';
        for (const kind of kinds) {
          const previous = p.entityVersions[kind] || new Map(),
            next = new Map(),
            radius = kind === 'npcs' ? 38 : 45,
            limit =
              kind === 'npcs'
                ? GAMEPLAY.maxNearbyNPCs
                : kind === 'loot'
                  ? GAMEPLAY.maxNearbyLoot
                  : 12,
            records = !publicWorld
              ? []
              : kind === 'npcs'
                ? indices[kind].near(p.x, p.z, radius, limit)
                : [...previous.keys()]
                    .map((id) => packed[kind].get(id)?.record)
                    .filter((n) => n && Math.hypot(n.x - p.x, n.z - p.z) <= radius);
          if (publicWorld && records.length < limit) {
            const ids = new Set(records.map((n) => n.id));
            for (const n of indices[kind].near(p.x, p.z, radius, limit))
              if (!ids.has(n.id) && records.length < limit) {
                records.push(n);
                ids.add(n.id);
              }
          }
          for (const record of records) {
            const source = packed[kind].get(record.id),
              value = source.values,
              old = previous.get(record.id);
            next.set(record.id, value);
            if (value === old) continue;
            if (!source.patches.has(old))
              source.patches.set(old, worldPatch(record.id, value, old));
            const patch = source.patches.get(old);
            if (patch) (patches[kind] ??= []).push(patch);
          }
          const gone = [...previous.keys()].filter((id) => !next.has(id));
          if (gone.length) removed[kind] = gone;
          p.entityVersions[kind] = next;
        }
        for (const [key, global] of Object.entries(globals)) {
          const actor =
            key === 'tiger'
              ? { x: world.tiger.tiger.x + 0.5, z: world.tiger.tiger.y + 0.5 }
              : key === 'raptor'
                ? world.raptor
                : null;
          const text =
            publicWorld && (!actor || Math.hypot(actor.x - p.x, actor.z - p.z) < 45)
              ? global.text
              : 'null';
          if (p.globalVersions[key] !== text) {
            state[key] = text === 'null' ? null : global.value;
            p.globalVersions[key] = text;
          }
        }
        if (p.population !== players.size) {
          state.population = players.size;
          p.population = players.size;
        }
        if (Object.keys(patches).length || Object.keys(removed).length || Object.keys(state).length)
          send(p, { type: 'world', time: now(), state, patches, removed });
        p.privateVersions ??= {};
        const fields = [];
        for (let i = 0; i < MP_PRIVATE_KEYS.length; i++) {
          const key = MP_PRIVATE_KEYS[i],
            v = p.profile.privateState[key];
          if (v !== undefined && p.privateVersions[key] !== v) {
            try {
              fields.push([i, JSON.parse(v)]);
              p.privateVersions[key] = v;
            } catch {}
          }
        }
        const inventoryVersion = p.inventory.meta.epoch + ':' + p.inventory.meta.revision,
          message = { type: 'playerState', time: now() };
        let dirty = false;
        if (fields.length) {
          message.fields = fields;
          dirty = true;
        }
        if (p.inventoryVersion !== inventoryVersion) {
          message.inventory = p.inventory.snapshot();
          p.inventoryVersion = inventoryVersion;
          dirty = true;
        }
        p.componentVersions ??= new Map();
        const changedComponents = {};
        for (const [key, entry] of personal.components(p))
          if (p.componentVersions.get(key) !== entry.version) {
            changedComponents[key] = entry.value;
            p.componentVersions.set(key, entry.version);
          }
        if (Object.keys(changedComponents).length) {
          message.state = changedComponents;
          dirty = true;
        }
        if (dirty) send(p, message);
      } finally {
        p.transport.uncork?.();
      }
    }
    metrics.broadcastMs = performance.now() - start;
    metrics.observe?.('broadcastMs', metrics.broadcastMs);
  }
  function* observersOf(speaker, radius) {
    yield speaker;
    if (speaker.mode === 'hidden') return;
    for (const id of watchers.get(speaker.id) || []) {
      const observer = players.get(id);
      if (
        observer &&
        observer !== speaker &&
        sameMapInstance(speaker, observer) &&
        (observer.x - speaker.x) ** 2 + (observer.z - speaker.z) ** 2 <= radius ** 2
      )
        yield observer;
    }
  }
  return { broadcast, playerIndex, observersOf };
}
