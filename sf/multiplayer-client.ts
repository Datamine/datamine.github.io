import { isFiniteNumber } from './types/json.ts';
import type {
  PoseCoordinates,
  ServerEvent,
  MultiplayerState,
  Peer,
  CommandResult,
} from './types/network.ts';
import type { PendingAward } from './types/content.ts';
export interface ConnectionSocketEvents {
  open: Event;
  message: { data: string | ArrayBuffer | ArrayBufferView };
  error: Event;
  close: { code: number };
}
export interface ConnectionSocket {
  readyState: number;
  bufferedAmount: number;
  binaryType: string;
  send: (value: string) => void;
  close: (code?: number, reason?: string) => void;
  addEventListener: <K extends keyof ConnectionSocketEvents>(
    name: K,
    callback: (event: ConnectionSocketEvents[K]) => void,
  ) => void;
}
export type ConnectionSocketConstructor = new (url: string) => ConnectionSocket;
type EventInput<T> = T extends unknown ? Omit<T, 'sampleTime'> & { sampleTime?: number } : never;
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import {
  MP_PROTOCOL,
  MP_PRIVATE_KEYS,
  MP_INTERPOLATION_MS,
  decodePlayerFrame,
} from './multiplayer-protocol.ts';
import type { WorldMaps } from './world-deltas.ts';
import { applyWorldPatches, WORLD_KINDS, worldCollection } from './world-deltas.ts';

export function readMultiplayerPreferences(storage: Pick<Storage, 'getItem'> = localStorage) {
  const value = storage.getItem('sf-character-v1');
  return typeof value === 'string' ? { 'sf-character-v1': value } : {};
}
export function multiplayerEndpoint(value: string | URL | null | undefined, base = location.href) {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    if (url.protocol === 'http:') url.protocol = 'ws:';
    if (url.protocol === 'https:') url.protocol = 'wss:';
    if (
      !(['ws:', 'wss:'] satisfies [string, string]).includes(url.protocol) ||
      url.username ||
      url.password ||
      url.hash
    )
      return null;
    if (new URL(base).protocol === 'https:' && url.protocol !== 'wss:') return null;
    return url.href;
  } catch {
    return null;
  }
}
export function interpolateNetworkPose<T extends PoseCoordinates>(a: T | null, b: T, t: number): T;
export function interpolateNetworkPose<T extends PoseCoordinates>(a: T, b: T | null, t: number): T;
export function interpolateNetworkPose(
  a: PoseCoordinates | null,
  b: PoseCoordinates | null,
  t: number,
) {
  if (!a) return { ...b };
  if (!b) return { ...a };
  t = Math.max(0, Math.min(1, t));
  if (Math.hypot(b.x - a.x, b.z - a.z) > 12 || a.mode === 'hidden' || b.mode === 'hidden')
    return { ...b };
  const result = { ...b };
  for (const key of ['x', 'y', 'z', 'motion'] as const)
    result[key] = a[key] + (b[key] - a[key]) * t;
  result.angle = a.angle + Math.atan2(Math.sin(b.angle - a.angle), Math.cos(b.angle - a.angle)) * t;
  // Gait distance, roll progress and vehicle banking are different clocks.
  // Never interpolate a fresh roll from the previous walking stride count.
  result.phase = a.mode === b.mode ? a.phase + (b.phase - a.phase) * t : b.phase;
  if (a.mode === b.mode && (['ski', 'surf'] satisfies [string, string]).includes(b.mode))
    result.phase =
      a.phase + Math.atan2(Math.sin(b.phase - a.phase), Math.cos(b.phase - a.phase)) * t;
  if (a.mode !== b.mode && b.mode === 'roll') result.phase = b.phase * t;
  if (a.mode === 'roll' && b.mode === 'walk' && t < 1) {
    result.mode = 'roll';
    result.phase = a.phase + (Math.PI * 2 - a.phase) * t;
  }
  return result;
}

/** Native browser WebSocket, bounded interpolation history and reconnects.
 * The render loop never waits for network or storage. */
export function createMultiplayerClient({
  endpoint,
  storage = localStorage,
  WebSocketClass = WebSocket,
  now = () => performance.now(),
  onStatus = () => {},
}: {
  endpoint: string | null;
  storage?: Pick<Storage, 'getItem' | 'setItem'> & Partial<Pick<Storage, 'removeItem'>>;
  WebSocketClass?: ConnectionSocketConstructor;
  now?: () => number;
  onStatus?: (state: MultiplayerState) => void;
}) {
  let token = storage.getItem('sf-mp-identity');
  if (!/^[a-f0-9]{64}$/.test(token || '')) {
    token = [...crypto.getRandomValues(new Uint8Array(32))]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('');
    storage.setItem('sf-mp-identity', token);
  }
  let worldMaps: WorldMaps = {},
    lastControls = '',
    lastPreferences: string | null = '',
    presentationOffset: number | null = null;
  const selfSamples: { time: number; pose: PoseCoordinates }[] = [],
    peers = new Map<number, Peer>(),
    listeners = new Set<(message: ServerEvent) => void>(),
    requests = new Map<
      number,
      { resolve: (result: CommandResult) => void; timeout: ReturnType<typeof setTimeout> }
    >(),
    appliedAwards = new Set<string | number>(),
    pendingAcks = new Set<string | number>();
  let socket: ConnectionSocket | null = null,
    reconnect: ReturnType<typeof setTimeout> | undefined = undefined,
    stopped = false,
    serial = 0,
    failures = 0,
    lastCheckpoint = 0,
    firstResolve!: (message: object | null) => void,
    lastReceivedAt = now();
  const state: MultiplayerState = {
    following: null,
    connected: false,
    configured: !!endpoint,
    id: null,
    name: contentText('multiplayer-client.createMultiplayerClient.name-1', {}),
    renameAt: 0,
    grapplingHook: false,
    population: 0,
    world: null,
    self: null,
    debug: false,
    status: endpoint ? 'Connecting…' : 'Server not configured',
    latency: 0,
  };
  const first = new Promise<object | null>((resolve) => (firstResolve = resolve)),
    settleTimer = endpoint ? setTimeout(() => firstResolve(null), 5000) : null;
  function status(text: string) {
    state.status = text;
    onStatus(state);
    emit({ type: 'connection', connected: state.connected, status: text });
  }
  function emit(message: EventInput<ServerEvent>) {
    for (const listener of listeners)
      listener({ ...message, sampleTime: message.sampleTime ?? now() } as ServerEvent);
  }
  function acceptInventory(
    inventory: import('./types/network.ts').InventorySnapshot | undefined,
    notify = true,
  ) {
    if (!inventory || !Number.isInteger(inventory.epoch) || !Number.isInteger(inventory.revision))
      return false;
    const previous = state.inventory;
    if (
      previous &&
      (inventory.epoch < previous.epoch ||
        (inventory.epoch === previous.epoch && inventory.revision < previous.revision))
    )
      return false;
    state.inventory = inventory;
    storage.setItem('sf-purse-v1', JSON.stringify(inventory.purse));
    storage.setItem(
      'sf-deli-v1',
      JSON.stringify({ sandwiches: inventory.sandwiches, pending: inventory.deliveryPending }),
    );
    if (notify) emit({ type: 'inventory', inventory });
    return true;
  }
  function send(message: object) {
    if (socket?.readyState !== 1 || socket.bufferedAmount > 65536) return false;
    socket.send(JSON.stringify(message));
    return true;
  }
  function checkpoint(force = false) {
    if (!state.connected || (!force && now() - lastCheckpoint < 3000)) return;
    lastCheckpoint = now();
    const value = storage.getItem('sf-character-v1'),
      changed = value !== lastPreferences;
    if (changed || pendingAcks.size) {
      if (
        send({
          type: 'checkpoint',
          privateState: changed && value ? { 'sf-character-v1': value } : {},
          awardsAck: [...pendingAcks],
        })
      ) {
        lastPreferences = value;
        pendingAcks.clear();
      }
    }
  }
  function connect() {
    if (stopped) return;
    status(failures ? 'Reconnecting…' : 'Connecting…');
    try {
      socket = new WebSocketClass(endpoint!);
      socket.binaryType = 'arraybuffer';
    } catch {
      schedule();
      return;
    }
    const attempt = socket;
    lastReceivedAt = now();
    attempt.addEventListener('open', () => {
      if (socket === attempt)
        send({
          type: 'hello',
          protocol: MP_PROTOCOL,
          token,
          privateState: readMultiplayerPreferences(storage),
        });
    });
    attempt.addEventListener('message', (event) => {
      if (socket !== attempt || stopped) return;
      lastReceivedAt = now();
      if (typeof event.data !== 'string') {
        const frame = decodePlayerFrame(event.data);
        if (!frame) return;
        const time = now();
        for (const pose of frame.players) {
          if (pose.id === state.id) {
            selfSamples.push({ time, pose });
            if (selfSamples.length > 6) selfSamples.shift();
            state.position = pose;
            if (state.hp !== pose.hp || state.max !== pose.max) {
              state.hp = pose.hp;
              state.max = pose.max;
              emit({ type: 'hitpoints', hp: pose.hp, max: pose.max });
            }
            continue;
          }
          const peer = peers.get(pose.id);
          if (!peer) continue;
          peer.hp = pose.hp;
          peer.level = pose.level;
          peer.pvp = pose.pvp;
          peer.samples.push({ time, pose });
          if (peer.samples.length > 6) peer.samples.shift();
        }
        return;
      }
      let message: ServerEvent;
      try {
        message = JSON.parse(event.data) as ServerEvent;
      } catch {
        return;
      }
      // Map server sample times onto one stable local render clock. Packet
      // arrival jitter must not change an NPC's apparent walking speed.
      if (message.type === 'welcome') presentationOffset = now() - message.time;
      message.sampleTime =
        isFiniteNumber(message.time) && isFiniteNumber(presentationOffset)
          ? message.time + presentationOffset
          : now();
      if (message.type === 'finance') state.finance = message.position;
      if (message.playerState) state.playerState = message.playerState;
      if (message.pvp) state.pvp = message.pvp;
      if (message.guild) state.guild = message.guild;
      if (message.illuminati !== undefined) state.illuminati = message.illuminati;
      if (message.bomber) state.bomber = message.bomber;
      if (message.bank) state.bank = message.bank;
      if (message.type === 'airshipReset') {
        state.world = { ...state.world, airship: message.airship };
        if (message.position) {
          state.following = null;
          state.pvpTarget = null;
          selfSamples.length = 0;
          state.self = null;
          state.position = message.position;
        }
      }
      if (message.type === 'following') {
        state.following = message.target;
        selfSamples.length = 0;
        if (message.target !== null && message.position)
          selfSamples.push({ time: now(), pose: message.position });
      }
      if (message.type === 'instance') {
        worldMaps = {};
        selfSamples.length = 0;
        state.instance = message.instance;
        state.position = message.position;
        peers.clear();
        if (state.personal) {
          const { ship, kraken, loot, ...personal } = state.personal;
          state.personal = personal;
        }
        state.world = {
          clock: 0,
          cows: [],
          raptor: null,
          tiger: null,
          airship: null,
          loot: [],
          npcs: [],
        };
      }
      if (message.playerState) state.playerState = message.playerState;
      if (message.type !== 'welcome')
        acceptInventory(message.inventory || message.award?.inventory);
      if (message.type === 'pvpHit') {
        const peer = peers.get(message.target);
        if (peer) peer.hp = message.hp;
      }
      if (message.type === 'welcome') {
        state.following = null;
        selfSamples.length = 0;
        state.connected = true;
        state.id = message.id;
        state.name = message.name;
        state.returningCharacter = message.returningCharacter === true;
        state.autoName = message.autoName === true;
        state.renameAt = message.renameAt;
        state.serverOffset = message.time - Date.now();
        state.grapplingHook = message.grapplingHook;
        state.debug = message.debug;
        state.world = message.shared;
        state.position = message.position;
        state.pendingAwards = message.pendingAwards;
        state.self = null;
        failures = 0;
        for (const key of MP_PRIVATE_KEYS) {
          if (typeof message.privateState?.[key] === 'string')
            storage.setItem(key, message.privateState[key]);
          else storage.removeItem?.(key);
        }
        state.privateState = message.privateState || {};
        lastControls = '';
        worldMaps = {};
        state.worldSampleAt = message.sampleTime;
        for (const kind of WORLD_KINDS)
          for (const record of message.shared?.[kind] || [])
            worldCollection(worldMaps, kind).set(record.id, record);
        for (const award of message.pendingAwards || [])
          if (appliedAwards.has(award.id)) pendingAcks.add(award.id);
        state.instance = message.instance || { id: 'world', kind: 'world', layer: 0 };
        state.level = message.level || 1;
        acceptInventory(message.inventory, false);
        clearTimeout(settleTimer ?? undefined);
        firstResolve(message);
        status('Online · ' + message.name);
        if (state.reloadOnWelcome) {
          location.reload();
          return;
        }
        emit(message);
      } else if (message.type === 'interest') {
        for (const id of message.remove) peers.delete(id);
        for (const p of message.enter) {
          const old = peers.get(p.id);
          peers.set(p.id, { ...old, ...p, samples: old?.samples || [] });
        }
      } else if (message.type === 'world') {
        const collections = applyWorldPatches(worldMaps, message.patches, message.removed);
        state.world = { ...state.world, ...message.state, ...collections };
        state.worldSampleAt = message.sampleTime;
        state.population = message.state.population ?? state.population ?? 0;
        state.self = message.self || null;
        status('Online · ' + state.population + ' player' + (state.population === 1 ? '' : 's'));
        emit({ ...message, state: state.world });
      } else if (message.type === 'playerState') {
        const fields: Record<string, unknown> = {};
        for (const [id, value] of message.fields || []) {
          const key = MP_PRIVATE_KEYS[id];
          if (!key) continue;
          fields[key] = value;
          storage.setItem(key, JSON.stringify(value));
          state.privateState ??= {};
          state.privateState[key] = JSON.stringify(value);
        }
        if (message.state) state.personal = { ...state.personal, ...message.state };
        state.personalSampleAt = message.sampleTime;
        emit({ ...message, state: state.personal, privateState: fields });
      } else if (message.type === 'result') {
        if (message.ok && message.action === 'rename') {
          if (message.name !== undefined) state.name = message.name;
          state.autoName = message.autoName === true;
          state.renameAt = message.retryAt || 0;
          onStatus(state);
        }
        if (message.grapplingHook) state.grapplingHook = true;
        const request = requests.get(message.request);
        if (request) {
          clearTimeout(request.timeout);
          requests.delete(message.request);
          request.resolve(message);
        }
        emit(message);
      } else if (message.type === 'pong') {
        state.latency = Math.max(0, now() - message.clientTime);
      } else emit(message);
    });
    attempt.addEventListener('error', () => {});
    attempt.addEventListener('close', (event) => {
      if (socket !== attempt) return;
      socket = null;
      disconnected(event.code);
    });
  }
  function disconnected(code?: number) {
    state.following = null;
    selfSamples.length = 0;
    state.connected = false;
    peers.clear();
    state.self = null;
    for (const request of requests.values()) {
      clearTimeout(request.timeout);
      request.resolve({
        ok: false,
        message: 'Connection lost. Please try again once reconnected.',
      });
    }
    requests.clear();
    if (code === 4001) {
      stopped = true;
      status('Character open in another tab');
      return;
    }
    schedule();
  }
  function schedule() {
    if (stopped) return;
    state.connected = false;
    status('Reconnecting…');
    const delay = Math.min(15000, 750 * 2 ** Math.min(failures++, 5)) + Math.random() * 250;
    clearTimeout(reconnect ?? undefined);
    reconnect = setTimeout(connect, delay);
  }
  function command(action: string, args: object = {}): Promise<CommandResult> {
    if (!state.connected)
      return Promise.resolve({ ok: false, message: 'Connect to the common world first.' });
    if (
      (['attack', 'pvpAttack', 'playerAction'] satisfies [string, string, string]).includes(action)
    )
      checkpoint(true);
    const request = ++serial;
    return new Promise<CommandResult>((resolve) => {
      const timeout = setTimeout(() => {
        requests.delete(request);
        resolve({ ok: false, message: 'The server did not respond. Reconnect before retrying.' });
      }, 8000);
      requests.set(request, { resolve, timeout });
      if (
        !send({ type: 'command', action, args, request, inventoryEpoch: state.inventory?.epoch })
      ) {
        clearTimeout(timeout);
        requests.delete(request);
        resolve({ ok: false, message: 'Connection is busy. Try again in a moment.' });
      }
    });
  }
  function remotePlayers(time = now()) {
    const result = [],
      targetTime = time - MP_INTERPOLATION_MS;
    for (const peer of peers.values()) {
      const samples = peer.samples;
      if (!samples.length) continue;
      let a = samples[0],
        b = samples.at(-1)!;
      for (let i = 1; i < samples.length; i++)
        if (samples[i].time >= targetTime) {
          a = samples[i - 1];
          b = samples[i];
          break;
        }
      const pose = interpolateNetworkPose(
        a.pose,
        b.pose,
        (targetTime - a.time) / (b.time - a.time || 1),
      );
      result.push({
        ...pose,
        hp: peer.hp ?? pose.hp,
        name: peer.name,
        appearance: peer.appearance,
        level: peer.level || pose.level || 1,
        pvp: peer.pvp ?? pose.pvp ?? false,
      });
    }
    return result;
  }
  function claimAward<T extends PendingAward>(award: T, apply: (award: T) => void) {
    if (!award || appliedAwards.has(award.id)) return false;
    apply(award);
    appliedAwards.add(award.id);
    pendingAcks.add(award.id);
    if (appliedAwards.size > 256) appliedAwards.delete(appliedAwards.values().next().value!);
    checkpoint(true);
    return true;
  }
  if (endpoint) connect();
  else firstResolve(null);
  // WebSocket close can lag a broken network. Never keep accepting gameplay
  // indefinitely on a socket that has stopped delivering the 5 Hz world feed.
  let watchdogAt = performance.now();
  const watchdog = endpoint
    ? setInterval(() => {
        // Loading geometry or suspending a background tab can delay every JS
        // task, including healthy queued messages. Give those a turn first.
        const tick = performance.now(),
          delayed = tick - watchdogAt > 2500;
        watchdogAt = tick;
        if (delayed) {
          lastReceivedAt = now();
          return;
        }
        if (stopped || !socket || now() - lastReceivedAt < 6000) return;
        const stale = socket;
        socket = null;
        disconnected();
        stale.close(4000, 'Server updates timed out');
      }, 1000)
    : null;
  function selfPose(time = now()) {
    if (!selfSamples.length) return null;
    const target = time - MP_INTERPOLATION_MS - 50;
    let a = selfSamples[0],
      b = selfSamples.at(-1)!;
    for (let i = 1; i < selfSamples.length; i++)
      if (selfSamples[i].time >= target) {
        a = selfSamples[i - 1];
        b = selfSamples[i];
        break;
      }
    return interpolateNetworkPose(a.pose, b.pose, (target - a.time) / (b.time - a.time || 1));
  }
  return {
    state,
    first,
    peers,
    selfPose,
    command,
    checkpoint,
    claimAward,
    remotePlayers,
    acceptInventory,
    subscribe(fn: (message: ServerEvent) => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    update(pose: { mode?: string; boost?: boolean; talkingTo?: string; gesture?: string }) {
      if (!state.connected) return;
      const controls = {
        type: 'controls',
        mode: pose.mode,
        boost: pose.boost === true,
        talkingTo: pose.talkingTo || '',
        gesture: pose.gesture || '',
      };
      const signature = JSON.stringify(controls);
      if (signature !== lastControls) {
        lastControls = signature;
        send(controls);
      }
      checkpoint();
    },
    say: (text: string) => state.connected && send({ type: 'say', text }),
    stop() {
      checkpoint(true);
      stopped = true;
      clearTimeout(reconnect ?? undefined);
      clearTimeout(settleTimer ?? undefined);
      clearInterval(watchdog ?? undefined);
      const old = socket;
      socket = null;
      old?.close(1000, 'Leaving world');
      disconnected();
      status('Disconnected');
    },
    ping() {
      send({ type: 'ping', time: now() });
    },
  };
}

export async function bootMultiplayer() {
  let endpoint;
  try {
    const query = new URL(location.href).searchParams;
    endpoint = query.get('server') || localStorage.getItem('sf-multiplayer-endpoint');
    if (!endpoint && location.protocol !== 'file:') {
      const response = await fetch(new URL('./multiplayer-config.json', location.href), {
        signal: AbortSignal.timeout(1200),
        cache: 'no-store',
      });
      if (response.ok) endpoint = (await response.json()).endpoint;
    }
  } catch {}
  endpoint = multiplayerEndpoint(endpoint);
  const client = createMultiplayerClient({
    endpoint,
    onStatus: (state: { status: string | null }) => {
      const label = document.getElementById('sf-multiplayer-status');
      if (label) label.textContent = state.status;
    },
  });
  const result = await client.first;
  if (!result) client.state.reloadOnWelcome = true;
  return client;
}
