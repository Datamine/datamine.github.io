# Capacity and performance

Measured results and raw reports: [local 2,000-player validation](benchmarks/capacity-2000.md).

One Node process owns the common world. Do not start one simulation per CPU
against the same world. Redis ownership/checkpoints are unchanged. Simulation
runs at 20 Hz, player deltas at up to 10 Hz and shared/private deltas at 5 Hz.
Replication preserves protocol 4. Deploy the client-command adapter refactor with its rebuilt client.

## Scheduling and caches

- Player/NPC/loot interests remain bounded to 32/32/64 per client. Private
  instances remain isolated and entering interests get complete baselines.
  Speech uses reverse visibility interests and one encoded event, avoiding an
  all-nearby broadcast/sort for invisible speakers in dense crowds.
- `spatial-index.mjs` shares candidate lists between nearby observers, uses
  bounded top-K selection, then checks exact distances. Boundary ties are kept.
- `player-frames.mjs` encodes each source player once per broadcast and copies
  cached 32-byte records to recipients. Changes compare actual wire bytes,
  avoiding both repeated encoding and lost sub-centimeter changes.
- `player-components.mjs` publishes immutable private DTOs only when explicit component fields change. Per-player revision baselines replace whole transient-state string comparisons. Idle/walking players reuse their records until an action, snapshot revision or activity transition invalidates them. Active police, keeper, travel and instance presentations sample independently.
- `replication.mjs` prepares rounded global state once per broadcast, then reuses it for recipients. It caches public metadata and unchanged shared source arrays.
  Field-mask patches are reused by observers with identical previous versions.
- `routes.mjs` caches exact endpoints, including failures, without rounding
  across walls. Cached waypoint arrays are detached from actor routes. Expiry
  and navigation revisions invalidate the cache. Limits bound entries and points.
  Obstructed routes can reuse a quarter-cell core only after both exact endpoint
  connectors pass the authoritative collision test. Exact destinations stay exact;
  a failed connector falls back to a normal search. Clear direct moves skip A*.
  Reusable routes retain their successful exact anchors; they do not snap a
  doorway to an arbitrary cell center. A separate small negative cache prevents
  one-use endpoints from evicting reusable routes. Route smoothing uses bounded
  forward shortcut probes rather than rescanning backward across a winding path.
- Follow replans use count/time budgets and round-robin admission. Deferred
  actors keep their existing route. A very crowded pursuit may lag; an individual
  synchronous path search cannot be interrupted by the time budget.
- `action-queue.mjs` yields to I/O/timers after 4 ms or 64 mutations, preserving
  order. Consecutive pending destinations coalesce; every request gets a result.
  Other messages are barriers. Sessions exceeding 32 pending commands close
  rather than growing an unbounded backlog. Running actions are not preempted.
- RAM checkpoint batches detach profiles once, avoiding a redundant copy of
  every profile before the batch copy. Consistent snapshot capture is preserved.
  Purchases, PvP toggles/deaths and disconnects commit only the affected RAM
  account row; they do not serialize all dirty players on every transaction.
  Shared state is materialized by the ordered periodic/final checkpoint hook.
- Static southern housing collisions now use spatial buckets and conservative
  bounds before detailed house/fence tests. Out-of-region navigation probes
  reject before running land classifiers. Distant institute interiors skip
  coordinate transforms. Differential tests preserve the original collision
  decisions, including rotated plots, padding and rounded-up grid extents.
- The WebSocket adapter corks each recipient's broadcast batch, reducing kernel
  writes while keeping separate protocol frames and immediate end-of-batch flush.
- Small idle creature shuffles use collision-checked direct movement or wait
  for another wander target. They do not search an entire mountain to shuffle
  around a nearby tree. Active pursuit and distant home returns retain routing.
- Static road/trail distance queries use exact spatial indexing instead of
  scanning every southern road for every height sample. A 10,000-position
  differential test matches original distances exactly. Unowned passive assets
  and unhired AI jobs skip unnecessary per-tick work and building searches.

Defaults are in [`tuning.mjs`](tuning.mjs); tests can override them using
`createGame({tuning:{...}})`. Gameplay balance/cadence remain in `sf/config`.

## Metrics

`GET /healthz` retains its existing fields and adds:

| Field       | Measurement                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `timings`   | Count, mean, p50/p95/p99/max for ticks, movement, shared/personal simulation, other systems, broadcasts, actions, checkpoint preparation and loop gaps |
| `resources` | RSS/heap/external MiB, CPU %, outgoing MB/s, movement packets/s; sampled each second                                                                   |
| `actions`   | Current/high-water backlog, I/O yields, coalesced destinations                                                                                         |
| `routes`    | Requests, hits, searches, search ms, evictions, deferred replans, cache entries/points                                                                 |
| `network`   | Total outgoing bytes, movement packets and slow-client skips                                                                                           |

Timing storage retains at most 1,200 samples per metric. CPU 100% means one
logical core; native/GC workers can bring process CPU above 100%. These metrics
measure server behavior, not browser rendering FPS. Watch checkpoint preparation
tails as well as tick duration: a synchronous snapshot can delay the next tick.

## Load tests

Use a disposable backend/database: runs create anonymous profiles. For a
production decision, put the load generator on a separate machine. Loopback
shares host resources and excludes WAN, TLS and reverse-proxy overhead.

```sh
node sf/server/load-test.mjs --url ws://127.0.0.1:8787/ws \
  --players 2000 --seconds 60 --warmup 8 --scenario crowded \
  --output /tmp/crowded-2000.json

node sf/server/load-test.mjs --url ws://127.0.0.1:8787/ws \
  --players 2000 --seconds 60 --warmup 8 --scenario mixed \
  --output /tmp/mixed-2000.json
```

| Scenario  | Workload                                                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `crowded` | Independent walking around the common spawn                                                                                                                         |
| `mixed`   | 20% paired PvP, 20% followers, remainder walking; PvP deaths request respawn                                                                                        |
| `follow`  | All but one player follow a moving leader                                                                                                                           |
| `idle`    | Idle connections and application pings                                                                                                                              |
| `spread`  | Walking at authored positions; requires a disposable `ALLOW_DEBUG=1` server and `--locations file.json` containing safe world positions `[{"x":92.2,"z":120}, ...]` |

Keep debug teleportation disabled publicly. Warmup learns accepted walking
destinations, then measured movement cycles those endpoints. Check
`clientsWithLearnedRoutes` and rejection reasons to assess actual workload.
Walking/fighting clients submit up to two requests/second, staggered in 25 ms
batches. Followers advance on server ticks. All clients ping every two seconds.
At most eight requests/client can be outstanding; expired requests are counted.

Reports contain action-to-result latency, ping RTT, wire latency, traffic,
rejections, outstanding/expired requests, disconnects, server timing percentiles
and resource peaks. Client metrics retain the latest 100,000 samples per series.
Frame gaps can include legitimate delta silence; they do not measure tick health.
The command exits nonzero on disconnects, expired requests, unhealthy server,
action p99 above 500 ms (`--max-action-p99-ms` overrides), or tick p99 above 50 ms.
Inspect rejected actions separately; they are still answered requests.
Mixed runs also count actual received PvP hit messages and followers observed
moving. A mixed run with no hits fails. For a repeatable native-map combat site,
use `--locations` with two verified, adjacent clear positions on a disposable
debug-enabled backend; combatants are returned there after respawning.
`follow --locations file.json` also places followers near the leader before
starting; use this when reusing identities previously scattered across the map.
`--identity-seed disposable-test-name` reuses the same anonymous test accounts
across runs, preventing old benchmark profiles from accumulating indefinitely.

These are smoke-test gates, not a 2,000-player SLA. Also exercise long-distance
routes, saturated combat encounters, slow consumers, reconnect bursts, checkpoint
growth and sustained operation on the intended production host. Whole-world
ownership still imposes a single-process simulation limit.
