import { isFiniteNumber, isRecord } from '../types/json.ts';
import { readClientMessage } from './client-messages.mts';
import type { CommandMessage, ClientHello } from './client-messages.mts';
import type { PlayerProfile } from '../types/profile.ts';
import type { Appearance } from '../types/content.ts';
import type { ServerGeometry, PlayerTransport, ServerPlayer } from '../types/server.ts';
import type { GameplayStore, NameReservation, StorageEntry } from '../types/storage.ts';

interface GameOptions {
  geometry: ServerGeometry;
  store: GameplayStore;
  now?: () => number;
  random?: () => number;
  maxPlayers?: number;
  allowDebug?: boolean;
  tuning?: Partial<{ [K in keyof typeof SERVER_TUNING]: number }>;
}
import { DEATH_DURATION } from '../capture-animation.ts';
import { clothingSelection, ownedClothing } from '../clothing.ts';
import { createResidentialSearch } from './residential-search.mts';
import { createHash } from 'node:crypto';
import { GAMEPLAY } from '../config/gameplay.ts';
import { HAIRSTYLES } from '../config/hairstyles.ts';
import { normalizeUsername, renameDecision, generateUsername } from './usernames.mts';
import { createSharedWorld } from './shared-world.mts';
import { MP_PROTOCOL, sanitizePrivateState } from '../multiplayer-protocol.ts';
import { createDetentionSite } from '../encounters.ts';
import { createInventoryAccount } from './inventory.mts';
import { hydratePlayerProfile, serializePlayerProfile } from '../player-document.ts';
import { createPvpCombat } from './pvp.mts';
import { skillStatus, hitpointMaximum } from '../progression.ts';
import { strengthStatus } from '../strength.ts';
import { guildStatusFor, guildAction } from './guild.mts';
import { createServerInstances } from './instances.mts';
import { PUBLIC_INSTANCE } from '../map-instances.ts';
import { bankSnapshotFor, bankAction } from './banking.mts';
import { equipmentOwned, railgunUnlocked } from '../item-stats.ts';
import { createServerTablets } from './teleport-tablets.mts';
import { createServerFollowing } from './following.mts';
import { createServerMovement } from './movement.mts';
import { createPlayerState } from './player-state.mts';
import { createServerFinance } from './finance.mts';
import { createDuels } from './duels.mts';
import { createReplication } from './replication.mts';
import { createActionQueue } from './action-queue.mts';
import { createRoutePlanner } from './routes.mts';
import { createPerformanceMetrics } from './performance.mts';
import { SERVER_TUNING } from './tuning.mts';

const clone = <T,>(value: T) => structuredClone(value);
const parse = (
  value: string | undefined,
  fallback: Record<string, unknown> = {},
): Record<string, unknown> => {
  try {
    const parsed: unknown = JSON.parse(value || '{}');
    return isRecord(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};
function appearance(input: unknown = {}) {
  const value = isRecord(input) ? input : {};
  const gender = value.gender === 'woman' ? 'woman' : 'man';
  const result: Appearance & {
    gender: typeof gender;
    back: string;
    neck: string;
    hat: string;
    weapon: string;
  } = {
    back: (
      ['none', 'backpack', 'new-year-rocket', 'cape'] satisfies [string, string, string, string]
    ).includes(String(value.back))
      ? String(value.back)
      : value.cape === true
        ? 'cape'
        : 'none',
    neck: value.neck === 'clock-amulet' ? 'clock-amulet' : 'none',
    gender,
    cape: value.cape === true,
    boots: value.boots === true,
    iceTop: value.iceTop === true,
    icePants: value.icePants === true,
    weapon: (
      ['unarmed', 'bayonet', 'battleaxe', 'railgun', 'akibo'] satisfies [
        string,
        string,
        string,
        string,
        string,
      ]
    ).includes(String(value.weapon))
      ? String(value.weapon)
      : 'unarmed',
    sunglasses: value.sunglasses === true,
    hat: typeof value.hat === 'string' ? value.hat.slice(0, 48) : 'none',
  };
  result.hairstyle = HAIRSTYLES[result.gender].some((s) => s.id === value.hairstyle)
    ? String(value.hairstyle)
    : HAIRSTYLES[result.gender][0].id;
  for (const key of ['skin', 'shirt', 'pants', 'hair', 'shoes'] as const)
    if (typeof value[key] === 'string' && /^#[0-9a-f]{6}$/i.test(value[key]))
      result[key] = value[key];
  return Object.assign(result, clothingSelection(value));
}

/** One authoritative owner for the common world. HTTP/WebSocket and storage
 * adapters are deliberately outside the fixed-step simulation. */
export async function createGame({
  geometry,
  store,
  now = Date.now,
  random = Math.random,
  maxPlayers = 2000,
  allowDebug = false,
  tuning: tuningOverrides = {},
}: GameOptions) {
  const tuning = { ...SERVER_TUNING, ...tuningOverrides };
  const players = new Map<number, ServerPlayer>(),
    profiles = new Map<string, PlayerProfile>(),
    identities = new Map<string, ServerPlayer>(),
    names = new Map<string, string>(),
    nameOwners = new Map<string, NameReservation>(),
    authenticating = new Map<string, Promise<void>>(),
    dirtyProfiles = new Set<string>(),
    revisions = new Map<string, number>(),
    persistedRevisions = new Map<string, number>(),
    cleanupTasks = new Set<Promise<unknown>>();
  for (const row of await store.names()) {
    names.set(row.canonical, row.owner);
    nameOwners.set(row.owner, row);
  }
  const saved = ((await store.get('world')) || {}) as {
    serial?: number;
    shared?: Parameters<typeof createSharedWorld>[0]['saved'];
  };
  let serial = saved.serial || 0,
    tickNumber = 0,
    flushing: Promise<unknown> | null = null,
    closing = false,
    closePromise: Promise<void> | null = null;
  const actionQueue = createActionQueue({
      sliceMs: tuning.actionSliceMs,
      maxBatch: tuning.actionsPerTurn,
    }),
    enqueueMutation = actionQueue.enqueue;
  const metrics = {
    connected: 0,
    frames: 0,
    bytes: 0,
    corrections: 0,
    rejected: 0,
    slowClients: 0,
    coalescedMoves: 0,
    tickMs: 0,
    broadcastMs: 0,
    ...createPerformanceMetrics(),
  };
  const routes = createRoutePlanner({
    pathTo: (...args: Parameters<ServerGeometry['pathTo']>) => geometry.pathTo(...args),
    canTravel: geometry.navigation
      ? (a, b, ignore) => geometry.canTravel!(a.x, a.y, b.x, b.y, ignore)
      : null,
    free: geometry.navigation ? (p) => geometry.landClearAt(p.x, p.y) : null,
    revision: () => geometry.navigationRevision || 0,
    maxEntries: tuning.routeCacheEntries,
    maxPoints: tuning.routeCachePoints,
    ttlMs: tuning.routeCacheTtlMs,
    coreTtlMs: tuning.routeCoreTtlMs,
    replansPerTick: tuning.followReplansPerTick,
    replanMs: tuning.followReplanMs,
  });
  const send = (p: ServerPlayer, message: object | string | ArrayBuffer) => {
    if (!p.transport.open) return;
    if (
      message &&
      isRecord(message) &&
      !(message instanceof ArrayBuffer) &&
      p.profile?.playerState &&
      (message.type === 'welcome' || p.sentStateRevision !== p.profile.stateRevision)
    ) {
      message = { ...message, playerState: p.profile.playerState };
      p.sentStateRevision = p.profile.stateRevision;
    }
    const data =
      typeof message === 'string' || message instanceof ArrayBuffer
        ? message
        : JSON.stringify(message);
    p.transport.send(data);
    p.lastSentAt = now();
    metrics.bytes += typeof data === 'string' ? Buffer.byteLength(data) : data.byteLength;
  };
  const dirty = (p: { owner: string }) => {
    if (p) {
      dirtyProfiles.add(p.owner);
      revisions.set(p.owner, (revisions.get(p.owner) || 0) + 1);
      store.markChanged?.();
    }
  };
  const shared = createSharedWorld({
    onCombatDamage: (p: ServerPlayer, damage: number) => personal.awardCombat(p, damage),
    geometry,
    routes,
    players,
    send,
    dirty,
    random,
    now,
    saved: saved.shared,
    onAirshipReset: (p: ServerPlayer) => {
      following.stop(p);
      movement.clear(p);
      pvp.stop(p);
      p.personalBattle = null;
    },
  });
  const pvp = createPvpCombat({
    onCombatDamage: (p: ServerPlayer, damage: number) => personal.awardCombat(p, damage),
    players,
    now,
    random,
    geometry,
    send,
    dirty,
    onDeath: pvpDeath,
  });
  const instances = createServerInstances({ geometry, shared, pvp, players, send, dirty, now });
  const tablets = createServerTablets({ geometry, shared, pvp, players, send, dirty, now });
  const following = createServerFollowing({ geometry, routes, pvp, players, send, dirty, now });
  const movement = createServerMovement({
    geometry,
    routes,
    players,
    send,
    dirty,
    now,
    following,
    clock: () => shared.clock,
  });
  const residentialSearch = createResidentialSearch({ geometry, now, dirty });
  const personal = createPlayerState({
    geometry,
    routes,
    shared,
    players,
    send,
    dirty,
    now,
    random,
    movement,
    instances,
  });
  const finance = createServerFinance({ geometry, players, send, dirty, now, random }),
    duels = createDuels({ players, send, dirty, now });
  const replication = createReplication({
    players,
    shared,
    personal,
    send,
    publicPlayer,
    now,
    metrics,
  });
  function mergePrivate(p: ServerPlayer, input: unknown) {
    // Checkpoints carry cosmetic preferences only. Progress is never merged.
    const incoming = sanitizePrivateState(input);
    if (incoming['sf-character-v1'])
      p.profile.privateState['sf-character-v1'] = incoming['sf-character-v1'];
    const look = appearance(parse(p.profile.privateState['sf-character-v1'] || '{}'));
    if (
      (['backpack', 'new-year-rocket'] satisfies [string, string]).includes(look.back) &&
      !equipmentOwned(p.inventory.economy.state, look.back)
    )
      look.back = 'none';
    if (look.neck === 'clock-amulet' && !equipmentOwned(p.inventory.economy.state, 'clock-amulet'))
      look.neck = 'none';
    if (look.back === 'cape' && p.profile.playerState.quests.expeditions.cape !== true)
      look.back = 'none';
    look.boots = look.boots && equipmentOwned(p.inventory.economy.state, 'combat-boots');
    look.cape = look.back === 'cape';
    look.rocketBurnUntil =
      look.back === 'new-year-rocket' && (p.profile.decorativeRocketBurnUntil || 0) > now()
        ? p.profile.decorativeRocketBurnUntil
        : 0;
    if (!p.inventory.economy.state.ownedHats.includes(look.hat)) look.hat = 'none';
    if (
      ((['akibo', 'battleaxe'] satisfies [string, string]).includes(look.weapon) &&
        !equipmentOwned(p.inventory.economy.state, look.weapon)) ||
      (look.weapon === 'railgun' &&
        !railgunUnlocked(parse(p.profile.privateState['sf-expeditions-v1']))) ||
      (look.weapon === 'bayonet' &&
        !{ theyLive: p.profile.playerState.quests.theyLive }.theyLive?.bayonet)
    )
      look.weapon = 'unarmed';
    Object.assign(
      look,
      ownedClothing(look, (id) => equipmentOwned(p.inventory.economy.state, id)),
    );
    look.rocketHopAt = look.back === 'new-year-rocket' ? p.profile.decorativeRocketHopAt || 0 : 0;
    look.sunglasses = look.sunglasses && p.profile.playerState.inventory.sunglasses.owned === true;
    look.cape = look.cape && p.profile.playerState.quests.expeditions.cape === true;
    p.profile.privateState['sf-character-v1'] = JSON.stringify(look);
    if (JSON.stringify(look) !== JSON.stringify(p.appearance)) {
      p.appearance = look;
      p.revision++;
    }
    dirty(p);
  }
  function pvpDeath(victim: ServerPlayer, killer: ServerPlayer | null) {
    const dropped = victim.inventory.deathDrops(),
      ids = shared.dropInventory(victim, killer, dropped);
    victim.profile.deathPending = true;
    victim.respawnReadyAt = now() + DEATH_DURATION * 1000;
    victim.revision++;
    shared.leave(victim);
    dirty(victim);
    const inventory = { ...victim.inventory.snapshot(), hp: 0 };
    const task = durable(victim)
      .then(() => {
        send(victim, { type: 'inventory', inventory });
        if (killer) {
          send(victim, { type: 'caught', source: 'pvp' });
          send(killer, { type: 'pvpKill', target: victim.id, name: victim.name, drops: ids });
        }
      })
      .catch((error) => console.error('PvP death persistence:', error.message));
    victim.deathTask = task;
    cleanupTasks.add(task);
    task.finally(() => cleanupTasks.delete(task));
  }
  function privatePosition(p: ServerPlayer) {
    return { x: p.x, z: p.z, y: p.y, angle: p.angle, hp: p.hp };
  }
  function publicPlayer(p: ServerPlayer) {
    return {
      id: p.id,
      name: p.name,
      appearance: p.appearance,
      revision: p.revision,
      level: p.level,
      pvp: pvp.status(p).enabled,
    };
  }
  function profileForSave(p: ServerPlayer) {
    const profile = profiles.get(p.owner)!,
      police = personal.runtime(p).police.state;
    profile.personalJailed = !!p.personalJailed;
    profile.police = { ...police, officers: police.officers.map(({ path, ...n }) => n) };
    profile.position = movement.savePosition(p, instances.savePosition(p));
    Object.assign(profile.playerState.skills.hitpoints, {
      hp: p.hp,
      max: p.max,
      xp: p.hitpointsXP,
    });
    return serializePlayerProfile(profile);
  }
  async function flush() {
    if (flushing) {
      await flushing;
      return;
    }
    const owners = [...dirtyProfiles],
      savedRevisions = new Map(owners.map((owner) => [owner, revisions.get(owner) || 0]));
    for (const owner of owners) dirtyProfiles.delete(owner);
    const entries: StorageEntry[] = [['world', { serial, shared: shared.persist() }]];
    // The RAM adapter detaches the whole batch synchronously before its
    // first await. Avoid cloning every active profile twice per checkpoint.
    for (const owner of owners) {
      const p = identities.get(owner),
        profile = p ? profileForSave(p) : profiles.get(owner);
      if (profile) entries.push(['player:' + owner, store.inMemory ? profile : clone(profile)]);
    }
    flushing = store.batch(entries);
    try {
      await flushing;
      for (const owner of owners)
        persistedRevisions.set(
          owner,
          Math.max(persistedRevisions.get(owner) || 0, savedRevisions.get(owner)!),
        );
    } catch (e) {
      for (const owner of owners) dirtyProfiles.add(owner);
      throw e;
    } finally {
      flushing = null;
    }
  }
  async function durable(p: ServerPlayer) {
    const revision = revisions.get(p.owner) || 0;
    if (store.inMemory) {
      // Gameplay is already authoritative in RAM. Commit this account's
      // detached ledger row without copying every other dirty player or
      // the whole world for each purchase, PvP toggle, death or disconnect.
      // The periodic checkpoint materializes the shared world atomically.
      const profile = identities.get(p.owner) === p ? profileForSave(p) : profiles.get(p.owner);
      if (profile) await store.batch([['player:' + p.owner, profile]]);
      persistedRevisions.set(p.owner, Math.max(persistedRevisions.get(p.owner) || 0, revision));
      if (revisions.get(p.owner) === revision) dirtyProfiles.delete(p.owner);
      return;
    }
    while ((persistedRevisions.get(p.owner) || 0) < revision) await flush();
  }
  async function connect(hello: ClientHello, transport: PlayerTransport) {
    if (closing) throw Error('Server restarting');
    if (
      hello?.protocol !== MP_PROTOCOL ||
      typeof hello.token !== 'string' ||
      !/^[a-f0-9]{64}$/.test(hello.token)
    )
      throw Error('Invalid session credentials or protocol.');
    const owner = createHash('sha256').update(hello.token).digest('hex');
    if (players.size >= maxPlayers && !identities.has(owner))
      throw Error('The world is full. Please try again soon.');
    if (authenticating.has(owner)) await authenticating.get(owner);
    let complete!: () => void;
    authenticating.set(owner, new Promise<void>((resolve) => (complete = resolve)));
    try {
      const stored = profiles.get(owner) || (await store.get('player:' + owner));
      let profile: PlayerProfile | undefined = isRecord(stored)
        ? hydratePlayerProfile(stored)
        : undefined;
      const returningCharacter = !!profile;
      if (!profile) {
        profile = hydratePlayerProfile({
          privateState: {
            ...(sanitizePrivateState(hello.privateState)['sf-character-v1']
              ? { 'sf-character-v1': sanitizePrivateState(hello.privateState)['sf-character-v1'] }
              : {}),
          },
          position: null,
          grapplingHook: false,
          awards: [],
          awardSerial: 0,
        });
        hydratePlayerProfile(profile);
        await store.batch([['player:' + owner, serializePlayerProfile(profile)]]);
      }
      hydratePlayerProfile(profile);
      const previous = identities.get(owner);
      if (previous) {
        duels.remove(previous);
        finance.remove(previous);
        following.stop(previous);
        personal.save(previous);
        Object.assign(profile, profileForSave(previous));
        movement.remove(previous);
        personal.remove(previous);
        shared.leave(previous);
        players.delete(previous.id);
        previous.transport.close(4001, 'This character connected in another tab.');
        if (!store.inMemory) await previous.queue;
      }
      if (players.size >= maxPlayers) throw Error('The world is full. Please try again soon.');
      profiles.set(owner, profile);
      const inventory = createInventoryAccount(profile);
      if (profile.deathPending) {
        const xp = skillStatus(parse(profile.privateState['sf-hitpoints-v1']).xp).xp,
          max = hitpointMaximum(xp),
          h = geometry.hospital || { x: 74.7, y: 89.5 };
        profile.position = {
          x: h.x + 0.5,
          z: h.y + 0.5,
          y: geometry.characterGround(h.x + 0.5, h.y + 0.5),
          hp: max,
        };
        profile.privateState['sf-hitpoints-v1'] = JSON.stringify({ hp: max, max, xp });
        profile.deathPending = false;
      }
      let persisted = nameOwners.get(owner);
      if (!persisted) {
        const generated = generateUsername((canonical) => names.has(canonical));
        // Reserve before yielding so concurrent browser identities
        // cannot receive the same automatic name.
        names.set(generated.canonical, owner);
        try {
          await store.rename(owner, generated.canonical, generated.name, 0);
          persisted = { owner, canonical: generated.canonical, name: generated.name, changed: 0 };
          nameOwners.set(owner, persisted);
        } catch (error) {
          if (names.get(generated.canonical) === owner) names.delete(generated.canonical);
          throw error;
        }
      }
      // Legacy/local adapters can authenticate concurrently while a name
      // reservation yields; capacity must still hold at the final commit.
      if (players.size >= maxPlayers) throw Error('The world is full. Please try again soon.');
      const hpXP = skillStatus(parse(profile.privateState['sf-hitpoints-v1']).xp).xp,
        maxHP = hitpointMaximum(hpXP);
      const id = ++serial,
        spawn = geometry.spawn,
        position = profile.position;
      const fallback = {
        x: spawn.x + 0.5,
        z: spawn.y + 0.5,
        y: geometry.characterGround(spawn.x + 0.5, spawn.y + 0.5),
        angle: Math.PI / 2,
      };
      const cell = geometry.detention,
        safe =
          profile.personalJailed && cell
            ? { x: cell.x, z: cell.z, y: cell.base + 0.18, angle: 0 }
            : position &&
                [position.x, position.z].every(Number.isFinite) &&
                geometry.landClearAt(position.x - 0.5, position.z! - 0.5)
              ? {
                  ...position,
                  z: position.z!,
                  y: geometry.characterGround(position.x, position.z!),
                  angle: isFiniteNumber(position.angle) ? position.angle : fallback.angle,
                }
              : fallback;
      const p: ServerPlayer = {
        owner,
        id,
        profile,
        inventory,
        level: strengthStatus(parse(profile.privateState['sf-strength-v1']).xp).level,
        transport,
        name: persisted.name,
        nameChanged: persisted.changed || 0,
        appearance: appearance(parse(profile.privateState['sf-character-v1'] || '{}')),
        revision: 1,
        ...safe,
        hp: Math.max(1, Math.min(maxHP, position?.hp || maxHP)),
        max: maxHP,
        hitpointsXP: hpXP,
        mode: 'walk',
        phase: 0,
        motion: 0,
        moving: false,
        gesture: '',
        seen: new Map(),
        sharedVersions: new Map(),
        npcVersions: new Map(),
        lastPoseAt: now(),
        shotAt: 0,
        attack: null,
        airship: false,
        deck: null,
        grappling: null,
        queue: Promise.resolve(),
        messages: 0,
        rateAt: now(),
        lastCheckpoint: 0,
        lastSeen: now(),
        instance: PUBLIC_INSTANCE,
      };
      p.personalJailed = profile.personalJailed === true;
      players.set(id, p);
      identities.set(owner, p);
      personal.runtime(p);
      mergePrivate(p, {});
      dirty(p);
      metrics.connected = players.size;
      send(p, {
        type: 'welcome',
        protocol: MP_PROTOCOL,
        id,
        name: p.name,
        returningCharacter,
        autoName: !p.nameChanged,
        renameAt: p.nameChanged ? p.nameChanged + 60_000 : 0,
        privateState: profile.privateState,
        position: privatePosition(p),
        instance: p.instance,
        illuminati: profile.illuminati === true,
        bomber: instances.bomberStatus(p),
        grapplingHook: profile.grapplingHook,
        inventory: inventory.snapshot(),
        bank: bankSnapshotFor(p, now),
        guild: guildStatusFor(p, now),
        pvp: pvp.status(p),
        level: p.level,
        pendingAwards: profile.awards,
        debug: allowDebug,
        time: now(),
        shared: shared.snapshot(p),
      });
      finance.account(p).update();
      finance.publish(p);
      return p;
    } finally {
      authenticating.delete(owner);
      complete();
    }
  }
  function disconnect(p: ServerPlayer) {
    if (closing) return;
    if (players.get(p.id) !== p) return;
    duels.remove(p);
    finance.remove(p);
    following.stop(p);
    personal.save(p);
    Object.assign(p.profile, profileForSave(p));
    movement.remove(p);
    personal.remove(p);
    shared.leave(p);
    players.delete(p.id);
    identities.delete(p.owner);
    metrics.connected = players.size;
    if (closing) return;
    dirty(p);
    // Keep the profile alive until any in-flight loot/purchase receipt and
    // its ledger commit finish, then evict the disconnected session cache.
    const task = p.queue
      .then(async () => {
        await p.deathTask;
        await durable(p);
      })
      .then(() => {
        if (!identities.has(p.owner) && !authenticating.has(p.owner)) {
          profiles.delete(p.owner);
          revisions.delete(p.owner);
          persistedRevisions.delete(p.owner);
        }
      })
      .catch((error) => console.error('Disconnect persistence:', error.message));
    cleanupTasks.add(task);
    task.finally(() => cleanupTasks.delete(task));
  }
  function correction(p: ServerPlayer, reason: string) {
    metrics.corrections++;
    send(p, { type: 'position', ...privatePosition(p), reason });
  }
  function pose(p: ServerPlayer, input: unknown) {
    // Protocol v4 accepts destinations and activity buttons, never poses or HP.
    metrics.rejected++;
    correction(p, 'Submit a movement action, not a player state.');
  }
  function controls(
    p: ServerPlayer,
    input: { talkingTo?: unknown; boost?: unknown; gesture?: unknown } = {},
  ) {
    p.lastSeen = now();
    if (typeof input.talkingTo === 'string')
      p.talkingTo = shared.npcById.has(input.talkingTo) ? input.talkingTo : null;
    if (input.boost !== undefined) movement.state(p).boost = input.boost === true;
    if ((['talk', 'drink'] satisfies [string, string]).includes(String(input.gesture))) {
      p.gesture = String(input.gesture);
      p.gestureUntil = now() + 800;
    }
  }
  async function checkpoint(
    p: ServerPlayer,
    message: { privateState?: unknown; awardsAck?: unknown },
  ) {
    if (now() - p.lastCheckpoint < 1000) return;
    p.lastCheckpoint = now();
    mergePrivate(p, message.privateState);
    const acknowledged = new Set<unknown>(
      Array.isArray(message.awardsAck) ? message.awardsAck.filter(Number.isSafeInteger) : [],
    );
    p.profile.awards = p.profile.awards.filter((a) => !acknowledged.has(a.id));
    dirty(p);
  }
  async function rename(p: ServerPlayer, name: unknown) {
    const normalized = normalizeUsername(name),
      decision = renameDecision({
        name,
        owner: p.owner,
        now: now(),
        lastChanged: p.nameChanged,
        current: p.name,
        takenBy: normalized.ok ? names.get(normalized.canonical) : null,
      });
    if (!normalized.ok || !decision.ok || ('unchanged' in decision && decision.unchanged))
      return { ...decision, autoName: !p.nameChanged };
    // Reserve before yielding; simultaneous requests for the same name
    // cannot both pass. Roll back if the ledger commit fails.
    const old = p.name.toLowerCase();
    names.set(normalized.canonical, p.owner);
    try {
      const changed = now();
      await store.rename(p.owner, normalized.canonical, decision.name, changed);
      if (names.get(old) === p.owner && old !== normalized.canonical) names.delete(old);
      p.name = decision.name;
      p.nameChanged = changed;
      p.revision++;
      nameOwners.set(p.owner, {
        owner: p.owner,
        canonical: normalized.canonical,
        name: p.name,
        changed,
      });
      return { ok: true, name: p.name, autoName: false, retryAt: changed + 60_000 };
    } catch (error) {
      if (normalized.canonical !== old) names.delete(normalized.canonical);
      return { ok: false, message: 'Unable to save that username. Please try again.' };
    }
  }
  async function command(p: ServerPlayer, message: CommandMessage) {
    const { action } = message;
    if (message.args !== undefined && !isRecord(message.args)) {
      send(p, {
        type: 'result',
        request: message.request,
        action,
        ok: false,
        message: 'Invalid action arguments.',
      });
      return;
    }
    const args = message.args || {};
    let result;
    if (
      p.tabletTeleport &&
      !(
        ['stopAttack', 'rename', 'personalTransit', 'teleport'] satisfies [
          string,
          string,
          string,
          string,
        ]
      ).includes(action)
    ) {
      send(p, {
        type: 'result',
        request: message.request,
        action,
        ok: false,
        message: 'Finish your teleport first.',
      });
      return;
    }
    if (
      message.privateState &&
      (
        [
          'buyGrapple',
          'buyBattleaxe',
          'attack',
          'releaseRaptor',
          'pvpAttack',
          'instanceEnter',
        ] satisfies [string, string, string, string, string, string]
      ).includes(action)
    ) {
      mergePrivate(p, message.privateState);
    }
    if (
      (
        [
          'useTablet',
          'instanceEnter',
          'instanceLeave',
          'bomberBoard',
          'bomberReturn',
          'bomberEject',
          'teleport',
          'personalTransit',
          'respawn',
          'airshipBoard',
          'grapple',
          'airshipClimb',
          'attack',
          'pvpAttack',
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
        ]
      ).includes(action)
    )
      following.stop(p);
    if (
      (
        [
          'instanceEnter',
          'instanceLeave',
          'bomberBoard',
          'bomberReturn',
          'bomberEject',
          'teleport',
          'personalTransit',
          'respawn',
          'useTablet',
          'airshipBoard',
          'grapple',
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
        ]
      ).includes(action)
    ) {
      movement.clear(p);
      p.personalBattle = null;
    }
    if ((['attack', 'pvpAttack'] satisfies [string, string]).includes(action)) {
      movement.wake(p);
      movement.leaveTraining(p);
      movement.stop(p);
      p.personalBattle = null;
    }
    if (
      action === 'playerAction' &&
      (
        ['train', 'fish', 'attackPersonal', 'attackKraken', 'stealMonkey'] satisfies [
          string,
          string,
          string,
          string,
          string,
        ]
      ).includes(String(args.verb))
    ) {
      following.stop(p);
      if (args.verb !== 'train') movement.leaveTraining(p);
      movement.wake(p);
      movement.stop(p);
    }
    if (action === 'moveTo') {
      // Walking is an explicit disengagement, including when the new
      // destination is blocked. Do not depend on a second client packet
      // to stop shared monsters, private encounters or PvP combat.
      p.attack = null;
      p.personalBattle = null;
      pvp.stop(p);
      personal.runtime(p).expeditions.stop();
      result = movement.move(p, args);
    } else if (action === 'equipAppearance') {
      mergePrivate(p, { 'sf-character-v1': JSON.stringify(args.look || {}) });
      result = { ok: true, appearance: p.appearance };
    } else if (action === 'searchHouse') {
      result = residentialSearch.search(p, args.id);
      if (result.ok) {
        movement.stop(p);
        await durable(p);
      }
    } else if (action === 'lightDecorativeRocket') {
      result = residentialSearch.light(p);
      if (result.ok) await durable(p);
    } else if (action === 'rocketHop') {
      result = residentialSearch.hop(p);
      if (result.ok) await durable(p);
    } else if (action === 'stopMoving') {
      movement.stop(p);
      result = { ok: true };
    } else if (
      (['growthBuy', 'growthList', 'growthSell'] satisfies [string, string, string]).includes(
        action,
      )
    ) {
      result = finance.command(p, action, args);
      if (result.ok) await durable(p);
    } else if (
      (['duelOffer', 'duelAccept', 'duelDecline'] satisfies [string, string, string]).includes(
        action,
      )
    ) {
      result = duels.command(p, action, args);
      if (result.participants) {
        const participants = result.participants;
        await Promise.all(participants.map(durable));
        for (const person of participants)
          send(person, {
            type: 'duelSettled',
            ...result.settlement,
            inventory: person.inventory.snapshot(),
          });
        Reflect.deleteProperty(result, 'participants');
      }
    } else if (action === 'activity') {
      result = movement.activity(p, args);
      if (result.ok && args.mode === 'sit') {
        pvp.stop(p);
        p.attack = null;
        p.personalBattle = null;
        personal.runtime(p).battle = null;
        personal.runtime(p).fishing.cancel();
        personal.runtime(p).expeditions.stop();
      }
    } else if (action === 'travel') {
      result = movement.travel(p, args);
      if (result.ok && 'inventory' in result && result.inventory) await durable(p);
    } else if (action === 'barrelRoll') {
      const s = movement.state(p);
      if (p.bomberActive && !s.bomber.state.active) s.bomber.board(movement.position(p));
      result = movement.barrelRoll(p);
    } else if (action === 'playerAction') result = personal.action(p, args);
    else if (
      (
        ['airshipStatus', 'airshipRecall', 'airshipBoard'] satisfies [string, string, string]
      ).includes(action)
    ) {
      if (action !== 'airshipStatus' && message.inventoryEpoch !== p.inventory.meta.epoch)
        result = {
          ok: false,
          message: 'Your inventory changed. Please try again.',
          inventory: p.inventory.snapshot(),
        };
      else {
        result = shared.command(p, action, args);
        if (result.ok && action !== 'airshipStatus') {
          dirty(p);
          await durable(p);
        }
      }
    } else if (action === 'followPlayer') {
      movement.wake(p);
      movement.leaveTraining(p);
      movement.stop(p);
      p.training = false;
      p.personalBattle = null;
      result = following.start(p, args.id, { attack: args.attack === true });
    } else if (action === 'stopFollowing') {
      following.stop(p);
      result = { ok: true };
    } else if (action === 'buyTablet' || action === 'useTablet') {
      if (message.inventoryEpoch !== p.inventory.meta.epoch)
        result = {
          ok: false,
          message: 'Your inventory changed. Please try again.',
          inventory: p.inventory.snapshot(),
        };
      else {
        result = tablets.command(p, action, args);
        if (result.ok) await durable(p);
      }
    } else if (action === 'buyBattleaxe') {
      const npc = geometry.merchants?.find((n) => n.id === 'industrial-armorer');
      if (message.inventoryEpoch !== p.inventory.meta.epoch)
        result = { ok: false, message: 'Your inventory changed. Try again.' };
      else if (
        !p.hp ||
        p.personalJailed ||
        p.bomberActive ||
        instances.kind(p) !== 'world' ||
        !npc ||
        Math.hypot(p.x - npc.x, p.z - npc.z) > 2.6 ||
        !{ theyLive: p.profile.playerState.quests.theyLive }.theyLive?.completed
      )
        result = {
          ok: false,
          message: 'That equipment is not available for purchase.',
        };
      else {
        result = p.inventory.economy.buyEquipment('battleaxe');
        if (result.ok) {
          p.inventory.save();
          dirty(p);
          await durable(p);
        }
        Object.assign(result, { inventory: p.inventory.snapshot() });
      }
    } else if (
      (
        ['bankStatus', 'bankDeposit', 'bankWithdraw', 'bankCoffee', 'bankCoffeeDrink'] satisfies [
          string,
          string,
          string,
          string,
          string,
        ]
      ).includes(action)
    ) {
      if (action !== 'bankStatus' && message.inventoryEpoch !== p.inventory.meta.epoch)
        result = {
          ok: false,
          message: 'Your inventory changed. Please try again.',
          inventory: p.inventory.snapshot(),
        };
      else {
        result = bankAction(p, action, args, { geometry, now, dirty });
        if (result.ok && action !== 'bankStatus') await durable(p);
      }
    } else if (
      (
        [
          'joinIlluminati',
          'instanceEnter',
          'instanceLeave',
          'bomberBoard',
          'bomberReturn',
          'bomberEject',
          'bomberBomb',
        ] satisfies [string, string, string, string, string, string, string]
      ).includes(action)
    ) {
      result = instances.command(p, action, args);
      if (result.ok) {
        dirty(p);
        await durable(p);
      }
    } else if (action === 'inventory') {
      if (message.inventoryEpoch !== p.inventory.meta.epoch)
        result = {
          ok: false,
          message: 'Your inventory changed. Please try again.',
          inventory: p.inventory.snapshot(),
        };
      else {
        result = personal.inventory(p, args.op, args);
        if (result.ok) {
          dirty(p);
          await durable(p);
        }
      }
    } else if (action === 'guildCheckIn' || action === 'guildDonate') {
      if (action === 'guildDonate' && message.inventoryEpoch !== p.inventory.meta.epoch)
        result = {
          ok: false,
          message: 'Your inventory changed. Please try again.',
          inventory: p.inventory.snapshot(),
        };
      else {
        result = guildAction(p, action, { geometry, now, dirty });
        if (result.ok) {
          dirty(p);
          await durable(p);
        }
      }
    } else if (action === 'pvp') {
      result = pvp.setMode(p, args.enabled);
      if (result.ok) {
        await durable(p);
        result.pvp = pvp.status(p);
      }
    } else if (action === 'pvpAttack') result = pvp.attack(p, args.id);
    else if (action === 'rename') result = await rename(p, args.name);
    else if (action === 'buyGrapple') {
      if (p.profile.grapplingHook)
        result = { ok: false, message: 'You already own a grappling hook.' };
      else if (Math.hypot(p.x - AIRSHIP_SHOP.x, p.z - AIRSHIP_SHOP.z) > 7)
        result = { ok: false, message: 'Visit the airship outfitter at the private jet terminal.' };
      else {
        const purse = p.inventory.economy.state;
        if (!Number.isSafeInteger(purse.coins) || purse.coins < 5)
          result = { ok: false, message: 'A grappling hook costs 5 coins.' };
        else {
          purse.coins -= 5;
          p.inventory.save();
          p.profile.grapplingHook = true;
          dirty(p);
          await durable(p);
          result = {
            ok: true,
            grapplingHook: true,
            purse,
            inventory: p.inventory.snapshot(),
            message: 'You buy a grappling hook. Use it within six tiles beneath the airship.',
          };
        }
      }
    } else if (action === 'teleport') {
      if (!allowDebug)
        result = { ok: false, message: 'Debug teleporting is disabled on this server.' };
      else if (
        !isFiniteNumber(args.x) ||
        !isFiniteNumber(args.z) ||
        !geometry.landClearAt(args.x - 0.5, args.z - 0.5)
      )
        result = { ok: false, message: 'That point is blocked.' };
      else {
        p.tabletTeleport = null;
        if (instances.kind(p) !== 'world' || p.bomberActive) instances.reset(p);
        shared.leave(p);
        Object.assign(p, {
          x: args.x,
          z: args.z,
          y: geometry.characterGround(args.x, args.z),
          mode: 'walk',
          lastPoseAt: now(),
        });
        correction(p, 'teleport');
        result = { ok: true };
      }
    } else if (action === 'personalTransit') {
      if (args.kind === 'jail') {
        p.tabletTeleport = null;
        if (instances.kind(p) !== 'world' || p.bomberActive) instances.reset(p);
        if (!personal.runtime(p).police.state.jailed) {
          result = { ok: false, message: 'Detention is controlled by the server.' };
          send(p, { type: 'result', request: message.request, action, ...result });
          return;
        }
        const cell = createDetentionSite(1.5);
        shared.leave(p);
        Object.assign(p, {
          x: cell.x,
          z: cell.z,
          y: cell.base + 0.18,
          mode: 'walk',
          personalJailed: true,
          lastPoseAt: now(),
        });
        correction(p, 'jail');
        result = { ok: true };
      } else if (args.kind === 'rehabilitation' && p.personalJailed) {
        result = personal.action(p, { verb: 'rehabilitate' });
      } else result = { ok: false, message: 'That personal journey is unavailable.' };
    } else if (action === 'respawn') {
      if (p.hp <= 0 && !p.profile.deathPending) pvpDeath(p, null);
      if (!p.respawnAllowed && p.hp > 0) result = { ok: false, message: 'No respawn is pending.' };
      else if (now() < (p.respawnReadyAt || 0))
        result = { ok: false, message: 'Wait for the collapse to finish.' };
      else {
        const entry = geometry.hospital || { x: 74.7, y: 89.5 };
        if (instances.kind(p) !== 'world' || p.bomberActive) instances.reset(p);
        shared.leave(p);
        personal.runtime(p).battles.clear();
        personal.runtime(p).battle = null;
        p.personalBattle = null;
        p.profile.deathPending = false;
        p.pvpDying = false;
        p.pvpProtectedUntil = now() + 5000;
        pvp.stop(p);
        Object.assign(p, {
          x: entry.x + 0.5,
          z: entry.y + 0.5,
          y: geometry.characterGround(entry.x + 0.5, entry.y + 0.5),
          hp: p.max,
          respawnAllowed: false,
          damagePending: false,
          mode: 'walk',
          lastPoseAt: now(),
        });
        correction(p, 'respawn');
        result = { ok: true };
      }
    } else {
      if (action === 'stopAttack') {
        pvp.stop(p);
        p.personalBattle = null;
        personal.runtime(p).expeditions.stop();
      } else if (action === 'attack') pvp.stop(p);
      result =
        action === 'releaseRaptor'
          ? personal.action(p, { verb: 'startRaptor' })
          : shared.command(p, action, args);
      if (action === 'petBear' && result.ok) {
        following.stop(p);
        movement.wake(p);
        movement.stop(p);
        pvp.stop(p);
        p.personalBattle = null;
      }
      if ('award' in result && isRecord(result.award) && typeof result.award.kind === 'string') {
        personal.collect(p, { ...result.award, kind: result.award.kind });
        const award = {
          id: ++p.profile.awardSerial,
          ...result.award,
          inventory: p.inventory.snapshot(),
        };
        p.profile.awards.push(award);
        dirty(p);
        await durable(p);
        result = { ...result, award };
      } else if (
        result.ok &&
        (['releaseRaptor', 'releaseTiger'] satisfies [string, string]).includes(action)
      ) {
        dirty(p);
        await durable(p);
      }
    }
    // Movement changes the pose frame and active-service fields already have
    // their own sampling. A new destination must not invalidate idle UI DTOs.
    if (result?.ok && action !== 'moveTo')
      p.presentationRevision = (p.presentationRevision || 0) + 1;
    send(p, { type: 'result', request: message.request, action, ...result });
  }
  function receive(p: ServerPlayer, input: unknown) {
    const message = readClientMessage(input);
    if (closing || players.get(p.id) !== p || !message || typeof message !== 'object') return;
    if (message.type !== 'command' || message.action !== 'moveTo') p.pendingMove = null;
    if (now() - p.rateAt >= 1000) {
      p.rateAt = now();
      p.messages = 0;
    }
    if (++p.messages > 80) {
      p.transport.close(4008, 'Too many messages');
      return;
    }
    if (message.type === 'pose') {
      if (store.inMemory)
        p.queue = enqueueMutation(() => {
          if (players.get(p.id) === p) pose(p, message.pose);
        });
      else pose(p, message.pose);
      return;
    }
    if (message.type === 'controls') {
      if (store.inMemory)
        p.queue = enqueueMutation(() => {
          if (players.get(p.id) === p) controls(p, message);
        });
      else controls(p, message);
      return;
    }
    if (message.type === 'ping') {
      send(p, { type: 'pong', clientTime: message.time, time: now() });
      return;
    }
    if (message.type === 'say') {
      const say = () => {
        if (players.get(p.id) !== p || now() - (p.spokeAt || 0) < 700) return;
        p.spokeAt = now();
        if (!(['yo', 'ok', 'no'] satisfies [string, string, string]).includes(String(message.text)))
          return;
        const speech = JSON.stringify({ type: 'say', id: p.id, text: message.text });
        for (const other of replication.observersOf(p, 25)) send(other, speech);
      };
      if (store.inMemory) p.queue = enqueueMutation(say);
      else say();
      return;
    }
    if ((p.pendingActions || 0) >= tuning.maxPendingActionsPerPlayer) {
      p.transport.close(4008, 'Too many pending actions');
      return;
    }
    const move =
      message.type === 'command' && message.action === 'moveTo' ? { superseded: false } : null;
    if (move && p.pendingMove) {
      p.pendingMove.superseded = true;
      metrics.coalescedMoves++;
    }
    p.pendingMove = move;
    p.pendingActions = (p.pendingActions || 0) + 1;
    const run = async () => {
      const started = performance.now();
      try {
        if (players.get(p.id) !== p) return;
        if (move?.superseded) {
          send(p, {
            type: 'result',
            request: message.request,
            action: 'moveTo',
            ok: true,
            superseded: true,
          });
          return;
        }
        if (p.pendingMove === move) p.pendingMove = null;
        return await (message.type === 'checkpoint'
          ? checkpoint(p, message)
          : message.type === 'command'
            ? command(p, message)
            : undefined);
      } finally {
        p.pendingActions = (p.pendingActions || 1) - 1;
        metrics.observe('actionMs', performance.now() - started);
      }
    };
    p.queue = (store.inMemory ? enqueueMutation(run) : p.queue.then(run)).catch((error) => {
      console.error('Player command:', error.message);
      send(p, {
        type: 'result',
        request: message.request,
        ok: false,
        message: 'Unable to complete this action. Try again.',
      });
    });
  }
  function tick(dt = 1 / GAMEPLAY.simulationHz) {
    if (closing || store.status === 'completed') return;
    const start = performance.now();
    let mark = start;
    const measured = (name: string) => {
      const current = performance.now();
      metrics.observe(name, current - mark);
      mark = current;
    };
    store.markChanged?.();
    tickNumber++;
    routes.beginTick();
    following.tick(dt);
    movement.tick(dt);
    measured('movementMs');
    for (const p of players.values())
      if (p.talkingTo) {
        const npc = shared.npcById.get(p.talkingTo);
        if (npc && p.hp > 0 && !p.moving && Math.hypot(npc.x - p.x, npc.z - p.z) < 3.5)
          npc.hold = 0.4;
      }
    shared.tick(dt);
    measured('sharedMs');
    finance.tick();
    duels.tick();
    instances.tick();
    tablets.tick();
    pvp.tick();
    measured('systemsMs');
    personal.tick(dt);
    measured('personalMs');
    const time = now();
    for (const p of players.values()) {
      residentialSearch.expire(p);
      if (p.hp === 0 && !p.profile.deathPending) {
        p.training = false;
        pvpDeath(p, null);
      }
      if (p.gestureUntil && time > p.gestureUntil) {
        p.gesture = '';
        p.gestureUntil = 0;
      }
    }
    metrics.tickMs = performance.now() - start;
    metrics.observe('tickMs', metrics.tickMs);
  }
  function broadcast() {
    replication.broadcast(tickNumber);
  }
  function close() {
    if (!closePromise) {
      closing = true;
      closePromise = (async () => {
        await actionQueue.drain();
        await Promise.all([...authenticating.values()]);
        await Promise.all([...players.values()].map((p) => p.queue));
        await Promise.all([...cleanupTasks]);
        for (const p of players.values()) {
          personal.save(p);
          Object.assign(p.profile, profileForSave(p));
          dirty(p);
        }
        await flush();
      })();
    }
    return closePromise;
  }
  function prepareCheckpoint<T>(capture: () => T) {
    const prepare = async () => {
      const start = performance.now();
      // A disconnect may still be committing its RAM ledger. Always
      // materialize a fresh world/profile view after that commit.
      while (flushing) await flushing;
      for (const p of players.values()) personal.save(p);
      await flush();
      const result = capture();
      metrics.observe('checkpointPrepareMs', performance.now() - start);
      return result;
    };
    return store.inMemory ? enqueueMutation(prepare) : prepare();
  }
  return {
    connect: store.inMemory
      ? (hello: ClientHello, transport: PlayerTransport) =>
          enqueueMutation(() => connect(hello, transport))
      : connect,
    disconnect: store.inMemory
      ? (p: ServerPlayer) => (closing ? undefined : enqueueMutation(() => disconnect(p)))
      : disconnect,
    receive,
    tick,
    broadcast,
    flush,
    prepareCheckpoint,
    players,
    shared,
    finance,
    duels,
    pvp,
    following,
    movement,
    personal,
    metrics,
    routes,
    actionQueue,
    store,
    get serial() {
      return serial;
    },
    get status() {
      return store.status || 'active';
    },
    close,
    async complete() {
      await close();
      if (!store.complete) throw new Error('Completion requires the RAM checkpoint store.');
      store.complete();
    },
  };
}

const AIRSHIP_SHOP = { x: 92.2, z: 123.4 };
