# Local 2,000-player capacity validation

Production map, one Node simulation owner, active state in RAM and Redis checkpoints every 1,000 ms. Each workload used 2,000 real WebSocket connections, eight warmup seconds and 60 measured seconds. Node v22.16.0 on an Apple M4 Max (16 logical CPUs, 64 GiB RAM); load generator and Redis shared that host. These are loopback smoke tests, not a production SLA.

| Workload                              | Action p99 ms | Tick p99 ms | Broadcast p99 ms | Accepted / rejected actions | Disconnects / expired |
| ------------------------------------- | ------------: | ----------: | ---------------: | --------------------------: | --------------------: |
| [crowded](capacity-2000-crowded.json) |         70.25 |      10.055 |           60.664 |                  235200 / 0 |                 0 / 0 |
| [mixed](capacity-2000-mixed.json)     |       115.579 |      26.396 |           64.859 |               183669 / 5731 |                 0 / 0 |
| [spread](capacity-2000-spread.json)   |       101.699 |      16.974 |           72.528 |                 236144 / 56 |                 0 / 0 |
| [follow](capacity-2000-follow.json)   |        91.334 |      25.998 |           63.816 |                     117 / 0 |                 0 / 0 |

All runs passed the load tool gates: healthy server, action p99 below 500 ms, tick p99 below 50 ms, no unexpected disconnects and no expired requests. Large movement-frame gaps can be legitimate delta silence and are not the tick-health metric. Raw JSON reports retain rolling server samples (latest 1,200) and aggregate client samples (latest 100,000).

Peak process RSS across these runs: 1.83 GiB. Peak application-payload output: 35.86 MB/s. This excludes WebSocket/TLS overhead and static asset downloads. The full world should continue using static hosting/CDN delivery. Browser FPS is not measured here.

The mixed run delivered 39,892 PvP hit messages and observed all 400 followers moving. Its rejected attacks were predominantly respawn protection, plus temporary inability to fight or range changes. The follow run observed all 1,999 followers moving. The spread run learned valid endpoints for every client; 56 later moves were rejected as unroutable, with no superseded destinations.

## Reproduce

Use an isolated Redis/database and a disposable backend with ALLOW_DEBUG=1 for the authored teleport positions below. Keep debug teleportation off publicly. Reuse the same identity seed between runs to avoid accumulating benchmark accounts.

```sh
node --import ./sf/node_modules/tsx/dist/loader.mjs sf/server/load-test.mts --players 2000 --seconds 60 --warmup 8 \
  --scenario spread --identity-seed disposable-capacity \
  --locations sf/server/benchmarks/capacity-locations.json \
  --url ws://127.0.0.1:8787/ws --output /tmp/spread-2000.json

node --import ./sf/node_modules/tsx/dist/loader.mjs sf/server/load-test.mts --players 2000 --seconds 60 --warmup 8 \
  --scenario mixed --identity-seed disposable-capacity \
  --locations sf/server/benchmarks/capacity-combat-locations.json \
  --url ws://127.0.0.1:8787/ws --output /tmp/mixed-2000.json
```

For crowded, use the first command with --scenario crowded (all players use its first point). For follow, use the second command with --scenario follow. The leader travels farther than normal walking clients, exercising server pursuit.

## Validation and limits

- A final graceful shutdown was followed by Redis discovery/restoration: all 2,000 profiles and eight shared cows restored, with checkpoint version 7,937,005 newer than the pre-shutdown version. See [recovery result](capacity-2000-recovery.json).
- All 172 backend tests passed, including Redis ownership/checkpoints, recovery, shutdown, movement, combat, browser-protocol compatibility and the new capacity cases.
- The generated map audit verified 466 destinations, 936 routes and 645 NPC interaction approaches. Focused build/collision tests pass, including 10,000 exact road/trail-distance comparisons. Map generation: 243446b9a5fce6effbfd.
- Five additional existing art/layout assertions remain failing: the private terminal has 87,065 triangles against an 80,000 limit; mansion count; central lamp-count expectation; a Lincoln Way tree/sidewalk overlap; and a market-farmer approach collision. The four world-navigation assertions also fail with the original path-smoothing algorithm restored through a temporary test loader. Thresholds and scenes were not changed to hide these failures.
- Repeat on the intended host and proxy, with a separate load generator. These runs do not cover WAN loss, TLS overhead, mass asset downloads, every quest/vehicle simultaneously, sustained multi-hour operation, or 2,000 unrelated long-distance destination searches arriving together.

See [capacity/tuning documentation](../CAPACITY.md) for cache bounds, scheduling budgets and health metrics.

## Module/cache refactor validation — 2026-11-19

Same local M4 Max / Node 22.16 setup, production map, 2,000 actual WebSockets,
one authoritative process and Redis checkpoints every second. The profile run
used Node's CPU sampler; the measurements below used an unprofiled process.

| Workload                                                              | Warmup | Action p99 ms | Tick p99 ms | Broadcast p99 ms | Disconnects / expired |
| --------------------------------------------------------------------- | -----: | ------------: | ----------: | ---------------: | --------------------: |
| [Mixed immediately after recovery](refactor-2000-recovery-mixed.json) |    8 s |      2432.557 |      37.883 |           99.030 |                 0 / 0 |
| [Spread](refactor-2000-spread.json)                                   |    8 s |       103.615 |      23.437 |           92.663 |                 0 / 0 |
| [Mixed, warm process](refactor-2000-mixed.json)                       |   20 s |       100.929 |      24.136 |           61.556 |                 0 / 0 |

The warm mixed run and spread run pass the existing load gates; the first
post-recovery mixed run fails the 500 ms action-latency gate. Do not interpret
the warm result as proof that restart bursts are solved. The post-recovery run
reached a queue high-water mark of 8,536, with a maximum broadcast of 816 ms;
it answered every request, but queued actions took seconds. Further recovery/
join-burst allocation and queue-budget profiling is warranted before an SLA.
The warm mixed run delivered 35,404 PvP hit messages and observed all 400
followers moving. Spread learned routes for all clients and rejected 28 later
unroutable moves. Peak RSS across these unprofiled runs was 1.91 GiB; peak
application payload output was 26.87 MB/s. Rolling server timing windows can
include the end of the preceding workload; client timings cover the measured
minute. Reuse the commands above with the authored locations and a disposable
identity seed; use `--warmup 20` for the warm mixed scenario.

The CPU profile covered startup plus profiled mixed/spread workloads. Largest
self-time consumers after idle were garbage collection, replication, socket
writes, message serialization and navigation probes. The profile was diagnostic;
no overall speedup is claimed against the older reports because recovery,
profiling and workload history differ.

Private presentation replication now uses immutable component DTOs with
monotonic revisions, skips unchanged walking/idle components and parses rounded
global snapshots once per broadcast. This removes transient-state stringify/
parse comparisons per player without changing the wire protocol or ownership.
The backend regression suite passes 217 tests, with three optional tests skipped.
After graceful shutdown, Redis discovery recovered all 2,000 profiles and names
at checkpoint version 4,847,460. See the [final checkpoint record](refactor-2000-final-checkpoint.json).

Client checks: scoped ES module bundling, native headless map/navigation,
server-command adapters, UI scheduling, exact cached vehicle geometry/picking,
localhost and file:// startup, Follow, GPU context restoration and CPU fallback.
Four existing scene assertions remain: private-terminal triangle budget, mansion
count, central lamp count and the Lincoln Way tree/sidewalk overlap. A stale
outlaw-loot expectation was updated to include its existing Goose Corp drop.

An unchanged production build now takes about 481 ms on this machine and skips
headless model construction/baking. Output: 2.86 MB HTML, 54.48 MB compressed
map chunks, version `57937c39a672e32b0aae`. The audit verifies 503 destinations,
1,010 routes and 654 NPC approaches. UI/dialogue/networking/artwork edits and
formatting are excluded from semantic geometry invalidation.

[Vehicle geometry measurements](../../reports/vehicle-cache.json) are reproduced
with `node --import ./sf/node_modules/tsx/dist/loader.mjs sf/tools/vehicle-cache-benchmark.mts`. Warm per-frame CPU construction
in ms (CPU reference → cached GPU records): airship 1.5041 → 0.0551;
Ferrari 0.7002 → 0.0679; streetcar 0.2317 → 0.0016; parked rocket
0.3645 → 0.0017. These measure CPU geometry preparation, not total FPS or GPU
draw time. Transparent runs retain the glass pass and CPU previews remain valid.
