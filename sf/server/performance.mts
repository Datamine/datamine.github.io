export interface PerformanceSummary {
  samples: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
}
/** Bounded, rolling samples. Reporting allocates; the simulation hot path does not. */
export function createPerformanceMetrics({ capacity = 1200 } = {}) {
  const series = new Map<string, { values: Float64Array; count: number; cursor: number }>();
  function observe(name: string, value: number) {
    let s = series.get(name);
    if (!s) series.set(name, (s = { values: new Float64Array(capacity), count: 0, cursor: 0 }));
    s.values[s.cursor] = value;
    s.cursor = (s.cursor + 1) % capacity;
    s.count++;
  }
  function snapshot() {
    const result: Record<string, PerformanceSummary> = {};
    for (const [name, s] of series) {
      const values = Array.from(s.values.subarray(0, Math.min(capacity, s.count))).sort(
          (a, b) => a - b,
        ),
        at = (p: number) =>
          +(values[Math.min(values.length - 1, Math.floor(values.length * p))] || 0).toFixed(3);
      result[name] = {
        samples: s.count,
        mean: +(values.reduce((sum, n) => sum + n, 0) / values.length).toFixed(3),
        p50: at(0.5),
        p95: at(0.95),
        p99: at(0.99),
        max: at(1),
      };
    }
    return result;
  }
  return { observe, snapshot };
}
