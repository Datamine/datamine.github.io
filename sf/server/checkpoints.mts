import type {
  CheckpointStore,
  GameCheckpoint,
  RamGameStore,
  NameReservation,
} from '../types/storage.ts';
interface CheckpointRuntime {
  state: {
    id: string;
    status: GameCheckpoint['status'];
    version: number;
    records: Map<string, unknown>;
    names: Map<string, NameReservation>;
  };
  persistedVersion: number;
  writing: Promise<void> | null;
  prepare: <T>(capture: () => T) => T | Promise<T>;
  drain: () => unknown | Promise<unknown>;
  adapter?: RamGameStore;
}
const copy = <T,>(value: T) => structuredClone(value);
const validId = (id: string) => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(id);

function positiveMilliseconds(value: unknown, name: string) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1)
    throw new Error(name + ' must be a positive integer in milliseconds.');
  return value;
}

/** Runtime queues, hooks and timers live here, outside the checkpoint document.
 * Redis is used only at startup and by the checkpoint writer, never by the RAM
 * store handed to the simulation. One process owns all of these games. */
export async function createCheckpointManager({
  store,
  intervalMs = 1000,
  shutdownTimeoutMs = 10000,
  logger = console,
  now = Date.now,
}: {
  store: Pick<CheckpointStore, 'loadGames' | 'saveGame' | 'loadLegacy' | 'close' | 'destroy'>;
  intervalMs?: number;
  shutdownTimeoutMs?: number;
  logger?: Pick<Console, 'error'>;
  now?: () => number;
}) {
  positiveMilliseconds(intervalMs, 'CHECKPOINT_INTERVAL_MS');
  positiveMilliseconds(shutdownTimeoutMs, 'SHUTDOWN_TIMEOUT_MS');
  const games = new Map<string, CheckpointRuntime>();
  let timer: ReturnType<typeof setInterval> | null = null,
    stopping = false,
    disposed = false,
    shutdownPromise: Promise<{ flushed: boolean; timedOut: boolean }> | null = null;

  function restore(document: GameCheckpoint) {
    if (
      document.schema !== 1 ||
      !validId(document.id) ||
      !(['active', 'completed'] satisfies [string, string]).includes(document.status) ||
      !Number.isSafeInteger(document.version) ||
      document.version < 1 ||
      !Array.isArray(document.records) ||
      !Array.isArray(document.names)
    )
      throw new Error('Invalid game checkpoint; refusing to start an empty world.');
    const state: CheckpointRuntime['state'] = {
      id: document.id,
      status: document.status,
      version: document.version,
      records: new Map(copy(document.records)),
      names: new Map(copy(document.names).map((row) => [row.owner, row])),
    };
    const runtime: CheckpointRuntime = {
      state,
      persistedVersion: document.version,
      writing: null,
      prepare: (capture) => capture(),
      drain: async () => {},
    };
    games.set(state.id, runtime);
    return runtime;
  }
  for (const document of await store.loadGames()) {
    if (games.has(document.id)) throw new Error('Duplicate saved game: ' + document.id);
    restore(document);
  }
  // Import the previous world/player records once. Subsequent starts restore
  // only the discoverable checkpoint documents, never stale legacy profiles.
  if (!games.size && store.loadLegacy) {
    const legacy = await store.loadLegacy();
    if (legacy.records.length || legacy.names.length) {
      const game = restore({ schema: 1, id: 'world', status: 'active', version: 1, ...legacy });
      game.persistedVersion = 0;
    }
  }

  function openGame(id = 'world') {
    if (stopping) throw new Error('Server is shutting down.');
    if (!validId(id)) throw new Error('Invalid game ID.');
    let game = games.get(id);
    if (!game) {
      game = restore({ schema: 1, id, status: 'active', version: 1, records: [], names: [] });
      game.persistedVersion = 0;
    }
    if (game.state.status === 'completed')
      throw new Error('Game ' + id + ' is completed and cannot be resumed.');
    if (game.adapter) return game.adapter;
    const changed = () => {
      if (game.state.version >= Number.MAX_SAFE_INTEGER)
        throw new Error('Game state version exhausted.');
      game.state.version++;
    };
    game.adapter = {
      kind: 'ram',
      inMemory: true,
      get: async (key: string) => copy(game.state.records.get(key) ?? null),
      batch: async (entries) => {
        const snapshot = copy(entries);
        for (const [key, value] of snapshot) game.state.records.set(key, value);
        if (snapshot.length) changed();
      },
      names: async () => copy([...game.state.names.values()]),
      rename: async (owner, canonical, name: string, changedAt) => {
        if (
          [...game.state.names.values()].some(
            (row) => row.owner !== owner && row.canonical === canonical,
          )
        )
          throw new Error('Username already taken.');
        game.state.names.set(owner, { owner, canonical, name, changed: changedAt });
        changed();
      },
      markChanged: changed,
      complete() {
        if (game.state.status !== 'completed') {
          game.state.status = 'completed';
          changed();
        }
      },
      get status() {
        return game.state.status;
      },
      get version() {
        return game.state.version;
      },
      get persistedVersion() {
        return game.persistedVersion;
      },
      close: async () => {},
    };
    return game.adapter;
  }
  function attach(
    id: string,
    { prepare, drain }: Partial<Pick<CheckpointRuntime, 'prepare' | 'drain'>>,
  ) {
    const game = games.get(id);
    if (!game) throw new Error('Open the game before attaching its simulation.');
    if (prepare) game.prepare = prepare;
    if (drain) game.drain = drain;
  }
  function checkpoint(id: string) {
    const game = games.get(id);
    if (!game) throw new Error('Unknown game: ' + id);
    if (disposed) return Promise.reject(new Error('Checkpoint storage is closed.'));
    if (game.writing) return game.writing;
    if (game.state.version <= game.persistedVersion) return Promise.resolve();
    // Assign the promise before prepare runs: another cycle cannot enqueue
    // a second snapshot while this game's writer is busy.
    game.writing = Promise.resolve()
      .then(async () => {
        // Materialize and capture inside the simulation's ordered mutation
        // queue. No newer action can advance the version between the two.
        const snapshot = await game.prepare(() => {
          const { state } = game;
          return copy<GameCheckpoint>({
            schema: 1,
            id: state.id,
            status: state.status,
            version: state.version,
            savedAt: now(),
            records: [...state.records],
            names: [...state.names.values()],
          });
        });
        if (disposed) throw new Error('Checkpoint storage is closed.');
        // The snapshot is detached before entering asynchronous storage.
        await store.saveGame(id, snapshot);
        game.persistedVersion = snapshot.version;
      })
      .catch((error) => {
        logger.error('Checkpoint failed for ' + id + ':', error);
        throw error;
      })
      .finally(() => {
        game.writing = null;
      });
    return game.writing;
  }
  async function cycle() {
    if (stopping) return;
    // Skip busy writers rather than accumulating a queue or promise
    // callbacks. The next cycle captures whatever version is latest then.
    await Promise.allSettled(
      [...games]
        .filter(([, g]) => !g.writing && g.state.version > g.persistedVersion)
        .map(([id]) => checkpoint(id)),
    );
  }
  function start() {
    if (stopping) throw new Error('Server is shutting down.');
    if (!timer) {
      timer = setInterval(() => {
        void cycle();
      }, intervalMs);
      timer.unref?.();
    }
  }
  function shutdown() {
    if (shutdownPromise) return shutdownPromise;
    stopping = true;
    if (timer) clearInterval(timer);
    timer = null;
    shutdownPromise = (async () => {
      let timeout: ReturnType<typeof setTimeout> | undefined,
        failed = false,
        timedOut = false;
      const deadline = performance.now() + shutdownTimeoutMs;
      const bounded = async <T,>(task: Promise<T>, label: string) => {
        const remaining = Math.max(1, deadline - performance.now());
        try {
          return await Promise.race([
            task,
            new Promise<never>((_, reject) => {
              timeout = setTimeout(() => {
                timedOut = true;
                reject(new Error(label + ' timed out after ' + shutdownTimeoutMs + ' ms.'));
              }, remaining);
            }),
          ]);
        } finally {
          clearTimeout(timeout);
        }
      };
      try {
        await bounded(
          (async () => {
            const drains = await Promise.allSettled(
              [...games.values()].map((game) => Promise.resolve().then(() => game.drain())),
            );
            const attempts = await Promise.allSettled(
              [...games].map(async ([id, game]) => {
                // A failed old write must not prevent the final attempt
                // to save the latest RAM state after mutations drain.
                if (game.writing) await game.writing.catch(() => {});
                if (!disposed && game.state.version > game.persistedVersion) await checkpoint(id);
              }),
            );
            const errors = [...drains, ...attempts]
              .filter((result) => result.status === 'rejected')
              .map((result) => result.reason);
            if (errors.length) throw new AggregateError(errors, 'Final game checkpoints failed.');
          })(),
          'Final checkpoint',
        );
      } catch (error) {
        failed = true;
        logger.error('Shutdown checkpoint failed:', error);
      }
      try {
        if (timedOut) {
          disposed = true;
          store.destroy?.();
        } else
          await bounded(
            Promise.resolve().then(() => store.close()),
            'Storage close',
          );
      } catch (error) {
        failed = true;
        logger.error('Storage shutdown failed:', error);
        store.destroy?.();
      }
      disposed = true;
      return { flushed: !failed, timedOut };
    })();
    return shutdownPromise;
  }
  return {
    openGame,
    attach,
    checkpoint,
    cycle,
    start,
    shutdown,
    intervalMs,
    shutdownTimeoutMs,
    list: () =>
      [...games.values()].map((g) => ({
        id: g.state.id,
        status: g.state.status,
        version: g.state.version,
        persistedVersion: g.persistedVersion,
        writing: !!g.writing,
      })),
    get stopping() {
      return stopping;
    },
  };
}
