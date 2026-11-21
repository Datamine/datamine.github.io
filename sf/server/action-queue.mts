import { setImmediate as yieldToIO } from 'node:timers/promises';

/** Ordered mutations retain one owner, but a burst cannot starve socket I/O,
 * simulation timers or checkpoint scheduling with an endless microtask chain. */
export function createActionQueue({
  sliceMs = 4,
  maxBatch = 64,
  clock = performance.now.bind(performance),
  yieldTurn = yieldToIO,
}: {
  sliceMs?: number;
  maxBatch?: number;
  clock?: () => number;
  yieldTurn?: () => Promise<void>;
} = {}) {
  let tail: Promise<unknown> = Promise.resolve(),
    start = clock(),
    batch = 0,
    pending = 0,
    highWater = 0,
    yields = 0;
  function enqueue<T>(fn: () => T | PromiseLike<T>): Promise<T> {
    pending++;
    highWater = Math.max(highWater, pending);
    const task = tail.then(async () => {
      if (batch >= maxBatch || clock() - start >= sliceMs) {
        await yieldTurn();
        start = clock();
        batch = 0;
        yields++;
      }
      batch++;
      try {
        return await fn();
      } finally {
        pending--;
      }
    });
    tail = task.catch(() => {});
    return task;
  }
  return {
    enqueue,
    drain: () => tail,
    get stats() {
      return { pending, highWater, yields };
    },
  };
}
