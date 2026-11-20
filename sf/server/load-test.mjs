import { WebSocket } from 'ws';
import { randomBytes, createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { cpus, totalmem } from 'node:os';
import { MP_PROTOCOL } from '../multiplayer-protocol.js';
import { createPerformanceMetrics } from './performance.mjs';

const arg = (name, fallback) => {
  const index = process.argv.indexOf('--' + name);
  return index < 0 ? fallback : process.argv[index + 1];
};
const url = arg('url', 'ws://127.0.0.1:8787/ws'),
  count = Number(arg('players', 2000)),
  seconds = Number(arg('seconds', 30)),
  warmup = Number(arg('warmup', 5)),
  output = arg('output', null),
  scenario = arg('scenario', 'crowded'),
  locationsFile = arg('locations', null),
  maxLatency = Number(arg('max-action-p99-ms', 500));
if (
  !Number.isInteger(count) ||
  count < 1 ||
  count > 10000 ||
  !Number.isFinite(seconds) ||
  seconds < 5 ||
  seconds > 600 ||
  !Number.isFinite(warmup) ||
  warmup < 0 ||
  warmup > 120 ||
  !Number.isFinite(maxLatency) ||
  maxLatency <= 0
)
  throw Error('Use --players 1..10000, --seconds 5..600, --warmup 0..120, --max-action-p99-ms > 0');
if (!['crowded', 'spread', 'mixed', 'follow', 'idle'].includes(scenario))
  throw Error('Use --scenario crowded|spread|mixed|follow|idle');
const locations = locationsFile ? JSON.parse(await readFile(locationsFile, 'utf8')) : null;
const identitySeed = arg('identity-seed', null);
if (
  scenario === 'spread' &&
  (!Array.isArray(locations) ||
    !locations.length ||
    locations.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.z)))
)
  throw Error(
    'Spread needs --locations file.json containing safe world positions [{x,z}, ...] and a disposable ALLOW_DEBUG=1 backend',
  );
const healthURL = new URL(url);
healthURL.protocol = healthURL.protocol === 'wss:' ? 'https:' : 'http:';
healthURL.pathname = '/healthz';
healthURL.search = '';
const clients = [],
  samples = createPerformanceMetrics({ capacity: 100000 }),
  healthSamples = [],
  reasons = {},
  closeReasons = {};
let bytes = 0,
  frames = 0,
  actions = 0,
  accepted = 0,
  rejected = 0,
  superseded = 0,
  unexpectedCloses = 0,
  expired = 0,
  combatMessages = 0,
  measuring = false,
  stopping = false,
  timer;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function send(c, action, args = {}, track = true) {
  if (c.ws.readyState !== WebSocket.OPEN || c.ws.bufferedAmount > 65536 || c.pending.size >= 8)
    return null;
  const request = ++c.serial;
  c.pending.set(request, {
    at: performance.now(),
    track: track && measuring,
    action,
    goal: action === 'moveTo' ? args : null,
  });
  c.ws.send(JSON.stringify({ type: 'command', request, action, args, inventoryEpoch: c.epoch }));
  if (track && measuring) actions++;
  return request;
}
async function connect(index) {
  const ws = new WebSocket(url),
    client = {
      ws,
      index,
      token: identitySeed
        ? createHash('sha256')
            .update(identitySeed + ':' + index)
            .digest('hex')
        : randomBytes(32).toString('hex'),
      spawn: null,
      lastFrame: 0,
      pending: new Map(),
      serial: 0,
      goals: [],
      actionIndex: 0,
      pvp: scenario === 'mixed' && index % 10 < 2,
      follow:
        (scenario === 'follow' && index > 0) ||
        (scenario === 'mixed' && index % 10 >= 2 && index % 10 < 4),
    };
  clients.push(client);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error('Connection ' + index + ' timed out')), 30000);
    ws.once('open', () =>
      ws.send(
        JSON.stringify({
          type: 'hello',
          protocol: MP_PROTOCOL,
          token: client.token,
          privateState: {},
        }),
      ),
    );
    ws.on('error', reject);
    ws.on('close', (code, reason) => {
      clearTimeout(timeout);
      if (!stopping) {
        unexpectedCloses++;
        const key = code + ': ' + reason.toString();
        closeReasons[key] = (closeReasons[key] || 0) + 1;
      }
      if (!client.spawn) reject(Error('Connection ' + index + ' closed: ' + code + ' ' + reason));
    });
    ws.on('message', (data, binary) => {
      const current = performance.now();
      if (measuring) bytes += data.length;
      if (binary) {
        if (measuring) {
          frames++;
          if (client.lastFrame) samples.observe('frameGapMs', current - client.lastFrame);
          client.lastFrame = current;
          const sent = data.readUInt32LE(8),
            latency = ((Date.now() >>> 0) - sent) >>> 0;
          if (latency < 60000) samples.observe('wireLatencyMs', latency);
          const last = data.length - 32;
          if (
            client.follow &&
            last >= 12 &&
            data.readUInt32LE(last) === client.id &&
            data[last + 29]
          )
            client.followMotion = true;
        }
        return;
      }
      const message = JSON.parse(data);
      if (message.type === 'welcome') {
        client.spawn = message.position;
        client.id = message.id;
        client.epoch = message.inventory.epoch;
        clearTimeout(timeout);
        resolve();
      }
      if (message.type === 'result') {
        const request = client.pending.get(message.request);
        if (request) {
          client.pending.delete(message.request);
          client.lastResult = message;
          if (message.ok && request.action === 'respawn' && client.pvp && locations)
            send(client, 'teleport', client.spawn, false);
          if (!measuring && message.ok && request.goal && client.goals.length < 16)
            client.goals.push(request.goal);
          if (request.track) {
            samples.observe('actionLatencyMs', current - request.at);
            if (message.superseded) superseded++;
            else if (message.ok) accepted++;
            else {
              rejected++;
              const reason = message.message || 'Unknown rejection';
              reasons[reason] = (reasons[reason] || 0) + 1;
            }
          }
        }
      }
      if (message.type === 'pong' && measuring)
        samples.observe('pingRttMs', Date.now() - message.clientTime);
      if (message.type === 'pvpHit' && measuring) combatMessages++;
      if (message.type === 'caught' && message.source === 'pvp') send(client, 'respawn', {}, false);
    });
  });
  if (scenario === 'spread' || (['crowded', 'follow', 'mixed'].includes(scenario) && locations)) {
    const p = locations[scenario === 'crowded' ? 0 : index % locations.length],
      request = send(client, 'teleport', p, false);
    for (let i = 0; i < 300 && client.pending.has(request); i++) await sleep(10);
    if (client.pending.has(request) || !client.lastResult?.ok)
      throw Error('Spread teleport failed: ' + (client.lastResult?.message || 'timeout'));
    client.spawn = p;
  }
  return client;
}
try {
  for (let start = 0; start < count; start += 50) {
    await Promise.all(
      Array.from({ length: Math.min(50, count - start) }, (_, i) => connect(start + i)),
    );
    if (start % 500 === 0) console.log('Connected', Math.min(start + 50, count));
    await sleep(20);
  }
  for (const c of clients) {
    if (c.pvp) send(c, 'pvp', { enabled: true }, false);
    if (c.follow)
      send(c, 'followPlayer', { id: clients[scenario === 'mixed' && count > 4 ? 4 : 0].id }, false);
  }
  const begin = performance.now();
  let lastHealth = 0,
    healthPending = false;
  const interval = 500;
  for (const c of clients) {
    c.nextAction = begin + ((c.index % 20) * interval) / 20;
    c.nextPing = begin + (c.index % 40) * 50;
  }
  timer = setInterval(() => {
    const current = performance.now(),
      time = (current - begin) / 1000;
    for (const c of clients) {
      if (current >= c.nextPing) {
        c.nextPing = current + 2000;
        if (c.ws.readyState === WebSocket.OPEN)
          c.ws.send(JSON.stringify({ type: 'ping', time: Date.now() }));
      }
      if (current < c.nextAction) continue;
      c.nextAction = current + interval;
      for (const [id, r] of c.pending)
        if (current - r.at > 10000) {
          c.pending.delete(id);
          if (r.track) expired++;
        }
      if (scenario === 'idle') continue;
      if (c.pvp) {
        send(c, 'pvpAttack', { id: clients[c.index % 10 === 0 ? c.index + 1 : c.index - 1]?.id });
        continue;
      }
      if (c.follow) continue;
      const phase = time + c.index * 0.01,
        p = c.spawn,
        radius = scenario === 'follow' || (scenario === 'mixed' && c.index === 4) ? 6 : 0.8,
        goal =
          measuring && c.goals.length >= 2
            ? c.goals[c.actionIndex++ % c.goals.length]
            : { x: p.x + Math.sin(phase) * radius, z: p.z + Math.cos(phase) * radius };
      send(c, 'moveTo', goal);
    }
    if (measuring && !healthPending && current - lastHealth >= 1000) {
      lastHealth = current;
      healthPending = true;
      fetch(healthURL)
        .then((r) => r.json())
        .then((h) => healthSamples.push(h))
        .catch(() => {})
        .finally(() => (healthPending = false));
    }
  }, 25);
  console.log('Warming up', count, scenario, 'WebSocket clients…');
  await sleep(warmup * 1000);
  for (const c of clients) c.lastFrame = 0;
  measuring = true;
  const start = performance.now();
  await sleep(seconds * 1000);
  const elapsed = (performance.now() - start) / 1000;
  measuring = false;
  const pendingAtEnd = clients.reduce(
      (n, c) => n + [...c.pending.values()].filter((r) => r.track).length,
      0,
    ),
    server = await (await fetch(healthURL)).json(),
    timings = samples.snapshot();
  const report = {
    players: count,
    scenario,
    seconds: +elapsed.toFixed(2),
    protocol: MP_PROTOCOL,
    clientsWithLearnedRoutes: clients.filter((c) => !c.pvp && !c.follow && c.goals.length >= 2)
      .length,
    actionsSent: actions,
    actionsAccepted: accepted,
    actionsRejected: rejected,
    actionsSuperseded: superseded,
    actionsExpired: expired,
    pendingAtEnd,
    rejectionReasons: reasons,
    framesPerPlayerSecond: +(frames / count / elapsed).toFixed(2),
    receivedMBPerSecond: +(bytes / elapsed / 1e6).toFixed(2),
    unexpectedCloses,
    clientTimings: timings,
    server,
    resourcePeaks: Object.fromEntries(
      ['rssMiB', 'heapUsedMiB', 'cpuPercent', 'outboundMBps'].map((key) => [
        key,
        Math.max(0, ...healthSamples.map((h) => h.resources?.[key] || 0)),
      ]),
    ),
    notes: [
      'Real WebSockets; application actions every 500ms, staggered across clients. Warmup learns walkable endpoints before measurement.',
      'Client percentile samples retain the latest 100,000 observations per metric. Server timings retain the latest 1,200.',
      'Loopback measurements exclude WAN/TLS; client and server share host resources.',
      'Delta silence is expected: movement frame gaps are not a measure of simulation tick health.',
    ],
  };
  report.loadHost = {
    node: process.version,
    cpu: cpus()[0]?.model,
    logicalCPUs: cpus().length,
    ramGiB: +(totalmem() / 1073741824).toFixed(1),
  };
  report.combatHitMessages = combatMessages;
  report.followersObservedMoving = clients.filter((c) => c.followMotion).length;
  report.closeReasons = closeReasons;
  console.log(JSON.stringify(report, null, 2));
  if (output) await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  if (
    unexpectedCloses ||
    expired ||
    !server.ok ||
    (timings.actionLatencyMs?.p99 || 0) > maxLatency ||
    (server.timings?.tickMs?.p99 || 0) > 50 ||
    (scenario === 'mixed' && !combatMessages)
  )
    process.exitCode = 1;
} finally {
  stopping = true;
  clearInterval(timer);
  for (const c of clients) c.ws.terminate();
}
