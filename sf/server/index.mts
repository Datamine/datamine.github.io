import type { CheckpointStore } from '../types/storage.ts';
import type { ServerGeometry, ServerPlayer, PlayerTransport } from '../types/server.ts';
import type { Socket } from 'node:net';
import { requiredValue } from '../types/assert.ts';
import { errorMessage, isRecord } from '../types/json.ts';
interface ServerOptions {
  port?: number;
  host?: string;
  store?: CheckpointStore | null;
  geometry?: ServerGeometry | null;
  maxPlayers?: number;
  allowDebug?: boolean;
  allowedOrigins?: string[];
  checkpointIntervalMs?: number;
  shutdownTimeoutMs?: number;
  logger?: Pick<Console, 'error'>;
}
import { watchContent } from '../content/server.mts';
import { applyWorldEdits } from '../world-edits.ts';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { WebSocketServer, WebSocket } from 'ws';
import { createWorldModel } from '../world.ts';
import { createGame } from './game.mts';
import { createStore } from './store.mts';
import { createCheckpointManager } from './checkpoints.mts';
import { MP_PROTOCOL, MP_TICK_HZ, MP_BROADCAST_HZ } from '../multiplayer-protocol.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};
export async function startServer({
  port = Number(process.env.PORT) || 8787,
  host = process.env.HOST || '127.0.0.1',
  store: providedStore = null,
  geometry: providedGeometry = null,
  maxPlayers = Number(process.env.MAX_PLAYERS) || 2000,
  allowDebug = process.env.ALLOW_DEBUG === '1',
  allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  checkpointIntervalMs = Number(process.env.CHECKPOINT_INTERVAL_MS ?? 1000),
  shutdownTimeoutMs = Number(process.env.SHUTDOWN_TIMEOUT_MS ?? 10000),
  logger = console,
}: ServerOptions = {}) {
  const geometry: ServerGeometry = providedGeometry || createWorldModel();
  if (!providedGeometry) {
    console.log('Preparing the authoritative map and its tile adjacency…');
    geometry.hospital = requiredValue(
      geometry.sights?.find((s) => s.id === 'ucsf'),
      'The hospital is missing.',
    ).entry;
    geometry.nearestGround = (x: number, z: number) => {
      if (geometry.landClearAt(x - 0.5, z - 0.5)) return { x, z };
      for (let r = 0.25; r <= 2; r += 0.25)
        for (let a = 0; a < 16; a++) {
          const xx = x + Math.cos((a * Math.PI) / 8) * r,
            zz = z + Math.sin((a * Math.PI) / 8) * r;
          if (geometry.landClearAt(xx - 0.5, zz - 0.5)) return { x: xx, z: zz };
        }
      return null;
    };
  }
  // Build the static map before acquiring Redis's renewable ownership lease;
  // map compilation is synchronous and must not starve its renewal timer.
  const store = providedStore || (await createStore());
  let checkpoints: Awaited<ReturnType<typeof createCheckpointManager>>,
    game: Awaited<ReturnType<typeof createGame>>;
  try {
    checkpoints = await createCheckpointManager({
      store,
      intervalMs: checkpointIntervalMs,
      shutdownTimeoutMs,
      logger,
    });
    const ram = checkpoints.openGame('world');
    game = await createGame({ geometry, store: ram, maxPlayers, allowDebug });
    checkpoints.attach('world', { prepare: game.prepareCheckpoint, drain: game.close });
  } catch (error) {
    await store.close();
    throw error;
  }
  const delay = monitorEventLoopDelay({ resolution: 20 });
  delay.enable();
  let resources = {},
    previousUsage = process.cpuUsage(),
    previousResourceTime = performance.now(),
    previousBytes = 0,
    previousFrames = 0;
  function sampleResources() {
    const current = performance.now(),
      elapsed = (current - previousResourceTime) / 1000,
      usage = process.cpuUsage(),
      memory = process.memoryUsage();
    resources = {
      rssMiB: +(memory.rss / 1048576).toFixed(2),
      heapUsedMiB: +(memory.heapUsed / 1048576).toFixed(2),
      externalMiB: +(memory.external / 1048576).toFixed(2),
      cpuPercent: +(
        (usage.user + usage.system - previousUsage.user - previousUsage.system) /
        (elapsed * 10000)
      ).toFixed(2),
      outboundMBps: +((game.metrics.bytes - previousBytes) / elapsed / 1e6).toFixed(3),
      movementFramesPerSecond: +((game.metrics.frames - previousFrames) / elapsed).toFixed(2),
    };
    previousUsage = usage;
    previousResourceTime = current;
    previousBytes = game.metrics.bytes;
    previousFrames = game.metrics.frames;
  }
  const resourceTimer = setInterval(sampleResources, 1000);
  resourceTimer.unref();
  let draining = false,
    healthy = true;
  function permitted(origin: string | undefined) {
    if (!origin) return true;
    if (allowedOrigins.includes(origin)) return true;
    if (origin === 'null') return host === '127.0.0.1' || process.env.ALLOW_FILE_ORIGIN === '1';
    try {
      const u = new URL(origin);
      return (['127.0.0.1', 'localhost', '[::1]'] satisfies [string, string, string]).includes(
        u.hostname,
      );
    } catch {
      return false;
    }
  }
  const http = createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname === '/healthz') {
      const ok = healthy && !draining && store.leaseHealthy !== false;
      res.writeHead(ok ? 200 : 503, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      });
      res.end(
        JSON.stringify({
          ok,
          players: game.players.size,
          capacity: maxPlayers,
          store: store.kind,
          checkpoint: {
            ...checkpoints.list().find((g) => g.id === 'world'),
            intervalMs: checkpointIntervalMs,
          },
          uptimeSeconds: Math.floor(process.uptime()),
          eventLoopP99Ms: Math.round(delay.percentile(99) / 1e6),
          tickMs: +game.metrics.tickMs.toFixed(2),
          broadcastMs: +game.metrics.broadcastMs.toFixed(2),
          timings: game.metrics.snapshot(),
          resources,
          actions: { ...game.actionQueue.stats, coalescedMoves: game.metrics.coalescedMoves },
          routes: game.routes.stats,
          network: {
            bytes: game.metrics.bytes,
            movementFrames: game.metrics.frames,
            slowClientSkips: game.metrics.slowClients,
          },
        }),
      );
      return;
    }
    if (url.pathname === '/multiplayer-config.json') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ endpoint: '/ws', protocol: MP_PROTOCOL }));
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405);
      res.end();
      return;
    }
    try {
      const path = decodeURIComponent(url.pathname),
        file = resolve(
          root,
          '.' + (path === '/' || path === '/explore.html' ? '/index.html' : path),
        ),
        local = relative(root, file),
        type = contentTypes[extname(file)];
      if (
        local.startsWith('..') ||
        local.startsWith('server/') ||
        local.split(/[\\/]/).some((p) => p.startsWith('.')) ||
        !type
      ) {
        res.writeHead(404);
        res.end();
        return;
      }
      const data = await readFile(file);
      res.writeHead(200, {
        'Content-Type': type,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control':
          path.endsWith('.html') || path.endsWith('/manifest.js')
            ? 'no-cache'
            : /^\/world-cache\/[a-f0-9]{20}\//.test(path)
              ? 'public, max-age=31536000, immutable'
              : 'public, max-age=300',
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  const sockets = new WebSocketServer({
    noServer: true,
    maxPayload: 98304,
    perMessageDeflate: false,
    clientTracking: true,
  });
  http.on('upgrade', (req, socket, head) => {
    let path;
    try {
      path = new URL(req.url || '/', 'http://localhost').pathname;
    } catch {
      socket.destroy();
      return;
    }
    if (
      draining ||
      !healthy ||
      store.leaseHealthy === false ||
      path !== '/ws' ||
      !permitted(req.headers.origin) ||
      sockets.clients.size > maxPlayers + 128
    ) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    sockets.handleUpgrade(req, socket, head, (ws) => sockets.emit('connection', ws, req));
  });
  const aliveClients = new WeakSet<WebSocket>();
  sockets.on('connection', (ws) => {
    let player: ServerPlayer | null = null,
      authenticating = false;
    aliveClients.add(ws);
    const deadline = setTimeout(() => {
      if (!player) ws.close(4003, 'Authentication timeout');
    }, 10_000);
    deadline.unref();
    const socket = (ws as WebSocket & { _socket?: Socket })._socket;
    const transport: PlayerTransport = {
      get open() {
        return ws.readyState === WebSocket.OPEN;
      },
      get bufferedAmount() {
        return ws.bufferedAmount;
      },
      cork: () => socket?.cork(),
      uncork: () => socket?.uncork(),
      send(data) {
        if (ws.readyState !== WebSocket.OPEN) return;
        if (ws.bufferedAmount > 1048576) {
          ws.close(4009, 'Connection too slow; reconnect to resynchronize');
          return;
        }
        ws.send(data);
      },
      close: (code: number | undefined, reason: string | Buffer<ArrayBufferLike> | undefined) =>
        ws.close(code, reason),
    };
    ws.on('error', () => {});
    ws.on('pong', () => aliveClients.add(ws));
    ws.on('message', async (data, binary) => {
      if (draining || store.leaseHealthy === false) return;
      if (binary) {
        ws.close(4002, 'Client messages must be JSON');
        return;
      }
      let message: unknown;
      try {
        message = JSON.parse(data.toString());
      } catch {
        ws.close(4002, 'Invalid JSON');
        return;
      }
      if (!player) {
        if (authenticating) return;
        if (!isRecord(message) || message.type !== 'hello') {
          ws.close(4003, 'Authenticate first');
          return;
        }
        authenticating = true;
        try {
          player = await game.connect(message, transport);
          clearTimeout(deadline);
          if (ws.readyState !== WebSocket.OPEN) game.disconnect(player);
        } catch (error) {
          ws.close(4003, errorMessage(error).slice(0, 120));
        }
        return;
      }
      game.receive(player, message);
    });
    ws.on('close', () => {
      clearTimeout(deadline);
      if (player) game.disconnect(player);
    });
  });
  const tickSeconds = 1 / MP_TICK_HZ,
    broadcastMilliseconds = 1000 / MP_BROADCAST_HZ;
  let previous = performance.now(),
    accumulator = 0,
    lastBroadcast = 0;
  const loop = setInterval(() => {
    if (store.leaseHealthy === false) {
      for (const ws of sockets.clients) ws.close(1012, 'World ownership changed');
      return;
    }
    const current = performance.now();
    game.metrics.observe('loopGapMs', current - previous);
    accumulator += Math.min(0.25, (current - previous) / 1000);
    previous = current;
    try {
      let steps = 0;
      while (accumulator >= tickSeconds && steps++ < 5) {
        game.tick(tickSeconds);
        accumulator -= tickSeconds;
      }
      if (current - lastBroadcast >= broadcastMilliseconds - 1) {
        lastBroadcast = current;
        game.broadcast();
      }
    } catch (error) {
      healthy = false;
      console.error('Simulation failed:', error);
    }
  }, 10);
  const heartbeat = setInterval(() => {
    for (const ws of sockets.clients) {
      if (!aliveClients.has(ws)) {
        ws.terminate();
        continue;
      }
      aliveClients.delete(ws);
      ws.ping();
    }
  }, 15000);
  try {
    await new Promise<void>((resolve, reject) => {
      http.once('error', reject);
      http.listen(port, host, resolve);
    });
  } catch (error) {
    clearInterval(loop);
    clearInterval(heartbeat);
    clearInterval(resourceTimer);
    delay.disable();
    sockets.close();
    await checkpoints.shutdown();
    throw error;
  }
  const address = http.address();
  if (!address || typeof address === 'string')
    throw new Error('The server did not bind a TCP port.');
  console.log(
    `Loeberland: http://${host}:${address.port}/ · WebSocket /ws · ${store.kind} · capacity ${maxPlayers}`,
  );
  checkpoints.start();
  const stopContent = await watchContent({
    root,
    onChange: () => applyWorldEdits(geometry),
    onError: (error) => logger.error('Content reload:', error),
  });
  let closing: ReturnType<typeof checkpoints.shutdown> | null = null;
  function close() {
    if (closing) return closing;
    draining = true;
    stopContent();
    clearInterval(loop);
    clearInterval(heartbeat);
    clearInterval(resourceTimer);
    delay.disable();
    closing = (async () => {
      const saving = checkpoints.shutdown();
      const httpClosed = new Promise((resolve) => http.close(resolve));
      http.closeIdleConnections();
      for (const ws of sockets.clients) ws.close(1001, 'Server restarting');
      const force = setTimeout(() => {
        for (const ws of sockets.clients) ws.terminate();
      }, 250);
      try {
        return await saving;
      } finally {
        clearTimeout(force);
        for (const ws of sockets.clients) ws.terminate();
        await new Promise((resolve) => sockets.close(resolve));
        http.closeAllConnections();
        await httpClosed;
      }
    })();
    return closing;
  }
  return { http, sockets, game, checkpoints, port: address.port, close };
}

export function installShutdownHooks(
  server: { close: () => Promise<unknown> },
  {
    signals = process,
    exit = (code: number) => process.exit(code),
    logger = console,
  }: {
    signals?: {
      on: (event: 'SIGTERM' | 'SIGINT', listener: () => void) => unknown;
      off: (event: 'SIGTERM' | 'SIGINT', listener: () => void) => unknown;
    };
    exit?: (code: number) => unknown;
    logger?: Pick<Console, 'error'>;
  } = {},
) {
  let stopping: Promise<void> | null = null;
  const shutdown = () => {
    if (!stopping)
      stopping = Promise.resolve()
        .then(() => server.close())
        .then(
          () => {
            exit(0);
          },
          (error) => {
            logger.error('Server shutdown failed:', error);
            exit(1);
          },
        );
    return stopping;
  };
  signals.on('SIGTERM', shutdown);
  signals.on('SIGINT', shutdown);
  return () => {
    signals.off('SIGTERM', shutdown);
    signals.off('SIGINT', shutdown);
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await startServer();
  installShutdownHooks(server);
}
